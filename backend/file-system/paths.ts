import fs from 'node:fs/promises';
import path from 'node:path';

export const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'dist-electron', '.vite']);

export async function readGitignorePatterns(workspacePath: string): Promise<string[]> {
  const gitignorePath = path.join(workspacePath, '.gitignore');
  try {
    const content = await fs.readFile(gitignorePath, 'utf-8');
    return content.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch {
    return [];
  }
}

export function matchesGitignorePattern(filePath: string, patterns: string[]): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  for (const pattern of patterns) {
    if (pattern.endsWith('/')) {
      if (normalized.startsWith(pattern) || normalized.includes('/' + pattern)) return true;
    } else {
      const baseName = path.basename(normalized);
      if (baseName === pattern || normalized.endsWith('/' + pattern)) return true;
    }
    // Handle simple glob *
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\./g, '\\.'));
      if (regex.test(baseName)) return true;
    }
  }
  return false;
}

export function normalizeRelative(relativePath: string) {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) {
    throw new Error('Path must stay inside the workspace.');
  }
  return normalized;
}

export function resolveWorkspacePath(workspacePath: string, relativePath = '.') {
  const base = path.resolve(workspacePath);
  const target = path.resolve(base, relativePath === '.' ? '' : normalizeRelative(relativePath));
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error('Path must stay inside the workspace.');
  }
  return target;
}

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export function toRelative(workspacePath: string, target: string) {
  return path.relative(workspacePath, target).replaceAll(path.sep, '/');
}

export function isProbablyTextFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const textExtensions = new Set([
    '.md',
    '.markdown',
    '.txt',
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.json',
    '.css',
    '.scss',
    '.html',
    '.xml',
    '.yml',
    '.yaml',
    '.toml',
    '.rs',
    '.go',
    '.py',
    '.rb',
    '.java',
    '.c',
    '.cpp',
    '.h',
    '.hpp',
    '.cs',
    '.sh',
    '.ps1',
    '.sql',
    '.env',
    '.gitignore'
  ]);
  return textExtensions.has(ext) || path.basename(filePath).startsWith('.');
}
