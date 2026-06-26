import fs from 'node:fs/promises';
import path from 'node:path';
import type { AdvancedSearchInput, Backlink, FileNode, NoteGraph, NoteNode, SaveFileInput, SearchResult } from '../../src/shared/types.js';
import { ensureDir, ignoredDirectories, isProbablyTextFile, matchesGitignorePattern, readGitignorePatterns, resolveWorkspacePath, toRelative } from './paths.js';
import { commitPaths } from '../git/git-service.js';

const hiddenSystemFiles = new Set(['.gitkeep']);

export class FileService {
  async tree(workspacePath: string): Promise<FileNode[]> {
    const root = resolveWorkspacePath(workspacePath);
    const gitignorePatterns = await readGitignorePatterns(root);
    return this.readDirectory(root, root, gitignorePatterns);
  }

  async read(workspacePath: string, relativePath: string) {
    const target = resolveWorkspacePath(workspacePath, relativePath);
    return fs.readFile(target, 'utf8');
  }

  async save(input: SaveFileInput, autoCommit: boolean) {
    const target = resolveWorkspacePath(input.workspacePath, input.relativePath);
    await ensureDir(path.dirname(target));
    await fs.writeFile(target, input.content, 'utf8');
    if (autoCommit) {
      await commitPaths(input.workspacePath, input.relativePath, input.message || `Updated file: ${input.relativePath}`);
    }
  }

  async createFile(workspacePath: string, relativePath: string, content = '') {
    assertValidRelativePath(relativePath, 'File name is required.');
    const target = resolveWorkspacePath(workspacePath, relativePath);
    await ensureDir(path.dirname(target));
    const existed = await fs.access(target).then(() => true).catch(() => false);
    if (existed) throw new Error(`File already exists: ${relativePath}`);
    await fs.writeFile(target, content, 'utf8');
  }

  async createDirectory(workspacePath: string, relativePath: string) {
    assertValidRelativePath(relativePath, 'Folder name is required.');
    const target = resolveWorkspacePath(workspacePath, relativePath);
    const exists = await fs.access(target).then(() => true).catch(() => false);
    if (exists) throw new Error(`Path already exists: ${relativePath}`);
    await ensureDir(target);
    await fs.writeFile(path.join(target, '.gitkeep'), '', 'utf8');
  }

  async rename(workspacePath: string, relativePath: string, nextRelativePath: string) {
    assertValidRelativePath(relativePath, 'Source path is required.');
    assertValidRelativePath(nextRelativePath, 'New path is required.');
    const current = resolveWorkspacePath(workspacePath, relativePath);
    const next = resolveWorkspacePath(workspacePath, nextRelativePath);
    const currentExists = await fs.access(current).then(() => true).catch(() => false);
    if (!currentExists) throw new Error(`Path not found: ${relativePath}`);
    const targetExists = await fs.access(next).then(() => true).catch(() => false);
    if (targetExists) throw new Error(`Path already exists: ${nextRelativePath}`);
    await ensureDir(path.dirname(next));
    await fs.rename(current, next);
  }

  async delete(workspacePath: string, relativePath: string) {
    assertValidRelativePath(relativePath, 'Path is required.');
    const target = resolveWorkspacePath(workspacePath, relativePath);
    const exists = await fs.access(target).then(() => true).catch(() => false);
    if (!exists) throw new Error(`Path not found: ${relativePath}`);
    await fs.rm(target, { recursive: true, force: true });
  }

  async duplicate(workspacePath: string, relativePath: string, nextRelativePath?: string) {
    assertValidRelativePath(relativePath, 'Path is required.');
    const source = resolveWorkspacePath(workspacePath, relativePath);
    const stat = await fs.stat(source).catch(() => undefined);
    if (!stat) throw new Error(`Path not found: ${relativePath}`);
    const targetRelative = nextRelativePath
      ? normalizeDuplicatePath(nextRelativePath)
      : await this.nextDuplicateName(workspacePath, relativePath, stat.isDirectory());
    const target = resolveWorkspacePath(workspacePath, targetRelative);
    const targetExists = await fs.access(target).then(() => true).catch(() => false);
    if (targetExists) throw new Error(`Path already exists: ${targetRelative}`);
    await ensureDir(path.dirname(target));
    if (stat.isDirectory()) {
      await copyDirectoryRecursive(source, target);
    } else {
      await fs.copyFile(source, target);
    }
    return targetRelative;
  }

  async statType(workspacePath: string, relativePath: string) {
    const target = resolveWorkspacePath(workspacePath, relativePath);
    const stat = await fs.stat(target).catch(() => undefined);
    if (!stat) return null;
    return stat.isDirectory() ? 'directory' : 'file';
  }

  async search(workspacePath: string, query: string): Promise<SearchResult[]> {
    return this.advancedSearch({ workspacePath, query });
  }

  async advancedSearch(input: AdvancedSearchInput): Promise<SearchResult[]> {
    const query = input.query.trim();
    const needle = query.toLowerCase();
    const sourceFiles = input.within?.length
      ? input.within.map((item) => resolveWorkspacePath(input.workspacePath, item))
      : await this.walkTextFiles(resolveWorkspacePath(input.workspacePath), resolveWorkspacePath(input.workspacePath));
    const results: SearchResult[] = [];
    for (const file of sourceFiles) {
      if (input.fileType && !file.toLowerCase().endsWith(input.fileType.toLowerCase())) continue;
      const stat = await fs.stat(file).catch(() => undefined);
      if (!stat) continue;
      if (input.modifiedAfter && stat.mtime < new Date(input.modifiedAfter)) continue;
      const content = await fs.readFile(file, 'utf8').catch(() => '');
      const tags = extractTags(content);
      if (input.tag && !tags.includes(input.tag.replace(/^#/, ''))) continue;
      const lines = content.split(/\r?\n/);
      const matches = lines.flatMap((line, index) => {
        const score = fuzzyScore(line.toLowerCase(), needle);
        if (!needle || score <= 0) return [];
        const column = Math.max(1, line.toLowerCase().indexOf(needle) + 1);
        return [{ line: index + 1, column, preview: line.trim() }];
      });
      if (matches.length) {
        results.push({
          relativePath: toRelative(input.workspacePath, file),
          matches: matches.slice(0, 8),
          score: matches.length,
          tags,
          updatedAt: stat.mtime.toISOString()
        });
      }
    }
    return results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 100);
  }

  async noteGraph(workspacePath: string): Promise<NoteGraph> {
    const root = resolveWorkspacePath(workspacePath);
    const files = (await this.walkTextFiles(root, root)).filter((file) => file.toLowerCase().endsWith('.md'));
    const nodes: NoteNode[] = [];
    const links = [];
    const noteByTitle = new Map<string, string>();
    for (const file of files) {
      const relativePath = toRelative(workspacePath, file);
      const content = await fs.readFile(file, 'utf8').catch(() => '');
      const stat = await fs.stat(file);
      const title = path.basename(file, path.extname(file));
      noteByTitle.set(normalizeNoteName(title), relativePath);
      nodes.push({ id: relativePath, title, path: relativePath, tags: extractTags(content), updatedAt: stat.mtime.toISOString() });
    }
    for (const file of files) {
      const source = toRelative(workspacePath, file);
      const content = await fs.readFile(file, 'utf8').catch(() => '');
      for (const label of extractWikiLinks(content)) {
        const target = noteByTitle.get(normalizeNoteName(label)) ?? notePathForName(label);
        links.push({ source, target, label });
      }
    }
    const tags: Record<string, string[]> = {};
    for (const node of nodes) {
      for (const tag of node.tags) tags[tag] = [...(tags[tag] ?? []), node.path];
    }
    return { nodes, links, tags };
  }

  async backlinks(workspacePath: string, relativePath: string): Promise<Backlink[]> {
    const title = path.basename(relativePath, path.extname(relativePath));
    const root = resolveWorkspacePath(workspacePath);
    const files = (await this.walkTextFiles(root, root)).filter((file) => file.toLowerCase().endsWith('.md'));
    const backlinks: Backlink[] = [];
    for (const file of files) {
      const source = toRelative(workspacePath, file);
      if (source === relativePath) continue;
      const lines = (await fs.readFile(file, 'utf8').catch(() => '')).split(/\r?\n/);
      lines.forEach((line, index) => {
        if (extractWikiLinks(line).some((link) => normalizeNoteName(link) === normalizeNoteName(title))) {
          backlinks.push({ source, line: index + 1, preview: line.trim() });
        }
      });
    }
    return backlinks;
  }

  async ensureLinkedNote(workspacePath: string, noteName: string) {
    const relativePath = notePathForName(noteName);
    const target = resolveWorkspacePath(workspacePath, relativePath);
    await ensureDir(path.dirname(target));
    await fs.writeFile(target, `# ${noteName.trim()}\n\n`, { flag: 'wx' }).catch(() => undefined);
    return relativePath;
  }

  async quickCapture(workspacePath: string, content: string) {
    const stamp = new Date().toISOString();
    const target = resolveWorkspacePath(workspacePath, 'quick/inbox.md');
    await ensureDir(path.dirname(target));
    await fs.appendFile(target, `\n## ${stamp}\n\n${content.trim()}\n`, 'utf8');
    return 'quick/inbox.md';
  }

  async legacySearch(workspacePath: string, query: string): Promise<SearchResult[]> {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const files = await this.walkTextFiles(resolveWorkspacePath(workspacePath), resolveWorkspacePath(workspacePath));
    const results: SearchResult[] = [];
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8').catch(() => '');
      const lines = content.split(/\r?\n/);
      const matches = lines.flatMap((line, index) => {
        const column = line.toLowerCase().indexOf(needle);
        if (column === -1) return [];
        return [{ line: index + 1, column: column + 1, preview: line.trim() }];
      });
      if (matches.length) results.push({ relativePath: toRelative(workspacePath, file), matches: matches.slice(0, 8) });
    }
    return results.slice(0, 80);
  }

  private async readDirectory(root: string, current: string, gitignorePatterns: string[] = []): Promise<FileNode[]> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    const nodes: FileNode[] = [];
    for (const entry of entries) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      if (entry.isFile() && hiddenSystemFiles.has(entry.name)) continue;
      const absolute = path.join(current, entry.name);
      if (gitignorePatterns.length > 0 && matchesGitignorePattern(absolute, gitignorePatterns)) continue;
      const relativePath = toRelative(root, absolute);
      nodes.push({
        name: entry.name,
        path: absolute,
        relativePath,
        type: entry.isDirectory() ? 'directory' : 'file',
        children: entry.isDirectory() ? await this.readDirectory(root, absolute, gitignorePatterns) : undefined
      });
    }
    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  private async walkTextFiles(root: string, current: string, gitignorePatterns?: string[]): Promise<string[]> {
    if (!gitignorePatterns) {
      gitignorePatterns = await readGitignorePatterns(root);
    }
    const entries = await fs.readdir(current, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      if (entry.isFile() && hiddenSystemFiles.has(entry.name)) continue;
      const absolute = path.join(current, entry.name);
      if (gitignorePatterns.length > 0 && matchesGitignorePattern(absolute, gitignorePatterns)) continue;
      if (entry.isDirectory()) files.push(...(await this.walkTextFiles(root, absolute, gitignorePatterns)));
      if (entry.isFile() && isProbablyTextFile(absolute)) files.push(absolute);
    }
    return files;
  }

  private async nextDuplicateName(workspacePath: string, relativePath: string, isDirectory: boolean) {
    const parsed = path.posix.parse(relativePath.replaceAll('\\', '/'));
    const suffix = ' copy';
    const ext = isDirectory ? '' : parsed.ext;
    const baseName = isDirectory ? parsed.base : parsed.name;
    for (let index = 1; index <= 9999; index += 1) {
      const candidateName = index === 1 ? `${baseName}${suffix}${ext}` : `${baseName}${suffix} ${index}${ext}`;
      const candidate = parsed.dir ? `${parsed.dir}/${candidateName}` : candidateName;
      const exists = await fs.access(resolveWorkspacePath(workspacePath, candidate)).then(() => true).catch(() => false);
      if (!exists) return candidate;
    }
    throw new Error('Unable to create duplicate path.');
  }
}

export function extractWikiLinks(content: string) {
  return [...content.matchAll(/\[\[([^\]]+)\]\]/g)].map((match) => match[1].trim()).filter(Boolean);
}

export function extractTags(content: string) {
  return [...new Set([...content.matchAll(/(^|\s)#([A-Za-z0-9_-]+)/g)].map((match) => match[2]))];
}

export function notePathForName(noteName: string) {
  return `${noteName.trim().replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ')}.md`;
}

function normalizeNoteName(noteName: string) {
  return noteName.trim().toLowerCase();
}

function normalizeDuplicatePath(relativePath: string) {
  return relativePath.replaceAll('\\', '/').replace(/^\/+/, '').trim();
}

function assertValidRelativePath(relativePath: string, emptyMessage: string) {
  const normalized = relativePath.replaceAll('\\', '/').trim();
  if (!normalized) throw new Error(emptyMessage);
  const name = normalized.split('/').at(-1)?.trim() ?? '';
  if (!name) throw new Error(emptyMessage);
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name)) {
    throw new Error(`Reserved path name is not allowed: ${name}`);
  }
}

async function copyDirectoryRecursive(source: string, target: string) {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await copyDirectoryRecursive(from, to);
    } else {
      await fs.copyFile(from, to);
    }
  }
}

function fuzzyScore(haystack: string, needle: string) {
  if (!needle) return 0;
  if (haystack.includes(needle)) return needle.length + 10;
  let score = 0;
  let lastIndex = -1;
  for (const char of needle) {
    const index = haystack.indexOf(char, lastIndex + 1);
    if (index === -1) return 0;
    score += index === lastIndex + 1 ? 2 : 1;
    lastIndex = index;
  }
  return score;
}
