import * as fs from 'fs';
import * as path from 'path';
import { readGitignorePatterns, matchesGitignorePattern } from './paths';

export class FileWatcher {
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private onChange: (event: 'change' | 'rename' | 'unlink', filePath: string) => void;
  private workspacePath: string;
  private gitignorePatterns: string[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs: number;

  constructor(
    workspacePath: string,
    onChange: (event: 'change' | 'rename' | 'unlink', filePath: string) => void,
    debounceMs = 300
  ) {
    this.workspacePath = workspacePath;
    this.onChange = onChange;
    this.debounceMs = debounceMs;
  }

  async start() {
    this.gitignorePatterns = await readGitignorePatterns(this.workspacePath);
    this.watchDirectory(this.workspacePath);
  }

  private watchDirectory(dirPath: string) {
    try {
      const watcher = fs.watch(dirPath, { recursive: false }, (eventType, filename) => {
        if (!filename) return;
        const fullPath = path.join(dirPath, filename);
        if (matchesGitignorePattern(fullPath, this.gitignorePatterns)) return;

        this.debouncedNotify(eventType as 'change' | 'rename', fullPath);

        // If it's a directory, watch it too
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            this.watchDirectory(fullPath);
          }
        } catch {}
      });

      watcher.on('error', () => {});
      this.watchers.set(dirPath, watcher);
    } catch {}
  }

  private debouncedNotify(event: 'change' | 'rename' | 'unlink', filePath: string) {
    const existing = this.debounceTimers.get(filePath);
    if (existing) clearTimeout(existing);
    this.debounceTimers.set(filePath, setTimeout(() => {
      this.debounceTimers.delete(filePath);
      this.onChange(event, filePath);
    }, this.debounceMs));
  }

  stop() {
    for (const [_, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
    for (const [_, timer] of this.debounceTimers) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }
}