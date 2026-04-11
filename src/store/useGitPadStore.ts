import { create } from 'zustand';
import type {
  ActivityEvent,
  AuthSession,
  BranchInfo,
  CodeExecutionResult,
  AdvancedSearchInput,
  AppSettings,
  Backlink,
  CommitDetails,
  DiffView,
  FileNode,
  GitCommit,
  MergeResult,
  NoteGraph,
  SearchResult,
  Snapshot,
  StagingStatus,
  SyncStatus,
  TerminalResult,
  UserProfile,
  WorkspaceAnalytics,
  WorkspaceSummary
} from '../shared/types';

export type ViewName = 'dashboard' | 'editor' | 'search' | 'graph' | 'history' | 'snapshots' | 'terminal' | 'github' | 'settings' | 'changes' | 'activity' | 'account';

export interface OpenTab {
  relativePath: string;
  content: string;
  dirty: boolean;
}

export interface PromptRequest {
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
}

export interface ConfirmRequest {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

interface GitPadState {
  settings: AppSettings | null;
  workspaces: WorkspaceSummary[];
  workspace: WorkspaceSummary | null;
  tree: FileNode[];
  activeView: ViewName;
  tabs: OpenTab[];
  activePath: string | null;
  searchQuery: string;
  searchResults: SearchResult[];
  commits: GitCommit[];
  selectedCommit: CommitDetails | null;
  branches: BranchInfo[];
  staging: StagingStatus | null;
  selectedDiff: DiffView | null;
  lastMerge: MergeResult | null;
  syncStatus: SyncStatus | null;
  terminalOutput: TerminalResult[];
  executionHistory: CodeExecutionResult[];
  session: AuthSession | null;
  users: UserProfile[];
  activityFeed: ActivityEvent[];
  graph: NoteGraph | null;
  backlinks: Backlink[];
  snapshots: Snapshot[];
  analytics: WorkspaceAnalytics | null;
  recentFiles: string[];
  closedTabs: OpenTab[];
  sidebarCollapsed: boolean;
  explorerFilter: string;
  explorerSelectedPath: string | null;
  promptRequest: PromptRequest | null;
  confirmRequest: ConfirmRequest | null;
  loading: boolean;
  notice: string;
  setActiveView(view: ViewName): void;
  setNotice(notice: string): void;
  setSearchQuery(query: string): void;
  setExplorerFilter(query: string): void;
  setExplorerSelectedPath(path: string | null): void;
  toggleSidebar(): void;
  requestInput(request: PromptRequest): Promise<string | null>;
  resolveInput(value: string | null): void;
  requestConfirm(request: ConfirmRequest): Promise<boolean>;
  resolveConfirm(value: boolean): void;
  setTabContent(relativePath: string, content: string): void;
  closeTab(relativePath: string): void;
  loadInitial(): Promise<void>;
  createWorkspace(name: string): Promise<void>;
  openWorkspace(path?: string): Promise<void>;
  renameWorkspace(name: string): Promise<void>;
  deleteWorkspace(deleteFiles?: boolean): Promise<void>;
  refreshTree(): Promise<void>;
  openFile(relativePath: string): Promise<void>;
  saveActive(): Promise<void>;
  createFile(relativePath: string): Promise<void>;
  createDirectory(relativePath: string): Promise<void>;
  renamePath(relativePath: string, nextRelativePath: string): Promise<void>;
  duplicatePath(relativePath: string, nextRelativePath?: string): Promise<string | null>;
  deletePath(relativePath: string): Promise<void>;
  saveAllTabs(): Promise<void>;
  closeAllTabs(): void;
  closeOtherTabs(relativePath: string): void;
  reopenClosedTab(): Promise<void>;
  runSearch(query: string): Promise<void>;
  runAdvancedSearch(input: Omit<AdvancedSearchInput, 'workspacePath'>): Promise<void>;
  loadGraph(): Promise<void>;
  loadBacklinks(relativePath: string): Promise<void>;
  openLinkedNote(noteName: string): Promise<void>;
  quickCapture(content: string): Promise<void>;
  runCodeSnippet(language: 'javascript' | 'python', code: string, sourcePath?: string, blockKey?: string): Promise<void>;
  runCodeFile(relativePath: string): Promise<void>;
  loadExecutionHistory(): Promise<void>;
  loadHistory(): Promise<void>;
  loadBranches(): Promise<void>;
  createBranch(name: string): Promise<void>;
  switchBranch(name: string): Promise<void>;
  renameBranch(oldName: string, newName: string): Promise<void>;
  deleteBranch(name: string): Promise<void>;
  loadStaging(): Promise<void>;
  stagePath(relativePath: string): Promise<void>;
  unstagePath(relativePath: string): Promise<void>;
  stageAll(): Promise<void>;
  unstageAll(): Promise<void>;
  discardPath(relativePath: string): Promise<void>;
  discardAll(): Promise<void>;
  commitStaged(message: string): Promise<void>;
  loadDiff(relativePath: string, mode: DiffView['mode']): Promise<void>;
  mergeBranch(name: string): Promise<void>;
  loadSyncStatus(): Promise<void>;
  register(username: string, email: string, password: string): Promise<void>;
  login(identifier: string, password: string): Promise<void>;
  logout(): Promise<void>;
  loadSession(): Promise<void>;
  loadUsers(): Promise<void>;
  loadActivity(): Promise<void>;
  selectCommit(hash: string): Promise<void>;
  commit(message: string): Promise<void>;
  restoreFile(hash: string, relativePath: string): Promise<void>;
  revertCommit(hash: string): Promise<void>;
  loadSnapshots(): Promise<void>;
  createSnapshot(name: string): Promise<void>;
  restoreSnapshot(tag: string): Promise<void>;
  loadAnalytics(): Promise<void>;
  runTerminal(command: string): Promise<void>;
  updateSettings(settings: Partial<AppSettings>): Promise<void>;
  saveGitHubToken(token: string, owner: string, repo: string): Promise<void>;
  githubPush(): Promise<void>;
  githubPull(): Promise<void>;
}

function requireWorkspace(workspace: WorkspaceSummary | null) {
  if (!workspace) throw new Error('Open or create a workspace first.');
  return workspace;
}

function executionHistoryKey(workspacePath: string) {
  return `gitpad:execution-history:${workspacePath}`;
}

function readExecutionHistory(workspacePath: string): CodeExecutionResult[] {
  try {
    const raw = window.localStorage.getItem(executionHistoryKey(workspacePath));
    return raw ? (JSON.parse(raw) as CodeExecutionResult[]) : [];
  } catch {
    return [];
  }
}

function writeExecutionHistory(workspacePath: string, history: CodeExecutionResult[]) {
  window.localStorage.setItem(executionHistoryKey(workspacePath), JSON.stringify(history.slice(0, 50)));
}

interface WorkspaceUiState {
  tabs: OpenTab[];
  activePath: string | null;
  explorerSelectedPath: string | null;
  sidebarCollapsed: boolean;
}

function workspaceUiStateKey(workspacePath: string) {
  return `gitpad:workspace-ui:${workspacePath}`;
}

function readWorkspaceUiState(workspacePath: string): WorkspaceUiState | null {
  try {
    const raw = window.localStorage.getItem(workspaceUiStateKey(workspacePath));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkspaceUiState;
    return {
      tabs: parsed.tabs ?? [],
      activePath: parsed.activePath ?? null,
      explorerSelectedPath: parsed.explorerSelectedPath ?? null,
      sidebarCollapsed: Boolean(parsed.sidebarCollapsed)
    };
  } catch {
    return null;
  }
}

function writeWorkspaceUiState(workspacePath: string, state: WorkspaceUiState) {
  window.localStorage.setItem(workspaceUiStateKey(workspacePath), JSON.stringify(state));
}

function syncWorkspaceUiState(state: Pick<GitPadState, 'workspace' | 'tabs' | 'activePath' | 'explorerSelectedPath' | 'sidebarCollapsed'>) {
  if (!state.workspace) return;
  writeWorkspaceUiState(state.workspace.path, {
    tabs: state.tabs,
    activePath: state.activePath,
    explorerSelectedPath: state.explorerSelectedPath,
    sidebarCollapsed: state.sidebarCollapsed
  });
}

function updatePathsForRename(relativePath: string, nextRelativePath: string, pathValue: string) {
  if (pathValue === relativePath) return nextRelativePath;
  if (!pathValue.startsWith(`${relativePath}/`)) return pathValue;
  return `${nextRelativePath}${pathValue.slice(relativePath.length)}`;
}

async function restoreWorkspaceUi(workspace: WorkspaceSummary): Promise<WorkspaceUiState> {
  const persisted = readWorkspaceUiState(workspace.path);
  if (!persisted) return { tabs: [], activePath: null, explorerSelectedPath: null, sidebarCollapsed: false };
  const restoredTabs: OpenTab[] = [];
  for (const tab of persisted.tabs ?? []) {
    try {
      const content = await window.gitpad.readFile(workspace.path, tab.relativePath);
      restoredTabs.push({
        relativePath: tab.relativePath,
        content: tab.dirty ? tab.content : content,
        dirty: Boolean(tab.dirty)
      });
    } catch {
      // Ignore stale tab references to deleted files.
    }
  }
  const activePath = restoredTabs.some((tab) => tab.relativePath === persisted.activePath) ? persisted.activePath : restoredTabs.at(-1)?.relativePath ?? null;
  const explorerSelectedPath = persisted.explorerSelectedPath;
  return {
    tabs: restoredTabs,
    activePath,
    explorerSelectedPath,
    sidebarCollapsed: Boolean(persisted.sidebarCollapsed)
  };
}

let pendingPromptResolve: ((value: string | null) => void) | null = null;
let pendingConfirmResolve: ((value: boolean) => void) | null = null;

export const useGitPadStore = create<GitPadState>((set, get) => ({
  settings: null,
  workspaces: [],
  workspace: null,
  tree: [],
  activeView: 'dashboard',
  tabs: [],
  activePath: null,
  searchQuery: '',
  searchResults: [],
  commits: [],
  selectedCommit: null,
  branches: [],
  staging: null,
  selectedDiff: null,
  lastMerge: null,
  syncStatus: null,
  terminalOutput: [],
  executionHistory: [],
  session: null,
  users: [],
  activityFeed: [],
  graph: null,
  backlinks: [],
  snapshots: [],
  analytics: null,
  recentFiles: [],
  closedTabs: [],
  sidebarCollapsed: false,
  explorerFilter: '',
  explorerSelectedPath: null,
  promptRequest: null,
  confirmRequest: null,
  loading: false,
  notice: '',
  setActiveView: (activeView) => set({ activeView }),
  setNotice: (notice) => set({ notice }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setExplorerFilter: (explorerFilter) => set({ explorerFilter }),
  setExplorerSelectedPath: (explorerSelectedPath) => {
    set({ explorerSelectedPath });
    syncWorkspaceUiState(get());
  },
  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
    syncWorkspaceUiState(get());
  },
  requestInput: async (request) =>
    new Promise((resolve) => {
      pendingPromptResolve = resolve;
      set({ promptRequest: request });
    }),
  resolveInput: (value) => {
    const resolve = pendingPromptResolve;
    pendingPromptResolve = null;
    set({ promptRequest: null });
    resolve?.(value);
  },
  requestConfirm: async (request) =>
    new Promise((resolve) => {
      pendingConfirmResolve = resolve;
      set({ confirmRequest: request });
    }),
  resolveConfirm: (value) => {
    const resolve = pendingConfirmResolve;
    pendingConfirmResolve = null;
    set({ confirmRequest: null });
    resolve?.(value);
  },
  setTabContent: (relativePath, content) => {
    set((state) => {
      const tabs = state.tabs.map((tab) => (tab.relativePath === relativePath ? { ...tab, content, dirty: true } : tab));
      const next = { tabs };
      return next;
    });
    syncWorkspaceUiState(get());
  },
  closeTab: (relativePath) => {
    set((state) => {
      const tabs = state.tabs.filter((tab) => tab.relativePath !== relativePath);
      const activePath = state.activePath === relativePath ? tabs.at(-1)?.relativePath ?? null : state.activePath;
      const closed = state.tabs.find((tab) => tab.relativePath === relativePath);
      return { tabs, activePath, closedTabs: closed ? [closed, ...state.closedTabs].slice(0, 20) : state.closedTabs };
    });
    syncWorkspaceUiState(get());
  },
  loadInitial: async () => {
    set({ loading: true });
    const [settings, workspaces] = await Promise.all([window.gitpad.getSettings(), window.gitpad.listWorkspaces()]);
    const workspace = workspaces[0] ?? null;
    set({ settings, workspaces, workspace, loading: false });
    await get().loadSession();
    await get().loadUsers();
    if (workspace) {
      const ui = await restoreWorkspaceUi(workspace);
      set({
        tabs: ui.tabs,
        activePath: ui.activePath,
        explorerSelectedPath: ui.explorerSelectedPath,
        sidebarCollapsed: ui.sidebarCollapsed,
        executionHistory: readExecutionHistory(workspace.path)
      });
      await get().refreshTree();
      await get().loadHistory();
      await get().loadBranches();
      await get().loadStaging();
      await get().loadSyncStatus();
      await get().loadGraph();
      await get().loadAnalytics();
      await get().loadActivity();
      syncWorkspaceUiState(get());
    }
  },
  createWorkspace: async (name) => {
    const workspace = await window.gitpad.createWorkspace({ name });
    const workspaces = await window.gitpad.listWorkspaces();
    set({
      workspace,
      workspaces,
      tabs: [],
      activePath: null,
      explorerSelectedPath: null,
      notice: `Created ${workspace.name}`,
      executionHistory: readExecutionHistory(workspace.path),
      recentFiles: []
    });
    await get().refreshTree();
    await get().loadHistory();
    await get().loadBranches();
    await get().loadStaging();
    await get().loadSyncStatus();
    await get().loadGraph();
    await get().loadAnalytics();
    await get().loadActivity();
    syncWorkspaceUiState(get());
  },
  openWorkspace: async (path) => {
    const workspace = await window.gitpad.openWorkspace(path);
    const workspaces = await window.gitpad.listWorkspaces();
    const ui = await restoreWorkspaceUi(workspace);
    set({
      workspace,
      workspaces,
      tabs: ui.tabs,
      activePath: ui.activePath,
      explorerSelectedPath: ui.explorerSelectedPath,
      sidebarCollapsed: ui.sidebarCollapsed,
      notice: `Opened ${workspace.name}`,
      executionHistory: readExecutionHistory(workspace.path)
    });
    await get().refreshTree();
    await get().loadHistory();
    await get().loadBranches();
    await get().loadStaging();
    await get().loadSyncStatus();
    await get().loadGraph();
    await get().loadAnalytics();
    await get().loadActivity();
    syncWorkspaceUiState(get());
  },
  renameWorkspace: async (name) => {
    const workspace = requireWorkspace(get().workspace);
    const renamed = await window.gitpad.renameWorkspace({ workspacePath: workspace.path, name });
    const workspaces = await window.gitpad.listWorkspaces();
    set({ workspace: renamed, workspaces, notice: `Renamed workspace to ${renamed.name}` });
    syncWorkspaceUiState(get());
  },
  deleteWorkspace: async (deleteFiles = true) => {
    const workspace = requireWorkspace(get().workspace);
    const workspaces = await window.gitpad.deleteWorkspace({ workspacePath: workspace.path, deleteFiles });
    const nextWorkspace = workspaces[0] ?? null;
    set({
      workspace: nextWorkspace,
      workspaces,
      tabs: [],
      activePath: null,
      explorerSelectedPath: null,
      commits: [],
      selectedCommit: null,
      tree: [],
      notice: `Deleted workspace ${workspace.name}`
    });
    if (nextWorkspace) {
      const ui = await restoreWorkspaceUi(nextWorkspace);
      set({
        tabs: ui.tabs,
        activePath: ui.activePath,
        explorerSelectedPath: ui.explorerSelectedPath,
        sidebarCollapsed: ui.sidebarCollapsed,
        executionHistory: readExecutionHistory(nextWorkspace.path)
      });
      await get().refreshTree();
      await get().loadHistory();
      await get().loadBranches();
      await get().loadStaging();
      await get().loadSyncStatus();
      await get().loadGraph();
      await get().loadAnalytics();
      await get().loadActivity();
      syncWorkspaceUiState(get());
    }
  },
  refreshTree: async () => {
    const workspace = requireWorkspace(get().workspace);
    set({ tree: await window.gitpad.getFileTree(workspace.path) });
  },
  openFile: async (relativePath) => {
    const workspace = requireWorkspace(get().workspace);
    const existing = get().tabs.find((tab) => tab.relativePath === relativePath);
    if (existing) {
      set((state) => ({
        activePath: relativePath,
        explorerSelectedPath: relativePath,
        activeView: 'editor',
        recentFiles: [relativePath, ...state.recentFiles.filter((item) => item !== relativePath)].slice(0, 12)
      }));
      syncWorkspaceUiState(get());
      return;
    }
    const content = await window.gitpad.readFile(workspace.path, relativePath);
    set((state) => ({
      tabs: [...state.tabs, { relativePath, content, dirty: false }],
      activePath: relativePath,
      explorerSelectedPath: relativePath,
      activeView: 'editor',
      recentFiles: [relativePath, ...state.recentFiles.filter((item) => item !== relativePath)].slice(0, 12)
    }));
    await get().loadBacklinks(relativePath).catch(() => undefined);
    syncWorkspaceUiState(get());
  },
  saveActive: async () => {
    const workspace = requireWorkspace(get().workspace);
    const active = get().tabs.find((tab) => tab.relativePath === get().activePath);
    if (!active) return;
    const output = await window.gitpad.saveFile({ workspacePath: workspace.path, relativePath: active.relativePath, content: active.content });
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.relativePath === active.relativePath ? { ...tab, dirty: false } : tab)),
      notice: output.trim() || `Updated file: ${active.relativePath}`
    }));
    await get().refreshTree();
    await get().loadHistory();
    await get().loadStaging();
    await get().loadGraph();
    syncWorkspaceUiState(get());
  },
  createFile: async (relativePath) => {
    const workspace = requireWorkspace(get().workspace);
    const output = await window.gitpad.createFile(workspace.path, relativePath);
    await get().refreshTree();
    await get().loadHistory();
    await get().loadStaging();
    await get().loadGraph();
    await get().openFile(relativePath);
    set({ notice: output.trim() || `Created file: ${relativePath}` });
    syncWorkspaceUiState(get());
  },
  createDirectory: async (relativePath) => {
    const workspace = requireWorkspace(get().workspace);
    const output = await window.gitpad.createDirectory(workspace.path, relativePath);
    await get().refreshTree();
    await get().loadHistory();
    await get().loadStaging();
    await get().loadGraph();
    set({ notice: output?.trim() || `Created folder: ${relativePath}` });
  },
  renamePath: async (relativePath, nextRelativePath) => {
    const workspace = requireWorkspace(get().workspace);
    const output = await window.gitpad.renamePath({ workspacePath: workspace.path, relativePath, nextRelativePath });
    set((state) => ({
      tabs: state.tabs.map((tab) => ({
        ...tab,
        relativePath: updatePathsForRename(relativePath, nextRelativePath, tab.relativePath)
      })),
      activePath: state.activePath ? updatePathsForRename(relativePath, nextRelativePath, state.activePath) : null,
      explorerSelectedPath: state.explorerSelectedPath
        ? updatePathsForRename(relativePath, nextRelativePath, state.explorerSelectedPath)
        : null,
      recentFiles: [
        nextRelativePath,
        ...state.recentFiles
          .map((item) => updatePathsForRename(relativePath, nextRelativePath, item))
          .filter((item, index, list) => list.indexOf(item) === index && item !== nextRelativePath)
      ].slice(0, 12)
    }));
    await get().refreshTree();
    await get().loadHistory();
    await get().loadStaging();
    await get().loadGraph();
    set({ notice: output.trim() || `Renamed ${relativePath}` });
    syncWorkspaceUiState(get());
  },
  duplicatePath: async (relativePath, nextRelativePath) => {
    const workspace = requireWorkspace(get().workspace);
    const result = await window.gitpad.duplicatePath({ workspacePath: workspace.path, relativePath, nextRelativePath });
    await get().refreshTree();
    await get().loadHistory();
    await get().loadStaging();
    const duplicated = result.relativePath;
    const type = await window.gitpad.getFileTree(workspace.path).then((tree) => {
      const find = (nodes: FileNode[]): FileNode | undefined => {
        for (const node of nodes) {
          if (node.relativePath === duplicated) return node;
          if (node.children) {
            const child = find(node.children);
            if (child) return child;
          }
        }
        return undefined;
      };
      return find(tree)?.type;
    });
    if (type === 'file') await get().openFile(duplicated);
    set({ notice: result.output.trim() || `Duplicated ${relativePath}` });
    return duplicated;
  },
  deletePath: async (relativePath) => {
    const workspace = requireWorkspace(get().workspace);
    const output = await window.gitpad.deletePath(workspace.path, relativePath);
    set((state) => {
      const tabs = state.tabs.filter((tab) => tab.relativePath !== relativePath && !tab.relativePath.startsWith(`${relativePath}/`));
      const activePath = state.activePath && (state.activePath === relativePath || state.activePath.startsWith(`${relativePath}/`))
        ? tabs.at(-1)?.relativePath ?? null
        : state.activePath;
      const explorerSelectedPath = state.explorerSelectedPath && (state.explorerSelectedPath === relativePath || state.explorerSelectedPath.startsWith(`${relativePath}/`))
        ? null
        : state.explorerSelectedPath;
      return { tabs, activePath, explorerSelectedPath };
    });
    await get().refreshTree();
    await get().loadHistory();
    await get().loadStaging();
    await get().loadGraph();
    set({ notice: output.trim() || `Deleted file: ${relativePath}` });
    syncWorkspaceUiState(get());
  },
  saveAllTabs: async () => {
    const workspace = requireWorkspace(get().workspace);
    const dirtyTabs = get().tabs.filter((tab) => tab.dirty);
    if (!dirtyTabs.length) {
      set({ notice: 'No unsaved changes.' });
      return;
    }
    for (const tab of dirtyTabs) {
      await window.gitpad.saveFile({ workspacePath: workspace.path, relativePath: tab.relativePath, content: tab.content });
    }
    set((state) => ({
      tabs: state.tabs.map((tab) => ({ ...tab, dirty: false })),
      notice: `Saved ${dirtyTabs.length} file${dirtyTabs.length > 1 ? 's' : ''}.`
    }));
    await get().refreshTree();
    await get().loadHistory();
    await get().loadStaging();
    await get().loadGraph();
    syncWorkspaceUiState(get());
  },
  closeAllTabs: () => {
    set((state) => ({ closedTabs: [...state.tabs, ...state.closedTabs].slice(0, 20), tabs: [], activePath: null }));
    syncWorkspaceUiState(get());
  },
  closeOtherTabs: (relativePath) => {
    set((state) => {
      const active = state.tabs.find((tab) => tab.relativePath === relativePath);
      if (!active) return state;
      const closed = state.tabs.filter((tab) => tab.relativePath !== relativePath);
      return { tabs: [active], activePath: relativePath, closedTabs: [...closed, ...state.closedTabs].slice(0, 20) };
    });
    syncWorkspaceUiState(get());
  },
  reopenClosedTab: async () => {
    const workspace = requireWorkspace(get().workspace);
    const closed = get().closedTabs[0];
    if (!closed) {
      set({ notice: 'No recently closed tabs.' });
      return;
    }
    const content = await window.gitpad.readFile(workspace.path, closed.relativePath).catch(() => closed.content);
    set((state) => ({
      closedTabs: state.closedTabs.slice(1),
      tabs: [...state.tabs, { ...closed, content }],
      activePath: closed.relativePath,
      activeView: 'editor'
    }));
    syncWorkspaceUiState(get());
  },
  runSearch: async (query) => {
    const workspace = requireWorkspace(get().workspace);
    set({ searchQuery: query, searchResults: await window.gitpad.search(workspace.path, query), activeView: 'search' });
  },
  runAdvancedSearch: async (input) => {
    const workspace = requireWorkspace(get().workspace);
    set({
      searchQuery: input.query,
      searchResults: await window.gitpad.advancedSearch({ ...input, workspacePath: workspace.path }),
      activeView: 'search'
    });
  },
  loadGraph: async () => {
    const workspace = get().workspace;
    if (!workspace) return;
    set({ graph: await window.gitpad.getNoteGraph(workspace.path) });
  },
  loadBacklinks: async (relativePath) => {
    const workspace = get().workspace;
    if (!workspace) return;
    set({ backlinks: await window.gitpad.getBacklinks(workspace.path, relativePath) });
  },
  openLinkedNote: async (noteName) => {
    const workspace = requireWorkspace(get().workspace);
    const relativePath = await window.gitpad.ensureLinkedNote(workspace.path, noteName);
    await get().refreshTree();
    await get().loadGraph();
    await get().openFile(relativePath);
  },
  quickCapture: async (content) => {
    const workspace = requireWorkspace(get().workspace);
    const relativePath = await window.gitpad.quickCapture(workspace.path, content);
    await get().refreshTree();
    await get().loadGraph();
    await get().openFile(relativePath);
  },
  loadExecutionHistory: async () => {
    const workspace = get().workspace;
    if (!workspace) return;
    set({ executionHistory: readExecutionHistory(workspace.path) });
  },
  runCodeSnippet: async (language, code, sourcePath, blockKey) => {
    const workspace = requireWorkspace(get().workspace);
    const result = await window.gitpad.executeCodeSnippet(workspace.path, language, code, sourcePath, blockKey);
    const next = [result, ...get().executionHistory];
    set({ executionHistory: next, terminalOutput: [...get().terminalOutput, result], activeView: 'editor', notice: result.exitCode === 0 ? 'Code executed.' : 'Execution failed.' });
    writeExecutionHistory(workspace.path, next);
  },
  runCodeFile: async (relativePath) => {
    const workspace = requireWorkspace(get().workspace);
    const result = await window.gitpad.executeCodeFile(workspace.path, relativePath);
    const next = [result, ...get().executionHistory];
    set({ executionHistory: next, terminalOutput: [...get().terminalOutput, result], notice: result.exitCode === 0 ? `Ran ${relativePath}` : `Run failed: ${relativePath}` });
    writeExecutionHistory(workspace.path, next);
  },
  loadHistory: async () => {
    const workspace = get().workspace;
    if (!workspace) return;
    set({ commits: await window.gitpad.gitHistory(workspace.path) });
  },
  loadBranches: async () => {
    const workspace = get().workspace;
    if (!workspace) return;
    set({ branches: await window.gitpad.gitBranches(workspace.path) });
  },
  createBranch: async (name) => {
    const workspace = requireWorkspace(get().workspace);
    const branches = await window.gitpad.gitCreateBranch(workspace.path, name);
    set({ branches, notice: `Created branch ${name}` });
    await get().loadActivity();
  },
  switchBranch: async (name) => {
    const workspace = requireWorkspace(get().workspace);
    const branches = await window.gitpad.gitSwitchBranch(workspace.path, name);
    const ui = await restoreWorkspaceUi(workspace);
    set({ branches, tabs: ui.tabs, activePath: ui.activePath, explorerSelectedPath: ui.explorerSelectedPath, notice: `Switched to ${name}` });
    await get().refreshTree();
    await get().loadHistory();
    await get().loadStaging();
    await get().loadSyncStatus();
    await get().loadGraph();
    await get().loadAnalytics();
    await get().loadActivity();
    syncWorkspaceUiState(get());
  },
  renameBranch: async (oldName, newName) => {
    const workspace = requireWorkspace(get().workspace);
    const branches = await window.gitpad.gitRenameBranch(workspace.path, oldName, newName);
    set({ branches, notice: `Renamed branch ${oldName} -> ${newName}` });
    await get().loadActivity();
  },
  deleteBranch: async (name) => {
    const workspace = requireWorkspace(get().workspace);
    const branches = await window.gitpad.gitDeleteBranch(workspace.path, name);
    set({ branches, notice: `Deleted branch ${name}` });
    await get().loadActivity();
  },
  loadStaging: async () => {
    const workspace = get().workspace;
    if (!workspace) return;
    set({ staging: await window.gitpad.gitStagingStatus(workspace.path) });
  },
  stagePath: async (relativePath) => {
    const workspace = requireWorkspace(get().workspace);
    set({ staging: await window.gitpad.gitStagePath(workspace.path, relativePath) });
  },
  unstagePath: async (relativePath) => {
    const workspace = requireWorkspace(get().workspace);
    set({ staging: await window.gitpad.gitUnstagePath(workspace.path, relativePath) });
  },
  stageAll: async () => {
    const workspace = requireWorkspace(get().workspace);
    set({ staging: await window.gitpad.gitStageAll(workspace.path) });
  },
  unstageAll: async () => {
    const workspace = requireWorkspace(get().workspace);
    set({ staging: await window.gitpad.gitUnstageAll(workspace.path) });
  },
  discardPath: async (relativePath) => {
    const workspace = requireWorkspace(get().workspace);
    const staging = await window.gitpad.gitDiscardPath(workspace.path, relativePath);
    set({ staging, notice: `Discarded changes in ${relativePath}` });
    await get().refreshTree();
    await get().loadActivity();
  },
  discardAll: async () => {
    const workspace = requireWorkspace(get().workspace);
    const staging = await window.gitpad.gitDiscardAll(workspace.path);
    set({ staging, notice: 'Discarded all unstaged changes.' });
    await get().refreshTree();
    await get().loadActivity();
  },
  commitStaged: async (message) => {
    const workspace = requireWorkspace(get().workspace);
    const author = get().session?.user ? `${get().session?.user.username} <${get().session?.user.email}>` : undefined;
    const output = await window.gitpad.gitCommitStaged(workspace.path, message, author);
    set({ notice: output.trim() || `Committed: ${message}` });
    await get().loadHistory();
    await get().loadStaging();
    await get().loadSyncStatus();
    await get().loadActivity();
  },
  loadDiff: async (relativePath, mode) => {
    const workspace = requireWorkspace(get().workspace);
    set({ selectedDiff: await window.gitpad.gitDiffPath(workspace.path, relativePath, mode) });
  },
  mergeBranch: async (name) => {
    const workspace = requireWorkspace(get().workspace);
    const result = await window.gitpad.gitMergeBranch(workspace.path, name);
    set({ lastMerge: result, notice: result.hasConflicts ? `Merge conflicts with ${name}` : `Merged ${name}` });
    await get().refreshTree();
    await get().loadHistory();
    await get().loadBranches();
    await get().loadStaging();
    await get().loadSyncStatus();
    await get().loadActivity();
  },
  loadSyncStatus: async () => {
    const workspace = get().workspace;
    if (!workspace) return;
    set({ syncStatus: await window.gitpad.gitSyncStatus(workspace.path) });
  },
  register: async (username, email, password) => {
    const session = await window.gitpad.authRegister(username, email, password);
    set({ session, notice: `Welcome ${session.user.username}` });
    await get().loadUsers();
    await get().loadActivity();
  },
  login: async (identifier, password) => {
    const session = await window.gitpad.authLogin(identifier, password);
    set({ session, notice: `Logged in as ${session.user.username}` });
    await get().loadUsers();
    await get().loadActivity();
  },
  logout: async () => {
    await window.gitpad.authLogout();
    set({ session: null, notice: 'Logged out.' });
  },
  loadSession: async () => {
    set({ session: await window.gitpad.authSession() });
  },
  loadUsers: async () => {
    set({ users: await window.gitpad.authUsers() });
  },
  loadActivity: async () => {
    set({ activityFeed: await window.gitpad.activityFeed(get().workspace?.path) });
  },
  selectCommit: async (hash) => {
    const workspace = requireWorkspace(get().workspace);
    set({ selectedCommit: await window.gitpad.gitCommitDetails(workspace.path, hash), activeView: 'history' });
  },
  commit: async (message) => {
    const workspace = requireWorkspace(get().workspace);
    const output = await window.gitpad.gitCommit(workspace.path, message);
    set({ notice: output.trim() || 'Commit complete.' });
    await get().loadHistory();
    await get().loadStaging();
    await get().loadSyncStatus();
    await get().loadActivity();
    if (get().settings?.github.autoPush) await get().githubPush();
  },
  restoreFile: async (hash, relativePath) => {
    const workspace = requireWorkspace(get().workspace);
    await window.gitpad.gitRestoreFile(workspace.path, hash, relativePath);
    await get().refreshTree();
    await get().loadHistory();
    await get().loadGraph();
  },
  revertCommit: async (hash) => {
    const workspace = requireWorkspace(get().workspace);
    const output = await window.gitpad.gitRevertCommit(workspace.path, hash);
    set({ notice: output.trim() || 'Commit reverted.' });
    await get().refreshTree();
    await get().loadHistory();
    await get().loadGraph();
  },
  loadSnapshots: async () => {
    const workspace = get().workspace;
    if (!workspace) return;
    set({ snapshots: await window.gitpad.listSnapshots(workspace.path) });
  },
  createSnapshot: async (name) => {
    const workspace = requireWorkspace(get().workspace);
    await window.gitpad.createSnapshot(workspace.path, name);
    await get().loadSnapshots();
    await get().loadHistory();
  },
  restoreSnapshot: async (tag) => {
    const workspace = requireWorkspace(get().workspace);
    await window.gitpad.restoreSnapshot(workspace.path, tag);
    await get().refreshTree();
    await get().loadGraph();
    await get().loadHistory();
  },
  loadAnalytics: async () => {
    const workspace = get().workspace;
    if (!workspace) return;
    set({ analytics: await window.gitpad.analytics(workspace.path) });
  },
  runTerminal: async (command) => {
    const workspace = requireWorkspace(get().workspace);
    const result = await window.gitpad.terminalRun(workspace.path, command);
    set((state) => ({ terminalOutput: [...state.terminalOutput, result], activeView: 'terminal' }));
  },
  updateSettings: async (settings) => set({ settings: await window.gitpad.updateSettings(settings) }),
  saveGitHubToken: async (token, owner, repo) => {
    const workspace = requireWorkspace(get().workspace);
    const github = await window.gitpad.githubSaveToken(workspace.path, { token, owner, repo });
    await get().updateSettings({ github });
    set({ notice: 'GitHub repository linked securely.' });
  },
  githubPush: async () => {
    const workspace = requireWorkspace(get().workspace);
    const result = await window.gitpad.githubPush(workspace.path);
    set((state) => ({ terminalOutput: [...state.terminalOutput, result], activeView: 'terminal' }));
    await get().loadSyncStatus();
    await get().loadActivity();
  },
  githubPull: async () => {
    const workspace = requireWorkspace(get().workspace);
    const result = await window.gitpad.githubPull(workspace.path);
    set((state) => ({ terminalOutput: [...state.terminalOutput, result], activeView: 'terminal' }));
    await get().loadSyncStatus();
    await get().loadActivity();
  }
}));
