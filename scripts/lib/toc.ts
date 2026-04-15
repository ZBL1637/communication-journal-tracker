import { load } from 'cheerio';

import type { JournalConfig, PaperCandidate, RuntimeConfig } from './types.js';

import { fetchText } from './client.js';
import { logger } from './logger.js';
import { absoluteUrl, cleanAuthors, normalizeWhitespace, parseDateToIso } from './utils.js';

const DEFAULT_SELECTORS = ["a[href*='/doi/']"];

export const fetchTocCandidates = async (
  journal: JournalConfig,
  runtime: RuntimeConfig,
  limitPerJournal?: number
) => {
  if (!journal.tocUrl) {
    return [];
  }

  try {
    const html = await fetchText(journal.tocUrl, runtime, undefined, `${journal.slug} TOC`);
    const $ = load(html);
    const selectors = journal.tocArticleSelectors?.length ? journal.tocArticleSelectors : DEFAULT_SELECTORS;
    const seen = new Set<string>();
    const results: PaperCandidate[] = [];

    for (const selector of selectors) {
      $(selector).each((_, element) => {
        const link = $(element).attr('href');
        if (!link) {
          return;
        }

        const url = absoluteUrl(link, journal.homepage);
        if (seen.has(url)) {
          return;
        }

        seen.add(url);
        const container = $(element).closest('article, li, .issue-item, .card, .articleEntry');
        const authors = cleanAuthors(
          normalizeWhitespace(
            container.find('.meta__authors, .hlFld-ContribAuthor, .author, .authors').first().text()
          ).split(/[,;]+/)
        );

        results.push({
          url,
          journalName: journal.name,
          journalSlug: journal.slug,
          issn: journal.issn,
          publishedAt: parseDateToIso(
            container.find('time').attr('datetime') ??
              container.find('time, .meta__pubDate, .issue-item__header').first().text()
          ),
          authors,
          title: normalizeWhitespace($(element).text()),
          source: {
            type: 'toc',
            label: 'Journal table of contents',
            url: journal.tocUrl,
            detailFetched: false
          }
        });
      });
    }

    const filtered = results.filter((item) => item.url);
    return typeof limitPerJournal === 'number' ? filtered.slice(0, limitPerJournal) : filtered;
  } catch (error) {
    logger.warn(`TOC fetch failed for ${journal.name}: ${(error as Error).message}`);
    return [];
  }
};
