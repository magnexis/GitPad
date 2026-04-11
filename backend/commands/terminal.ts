import { spawn } from 'node:child_process';
import type { TerminalResult } from '../../src/shared/types.js';

export function runShellCommand(cwd: string, command: string, timeoutMs = 120000): Promise<TerminalResult> {
  return new Promise((resolve) => {
    const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/sh';
    const args = process.platform === 'win32' ? ['-NoProfile', '-Command', command] : ['-lc', command];
    const child = spawn(shell, args, { cwd, windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      stderr += `\nCommand timed out after ${Math.round(timeoutMs / 1000)}s.`;
      child.kill();
    }, timeoutMs);
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({ command, cwd, exitCode, stdout, stderr });
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ command, cwd, exitCode: 1, stdout, stderr: error.message });
    });
  });
}
