import fs from 'node:fs/promises';
import path from 'node:path';
import type { GitHubSettings, GitHubTokenInput, TerminalResult } from '../../src/shared/types.js';
import { runCommand, runGit } from '../git/git-service.js';

export class GitHubService {
  private readonly storePath: string;

  constructor(
    appDataPath: string,
    private readonly encrypt: (value: string) => string,
    private readonly decrypt: (value: string) => string
  ) {
    this.storePath = path.join(appDataPath, 'github-token.enc');
  }

  async saveToken(workspacePath: string, input: GitHubTokenInput): Promise<GitHubSettings> {
    if (!input.token.trim()) throw new Error('GitHub token is required.');
    if (!input.owner.trim() || !input.repo.trim()) throw new Error('Owner and repository are required.');
    await fs.mkdir(path.dirname(this.storePath), { recursive: true });
    await fs.writeFile(this.storePath, this.encrypt(input.token.trim()), 'utf8');
    const remoteUrl = `https://github.com/${input.owner.trim()}/${input.repo.trim()}.git`;
    await runGit(workspacePath, ['remote', 'remove', 'origin']).catch(() => undefined);
    await runGit(workspacePath, ['remote', 'add', 'origin', remoteUrl]);
    return { owner: input.owner.trim(), repo: input.repo.trim(), remoteUrl, hasToken: true, autoPush: false };
  }

  async push(workspacePath: string): Promise<TerminalResult> {
    try {
      const remote = await this.authenticatedRemote(workspacePath);
      return runCommand(workspacePath, 'git', ['push', remote, 'HEAD:main'], 120000);
    } catch (error) {
      return {
        command: 'git push',
        cwd: workspacePath,
        exitCode: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : 'GitHub remote is not linked.'
      };
    }
  }

  async pull(workspacePath: string): Promise<TerminalResult> {
    try {
      const remote = await this.authenticatedRemote(workspacePath);
      return runCommand(workspacePath, 'git', ['pull', '--rebase', remote, 'main'], 120000);
    } catch (error) {
      return {
        command: 'git pull --rebase',
        cwd: workspacePath,
        exitCode: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : 'GitHub remote is not linked.'
      };
    }
  }

  private async authenticatedRemote(workspacePath: string) {
    const tokenExists = await fs.access(this.storePath).then(() => true).catch(() => false);
    if (!tokenExists) {
      throw new Error('GitHub is not linked yet. Open GitHub Sync and save your token, owner, and repository first.');
    }
    const token = this.decrypt(await fs.readFile(this.storePath, 'utf8'));
    const origin = (await runGit(workspacePath, ['remote', 'get-url', 'origin'])).trim();
    if (!origin.startsWith('https://github.com/')) return origin;
    return origin.replace('https://github.com/', `https://x-access-token:${encodeURIComponent(token)}@github.com/`);
  }
}
