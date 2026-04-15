import fs from 'node:fs/promises';
import path from 'node:path';

export const ensureDir = async (target: string) => {
  await fs.mkdir(target, { recursive: true });
};

export const readJson = async <T>(filePath: string, fallback: T): Promise<T> => {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const writeJson = async (filePath: string, value: unknown) => {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};
