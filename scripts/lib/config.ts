import fs from 'node:fs';
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

const stripWrappingQuotes = (value: string) => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
};

const loadEnvFileIntoProcess = (filePath: string) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    const value = stripWrappingQuotes(line.slice(equalsIndex + 1).trim());

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = value;
  }
};

loadEnvFileIntoProcess(path.join(repoRoot, '.env'));
loadEnvFileIntoProcess(path.join(repoRoot, '.env.local'));

export const loadRuntimeConfig = (): RuntimeConfig => {
  const openAiApiKey =
    process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.LLM_API_KEY || undefined;
  const configuredBaseUrl =
    process.env.OPENAI_BASE_URL || process.env.DEEPSEEK_BASE_URL || process.env.LLM_API_BASE_URL;
  const configuredModel = process.env.OPENAI_MODEL || process.env.DEEPSEEK_MODEL || process.env.LLM_MODEL;
  const prefersDeepSeek = /deepseek/i.test(configuredBaseUrl ?? '') || Boolean(process.env.DEEPSEEK_API_KEY);

  return {
    openAiApiKey,
    openAiBaseUrl: configuredBaseUrl || (prefersDeepSeek ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1'),
    openAiModel: configuredModel || (prefersDeepSeek ? 'deepseek-chat' : 'gpt-4.1-mini'),
    userAgent:
      process.env.REQUEST_USER_AGENT ||
      'communication-journal-tracker/0.1 (+https://github.com/ZBL1637/communication-journal-tracker)',
    requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 20000),
    maxConcurrency: Number(process.env.MAX_CONCURRENCY || 3)
  };
};

export const loadJournalsConfig = async (): Promise<JournalConfig[]> =>
  readJson<JournalConfig[]>(journalsConfigPath, []);
