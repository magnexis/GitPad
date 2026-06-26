import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const targets = [
  'dist',
  'dist-electron',
  path.join('target', 'dist'),
  path.join('target', 'dist-electron'),
  path.join('target', 'release'),
  path.join('target', 'build-info.json'),
  path.join('build', 'icon.ico')
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function removeWithRetry(targetPath, attempts = 5) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await fs.rm(targetPath, { recursive: true, force: true });
      return;
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
      if (code === 'EBUSY' || code === 'EPERM' || code === 'ENOTEMPTY') {
        if (attempt < attempts) {
          await sleep(200 * attempt);
          continue;
        }
        console.warn(`Skipped locked path during clean: ${targetPath}`);
        return;
      }
      if (code === 'ENOENT') return;
      throw error;
    }
  }
}

for (const target of targets) {
  await removeWithRetry(path.join(root, target));
}

await fs.mkdir(path.join(root, 'target'), { recursive: true });
await fs.writeFile(path.join(root, 'target', '.gitkeep'), '', 'utf8');
