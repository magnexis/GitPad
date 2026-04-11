import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FileService } from '../backend/file-system/file-service';
import { branches, commitStaged, createBranch, initRepository, stagePath, stagingStatus, switchBranch, runGit } from '../backend/git/git-service';
import { WorkspaceService } from '../backend/file-system/workspaces';

async function tempWorkspace() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'gitpad-test-'));
}

describe('GitPad backend', () => {
  it('initializes a Git repository and creates commits', async () => {
    const workspace = await tempWorkspace();
    await initRepository(workspace, 'GitPad Test', 'test@gitpad.local');
    await fs.writeFile(path.join(workspace, 'note.md'), '# Test\n', 'utf8');
    await runGit(workspace, ['add', '.']);
    await runGit(workspace, ['commit', '-m', 'Add note']);
    const log = await runGit(workspace, ['log', '--oneline']);
    expect(log).toContain('Add note');
  });

  it('saves files and searches across workspace text files', async () => {
    const workspace = await tempWorkspace();
    const service = new FileService();
    await initRepository(workspace, 'GitPad Test', 'test@gitpad.local');
    await service.save({ workspacePath: workspace, relativePath: 'notes/today.md', content: 'alpha beta gamma' }, false);
    await service.save({ workspacePath: workspace, relativePath: 'code/app.ts', content: 'const beta = true;' }, false);
    const results = await service.search(workspace, 'beta');
    expect(results.map((result) => result.relativePath).sort()).toEqual(['code/app.ts', 'notes/today.md']);
  });

  it('rejects paths outside a workspace', async () => {
    const workspace = await tempWorkspace();
    const service = new FileService();
    await expect(service.read(workspace, '../secret.txt')).rejects.toThrow('inside the workspace');
  });

  it('builds note links, tags, and backlinks from real markdown files', async () => {
    const workspace = await tempWorkspace();
    const service = new FileService();
    await service.save({ workspacePath: workspace, relativePath: 'Alpha.md', content: '# Alpha\n\nLinks to [[Beta]] #ideas' }, false);
    await service.save({ workspacePath: workspace, relativePath: 'Beta.md', content: '# Beta\n\n#work' }, false);
    const graph = await service.noteGraph(workspace);
    expect(graph.nodes.map((node) => node.path).sort()).toEqual(['Alpha.md', 'Beta.md']);
    expect(graph.links).toContainEqual({ source: 'Alpha.md', target: 'Beta.md', label: 'Beta' });
    expect(graph.tags.ideas).toEqual(['Alpha.md']);
    const backlinks = await service.backlinks(workspace, 'Beta.md');
    expect(backlinks[0].source).toBe('Alpha.md');
  });

  it('creates workspace repository without creating an initial commit', async () => {
    const root = await tempWorkspace();
    const appData = path.join(root, 'appdata');
    const docs = path.join(root, 'docs');
    await fs.mkdir(docs, { recursive: true });
    const workspaces = new WorkspaceService(appData, docs, async () => undefined);
    const workspace = await workspaces.create({ name: 'Alpha Workspace', location: root });
    await expect(runGit(workspace.path, ['rev-parse', '--verify', 'HEAD'])).rejects.toThrow();
  });

  it('prevents duplicate file creation and supports duplicate copy operation', async () => {
    const workspace = await tempWorkspace();
    const service = new FileService();
    await initRepository(workspace, 'GitPad Test', 'test@gitpad.local');
    await service.createFile(workspace, 'notes/alpha.md', '# alpha');
    await expect(service.createFile(workspace, 'notes/alpha.md', '# again')).rejects.toThrow('already exists');
    const duplicatedPath = await service.duplicate(workspace, 'notes/alpha.md');
    expect(duplicatedPath).toMatch(/^notes\/alpha copy/);
    const duplicatedContent = await service.read(workspace, duplicatedPath);
    expect(duplicatedContent).toContain('# alpha');
  });

  it('lists and switches branches before first commit', async () => {
    const workspace = await tempWorkspace();
    await initRepository(workspace, 'GitPad Test', 'test@gitpad.local');

    const initial = await branches(workspace);
    expect(initial.length).toBe(1);
    expect(initial[0].isActive).toBe(true);

    await createBranch(workspace, 'feature/notes');
    const afterCreate = await branches(workspace);
    expect(afterCreate.some((branch) => branch.name === 'feature/notes' && branch.isActive)).toBe(true);

    await switchBranch(workspace, initial[0].name);
    const afterSwitch = await branches(workspace);
    expect(afterSwitch.some((branch) => branch.name === initial[0].name && branch.isActive)).toBe(true);
  });

  it('requires staged files and commit message for staged commit flow', async () => {
    const workspace = await tempWorkspace();
    const service = new FileService();
    await initRepository(workspace, 'GitPad Test', 'test@gitpad.local');

    await service.createFile(workspace, 'notes/staged.md', 'hello');
    const pending = await stagingStatus(workspace);
    expect(pending.unstaged.some((change) => change.state === 'untracked')).toBe(true);

    await expect(commitStaged(workspace, 'no staged yet')).rejects.toThrow('No staged changes');
    await stagePath(workspace, 'notes/staged.md');
    await expect(commitStaged(workspace, '   ')).rejects.toThrow('Commit message is required');

    await commitStaged(workspace, 'Created file: notes/staged.md');
    const log = await runGit(workspace, ['log', '--oneline']);
    expect(log).toContain('Created file: notes/staged.md');
  });
});
