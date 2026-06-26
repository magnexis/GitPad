export type ThemeName = 'light' | 'dark' | 'cyberpunk' | 'high-contrast';

export interface WorkspaceSummary {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  lastOpenedAt: string;
}

export interface FileNode {
  name: string;
  path: string;
  relativePath: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface SearchMatch {
  line: number;
  column: number;
  preview: string;
}

export interface SearchResult {
  relativePath: string;
  matches: SearchMatch[];
  score?: number;
  tags?: string[];
  updatedAt?: string;
}

export interface AdvancedSearchInput {
  workspacePath: string;
  query: string;
  within?: string[];
  fileType?: string;
  tag?: string;
  modifiedAfter?: string;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitFileChange {
  path: string;
  status: string;
}

export type FileChangeState = 'untracked' | 'modified' | 'staged' | 'conflicted';

export interface WorkingTreeChange {
  path: string;
  stagedStatus: string;
  unstagedStatus: string;
  state: FileChangeState;
}

export interface BranchInfo {
  id: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  lastUpdated?: string;
  head?: string;
}

export interface StagingStatus {
  branch: string;
  staged: WorkingTreeChange[];
  unstaged: WorkingTreeChange[];
  conflicted: WorkingTreeChange[];
}

export interface DiffView {
  path: string;
  mode: 'staged' | 'unstaged' | 'working-vs-head';
  diff: string;
}

export interface MergeResult {
  targetBranch: string;
  sourceBranch: string;
  merged: boolean;
  hasConflicts: boolean;
  output: string;
  conflictedPaths: string[];
}

export interface SyncStatus {
  branch: string;
  remote: string | null;
  hasUpstream: boolean;
  ahead: number;
  behind: number;
  status: 'up-to-date' | 'ahead' | 'behind' | 'diverged' | 'no-upstream';
}

export type PermissionRole = 'owner' | 'editor' | 'viewer';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export interface AuthSession {
  user: UserProfile;
  token: string;
  loginAt: string;
}

export interface ActivityEvent {
  id: string;
  workspacePath?: string;
  userId?: string;
  type: 'commit' | 'merge' | 'branch' | 'sync' | 'file' | 'auth';
  summary: string;
  details?: string;
  timestamp: string;
}

export interface CommitDetails {
  commit: GitCommit;
  files: GitFileChange[];
  diff: string;
}

export interface TerminalResult {
  command: string;
  cwd: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export interface GitHubSettings {
  owner: string;
  repo: string;
  remoteUrl: string;
  hasToken: boolean;
  autoPush: boolean;
}

export interface AppSettings {
  autoCommit: boolean;
  theme: ThemeName;
  gitUserName: string;
  gitUserEmail: string;
  defaultWorkspaceLocation: string;
  github: GitHubSettings;
}

export interface CreateWorkspaceInput {
  name: string;
  location?: string;
}

export interface RenameWorkspaceInput {
  workspacePath: string;
  name: string;
}

export interface DeleteWorkspaceInput {
  workspacePath: string;
  deleteFiles?: boolean;
}

export interface SaveFileInput {
  workspacePath: string;
  relativePath: string;
  content: string;
  message?: string;
}

export interface RenameInput {
  workspacePath: string;
  relativePath: string;
  nextRelativePath: string;
}

export interface DuplicateInput {
  workspacePath: string;
  relativePath: string;
  nextRelativePath?: string;
}

export interface GitHubTokenInput {
  token: string;
  owner: string;
  repo: string;
}

export interface NoteLink {
  source: string;
  target: string;
  label: string;
}

export interface NoteNode {
  id: string;
  title: string;
  path: string;
  tags: string[];
  updatedAt: string;
}

export interface NoteGraph {
  nodes: NoteNode[];
  links: NoteLink[];
  tags: Record<string, string[]>;
}

export interface Backlink {
  source: string;
  line: number;
  preview: string;
}

export interface WorkspaceAnalytics {
  noteCount: number;
  fileCount: number;
  tagCount: number;
  recentActivity: GitCommit[];
  mostEditedFiles: Array<{ path: string; edits: number }>;
  commitFrequency: Array<{ date: string; commits: number }>;
}

export interface Snapshot {
  name: string;
  tag: string;
  hash: string;
  date: string;
  message: string;
}

export type ExecutionLanguage = 'javascript' | 'python';
export type ExecutionScope = 'block' | 'file';

export interface CodeExecutionResult {
  id: string;
  language: ExecutionLanguage;
  scope: ExecutionScope;
  sourcePath?: string;
  blockKey?: string;
  input: string;
  command: string;
  cwd: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  startedAt: string;
  finishedAt: string;
}
