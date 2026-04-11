import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  BranchInfo,
  CommitDetails,
  DiffView,
  GitCommit,
  MergeResult,
  Snapshot,
  StagingStatus,
  SyncStatus,
  TerminalResult,
  WorkingTreeChange,
  WorkspaceAnalytics
} from '../../src/shared/types.js';

export function runCommand(cwd: string, command: string, args: string[], timeoutMs = 30000): Promise<TerminalResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: false, windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({ command: [command, ...args].join(' '), cwd, exitCode, stdout, stderr });
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ command: [command, ...args].join(' '), cwd, exitCode: 1, stdout, stderr: error.message });
    });
  });
}

export async function runGit(cwd: string, args: string[], timeoutMs = 30000) {
  const result = await runCommand(cwd, 'git', args, timeoutMs);
  if (result.exitCode !== 0) throw new Error(result.stderr || result.stdout || `git ${args.join(' ')} failed`);
  return result.stdout;
}

export async function initRepository(workspacePath: string, name: string, email: string) {
  const gitDir = path.join(workspacePath, '.git');
  await fs.mkdir(workspacePath, { recursive: true });
  try {
    await fs.access(gitDir);
  } catch {
    await runGit(workspacePath, ['init']);
  }
  await runGit(workspacePath, ['config', 'user.name', name || 'GitPad User']).catch(() => undefined);
  await runGit(workspacePath, ['config', 'user.email', email || 'gitpad@local']).catch(() => undefined);
}

export async function commitAll(workspacePath: string, message: string) {
  await runGit(workspacePath, ['add', '.']);
  const status = await runGit(workspacePath, ['status', '--porcelain']);
  if (!status.trim()) return 'No changes to commit.';
  return runGit(workspacePath, ['commit', '-m', message]);
}

export async function commitPaths(workspacePath: string, paths: string[] | string, message: string) {
  const items = Array.isArray(paths) ? paths : [paths];
  if (!items.length) return 'No changes to commit.';
  await runGit(workspacePath, ['add', '--', ...items]).catch(() => undefined);
  const status = await runGit(workspacePath, ['status', '--porcelain', '--', ...items]).catch(() => '');
  if (!status.trim()) return 'No changes to commit.';
  return runGit(workspacePath, ['commit', '-m', message]);
}

export async function deleteAndCommit(workspacePath: string, paths: string[] | string, message: string) {
  const items = Array.isArray(paths) ? paths : [paths];
  if (!items.length) return 'No changes to commit.';
  await runGit(workspacePath, ['add', '-A', '--', ...items]).catch(() => undefined);
  const status = await runGit(workspacePath, ['status', '--porcelain', '--', ...items]).catch(() => '');
  if (!status.trim()) return 'No changes to commit.';
  return runGit(workspacePath, ['commit', '-m', message]);
}

export async function moveAndCommit(workspacePath: string, paths: string[] | string, message: string) {
  const items = Array.isArray(paths) ? paths : [paths];
  if (!items.length) return 'No changes to commit.';
  await runGit(workspacePath, ['add', '-A', '--', ...items]).catch(() => undefined);
  const status = await runGit(workspacePath, ['status', '--porcelain', '--', ...items]).catch(() => '');
  if (!status.trim()) return 'No changes to commit.';
  return runGit(workspacePath, ['commit', '-m', message]);
}

export async function status(workspacePath: string) {
  return runGit(workspacePath, ['status', '--short']);
}

export async function branches(workspacePath: string): Promise<BranchInfo[]> {
  const output = await runGit(workspacePath, ['branch', '--format=%(HEAD)%x1f%(refname:short)%x1f%(objectname)%x1e']).catch(() => '');
  const parsed = output
    .split('\x1e')
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const [headMarker, name, head] = row.split('\x1f');
      return {
        id: name,
        name,
        isActive: headMarker === '*',
        head
      };
    });
  if (parsed.length) return parsed;
  const current = await activeBranch(workspacePath).catch(() => '');
  if (!current || current === 'HEAD') return [];
  return [{ id: current, name: current, isActive: true, head: '' }];
}

export async function createBranch(workspacePath: string, name: string): Promise<BranchInfo[]> {
  const normalized = normalizeBranchName(name);
  const hasHistory = await hasCommits(workspacePath);
  if (hasHistory) {
    await runGit(workspacePath, ['branch', normalized]);
    return branches(workspacePath);
  }
  const current = await activeBranch(workspacePath).catch(() => '');
  if (current !== normalized) {
    await runGit(workspacePath, ['switch', '-c', normalized]);
  }
  return branches(workspacePath);
}

export async function switchBranch(workspacePath: string, name: string): Promise<BranchInfo[]> {
  const normalized = normalizeBranchName(name);
  const hasHistory = await hasCommits(workspacePath);
  if (hasHistory) {
    await runGit(workspacePath, ['checkout', normalized]);
    return branches(workspacePath);
  }
  const current = await activeBranch(workspacePath).catch(() => '');
  if (current !== normalized) {
    await runGit(workspacePath, ['switch', '-c', normalized]);
  }
  return branches(workspacePath);
}

export async function renameBranch(workspacePath: string, oldName: string, newName: string): Promise<BranchInfo[]> {
  const oldNormalized = normalizeBranchName(oldName);
  const nextNormalized = normalizeBranchName(newName);
  const hasHistory = await hasCommits(workspacePath);
  if (hasHistory) {
    await runGit(workspacePath, ['branch', '-m', oldNormalized, nextNormalized]);
    return branches(workspacePath);
  }
  const current = await activeBranch(workspacePath).catch(() => '');
  if (current !== oldNormalized) {
    throw new Error('Can only rename the active branch before the first commit.');
  }
  await runGit(workspacePath, ['symbolic-ref', 'HEAD', `refs/heads/${nextNormalized}`]);
  return branches(workspacePath);
}

export async function deleteBranch(workspacePath: string, name: string): Promise<BranchInfo[]> {
  const normalized = normalizeBranchName(name);
  const current = await activeBranch(workspacePath);
  if (current === normalized) throw new Error('Cannot delete the active branch.');
  const all = await branches(workspacePath);
  if (all.length <= 1) throw new Error('Cannot delete the only branch.');
  const hasHistory = await hasCommits(workspacePath);
  if (!hasHistory) throw new Error('Cannot delete branches before the first commit.');
  await runGit(workspacePath, ['branch', '-D', normalized]);
  return branches(workspacePath);
}

export async function stagingStatus(workspacePath: string): Promise<StagingStatus> {
  const branch = await activeBranch(workspacePath);
  const output = await runGit(workspacePath, ['status', '--porcelain=1']).catch(() => '');
  const entries = output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map(parsePorcelainLine);
  const staged: WorkingTreeChange[] = [];
  const unstaged: WorkingTreeChange[] = [];
  const conflicted: WorkingTreeChange[] = [];
  for (const entry of entries) {
    if (entry.state === 'conflicted') {
      conflicted.push(entry);
      continue;
    }
    if (entry.state === 'untracked') {
      unstaged.push(entry);
      continue;
    }
    if (entry.stagedStatus !== ' ') staged.push(entry);
    if (entry.unstagedStatus !== ' ') unstaged.push(entry);
  }
  return { branch, staged, unstaged, conflicted };
}

export async function stagePath(workspacePath: string, relativePath: string) {
  await runGit(workspacePath, ['add', '--', relativePath]);
  return stagingStatus(workspacePath);
}

export async function unstagePath(workspacePath: string, relativePath: string) {
  await runGit(workspacePath, ['reset', 'HEAD', '--', relativePath]).catch(async () => {
    await runGit(workspacePath, ['restore', '--staged', '--', relativePath]);
  });
  return stagingStatus(workspacePath);
}

export async function stageAll(workspacePath: string) {
  await runGit(workspacePath, ['add', '-A']);
  return stagingStatus(workspacePath);
}

export async function unstageAll(workspacePath: string) {
  await runGit(workspacePath, ['reset']);
  return stagingStatus(workspacePath);
}

export async function discardPath(workspacePath: string, relativePath: string) {
  const currentStatus = await stagingStatus(workspacePath);
  const current = [...currentStatus.unstaged, ...currentStatus.staged, ...currentStatus.conflicted].find((item) => item.path === relativePath);
  if (!current) return currentStatus;
  if (current.state === 'untracked') {
    await runGit(workspacePath, ['clean', '-fd', '--', relativePath]);
  } else {
    await runGit(workspacePath, ['restore', '--staged', '--worktree', '--', relativePath]).catch(async () => {
      await runGit(workspacePath, ['checkout', '--', relativePath]);
    });
  }
  return stagingStatus(workspacePath);
}

export async function discardAll(workspacePath: string) {
  await runGit(workspacePath, ['restore', '--worktree', '--', '.']).catch(() => undefined);
  await runGit(workspacePath, ['clean', '-fd']).catch(() => undefined);
  return stagingStatus(workspacePath);
}

export async function commitStaged(workspacePath: string, message: string, author?: string) {
  const trimmed = message.trim();
  if (!trimmed) throw new Error('Commit message is required.');
  const staged = await runGit(workspacePath, ['diff', '--cached', '--name-only']).catch(() => '');
  if (!staged.trim()) throw new Error('No staged changes to commit.');
  const args = ['commit', '-m', trimmed];
  if (author?.trim()) args.push('--author', author.trim());
  return runGit(workspacePath, args);
}

export async function diffPath(workspacePath: string, relativePath: string, mode: DiffView['mode']): Promise<DiffView> {
  let args: string[] = [];
  if (mode === 'staged') args = ['diff', '--cached', '--', relativePath];
  if (mode === 'unstaged') args = ['diff', '--', relativePath];
  if (mode === 'working-vs-head') args = ['diff', 'HEAD', '--', relativePath];
  const diff = await runGit(workspacePath, args).catch(() => '');
  return { path: relativePath, mode, diff };
}

export async function mergeBranch(workspacePath: string, sourceBranch: string): Promise<MergeResult> {
  const targetBranch = await activeBranch(workspacePath);
  const result = await runCommand(workspacePath, 'git', ['merge', sourceBranch], 60000);
  const status = await stagingStatus(workspacePath);
  const hasConflicts = status.conflicted.length > 0;
  return {
    targetBranch,
    sourceBranch,
    merged: result.exitCode === 0 && !hasConflicts,
    hasConflicts,
    output: `${result.stdout}\n${result.stderr}`.trim(),
    conflictedPaths: status.conflicted.map((item) => item.path)
  };
}

export async function syncStatus(workspacePath: string): Promise<SyncStatus> {
  const branch = await activeBranch(workspacePath);
  const remote = (await runGit(workspacePath, ['remote']).catch(() => ''))
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find(Boolean) ?? null;
  const upstream = await runGit(workspacePath, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']).catch(() => '');
  const hasUpstream = Boolean(upstream.trim());
  if (!hasUpstream) {
    return { branch, remote, hasUpstream: false, ahead: 0, behind: 0, status: 'no-upstream' };
  }
  const counts = await runGit(workspacePath, ['rev-list', '--left-right', '--count', '@{upstream}...HEAD']).catch(() => '0\t0');
  const [behindText, aheadText] = counts.trim().split(/\s+/);
  const behind = Number(behindText) || 0;
  const ahead = Number(aheadText) || 0;
  let state: SyncStatus['status'] = 'up-to-date';
  if (ahead > 0 && behind > 0) state = 'diverged';
  else if (ahead > 0) state = 'ahead';
  else if (behind > 0) state = 'behind';
  return { branch, remote, hasUpstream: true, ahead, behind, status: state };
}

async function activeBranch(workspacePath: string) {
  const fromRevParse = await runGit(workspacePath, ['rev-parse', '--abbrev-ref', 'HEAD']).catch(() => '');
  const normalized = fromRevParse.trim();
  if (normalized && normalized !== 'HEAD') return normalized;
  const fromSymbolicRef = await runGit(workspacePath, ['symbolic-ref', '--short', 'HEAD']).catch(() => '');
  return fromSymbolicRef.trim();
}

async function hasCommits(workspacePath: string) {
  return runGit(workspacePath, ['rev-parse', '--verify', 'HEAD'])
    .then(() => true)
    .catch(() => false);
}

function normalizeBranchName(name: string) {
  const normalized = name.trim();
  if (!normalized) throw new Error('Branch name is required.');
  if (/\s/.test(normalized)) throw new Error('Branch name cannot contain spaces.');
  if (normalized.includes('..') || normalized.includes('^') || normalized.includes('~') || normalized.includes(':')) {
    throw new Error('Invalid branch name.');
  }
  return normalized;
}

function parsePorcelainLine(line: string): WorkingTreeChange {
  const stagedStatus = line[0] ?? ' ';
  const unstagedStatus = line[1] ?? ' ';
  const rawPath = line.slice(3).trim();
  const path = rawPath.includes('->') ? rawPath.split('->').at(-1)?.trim() ?? rawPath : rawPath;
  const state = deriveState(stagedStatus, unstagedStatus);
  return { path, stagedStatus, unstagedStatus, state };
}

function deriveState(stagedStatus: string, unstagedStatus: string): WorkingTreeChange['state'] {
  const pair = `${stagedStatus}${unstagedStatus}`;
  const conflictPairs = new Set(['UU', 'AA', 'DD', 'AU', 'UA', 'DU', 'UD']);
  if (conflictPairs.has(pair)) return 'conflicted';
  if (stagedStatus === '?' && unstagedStatus === '?') return 'untracked';
  if (stagedStatus !== ' ') return 'staged';
  return 'modified';
}

export async function history(workspacePath: string): Promise<GitCommit[]> {
  const format = '%H%x1f%h%x1f%an%x1f%ad%x1f%s%x1e';
  const output = await runGit(workspacePath, ['log', '--date=iso', `--pretty=format:${format}`]).catch(() => '');
  return output
    .split('\x1e')
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const [hash, shortHash, author, date, message] = row.split('\x1f');
      return { hash, shortHash, author, date, message };
    });
}

export async function fileHistory(workspacePath: string, relativePath: string): Promise<GitCommit[]> {
  const format = '%H%x1f%h%x1f%an%x1f%ad%x1f%s%x1e';
  const output = await runGit(workspacePath, ['log', '--date=iso', `--pretty=format:${format}`, '--', relativePath]).catch(() => '');
  return output
    .split('\x1e')
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const [hash, shortHash, author, date, message] = row.split('\x1f');
      return { hash, shortHash, author, date, message };
    });
}

export async function details(workspacePath: string, hash: string): Promise<CommitDetails> {
  const commits = await history(workspacePath);
  const commit = commits.find((item) => item.hash === hash || item.shortHash === hash);
  if (!commit) throw new Error('Commit not found.');
  const filesOutput = await runGit(workspacePath, ['show', '--name-status', '--format=', hash]);
  const files = filesOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [statusCode, ...fileParts] = line.split(/\s+/);
      return { status: statusCode, path: fileParts.join(' ') };
    });
  const diff = await runGit(workspacePath, ['show', '--format=short', '--find-renames', hash], 60000);
  return { commit, files, diff };
}

export async function restoreFile(workspacePath: string, hash: string, relativePath: string) {
  await runGit(workspacePath, ['checkout', hash, '--', relativePath]);
  return commitAll(workspacePath, `Restore ${relativePath} from ${hash.slice(0, 7)}`);
}

export async function revertCommit(workspacePath: string, hash: string) {
  return runGit(workspacePath, ['revert', '--no-edit', hash]);
}

export async function createSnapshot(workspacePath: string, name: string): Promise<Snapshot> {
  const cleanName = name.trim() || `Snapshot ${new Date().toLocaleString()}`;
  await commitAll(workspacePath, `Snapshot: ${cleanName}`).catch(() => undefined);
  const hash = (await runGit(workspacePath, ['rev-parse', 'HEAD'])).trim();
  const tag = `gitpad-snapshot/${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}`;
  await runGit(workspacePath, ['tag', '-a', tag, '-m', cleanName]);
  return { name: cleanName, tag, hash, date: new Date().toISOString(), message: cleanName };
}

export async function listSnapshots(workspacePath: string): Promise<Snapshot[]> {
  const output = await runGit(workspacePath, ['tag', '--list', 'gitpad-snapshot/*', '--format=%(refname:short)%x1f%(objectname)%x1f%(creatordate:iso)%x1f%(contents:subject)']).catch(() => '');
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [tag, hash, date, message] = line.split('\x1f');
      const name = message || tag.replace(/^gitpad-snapshot\//, '');
      return { name, tag, hash, date, message: name };
    });
}

export async function restoreSnapshot(workspacePath: string, tag: string) {
  await runGit(workspacePath, ['checkout', tag, '--', '.']);
  return commitAll(workspacePath, `Restore snapshot ${tag.replace(/^gitpad-snapshot\//, '')}`);
}

export async function analytics(workspacePath: string, noteCount: number, fileCount: number, tagCount: number): Promise<WorkspaceAnalytics> {
  const recentActivity = (await history(workspacePath)).slice(0, 12);
  const frequencyOutput = await runGit(workspacePath, ['log', '--date=short', '--pretty=format:%ad']).catch(() => '');
  const commitFrequency = Object.entries(
    frequencyOutput.split(/\r?\n/).filter(Boolean).reduce<Record<string, number>>((acc, date) => {
      acc[date] = (acc[date] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([date, commits]) => ({ date, commits }));
  const fileOutput = await runGit(workspacePath, ['log', '--name-only', '--pretty=format:']).catch(() => '');
  const mostEditedFiles = Object.entries(
    fileOutput.split(/\r?\n/).filter(Boolean).reduce<Record<string, number>>((acc, file) => {
      acc[file] = (acc[file] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([path, edits]) => ({ path, edits }))
    .sort((a, b) => b.edits - a.edits)
    .slice(0, 8);
  return { noteCount, fileCount, tagCount, recentActivity, mostEditedFiles, commitFrequency };
}
