import type { IpcMain } from 'electron';
import { FileService } from '../file-system/file-service.js';
import { WorkspaceService } from '../file-system/workspaces.js';
import { runCodeFile, runCodeSnippet } from './execution.js';
import {
  branches,
  analytics,
  commitStaged,
  commitAll,
  commitPaths,
  createSnapshot,
  createBranch,
  deleteBranch,
  diffPath,
  discardAll,
  discardPath,
  details,
  fileHistory,
  history,
  mergeBranch,
  deleteAndCommit,
  listSnapshots,
  moveAndCommit,
  renameBranch,
  restoreFile,
  restoreSnapshot,
  revertCommit,
  stageAll,
  stagePath,
  stagingStatus,
  switchBranch,
  syncStatus,
  status,
  unstageAll,
  unstagePath
} from '../git/git-service.js';
import { runShellCommand } from './terminal.js';
import { GitHubService } from './github.js';
import { AuthService } from './auth.js';
import { ActivityService } from './activity.js';

interface BackendOptions {
  appDataPath: string;
  documentsPath: string;
  chooseDirectory: () => Promise<string | undefined>;
  encrypt: (value: string) => string;
  decrypt: (value: string) => string;
}

export function createAppBackend(options: BackendOptions) {
  const workspaces = new WorkspaceService(options.appDataPath, options.documentsPath, options.chooseDirectory);
  const files = new FileService();
  const github = new GitHubService(options.appDataPath, options.encrypt, options.decrypt);
  const auth = new AuthService(options.appDataPath);
  const activity = new ActivityService(options.appDataPath);

  const recordActivity = (workspacePath: string | undefined, type: 'commit' | 'merge' | 'branch' | 'sync' | 'file' | 'auth', summary: string, details?: string) =>
    activity.record({ workspacePath, type, summary, details }).catch(() => undefined);

  return {
    register(ipcMain: IpcMain) {
      ipcMain.handle('settings:get', () => workspaces.getSettings());
      ipcMain.handle('settings:update', (_event, settings) => workspaces.updateSettings(settings));
      ipcMain.handle('workspace:list', () => workspaces.list());
      ipcMain.handle('workspace:create', async (_event, input) => {
        const workspace = await workspaces.create(input);
        await recordActivity(workspace.path, 'file', `Created workspace ${workspace.name}`);
        return workspace;
      });
      ipcMain.handle('workspace:open', async (_event, selectedPath?: string) => workspaces.open(selectedPath));
      ipcMain.handle('workspace:rename', async (_event, input) => {
        const workspace = await workspaces.rename(input);
        await recordActivity(workspace.path, 'file', `Renamed workspace to ${workspace.name}`);
        return workspace;
      });
      ipcMain.handle('workspace:delete', async (_event, input) => {
        await recordActivity(input.workspacePath, 'file', `Deleted workspace at ${input.workspacePath}`);
        return workspaces.delete(input);
      });
      ipcMain.handle('fs:tree', (_event, workspacePath) => files.tree(workspacePath));
      ipcMain.handle('fs:read', (_event, workspacePath, relativePath) => files.read(workspacePath, relativePath));
      ipcMain.handle('fs:save', async (_event, input) => {
        await files.save(input, false);
        await recordActivity(input.workspacePath, 'file', `Saved ${input.relativePath}`);
        return `Updated file: ${input.relativePath}`;
      });
      ipcMain.handle('fs:create-file', async (_event, workspacePath, relativePath, content) => {
        await files.createFile(workspacePath, relativePath, content);
        await recordActivity(workspacePath, 'file', `Created file ${relativePath}`);
        return `Created file: ${relativePath}`;
      });
      ipcMain.handle('fs:create-directory', async (_event, workspacePath, relativePath) => {
        await files.createDirectory(workspacePath, relativePath);
        await recordActivity(workspacePath, 'file', `Created folder ${relativePath}`);
        return `Created folder: ${relativePath}`;
      });
      ipcMain.handle('fs:rename', async (_event, input) => {
        const sourceType = await files.statType(input.workspacePath, input.relativePath);
        await files.rename(input.workspacePath, input.relativePath, input.nextRelativePath);
        const summary = sourceType === 'directory'
          ? `Renamed folder: ${input.relativePath} -> ${input.nextRelativePath}`
          : `Renamed file: ${input.relativePath} -> ${input.nextRelativePath}`;
        await recordActivity(input.workspacePath, 'file', summary);
        return summary;
      });
      ipcMain.handle('fs:delete', async (_event, workspacePath, relativePath) => {
        const sourceType = await files.statType(workspacePath, relativePath);
        await files.delete(workspacePath, relativePath);
        const summary = sourceType === 'directory' ? `Deleted folder: ${relativePath}` : `Deleted file: ${relativePath}`;
        await recordActivity(workspacePath, 'file', summary);
        return summary;
      });
      ipcMain.handle('fs:duplicate', async (_event, input) => {
        const sourceType = await files.statType(input.workspacePath, input.relativePath);
        const duplicatedPath = await files.duplicate(input.workspacePath, input.relativePath, input.nextRelativePath);
        const summary = sourceType === 'directory'
          ? `Duplicated folder: ${input.relativePath}`
          : `Duplicated file: ${input.relativePath}`;
        await recordActivity(input.workspacePath, 'file', `${summary} -> ${duplicatedPath}`);
        return { relativePath: duplicatedPath, output: `${summary} -> ${duplicatedPath}` };
      });
      ipcMain.handle('search:query', (_event, workspacePath, query) => files.search(workspacePath, query));
      ipcMain.handle('search:advanced', (_event, input) => files.advancedSearch(input));
      ipcMain.handle('notes:graph', (_event, workspacePath) => files.noteGraph(workspacePath));
      ipcMain.handle('notes:backlinks', (_event, workspacePath, relativePath) => files.backlinks(workspacePath, relativePath));
      ipcMain.handle('notes:ensure-linked', (_event, workspacePath, noteName) => files.ensureLinkedNote(workspacePath, noteName));
      ipcMain.handle('notes:quick-capture', async (_event, workspacePath, content) => {
        const relativePath = await files.quickCapture(workspacePath, content);
        const settings = await workspaces.getSettings();
        if (settings.autoCommit) await commitPaths(workspacePath, relativePath, `Updated file: ${relativePath}`).catch(() => undefined);
        return relativePath;
      });
      ipcMain.handle('execution:run-snippet', (_event, workspacePath, language, code, sourcePath, blockKey) =>
        runCodeSnippet(workspacePath, language, code, sourcePath, blockKey)
      );
      ipcMain.handle('execution:run-file', (_event, workspacePath, relativePath) => runCodeFile(workspacePath, relativePath));
      ipcMain.handle('git:status', (_event, workspacePath) => status(workspacePath));
      ipcMain.handle('git:branches', (_event, workspacePath) => branches(workspacePath));
      ipcMain.handle('git:branch-create', async (_event, workspacePath, name) => {
        const list = await createBranch(workspacePath, name);
        await recordActivity(workspacePath, 'branch', `Created branch ${name}`);
        return list;
      });
      ipcMain.handle('git:branch-switch', async (_event, workspacePath, name) => {
        const list = await switchBranch(workspacePath, name);
        await recordActivity(workspacePath, 'branch', `Switched to branch ${name}`);
        return list;
      });
      ipcMain.handle('git:branch-rename', async (_event, workspacePath, oldName, newName) => {
        const list = await renameBranch(workspacePath, oldName, newName);
        await recordActivity(workspacePath, 'branch', `Renamed branch ${oldName} -> ${newName}`);
        return list;
      });
      ipcMain.handle('git:branch-delete', async (_event, workspacePath, name) => {
        const list = await deleteBranch(workspacePath, name);
        await recordActivity(workspacePath, 'branch', `Deleted branch ${name}`);
        return list;
      });
      ipcMain.handle('git:staging-status', (_event, workspacePath) => stagingStatus(workspacePath));
      ipcMain.handle('git:stage-path', (_event, workspacePath, relativePath) => stagePath(workspacePath, relativePath));
      ipcMain.handle('git:unstage-path', (_event, workspacePath, relativePath) => unstagePath(workspacePath, relativePath));
      ipcMain.handle('git:stage-all', (_event, workspacePath) => stageAll(workspacePath));
      ipcMain.handle('git:unstage-all', (_event, workspacePath) => unstageAll(workspacePath));
      ipcMain.handle('git:discard-path', async (_event, workspacePath, relativePath) => {
        const result = await discardPath(workspacePath, relativePath);
        await recordActivity(workspacePath, 'file', `Discarded changes in ${relativePath}`);
        return result;
      });
      ipcMain.handle('git:discard-all', async (_event, workspacePath) => {
        const result = await discardAll(workspacePath);
        await recordActivity(workspacePath, 'file', 'Discarded all unstaged changes');
        return result;
      });
      ipcMain.handle('git:commit-staged', async (_event, workspacePath, message, author) => {
        const output = await commitStaged(workspacePath, message, author);
        await recordActivity(workspacePath, 'commit', message);
        return output;
      });
      ipcMain.handle('git:diff-path', (_event, workspacePath, relativePath, mode) => diffPath(workspacePath, relativePath, mode));
      ipcMain.handle('git:merge-branch', async (_event, workspacePath, sourceBranch) => {
        const result = await mergeBranch(workspacePath, sourceBranch);
        await recordActivity(
          workspacePath,
          'merge',
          result.hasConflicts ? `Merge conflicts from ${sourceBranch}` : `Merged ${sourceBranch} into ${result.targetBranch}`,
          result.output
        );
        return result;
      });
      ipcMain.handle('git:sync-status', (_event, workspacePath) => syncStatus(workspacePath));
      ipcMain.handle('git:commit', async (_event, workspacePath, message) => {
        const output = await commitAll(workspacePath, message);
        await recordActivity(workspacePath, 'commit', message);
        return output;
      });
      ipcMain.handle('git:history', (_event, workspacePath) => history(workspacePath));
      ipcMain.handle('git:details', (_event, workspacePath, hash) => details(workspacePath, hash));
      ipcMain.handle('git:file-history', (_event, workspacePath, relativePath) => fileHistory(workspacePath, relativePath));
      ipcMain.handle('git:restore-file', (_event, workspacePath, hash, relativePath) => restoreFile(workspacePath, hash, relativePath));
      ipcMain.handle('git:revert', (_event, workspacePath, hash) => revertCommit(workspacePath, hash));
      ipcMain.handle('git:snapshot-create', (_event, workspacePath, name) => createSnapshot(workspacePath, name));
      ipcMain.handle('git:snapshot-list', (_event, workspacePath) => listSnapshots(workspacePath));
      ipcMain.handle('git:snapshot-restore', (_event, workspacePath, tag) => restoreSnapshot(workspacePath, tag));
      ipcMain.handle('analytics:get', async (_event, workspacePath) => {
        const graph = await files.noteGraph(workspacePath);
        const tree = await files.tree(workspacePath);
        const countFiles = (nodes: typeof tree): number => nodes.reduce((sum, node) => sum + (node.type === 'file' ? 1 : countFiles(node.children ?? [])), 0);
        return analytics(workspacePath, graph.nodes.length, countFiles(tree), Object.keys(graph.tags).length);
      });
      ipcMain.handle('terminal:run', (_event, workspacePath, command) => runShellCommand(workspacePath, command));
      ipcMain.handle('github:save-token', async (_event, workspacePath, input) => {
        const githubSettings = await github.saveToken(workspacePath, input);
        await workspaces.updateSettings({ github: githubSettings });
        return githubSettings;
      });
      ipcMain.handle('github:push', (_event, workspacePath) => github.push(workspacePath));
      ipcMain.handle('github:pull', (_event, workspacePath) => github.pull(workspacePath));
      ipcMain.handle('auth:register', async (_event, username, email, password) => {
        const session = await auth.register(username, email, password);
        await recordActivity(undefined, 'auth', `Registered ${session.user.username}`);
        return session;
      });
      ipcMain.handle('auth:login', async (_event, identifier, password) => {
        const session = await auth.login(identifier, password);
        await recordActivity(undefined, 'auth', `Logged in ${session.user.username}`);
        return session;
      });
      ipcMain.handle('auth:logout', async () => {
        await auth.logout();
      });
      ipcMain.handle('auth:session', () => auth.session());
      ipcMain.handle('auth:users', () => auth.users());
      ipcMain.handle('activity:feed', (_event, workspacePath?: string) => activity.feed(workspacePath));
      ipcMain.handle('activity:record', (_event, event) => activity.record(event));
    }
  };
}
