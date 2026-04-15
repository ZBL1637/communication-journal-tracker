import { load } from 'cheerio';

import type { PaperCandidate, RuntimeConfig } from './types.js';

import { fetchText } from './client.js';
import { logger } from './logger.js';
import {
  absoluteUrl,
  cleanAuthors,
  normalizeDoi,
  normalizeWhitespace,
  parseDateToIso,
  splitKeywords,
  stripHtml
} from './utils.js';

const metaContent = ($: ReturnType<typeof load>, selectors: string[]) => {
  for (const selector of selectors) {
    const value = $(selector).attr('content');
    if (value) {
      return normalizeWhitespace(value);
    }
  }

  return '';
};

const collectJsonLd = ($: ReturnType<typeof load>) => {
  const objects: Record<string, unknown>[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const raw = $(element).contents().text();
      const parsed = JSON.parse(raw) as Record<string, unknown> | Record<string, unknown>[];
      if (Array.isArray(parsed)) {
        objects.push(...parsed);
      } else {
        objects.push(parsed);
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });

  return objects;
};

export const enrichCandidateFromDetailPage = async (
  candidate: PaperCandidate,
  runtime: RuntimeConfig
): Promise<PaperCandidate> => {
  if (!candidate.url) {
    return candidate;
  }

  try {
    const html = await fetchText(candidate.url, runtime, undefined, `${candidate.journalSlug} detail page`);
    const $ = load(html);
    const jsonLd = collectJsonLd($).find((node) => node['@type'] === 'ScholarlyArticle') ?? {};

    const title =
      metaContent($, ['meta[name="citation_title"]', 'meta[property="og:title"]']) ||
      normalizeWhitespace($('h1').first().text()) ||
      normalizeWhitespace(String(jsonLd.name ?? ''));

    const abstract =
      stripHtml(
        metaContent($, ['meta[name="dc.Description"]', 'meta[name="description"]', 'meta[name="citation_abstract"]'])
      ) ||
      stripHtml(
        $('.abstract, .hlFld-Abstract, section.abstract, #abstract, [data-title="Abstract"]').first().text()
      ) ||
      stripHtml(String(jsonLd.description ?? ''));

    const authorsFromMeta = $('meta[name="citation_author"]')
      .map((_, element) => normalizeWhitespace($(element).attr('content')))
      .get();

    const authorsFromJsonLd = Array.isArray(jsonLd.author)
      ? (jsonLd.author as Array<Record<string, unknown>>)
          .map((author) => normalizeWhitespace(String(author.name ?? '')))
          .filter(Boolean)
      : [];

    const keywordSource =
      metaContent($, ['meta[name="keywords"]', 'meta[name="citation_keywords"]']) ||
      normalizeWhitespace(
        $('.keywords, .kwd-group, [class*="keyword"]').first().text().replace(/^keywords?:/i, '')
      );

    const publishedAt =
      parseDateToIso(
        metaContent($, [
          'meta[name="citation_publication_date"]',
          'meta[name="citation_online_date"]',
          'meta[name="citation_date"]'
        ])
      ) ||
      parseDateToIso($('time').first().attr('datetime')) ||
      parseDateToIso(String(jsonLd.datePublished ?? '')) ||
      candidate.publishedAt;

    return {
      ...candidate,
      doi: normalizeDoi(
        metaContent($, ['meta[name="citation_doi"]', 'meta[name="dc.Identifier"]']) || String(jsonLd.identifier ?? '')
      ) || candidate.doi,
      url: absoluteUrl(
        metaContent($, ['meta[property="og:url"]']) || normalizeWhitespace(String(jsonLd.url ?? '')) || candidate.url,
        candidate.url
      ),
      publishedAt,
      authors: cleanAuthors([...authorsFromMeta, ...authorsFromJsonLd, ...candidate.authors]),
      title: title || candidate.title,
      abstract: abstract || candidate.abstract,
      keywords: splitKeywords(keywordSource).length > 0 ? splitKeywords(keywordSource) : candidate.keywords,
      source: {
        ...candidate.source,
        detailFetched: true
      }
    };
  } catch (error) {
    logger.warn(`Detail fetch failed for ${candidate.url}: ${(error as Error).message}`);
    return candidate;
  }
};
