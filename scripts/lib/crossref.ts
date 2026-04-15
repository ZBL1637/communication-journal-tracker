import type { JournalConfig, PaperCandidate, RuntimeConfig } from './types.js';

import { fetchJson } from './client.js';
import { logger } from './logger.js';
import { normalizeDoi, normalizeWhitespace, splitKeywords, stripHtml } from './utils.js';

interface CrossrefMessage {
  'next-cursor'?: string;
  items?: Array<Record<string, unknown>>;
}

interface CrossrefResponse {
  message?: CrossrefMessage;
}

const pickDate = (item: Record<string, unknown>) => {
  const nodes = ['published-print', 'published-online', 'issued', 'created', 'deposited']
    .map((key) => item[key] as { 'date-parts'?: number[][] } | undefined)
    .filter(Boolean);

  for (const node of nodes) {
    const parts = node?.['date-parts']?.[0];
    if (!parts || parts.length === 0) {
      continue;
    }

    const [year, month = 1, day = 1] = parts;
    return new Date(Date.UTC(year, month - 1, day)).toISOString();
  }

  return '';
};

export const fetchCrossrefCandidates = async (
  journal: JournalConfig,
  runtime: RuntimeConfig,
  daysBack: number,
  limitPerJournal?: number
) => {
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - daysBack);
  const fromDateText = fromDate.toISOString().slice(0, 10);

  const rows = Math.min(Math.max(limitPerJournal ?? 50, 20), 100);
  const results: PaperCandidate[] = [];
  let cursor = '*';
  let page = 0;

  while (page < 5) {
    const url = new URL(`https://api.crossref.org/journals/${encodeURIComponent(journal.issn)}/works`);
    url.searchParams.set('rows', String(rows));
    url.searchParams.set('cursor', cursor);
    url.searchParams.set('sort', 'published');
    url.searchParams.set('order', 'desc');
    url.searchParams.set('filter', `from-pub-date:${fromDateText}`);

    try {
      const payload = await fetchJson<CrossrefResponse>(url.toString(), runtime, undefined, `${journal.slug} Crossref`);
      const items = payload.message?.items ?? [];

      for (const item of items) {
        const title = Array.isArray(item.title) ? normalizeWhitespace(String(item.title[0] ?? '')) : '';
        const abstract = stripHtml(String(item.abstract ?? ''));
        const authors = Array.isArray(item.author)
          ? item.author
              .map((author) =>
                normalizeWhitespace(
                  `${String((author as Record<string, unknown>).given ?? '')} ${String(
                    (author as Record<string, unknown>).family ?? ''
                  )}`
                )
              )
              .filter(Boolean)
          : [];

        results.push({
          doi: normalizeDoi(String(item.DOI ?? '')),
          url: normalizeWhitespace(String(item.URL ?? '')),
          journalName: journal.name,
          journalSlug: journal.slug,
          issn: journal.issn,
          publishedAt: pickDate(item),
          authors,
          title,
          abstract,
          keywords: splitKeywords(Array.isArray(item.subject) ? (item.subject as string[]) : []),
          source: {
            type: 'crossref',
            label: 'Crossref journals API',
            url: url.toString(),
            detailFetched: false
          }
        });
      }

      cursor = payload.message?.['next-cursor'] ?? '';
      page += 1;

      if (!cursor || items.length < rows || (typeof limitPerJournal === 'number' && results.length >= limitPerJournal)) {
        break;
      }
    } catch (error) {
      logger.warn(`Crossref fetch failed for ${journal.name}: ${(error as Error).message}`);
      break;
    }
  }

  return typeof limitPerJournal === 'number' ? results.slice(0, limitPerJournal) : results;
};
