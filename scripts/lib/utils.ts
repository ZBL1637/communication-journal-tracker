import crypto from 'node:crypto';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import type { PaperCandidate, PaperRecord, SupportedLanguage } from './types.js';

dayjs.extend(utc);

const EN_STOPWORDS = new Set([
  'about',
  'after',
  'among',
  'between',
  'being',
  'from',
  'into',
  'that',
  'this',
  'their',
  'there',
  'these',
  'those',
  'with',
  'using',
  'study',
  'research',
  'communication',
  'media',
  'social',
  'platform'
]);

export const normalizeWhitespace = (value: string | undefined | null) =>
  (value ?? '').replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim();

export const stripHtml = (value: string | undefined | null) =>
  normalizeWhitespace(
    (value ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
  );

export const absoluteUrl = (value: string, base: string) => {
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
};

export const splitKeywords = (value: string | string[] | undefined | null) => {
  if (!value) {
    return [];
  }

  const source = Array.isArray(value) ? value.join(';') : value;

  return Array.from(
    new Set(
      source
        .split(/[,;|/、，；]+/)
        .map((item) => normalizeWhitespace(item))
        .filter(Boolean)
    )
  );
};

export const normalizeDoi = (value: string | undefined | null) => {
  const normalized = normalizeWhitespace(value)
    .replace(/^https?:\/\/doi.org\//i, '')
    .replace(/^doi:\s*/i, '');

  return normalized || '';
};

export const toSlug = (value: string) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const parseDateToIso = (value: string | undefined | null) => {
  const candidate = normalizeWhitespace(value);
  if (!candidate) {
    return '';
  }

  const parsed = dayjs(candidate);
  if (parsed.isValid()) {
    return parsed.utc().toISOString();
  }

  return '';
};

export const getDateDaysAgo = (days: number) => dayjs().utc().subtract(days, 'day').startOf('day');

export const uniq = <T>(values: T[]) => Array.from(new Set(values));

export const mergeUniqueStrings = (...lists: string[][]) =>
  uniq(
    lists
      .flat()
      .map((value) => normalizeWhitespace(value))
      .filter(Boolean)
  );

export const detectLanguage = (...values: string[]): SupportedLanguage => {
  const source = normalizeWhitespace(values.join(' '));
  if (!source) {
    return 'unknown';
  }

  const zhChars = (source.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const latinChars = (source.match(/[A-Za-z]/g) ?? []).length;

  if (zhChars > 0 && latinChars === 0) {
    return 'zh';
  }

  if (latinChars > 0 && zhChars === 0) {
    return 'en';
  }

  if (latinChars > 0 && zhChars > 0) {
    return 'mixed';
  }

  return 'unknown';
};

export const buildPaperId = (candidate: PaperCandidate) => {
  const seed =
    normalizeDoi(candidate.doi) ||
    absoluteUrl(candidate.url ?? '', 'https://example.com') ||
    `${candidate.journalSlug}-${normalizeWhitespace(candidate.title)}`;

  const hash = crypto.createHash('sha1').update(seed).digest('hex').slice(0, 12);
  const prefix = candidate.journalSlug || 'paper';

  return `${prefix}-${hash}`;
};

export const cleanAuthors = (values: string[]) =>
  uniq(
    values
      .map((value) => normalizeWhitespace(value))
      .filter(Boolean)
  );

export const sortPapersDesc = <T extends Pick<PaperRecord, 'publishedAt' | 'fetchedAt'>>(papers: T[]) =>
  [...papers].sort((left, right) => {
    const publishedDiff = new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
    if (publishedDiff !== 0) {
      return publishedDiff;
    }

    return new Date(right.fetchedAt).getTime() - new Date(left.fetchedAt).getTime();
  });

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const topWords = (value: string, limit = 8) => {
  const tokens = normalizeWhitespace(value)
    .toLowerCase()
    .match(/[a-z]{3,}/g);

  if (!tokens) {
    return [];
  }

  const counts = new Map<string, number>();
  for (const token of tokens) {
    if (EN_STOPWORDS.has(token)) {
      continue;
    }

    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
};
