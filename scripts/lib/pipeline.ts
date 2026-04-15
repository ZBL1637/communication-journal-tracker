import path from 'node:path';

import { dataDir, loadJournalsConfig, loadRuntimeConfig, papersDir } from './config.js';
import { enrichCandidateWithAi } from './ai.js';
import { fetchCrossrefCandidates } from './crossref.js';
import { buildExistingPaperMap, dedupeCandidates, getDedupeKey } from './dedupe.js';
import { enrichCandidateFromDetailPage } from './detail.js';
import { ensureDir, readJson, writeJson } from './fs.js';
import { logger } from './logger.js';
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
  mergeUniqueStrings,
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

const shouldFetchDetail = (candidate: PaperCandidate) =>
  Boolean(candidate.url) &&
  (!candidate.abstract || !candidate.keywords || candidate.keywords.length === 0 || candidate.source.type === 'toc');

const collectCandidatesForJournal = async (
  journal: JournalConfig,
  options: PipelineOptions,
  runtime = loadRuntimeConfig()
) => {
  const [rssCandidates, tocCandidates, crossrefCandidates] = await Promise.all([
    fetchRssCandidates(journal, runtime, options.limitPerJournal),
    fetchTocCandidates(journal, runtime, options.limitPerJournal),
    fetchCrossrefCandidates(journal, runtime, options.daysBack, options.limitPerJournal)
  ]);

  return dedupeCandidates([...rssCandidates, ...tocCandidates, ...crossrefCandidates]);
};

const materializeRecord = async (
  candidate: PaperCandidate,
  runtime = loadRuntimeConfig()
): Promise<PaperRecord | null> => {
  const withDetail = shouldFetchDetail(candidate)
    ? await enrichCandidateFromDetailPage(candidate, runtime)
    : candidate;

  const rawTitle = normalizeWhitespace(withDetail.title);
  const rawAbstract = normalizeWhitespace(withDetail.abstract);
  if (!rawTitle && !withDetail.url) {
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
  return {
    id: paperId,
    doi: normalizeDoi(withDetail.doi),
    url: withDetail.url ?? '',
    journalName: withDetail.journalName,
    journalSlug: withDetail.journalSlug,
    issn: withDetail.issn,
    publishedAt: withDetail.publishedAt || new Date().toISOString(),
    authors: cleanAuthors(withDetail.authors),
    source: withDetail.source.detailFetched ? `${withDetail.source.type}+detail` : withDetail.source.type,
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

    for (const candidate of candidates) {
      if (options.mode === 'incremental' && existingMap.has(getDedupeKey(candidate))) {
        continue;
      }

      const record = await materializeRecord(candidate, runtime);
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

  logger.info(`Wrote ${allPapers.length} paper records`);

  return {
    generatedAt: new Date().toISOString(),
    mode: options.mode,
    totalCandidates: allCandidates.length,
    newPapers: newRecords.length,
    totalPapersAfterWrite: allPapers.length
  };
};
