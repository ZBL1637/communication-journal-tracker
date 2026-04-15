import type { PaperCandidate, PaperRecord } from './types.js';

import { absoluteUrl, normalizeDoi, normalizeWhitespace } from './utils.js';

const SOURCE_PRIORITY: Record<string, number> = {
  rss: 1,
  toc: 2,
  crossref: 3
};

type DedupeSource = {
  doi?: string;
  url?: string;
  title?: string;
  raw_title?: string;
  title_en?: string;
};

export const getDedupeKey = (paper: DedupeSource) => {
  const doi = normalizeDoi(paper.doi);
  if (doi) {
    return `doi:${doi.toLowerCase()}`;
  }

  const url = absoluteUrl(paper.url ?? '', 'https://example.com');
  const title = normalizeWhitespace(paper.title ?? paper.raw_title ?? paper.title_en).toLowerCase();
  return `fallback:${url}|${title}`;
};

const scoreCandidate = (paper: PaperCandidate) => {
  const sourceScore = SOURCE_PRIORITY[paper.source.type] ?? 99;
  const detailBonus = paper.source.detailFetched ? -1 : 0;
  const fieldBonus =
    [paper.title, paper.abstract, paper.keywords?.length ? 'keywords' : ''].filter(Boolean).length * -0.1;

  return sourceScore + detailBonus + fieldBonus;
};

export const mergeCandidates = (left: PaperCandidate, right: PaperCandidate): PaperCandidate => {
  const preferred = scoreCandidate(left) <= scoreCandidate(right) ? left : right;
  const secondary = preferred === left ? right : left;

  return {
    ...secondary,
    ...preferred,
    doi: normalizeDoi(preferred.doi || secondary.doi),
    url: preferred.url || secondary.url,
    publishedAt: preferred.publishedAt || secondary.publishedAt,
    title: preferred.title || secondary.title,
    abstract: preferred.abstract || secondary.abstract,
    keywords:
      preferred.keywords && preferred.keywords.length > 0 ? preferred.keywords : (secondary.keywords ?? []),
    authors: preferred.authors.length > 0 ? preferred.authors : secondary.authors
  };
};

export const dedupeCandidates = (candidates: PaperCandidate[]) => {
  const map = new Map<string, PaperCandidate>();

  for (const candidate of candidates) {
    if (!candidate.title && !candidate.url && !candidate.doi) {
      continue;
    }

    const key = getDedupeKey(candidate);
    const existing = map.get(key);
    map.set(key, existing ? mergeCandidates(existing, candidate) : candidate);
  }

  return [...map.values()];
};

export const buildExistingPaperMap = (papers: PaperRecord[]) => {
  const map = new Map<string, PaperRecord>();
  for (const paper of papers) {
    map.set(getDedupeKey(paper), paper);
  }

  return map;
};
