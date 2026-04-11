import type {
  AppSettings,
  AdvancedSearchInput,
  Backlink,
  BranchInfo,
  CommitDetails,
  CreateWorkspaceInput,
  DeleteWorkspaceInput,
  DuplicateInput,
  FileNode,
  GitCommit,
  GitHubSettings,
  GitHubTokenInput,
  NoteGraph,
  RenameWorkspaceInput,
  RenameInput,
  SaveFileInput,
  SearchResult,
  Snapshot,
  CodeExecutionResult,
  ExecutionLanguage,
  DiffView,
  MergeResult,
  ActivityEvent,
  TerminalResult,
  AuthSession,
  SyncStatus,
  UserProfile,
  StagingStatus,
  WorkspaceAnalytics,
  WorkspaceSummary
} from './types.js';

export interface GitPadApi {
  getSettings(): Promise<AppSettings>;
  updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
  listWorkspaces(): Promise<WorkspaceSummary[]>;
  createWorkspace(input: CreateWorkspaceInput): Promise<WorkspaceSummary>;
  openWorkspace(path?: string): Promise<WorkspaceSummary>;
  renameWorkspace(input: RenameWorkspaceInput): Promise<WorkspaceSummary>;
  deleteWorkspace(input: DeleteWorkspaceInput): Promise<WorkspaceSummary[]>;
  getFileTree(workspacePath: string): Promise<FileNode[]>;
  readFile(workspacePath: string, relativePath: string): Promise<string>;
  saveFile(input: SaveFileInput): Promise<string>;
  createFile(workspacePath: string, relativePath: string, content?: string): Promise<string>;
  createDirectory(workspacePath: string, relativePath: string): Promise<string>;
  renamePath(input: RenameInput): Promise<string>;
  duplicatePath(input: DuplicateInput): Promise<{ relativePath: string; output: string }>;
  deletePath(workspacePath: string, relativePath: string): Promise<string>;
  search(workspacePath: string, query: string): Promise<SearchResult[]>;
  advancedSearch(input: AdvancedSearchInput): Promise<SearchResult[]>;
  getNoteGraph(workspacePath: string): Promise<NoteGraph>;
  getBacklinks(workspacePath: string, relativePath: string): Promise<Backlink[]>;
  ensureLinkedNote(workspacePath: string, noteName: string): Promise<string>;
  quickCapture(workspacePath: string, content: string): Promise<string>;
  executeCodeSnippet(workspacePath: string, language: ExecutionLanguage, code: string, sourcePath?: string, blockKey?: string): Promise<CodeExecutionResult>;
  executeCodeFile(workspacePath: string, relativePath: string): Promise<CodeExecutionResult>;
  gitStatus(workspacePath: string): Promise<string>;
  gitBranches(workspacePath: string): Promise<BranchInfo[]>;
  gitCreateBranch(workspacePath: string, name: string): Promise<BranchInfo[]>;
  gitSwitchBranch(workspacePath: string, name: string): Promise<BranchInfo[]>;
  gitRenameBranch(workspacePath: string, oldName: string, newName: string): Promise<BranchInfo[]>;
  gitDeleteBranch(workspacePath: string, name: string): Promise<BranchInfo[]>;
  gitStagingStatus(workspacePath: string): Promise<StagingStatus>;
  gitStagePath(workspacePath: string, relativePath: string): Promise<StagingStatus>;
  gitUnstagePath(workspacePath: string, relativePath: string): Promise<StagingStatus>;
  gitStageAll(workspacePath: string): Promise<StagingStatus>;
  gitUnstageAll(workspacePath: string): Promise<StagingStatus>;
  gitDiscardPath(workspacePath: string, relativePath: string): Promise<StagingStatus>;
  gitDiscardAll(workspacePath: string): Promise<StagingStatus>;
  gitCommitStaged(workspacePath: string, message: string, author?: string): Promise<string>;
  gitDiffPath(workspacePath: string, relativePath: string, mode: DiffView['mode']): Promise<DiffView>;
  gitMergeBranch(workspacePath: string, sourceBranch: string): Promise<MergeResult>;
  gitSyncStatus(workspacePath: string): Promise<SyncStatus>;
  gitCommit(workspacePath: string, message: string): Promise<string>;
  gitHistory(workspacePath: string): Promise<GitCommit[]>;
  gitCommitDetails(workspacePath: string, hash: string): Promise<CommitDetails>;
  gitFileHistory(workspacePath: string, relativePath: string): Promise<GitCommit[]>;
  gitRestoreFile(workspacePath: string, hash: string, relativePath: string): Promise<void>;
  gitRevertCommit(workspacePath: string, hash: string): Promise<string>;
  createSnapshot(workspacePath: string, name: string): Promise<Snapshot>;
  listSnapshots(workspacePath: string): Promise<Snapshot[]>;
  restoreSnapshot(workspacePath: string, tag: string): Promise<string>;
  analytics(workspacePath: string): Promise<WorkspaceAnalytics>;
  terminalRun(workspacePath: string, command: string): Promise<TerminalResult>;
  githubSaveToken(workspacePath: string, input: GitHubTokenInput): Promise<GitHubSettings>;
  githubPush(workspacePath: string): Promise<TerminalResult>;
  githubPull(workspacePath: string): Promise<TerminalResult>;
  authRegister(username: string, email: string, password: string): Promise<AuthSession>;
  authLogin(identifier: string, password: string): Promise<AuthSession>;
  authLogout(): Promise<void>;
  authSession(): Promise<AuthSession | null>;
  authUsers(): Promise<UserProfile[]>;
  activityFeed(workspacePath?: string): Promise<ActivityEvent[]>;
  activityRecord(event: Omit<ActivityEvent, 'id' | 'timestamp'>): Promise<ActivityEvent>;
}

declare global {
  interface Window {
    gitpad: GitPadApi;
  }
}
