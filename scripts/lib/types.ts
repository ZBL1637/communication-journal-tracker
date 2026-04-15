export type JournalSourceType = 'rss' | 'toc' | 'crossref' | 'hybrid';
export type SupportedLanguage = 'en' | 'zh' | 'mixed' | 'unknown';
export type SourceKind = 'rss' | 'toc' | 'crossref';
export type PipelineMode = 'bootstrap' | 'incremental';

export interface JournalConfig {
  name: string;
  slug: string;
  issn: string;
  publisher: string;
  homepage: string;
  tocUrl: string;
  rssUrl: string;
  sourceType: JournalSourceType;
  tocArticleSelectors?: string[];
}

export interface PaperSourceMeta {
  type: SourceKind;
  label: string;
  url: string;
  detailFetched: boolean;
}

export interface PaperCandidate {
  doi?: string;
  url?: string;
  journalName: string;
  journalSlug: string;
  issn: string;
  publishedAt?: string;
  authors: string[];
  title?: string;
  abstract?: string;
  keywords?: string[];
  language?: SupportedLanguage;
  source: PaperSourceMeta;
}

export interface BilingualEnrichment {
  title_en: string;
  title_zh: string;
  abstract_en: string;
  abstract_zh: string;
  keywords_en: string[];
  keywords_zh: string[];
  inferred_keywords_en: string[];
  inferred_keywords_zh: string[];
  plain_summary_zh: string;
  plain_summary_en: string;
  research_direction_zh: string;
  research_direction_en: string;
  method_tags_zh: string[];
  method_tags_en: string[];
}

export interface PaperRecord extends BilingualEnrichment {
  id: string;
  doi: string;
  url: string;
  journalName: string;
  journalSlug: string;
  issn: string;
  publishedAt: string;
  authors: string[];
  source: string;
  fetchedAt: string;
  language: SupportedLanguage;
  raw_title: string;
  raw_abstract: string;
  raw_keywords: string[];
}

export interface PaperIndexItem
  extends Pick<
    PaperRecord,
    | 'id'
    | 'doi'
    | 'url'
    | 'journalName'
    | 'journalSlug'
    | 'issn'
    | 'publishedAt'
    | 'authors'
    | 'title_en'
    | 'title_zh'
    | 'keywords_en'
    | 'keywords_zh'
    | 'inferred_keywords_en'
    | 'inferred_keywords_zh'
    | 'plain_summary_zh'
    | 'plain_summary_en'
    | 'research_direction_zh'
    | 'research_direction_en'
    | 'method_tags_zh'
    | 'method_tags_en'
    | 'source'
    | 'fetchedAt'
  > {}

export interface JournalSummary extends JournalConfig {
  paperCount: number;
  latestPublishedAt: string | null;
  topKeywordsEn: string[];
  topKeywordsZh: string[];
}

export interface FrequencyItem {
  label_en: string;
  label_zh: string;
  count: number;
}

export interface TrendSnapshot {
  key: '7d' | '30d' | '180d';
  label_en: string;
  label_zh: string;
  paperCount: number;
  overview_en: string;
  overview_zh: string;
  hot_topics_en: string[];
  hot_topics_zh: string[];
  high_frequency_keywords: FrequencyItem[];
  high_frequency_methods: FrequencyItem[];
}

export interface JournalBiasItem {
  journalName: string;
  journalSlug: string;
  paperCount: number;
  topic_bias_en: string[];
  topic_bias_zh: string[];
  method_bias_en: string[];
  method_bias_zh: string[];
}

export interface TrendsData {
  generatedAt: string;
  snapshots: TrendSnapshot[];
  journal_bias: JournalBiasItem[];
  high_frequency_keywords: FrequencyItem[];
  high_frequency_methods: FrequencyItem[];
}

export interface ManifestData {
  schemaVersion: number;
  generatedAt: string;
  mode: PipelineMode | 'sample';
  papersCount: number;
  journalsCount: number;
  paths: {
    journals: string;
    trends: string;
    papersIndex: string;
    paperDetailsBase: string;
  };
}

export interface RuntimeConfig {
  openAiApiKey?: string;
  openAiBaseUrl: string;
  openAiModel: string;
  userAgent: string;
  requestTimeoutMs: number;
  maxConcurrency: number;
}

export interface PipelineOptions {
  mode: PipelineMode;
  daysBack: number;
  limitPerJournal?: number;
  journalSlugs?: string[];
}

export interface PipelineSummary {
  generatedAt: string;
  mode: PipelineMode;
  totalCandidates: number;
  newPapers: number;
  totalPapersAfterWrite: number;
}
