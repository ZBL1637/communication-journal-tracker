import type { RuntimeConfig } from './types.js';

import { logger } from './logger.js';
import { sleep } from './utils.js';

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export const fetchWithRetry = async (
  url: string,
  runtime: RuntimeConfig,
  init?: RequestInit,
  label?: string,
  attempts = 3
) => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          'user-agent': runtime.userAgent,
          accept: 'application/json, text/html, application/xml, text/xml;q=0.9, */*;q=0.8',
          ...(init?.headers ?? {})
        },
        signal: AbortSignal.timeout(runtime.requestTimeoutMs)
      });

      if (!response.ok && RETRYABLE_STATUS.has(response.status) && attempt < attempts) {
        logger.warn(`${label ?? url} returned ${response.status}; retrying (${attempt}/${attempts})`);
        await sleep(300 * attempt);
        continue;
      }

      if (!response.ok) {
        throw new Error(`${label ?? url} failed with status ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        logger.warn(`${label ?? url} failed on attempt ${attempt}; retrying`);
        await sleep(400 * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${label ?? url}`);
};

export const fetchText = async (
  url: string,
  runtime: RuntimeConfig,
  init?: RequestInit,
  label?: string
) => {
  const response = await fetchWithRetry(url, runtime, init, label);
  return response.text();
};

export const fetchJson = async <T>(
  url: string,
  runtime: RuntimeConfig,
  init?: RequestInit,
  label?: string
) => {
  const response = await fetchWithRetry(url, runtime, init, label);
  return (await response.json()) as T;
};
