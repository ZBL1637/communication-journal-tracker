import type {
  FrequencyItem,
  JournalBiasItem,
  JournalConfig,
  PaperRecord,
  TrendSnapshot,
  TrendsData
} from './types.js';

import { getDateDaysAgo } from './utils.js';

const buildFrequency = (
  papers: PaperRecord[],
  pickEn: (paper: PaperRecord) => string[],
  pickZh: (paper: PaperRecord) => string[],
  limit = 10
): FrequencyItem[] => {
  const map = new Map<string, FrequencyItem>();

  for (const paper of papers) {
    const english = pickEn(paper);
    const chinese = pickZh(paper);

    english.forEach((labelEn, index) => {
      const normalized = labelEn.trim();
      if (!normalized) {
        return;
      }

      const key = normalized.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, {
          label_en: normalized,
          label_zh: chinese[index] || chinese[0] || normalized,
          count: 1
        });
      }
    });
  }

  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
};

const buildOverview = (keywords: FrequencyItem[], methods: FrequencyItem[], paperCount: number) => {
  const topKeywordEn = keywords.slice(0, 3).map((item) => item.label_en).join(', ');
  const topMethodEn = methods.slice(0, 2).map((item) => item.label_en).join(', ');
  const summary = `Across ${paperCount} papers, the most visible themes are ${topKeywordEn || 'platforms, news, and public attention'}. Researchers most often rely on ${topMethodEn || 'mixed methods'} to explain what these changes mean for communication.`;

  return {
    en: summary,
    zh: summary
  };
};

const buildSnapshot = (key: TrendSnapshot['key'], papers: PaperRecord[], labelEn: string): TrendSnapshot => {
  const keywords = buildFrequency(
    papers,
    (paper) => paper.keywords_en.concat(paper.inferred_keywords_en),
    (paper) => paper.keywords_zh.concat(paper.inferred_keywords_zh)
  );

  const methods = buildFrequency(
    papers,
    (paper) => paper.method_tags_en,
    (paper) => paper.method_tags_zh
  );

  const overview = buildOverview(keywords, methods, papers.length);

  return {
    key,
    label_en: labelEn,
    label_zh: labelEn,
    paperCount: papers.length,
    overview_en: overview.en,
    overview_zh: overview.zh,
    hot_topics_en: keywords.slice(0, 5).map((item) => item.label_en),
    hot_topics_zh: keywords.slice(0, 5).map((item) => item.label_zh),
    high_frequency_keywords: keywords,
    high_frequency_methods: methods
  };
};

const buildJournalBias = (papers: PaperRecord[], journals: JournalConfig[]): JournalBiasItem[] =>
  journals
    .map((journal) => {
      const matched = papers.filter((paper) => paper.journalSlug === journal.slug);
      const keywords = buildFrequency(
        matched,
        (paper) => paper.keywords_en.concat(paper.inferred_keywords_en),
        (paper) => paper.keywords_zh.concat(paper.inferred_keywords_zh),
        4
      );
      const methods = buildFrequency(
        matched,
        (paper) => paper.method_tags_en,
        (paper) => paper.method_tags_zh,
        4
      );

      return {
        journalName: journal.name,
        journalSlug: journal.slug,
        paperCount: matched.length,
        topic_bias_en: keywords.map((item) => item.label_en),
        topic_bias_zh: keywords.map((item) => item.label_zh),
        method_bias_en: methods.map((item) => item.label_en),
        method_bias_zh: methods.map((item) => item.label_zh)
      };
    })
    .filter((item) => item.paperCount > 0);

export const buildTrends = (papers: PaperRecord[], journals: JournalConfig[]): TrendsData => {
  const now = new Date();
  const last7 = papers.filter((paper) => new Date(paper.publishedAt) >= getDateDaysAgo(7).toDate());
  const last30 = papers.filter((paper) => new Date(paper.publishedAt) >= getDateDaysAgo(30).toDate());
  const last180 = papers.filter((paper) => new Date(paper.publishedAt) >= getDateDaysAgo(180).toDate());

  return {
    generatedAt: now.toISOString(),
    snapshots: [
      buildSnapshot('7d', last7, 'Last 7 days'),
      buildSnapshot('30d', last30, 'Last 30 days'),
      buildSnapshot('180d', last180, 'Last 6 months')
    ],
    journal_bias: buildJournalBias(last180, journals),
    high_frequency_keywords: buildFrequency(
      last180,
      (paper) => paper.keywords_en.concat(paper.inferred_keywords_en),
      (paper) => paper.keywords_zh.concat(paper.inferred_keywords_zh),
      12
    ),
    high_frequency_methods: buildFrequency(
      last180,
      (paper) => paper.method_tags_en,
      (paper) => paper.method_tags_zh,
      12
    )
  };
};
