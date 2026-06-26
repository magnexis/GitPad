import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CodeExecutionResult, ExecutionLanguage } from '../../src/shared/types.js';
import { runCommand } from '../git/git-service.js';

function normalizeLanguage(language: string): ExecutionLanguage {
  if (language === 'python') return 'python';
  return 'javascript';
}

function runnerFor(language: ExecutionLanguage) {
  if (language === 'python') {
    return { command: process.platform === 'win32' ? 'python' : 'python3', args: ['-I'] };
  }
  return { command: 'node', args: ['--experimental-default-type=module'] };
}

async function execute(language: ExecutionLanguage, input: string, options: { scope: 'block' | 'file'; cwd: string; sourcePath?: string; blockKey?: string }) {
  const startedAt = new Date().toISOString();
  const sandboxDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gitpad-exec-'));
  const id = randomUUID();
  const runner = runnerFor(language);
  let scriptPath = input;
  let cleanup: (() => Promise<void>) | undefined;

  try {
    if (options.scope === 'block') {
      const ext = language === 'python' ? '.py' : '.mjs';
      scriptPath = path.join(sandboxDir, `snippet${ext}`);
      await fs.writeFile(scriptPath, input, 'utf8');
      cleanup = async () => fs.rm(sandboxDir, { recursive: true, force: true });
      const result = await runCommand(options.cwd, runner.command, [...runner.args, scriptPath], 5000);
      return finalizeResult({ id, language, startedAt, input, result, sourcePath: options.sourcePath, blockKey: options.blockKey, scope: options.scope });
    }

    const filePath = path.isAbsolute(input) ? input : path.join(options.cwd, input);
    const result = await runCommand(options.cwd, runner.command, [...runner.args, filePath], 10000);
    return finalizeResult({ id, language, startedAt, input, result, sourcePath: options.sourcePath ?? input, scope: options.scope });
  } finally {
    await cleanup?.();
  }
}

function finalizeResult({
  id,
  language,
  startedAt,
  input,
  result,
  sourcePath,
  blockKey,
  scope
}: {
  id: string;
  language: ExecutionLanguage;
  startedAt: string;
  input: string;
  result: Awaited<ReturnType<typeof runCommand>>;
  sourcePath?: string;
  blockKey?: string;
  scope: 'block' | 'file';
}): CodeExecutionResult {
  return {
    id,
    language,
    scope,
    sourcePath,
    blockKey,
    input,
    command: result.command,
    cwd: result.cwd,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    startedAt,
    finishedAt: new Date().toISOString()
  };
}

export async function runCodeSnippet(workspacePath: string, language: string, code: string, sourcePath?: string, blockKey?: string) {
  return execute(normalizeLanguage(language), code, { scope: 'block', cwd: workspacePath, sourcePath, blockKey });
}

export async function runCodeFile(workspacePath: string, relativePath: string) {
  const language = relativePath.toLowerCase().endsWith('.py') ? 'python' : 'javascript';
  return execute(language, relativePath, { scope: 'file', cwd: workspacePath, sourcePath: relativePath });
}
