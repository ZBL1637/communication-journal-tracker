import fs from 'node:fs/promises';
import path from 'node:path';

import { dataDir, loadJournalsConfig, loadRuntimeConfig, papersDir } from './config.js';
import { enrichCandidateWithAi } from './ai.js';
import { enrichCandidateFromCrossrefDoi, fetchCrossrefCandidates } from './crossref.js';
import { buildExistingPaperMap, dedupeCandidates, getDedupeKey } from './dedupe.js';
import { enrichCandidateFromDetailPage } from './detail.js';
import { ensureDir, readJson, writeJson } from './fs.js';
import { logger } from './logger.js';
import { enrichCandidateFromOpenAlexDoi } from './openalex.js';
import { fetchRssCandidates } from './rss.js';
import { fetchTocCandidates } from './toc.js';
import { buildTrends } from './trends.js';
import type {
  JournalConfig,
  JournalSummary,
  ManifestData,
  PaperCandidate,
  PaperIndexItem,
  PaperRecord,
  PipelineOptions,
  PipelineSummary
} from './types.js';
import {
  buildPaperId,
  cleanAuthors,
  detectLanguage,
  hasKeywords,
  hasMeaningfulAbstract,
  isNoisyAuthors,
  mapWithConcurrency,
  mergeUniqueStrings,
  normalizeAbstractText,
  normalizeDoi,
  normalizeWhitespace,
  sortPapersDesc
} from './utils.js';

const manifestPath = path.join(dataDir, 'manifest.json');
const journalsOutputPath = path.join(dataDir, 'journals.json');
const trendsOutputPath = path.join(dataDir, 'trends.json');
const papersIndexPath = path.join(papersDir, 'index.json');

const loadExistingPapers = async () => {
  const index = await readJson<PaperIndexItem[]>(papersIndexPath, []);
  const existingRecords: PaperRecord[] = [];

  for (const item of index) {
    const filePath = path.join(papersDir, `${item.id}.json`);
    const detail = await readJson<PaperRecord | null>(filePath, null);
    if (detail) {
      existingRecords.push(detail);
    }
  }

  return existingRecords;
};

const DETAIL_SCRAPE_BLOCKLIST = ['tandfonline.com'];
const OPENALEX_ENRICHMENT_JOURNALS = new Set(['digital-journalism', 'political-communication']);

const shouldFetchCrossrefDoi = (candidate: PaperCandidate) =>
  Boolean(candidate.doi) &&
  candidate.source.type !== 'crossref' &&
  (!hasMeaningfulAbstract(candidate.abstract) || !hasKeywords(candidate.keywords) || isNoisyAuthors(candidate.authors));

const shouldFetchOpenAlex = (candidate: PaperCandidate) =>
  Boolean(candidate.doi) &&
  OPENALEX_ENRICHMENT_JOURNALS.has(candidate.journalSlug) &&
  (!hasMeaningfulAbstract(candidate.abstract) || !hasKeywords(candidate.keywords) || isNoisyAuthors(candidate.authors));

const shouldFetchDetail = (candidate: PaperCandidate) => {
  if (!candidate.url) {
    return false;
  }

  let host = '';
  try {
    host = new URL(candidate.url).hostname.toLowerCase();
  } catch {
    host = '';
  }

  if (DETAIL_SCRAPE_BLOCKLIST.some((domain) => host.includes(domain))) {
    return false;
  }

  if (candidate.source.type === 'toc') {
    return true;
  }

  return !hasMeaningfulAbstract(candidate.abstract) || isNoisyAuthors(candidate.authors) || !hasKeywords(candidate.keywords);
};

const isIgnoredTitle = (title: string) => {
  const normalized = title.trim().toLowerCase();
  return (
    normalized === '' ||
    normalized === 'pdf' ||
    normalized === 'correction' ||
    normalized === 'corrigendum' ||
    normalized === 'erratum' ||
    normalized === 'retraction' ||
    normalized === 'issue information' ||
    normalized.startsWith('correction to:') ||
    normalized.startsWith('corrigendum to:') ||
    normalized.startsWith('erratum to:') ||
    normalized.startsWith('retraction to:') ||
    normalized.startsWith('book review:') ||
    normalized === 'thanks to reviewers'
  );
};

const resolveSourceTasks = (
  journal: JournalConfig,
  options: PipelineOptions,
  runtime: ReturnType<typeof loadRuntimeConfig>
) => {
  const tasks: Array<Promise<PaperCandidate[]>> = [];

  if (journal.sourceType === 'rss' || journal.sourceType === 'hybrid') {
    tasks.push(fetchRssCandidates(journal, runtime, options.limitPerJournal));
  }

  if (journal.sourceType === 'toc' || journal.sourceType === 'hybrid') {
    tasks.push(fetchTocCandidates(journal, runtime, options.limitPerJournal));
  }

  if (journal.sourceType === 'crossref' || journal.sourceType === 'hybrid') {
    tasks.push(fetchCrossrefCandidates(journal, runtime, options.daysBack, options.limitPerJournal));
  }

  return tasks.length > 0 ? tasks : [Promise.resolve([])];
};

const collectCandidatesForJournal = async (
  journal: JournalConfig,
  options: PipelineOptions,
  runtime = loadRuntimeConfig()
) => {
  const results = await Promise.all(resolveSourceTasks(journal, options, runtime));
  return dedupeCandidates(results.flat());
};

const materializeRecord = async (
  candidate: PaperCandidate,
  runtime = loadRuntimeConfig()
): Promise<PaperRecord | null> => {
  const withCrossref = shouldFetchCrossrefDoi(candidate)
    ? await enrichCandidateFromCrossrefDoi(candidate, runtime)
    : candidate;
  const withOpenAlex = shouldFetchOpenAlex(withCrossref)
    ? await enrichCandidateFromOpenAlexDoi(withCrossref, runtime)
    : withCrossref;
  const withDetail = shouldFetchDetail(withOpenAlex)
    ? await enrichCandidateFromDetailPage(withOpenAlex, runtime)
    : withOpenAlex;

  const rawTitle = normalizeWhitespace(withDetail.title);
  const rawAbstract = normalizeAbstractText(withDetail.abstract);
  if (isIgnoredTitle(rawTitle) || (!rawTitle && !withDetail.url)) {
    return null;
  }

  const language = detectLanguage(rawTitle, rawAbstract);
  const finalized = await enrichCandidateWithAi(
    {
      ...withDetail,
      language,
      authors: cleanAuthors(withDetail.authors)
    },
    runtime
  );

  const paperId = buildPaperId(withDetail);
  const sourceParts: string[] = [withDetail.source.type];
  if (withDetail.source.openAlexFetched) {
    sourceParts.push('openalex');
  }
  if (withDetail.source.detailFetched) {
    sourceParts.push('detail');
  }

  return {
    id: paperId,
    doi: normalizeDoi(withDetail.doi),
    url: withDetail.url ?? '',
    journalName: withDetail.journalName,
    journalSlug: withDetail.journalSlug,
    issn: withDetail.issn,
    publishedAt: withDetail.publishedAt || new Date().toISOString(),
    authors: cleanAuthors(withDetail.authors),
    source: sourceParts.join('+'),
    fetchedAt: new Date().toISOString(),
    language,
    raw_title: rawTitle,
    raw_abstract: rawAbstract,
    raw_keywords: withDetail.keywords ?? [],
    ...finalized
  };
};

const buildJournalSummaries = (journals: JournalConfig[], papers: PaperRecord[]): JournalSummary[] =>
  journals.map((journal) => {
    const matched = papers.filter((paper) => paper.journalSlug === journal.slug);
    const latest = sortPapersDesc(matched)[0];
    const topKeywordsEn = mergeUniqueStrings(
      ...matched.map((paper) => paper.keywords_en.concat(paper.inferred_keywords_en))
    ).slice(0, 5);
    const topKeywordsZh = mergeUniqueStrings(
      ...matched.map((paper) => paper.keywords_zh.concat(paper.inferred_keywords_zh))
    ).slice(0, 5);

    return {
      ...journal,
      paperCount: matched.length,
      latestPublishedAt: latest?.publishedAt ?? null,
      topKeywordsEn,
      topKeywordsZh
    };
  });

const buildManifest = (mode: PipelineOptions['mode'], papersCount: number, journalsCount: number): ManifestData => ({
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  mode,
  papersCount,
  journalsCount,
  paths: {
    journals: '/data/journals.json',
    trends: '/data/trends.json',
    papersIndex: '/data/papers/index.json',
    paperDetailsBase: '/data/papers'
  }
});

const buildIndex = (papers: PaperRecord[]): PaperIndexItem[] =>
  papers.map((paper) => ({
    id: paper.id,
    doi: paper.doi,
    url: paper.url,
    journalName: paper.journalName,
    journalSlug: paper.journalSlug,
    issn: paper.issn,
    publishedAt: paper.publishedAt,
    authors: paper.authors,
    title_en: paper.title_en,
    title_zh: paper.title_zh,
    keywords_en: paper.keywords_en,
    keywords_zh: paper.keywords_zh,
    inferred_keywords_en: paper.inferred_keywords_en,
    inferred_keywords_zh: paper.inferred_keywords_zh,
    plain_summary_zh: paper.plain_summary_zh,
    plain_summary_en: paper.plain_summary_en,
    research_direction_zh: paper.research_direction_zh,
    research_direction_en: paper.research_direction_en,
    method_tags_zh: paper.method_tags_zh,
    method_tags_en: paper.method_tags_en,
    source: paper.source,
    fetchedAt: paper.fetchedAt
  }));

const dedupeExisting = (existing: PaperRecord[], incoming: PaperRecord[]) => {
  const map = new Map<string, PaperRecord>();

  for (const paper of existing) {
    map.set(getDedupeKey(paper), paper);
  }

  for (const paper of incoming) {
    map.set(getDedupeKey(paper), paper);
  }

  return [...map.values()];
};

export const runPipeline = async (options: PipelineOptions): Promise<PipelineSummary> => {
  const runtime = loadRuntimeConfig();
  const allJournals = await loadJournalsConfig();
  const journals = options.journalSlugs?.length
    ? allJournals.filter((journal) => options.journalSlugs?.includes(journal.slug))
    : allJournals;

  const existing = options.mode === 'incremental' ? await loadExistingPapers() : [];
  const existingMap = buildExistingPaperMap(existing);
  const allCandidates: PaperCandidate[] = [];
  const newRecords: PaperRecord[] = [];

  logger.section(`Running ${options.mode} pipeline for ${journals.length} journals`);

  for (const journal of journals) {
    logger.info(`Collecting candidates for ${journal.name}`);
    const candidates = await collectCandidatesForJournal(journal, options, runtime);
    allCandidates.push(...candidates);

    const journalRecords = await mapWithConcurrency(candidates, runtime.maxConcurrency, async (candidate) => {
      if (options.mode === 'incremental' && existingMap.has(getDedupeKey(candidate))) {
        return null;
      }

      return materializeRecord(candidate, runtime);
    });

    for (const record of journalRecords) {
      if (record) {
        newRecords.push(record);
      }
    }
  }

  const allPapers = sortPapersDesc(options.mode === 'bootstrap' ? newRecords : dedupeExisting(existing, newRecords));
  const journalSummaries = buildJournalSummaries(allJournals, allPapers);
  const trends = buildTrends(allPapers, allJournals);
  const manifest = buildManifest(options.mode, allPapers.length, allJournals.length);
  const index = buildIndex(allPapers);
  const activePaperFiles = new Set(allPapers.map((paper) => `${paper.id}.json`).concat('index.json'));

  await ensureDir(papersDir);
  await Promise.all([
    writeJson(manifestPath, manifest),
    writeJson(journalsOutputPath, journalSummaries),
    writeJson(trendsOutputPath, trends),
    writeJson(papersIndexPath, index)
  ]);

  for (const paper of allPapers) {
    await writeJson(path.join(papersDir, `${paper.id}.json`), paper);
  }

  if (options.mode === 'bootstrap') {
    const currentFiles = await fs.readdir(papersDir).catch(() => []);
    const staleFiles = currentFiles.filter((fileName) => fileName.endsWith('.json') && !activePaperFiles.has(fileName));

    await Promise.all(staleFiles.map((fileName) => fs.rm(path.join(papersDir, fileName), { force: true })));
  }

  logger.info(`Wrote ${allPapers.length} paper records`);

  return {
    generatedAt: new Date().toISOString(),
    mode: options.mode,
    totalCandidates: allCandidates.length,
    newPapers: newRecords.length,
    totalPapersAfterWrite: allPapers.length
  };
};
