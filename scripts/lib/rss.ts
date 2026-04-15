import { XMLParser } from 'fast-xml-parser';

import type { JournalConfig, PaperCandidate, RuntimeConfig } from './types.js';

import { fetchText } from './client.js';
import { logger } from './logger.js';
import { cleanAuthors, normalizeDoi, normalizeWhitespace, parseDateToIso, splitKeywords, stripHtml } from './utils.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: true,
  trimValues: true
});

const arrayify = <T>(value: T | T[] | undefined): T[] => {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

export const fetchRssCandidates = async (
  journal: JournalConfig,
  runtime: RuntimeConfig,
  limitPerJournal?: number
) => {
  if (!journal.rssUrl) {
    return [];
  }

  try {
    const xml = await fetchText(journal.rssUrl, runtime, undefined, `${journal.slug} RSS`);
    const document = parser.parse(xml);
    const items = arrayify(document?.rss?.channel?.item ?? document?.feed?.entry);
    const candidates: PaperCandidate[] = items.map((item: Record<string, unknown>) => {
      const authorNode = item['dc:creator'] ?? item.author ?? item['authors'];
      const authors = cleanAuthors(
        arrayify(authorNode as string | string[] | undefined).flatMap((author) =>
          normalizeWhitespace(String(author)).split(/,\s+(?=[A-Z])/)
        )
      );

      return {
        doi: normalizeDoi(
          String(item['prism:doi'] ?? item['dc:identifier'] ?? item['doi'] ?? '')
        ),
        url: normalizeWhitespace(String(item.link ?? item.id ?? item.guid ?? '')),
        journalName: journal.name,
        journalSlug: journal.slug,
        issn: journal.issn,
        publishedAt: parseDateToIso(
          String(item.pubDate ?? item.published ?? item.updated ?? item['prism:publicationDate'] ?? '')
        ),
        authors,
        title: normalizeWhitespace(String(item.title ?? '')),
        abstract: stripHtml(String(item.description ?? item.summary ?? item.content ?? '')),
        keywords: splitKeywords(String(item.category ?? item['dc:subject'] ?? '')),
        source: {
          type: 'rss',
          label: 'RSS feed',
          url: journal.rssUrl,
          detailFetched: false
        }
      };
    });

    const filtered = candidates.filter((item) => item.title || item.url);
    return typeof limitPerJournal === 'number' ? filtered.slice(0, limitPerJournal) : filtered;
  } catch (error) {
    logger.warn(`RSS fetch failed for ${journal.name}: ${(error as Error).message}`);
    return [];
  }
};
