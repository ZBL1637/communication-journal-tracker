import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { JournalConfig, RuntimeConfig } from './types.js';

import { readJson } from './fs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, '..', '..');
export const dataDir = path.join(repoRoot, 'public', 'data');
export const papersDir = path.join(dataDir, 'papers');
export const journalsConfigPath = path.join(repoRoot, 'scripts', 'config', 'journals.json');

export const loadRuntimeConfig = (): RuntimeConfig => ({
  openAiApiKey: process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || undefined,
  openAiBaseUrl: process.env.OPENAI_BASE_URL || process.env.LLM_API_BASE_URL || 'https://api.openai.com/v1',
  openAiModel: process.env.OPENAI_MODEL || process.env.LLM_MODEL || 'gpt-4.1-mini',
  userAgent:
    process.env.REQUEST_USER_AGENT ||
    'communication-journal-tracker/0.1 (+https://github.com/ZBL1637/communication-journal-tracker)',
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 20000),
  maxConcurrency: Number(process.env.MAX_CONCURRENCY || 3)
});

export const loadJournalsConfig = async (): Promise<JournalConfig[]> =>
  readJson<JournalConfig[]>(journalsConfigPath, []);
