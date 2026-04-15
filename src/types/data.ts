export interface PaperRecord {
  id: string;
  doi: string;
  url: string;
  journalName: string;
  journalSlug: string;
  issn: string;
  publishedAt: string;
  authors: string[];
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
  source: string;
  fetchedAt: string;
  language: 'en' | 'zh' | 'mixed' | 'unknown';
  raw_title: string;
  raw_abstract: string;
  raw_keywords: string[];
}

export type PaperIndexItem = Omit<PaperRecord, 'abstract_en' | 'abstract_zh' | 'language' | 'raw_title' | 'raw_abstract' | 'raw_keywords'>;

export interface JournalSummary {
  name: string;
  slug: string;
  issn: string;
  publisher: string;
  homepage: string;
  tocUrl: string;
  rssUrl: string;
  sourceType: string;
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
  mode: 'bootstrap' | 'incremental' | 'sample';
  papersCount: number;
  journalsCount: number;
  paths: {
    journals: string;
    trends: string;
    papersIndex: string;
    paperDetailsBase: string;
  };
}
