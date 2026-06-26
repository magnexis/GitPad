import fs from 'node:fs/promises';
import path from 'node:path';
import pngToIco from 'png-to-ico';

const root = process.cwd();
const sourcePng = path.join(root, 'public', 'GITPAD-icon.png');
const outputDir = path.join(root, 'build');
const outputIco = path.join(outputDir, 'icon.ico');

await fs.mkdir(outputDir, { recursive: true });

const icoBuffer = await pngToIco(sourcePng);
await fs.writeFile(outputIco, icoBuffer);

console.log(`Generated ${path.relative(root, outputIco)} from ${path.relative(root, sourcePng)}`);
