import fs from 'node:fs/promises';
import path from 'node:path';
import type { AppSettings, CreateWorkspaceInput, DeleteWorkspaceInput, RenameWorkspaceInput, WorkspaceSummary } from '../../src/shared/types.js';
import { ensureDir } from './paths.js';
import { initRepository } from '../git/git-service.js';

interface WorkspaceStore {
  workspaces: WorkspaceSummary[];
  settings: AppSettings;
  lastOpenedWorkspacePath?: string;
}

export class WorkspaceService {
  private readonly storePath: string;

  constructor(
    private readonly appDataPath: string,
    private readonly documentsPath: string,
    private readonly chooseDirectory: () => Promise<string | undefined>
  ) {
    this.storePath = path.join(appDataPath, 'gitpad-store.json');
  }

  async loadStore(): Promise<WorkspaceStore> {
    await ensureDir(this.appDataPath);
    try {
      const raw = await fs.readFile(this.storePath, 'utf8');
      const parsed = JSON.parse(raw) as WorkspaceStore;
      return {
        workspaces: parsed.workspaces ?? [],
        settings: { ...this.defaultSettings(), ...(parsed.settings ?? {}) },
        lastOpenedWorkspacePath: parsed.lastOpenedWorkspacePath
      };
    } catch {
      const store = { workspaces: [], settings: this.defaultSettings(), lastOpenedWorkspacePath: undefined };
      await this.saveStore(store);
      return store;
    }
  }

  async saveStore(store: WorkspaceStore) {
    await ensureDir(this.appDataPath);
    await fs.writeFile(this.storePath, JSON.stringify(store, null, 2), 'utf8');
  }

  async getSettings() {
    return (await this.loadStore()).settings;
  }

  async updateSettings(settings: Partial<AppSettings>) {
    const store = await this.loadStore();
    store.settings = {
      ...store.settings,
      ...settings,
      github: { ...store.settings.github, ...(settings.github ?? {}) }
    };
    await this.saveStore(store);
    return store.settings;
  }

  async list() {
    return [...(await this.loadStore()).workspaces].sort((a, b) => {
      const left = new Date(a.lastOpenedAt).getTime();
      const right = new Date(b.lastOpenedAt).getTime();
      return right - left;
    });
  }

  async create(input: CreateWorkspaceInput) {
    const store = await this.loadStore();
    const safeName = input.name.trim().replace(/[<>:"/\\|?*]/g, '-');
    if (!safeName) throw new Error('Workspace name is required.');
    const parent = input.location || store.settings.defaultWorkspaceLocation;
    const workspacePath = path.join(parent, safeName);
    const exists = store.workspaces.some((item) => item.path.toLowerCase() === workspacePath.toLowerCase());
    if (exists) throw new Error(`Workspace "${safeName}" already exists.`);
    await ensureDir(workspacePath);
    await initRepository(workspacePath, store.settings.gitUserName, store.settings.gitUserEmail);
    const now = new Date().toISOString();
    const summary: WorkspaceSummary = {
      id: Buffer.from(workspacePath).toString('base64url'),
      name: safeName,
      path: workspacePath,
      createdAt: now,
      lastOpenedAt: now
    };
    store.workspaces = [summary, ...store.workspaces.filter((item) => item.path !== workspacePath)];
    store.lastOpenedWorkspacePath = workspacePath;
    await this.saveStore(store);
    return summary;
  }

  async open(pathFromUi?: string) {
    const selected = pathFromUi || (await this.chooseDirectory());
    if (!selected) throw new Error('No workspace selected.');
    const workspacePath = path.resolve(selected);
    await ensureDir(workspacePath);
    const store = await this.loadStore();
    await initRepository(workspacePath, store.settings.gitUserName, store.settings.gitUserEmail);
    const now = new Date().toISOString();
    const name = path.basename(workspacePath);
    const existing = store.workspaces.find((item) => item.path === workspacePath);
    const summary: WorkspaceSummary = {
      id: existing?.id ?? Buffer.from(workspacePath).toString('base64url'),
      name,
      path: workspacePath,
      createdAt: existing?.createdAt ?? now,
      lastOpenedAt: now
    };
    store.workspaces = [summary, ...store.workspaces.filter((item) => item.path !== workspacePath)];
    store.lastOpenedWorkspacePath = workspacePath;
    await this.saveStore(store);
    return summary;
  }

  async rename(input: RenameWorkspaceInput) {
    const store = await this.loadStore();
    const safeName = input.name.trim().replace(/[<>:"/\\|?*]/g, '-');
    if (!safeName) throw new Error('Workspace name is required.');
    const sourcePath = path.resolve(input.workspacePath);
    const existing = store.workspaces.find((item) => path.resolve(item.path) === sourcePath);
    if (!existing) throw new Error('Workspace not found.');
    const nextPath = path.join(path.dirname(sourcePath), safeName);
    if (nextPath.toLowerCase() !== sourcePath.toLowerCase()) {
      const targetExists = await fs.access(nextPath).then(() => true).catch(() => false);
      if (targetExists) throw new Error(`A workspace named "${safeName}" already exists in this location.`);
      await fs.rename(sourcePath, nextPath);
    }
    const now = new Date().toISOString();
    const renamed: WorkspaceSummary = {
      ...existing,
      name: safeName,
      path: nextPath,
      lastOpenedAt: now
    };
    store.workspaces = [renamed, ...store.workspaces.filter((item) => item.id !== existing.id)];
    store.lastOpenedWorkspacePath = nextPath;
    await this.saveStore(store);
    return renamed;
  }

  async delete(input: DeleteWorkspaceInput) {
    const store = await this.loadStore();
    const workspacePath = path.resolve(input.workspacePath);
    const existing = store.workspaces.find((item) => path.resolve(item.path) === workspacePath);
    if (!existing) throw new Error('Workspace not found.');
    if (input.deleteFiles ?? true) {
      await fs.rm(workspacePath, { recursive: true, force: true });
    }
    store.workspaces = store.workspaces.filter((item) => item.id !== existing.id);
    if (store.lastOpenedWorkspacePath && path.resolve(store.lastOpenedWorkspacePath) === workspacePath) {
      store.lastOpenedWorkspacePath = store.workspaces[0]?.path;
    }
    await this.saveStore(store);
    return this.list();
  }

  defaultSettings(): AppSettings {
    return {
      autoCommit: true,
      theme: 'dark',
      gitUserName: 'GitPad User',
      gitUserEmail: 'gitpad@local',
      defaultWorkspaceLocation: path.join(this.documentsPath, 'GitPad Workspaces'),
      github: {
        owner: '',
        repo: '',
        remoteUrl: '',
        hasToken: false,
        autoPush: false
      }
    };
  }
}
