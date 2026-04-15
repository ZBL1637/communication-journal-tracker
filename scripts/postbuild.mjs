import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');

await mkdir(distDir, { recursive: true });
await copyFile(path.join(distDir, 'index.html'), path.join(distDir, '404.html'));
