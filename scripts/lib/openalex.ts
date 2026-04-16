import type { PaperCandidate, RuntimeConfig } from './types.js';

import { fetchJson } from './client.js';
import { logger } from './logger.js';
import {
  cleanAuthors,
  hasKeywords,
  hasMeaningfulAbstract,
  isNoisyAuthors,
  normalizeAbstractText,
  normalizeDoi,
  normalizeWhitespace,
  parseDateToIso
} from './utils.js';

interface OpenAlexAuthor {
  author?: {
    display_name?: string;
  };
}

interface OpenAlexKeyword {
  display_name?: string;
  score?: number;
}

interface OpenAlexConcept {
  display_name?: string;
  score?: number;
}

interface OpenAlexLocation {
  landing_page_url?: string;
}

interface OpenAlexWorkResponse {
  doi?: string;
  title?: string;
  display_name?: string;
  publication_date?: string;
  abstract_inverted_index?: Record<string, number[]>;
  authorships?: OpenAlexAuthor[];
  keywords?: OpenAlexKeyword[];
  concepts?: OpenAlexConcept[];
  primary_location?: OpenAlexLocation;
  locations?: OpenAlexLocation[];
}

const normalizeLabels = (values: string[]) =>
  Array.from(
    new Set(
      values
        .map((value) => normalizeWhitespace(value))
        .filter(Boolean)
    )
  );

const reconstructAbstract = (index?: Record<string, number[]>) => {
  if (!index) {
    return '';
  }

  const positions = Object.values(index).flat();
  if (positions.length === 0) {
    return '';
  }

  const words = new Array(Math.max(...positions) + 1).fill('');
  for (const [word, slots] of Object.entries(index)) {
    for (const slot of slots) {
      words[slot] = word;
    }
  }

  return normalizeAbstractText(
    words
      .filter(Boolean)
      .join(' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
  );
};

const collectKeywords = (work: OpenAlexWorkResponse) => {
  const keywords = normalizeLabels((work.keywords ?? []).map((item) => item.display_name ?? ''));
  if (keywords.length > 0) {
    return keywords;
  }

  return normalizeLabels(
    (work.concepts ?? [])
      .filter((item) => (item.score ?? 0) >= 0.35)
      .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
      .map((item) => item.display_name ?? '')
      .slice(0, 8)
  );
};

const sameList = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

export const enrichCandidateFromOpenAlexDoi = async (
  candidate: PaperCandidate,
  runtime: RuntimeConfig
): Promise<PaperCandidate> => {
  const doi = normalizeDoi(candidate.doi);
  if (!doi) {
    return candidate;
  }

  const url = `https://api.openalex.org/works/${encodeURIComponent(`https://doi.org/${doi}`)}`;

  try {
    const work = await fetchJson<OpenAlexWorkResponse>(url, runtime, undefined, `${candidate.journalSlug} OpenAlex DOI`);
    const mappedAuthors = cleanAuthors((work.authorships ?? []).map((item) => item.author?.display_name ?? ''));
    const mappedKeywords = collectKeywords(work);
    const mappedAbstract = reconstructAbstract(work.abstract_inverted_index);
    const mappedTitle = normalizeWhitespace(work.title ?? work.display_name ?? '');
    const mappedUrl =
      normalizeWhitespace(work.primary_location?.landing_page_url ?? '') ||
      normalizeWhitespace((work.locations ?? []).map((item) => item.landing_page_url ?? '').find(Boolean) ?? '');
    const mappedPublishedAt = parseDateToIso(work.publication_date) || '';
    const nextAuthors =
      isNoisyAuthors(candidate.authors) && mappedAuthors.length > 0
        ? mappedAuthors
        : cleanAuthors([...mappedAuthors, ...candidate.authors]);
    const nextKeywords = hasKeywords(candidate.keywords) ? candidate.keywords ?? [] : mappedKeywords;
    const nextAbstract = hasMeaningfulAbstract(candidate.abstract) ? candidate.abstract ?? '' : mappedAbstract;
    const nextCandidate: PaperCandidate = {
      ...candidate,
      doi: normalizeDoi(work.doi) || candidate.doi,
      url: candidate.url || mappedUrl,
      publishedAt: candidate.publishedAt || mappedPublishedAt,
      authors: nextAuthors,
      title: candidate.title || mappedTitle,
      abstract: nextAbstract,
      keywords: nextKeywords
    };

    const changed =
      normalizeDoi(nextCandidate.doi) !== normalizeDoi(candidate.doi) ||
      normalizeWhitespace(nextCandidate.url) !== normalizeWhitespace(candidate.url) ||
      normalizeWhitespace(nextCandidate.publishedAt) !== normalizeWhitespace(candidate.publishedAt) ||
      normalizeWhitespace(nextCandidate.title) !== normalizeWhitespace(candidate.title) ||
      normalizeAbstractText(nextCandidate.abstract) !== normalizeAbstractText(candidate.abstract) ||
      !sameList(nextCandidate.authors, candidate.authors) ||
      !sameList(nextCandidate.keywords ?? [], candidate.keywords ?? []);

    return changed
      ? {
          ...nextCandidate,
          source: {
            ...candidate.source,
            openAlexFetched: true
          }
        }
      : candidate;
  } catch (error) {
    logger.warn(`OpenAlex DOI lookup failed for ${doi}: ${(error as Error).message}`);
    return candidate;
  }
};
