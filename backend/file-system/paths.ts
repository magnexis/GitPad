import fs from 'node:fs/promises';
import path from 'node:path';

export const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'dist-electron', '.vite']);

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
