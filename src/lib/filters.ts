import dayjs from 'dayjs';

import type { PaperIndexItem } from '../types/data';

import type { Locale } from './i18n';

export type TimeFilter = 'all' | '7d' | '30d' | '180d';

export interface FilterState {
  search: string;
  journalSlug: string;
  timeFilter: TimeFilter;
  keyword: string;
}

const getPaperSearchIndex = (paper: PaperIndexItem) =>
  [
    paper.title_en,
    paper.title_zh,
    paper.plain_summary_en,
    paper.plain_summary_zh,
    paper.research_direction_en,
    paper.research_direction_zh,
    ...paper.keywords_en,
    ...paper.keywords_zh,
    ...paper.inferred_keywords_en,
    ...paper.inferred_keywords_zh,
    paper.journalName
  ]
    .join(' ')
    .toLowerCase();

const withinTimeWindow = (publishedAt: string, timeFilter: TimeFilter) => {
  if (timeFilter === 'all') {
    return true;
  }

  const days = timeFilter === '7d' ? 7 : timeFilter === '30d' ? 30 : 180;
  return dayjs(publishedAt).isAfter(dayjs().subtract(days, 'day'));
};

const keywordList = (paper: PaperIndexItem, locale: Locale) =>
  locale === 'zh'
    ? paper.keywords_zh.concat(paper.inferred_keywords_zh)
    : paper.keywords_en.concat(paper.inferred_keywords_en);

export const filterPapers = (papers: PaperIndexItem[], filters: FilterState, locale: Locale) => {
  const search = filters.search.trim().toLowerCase();
  const keyword = filters.keyword.trim().toLowerCase();

  return papers.filter((paper) => {
    if (filters.journalSlug && paper.journalSlug !== filters.journalSlug) {
      return false;
    }

    if (!withinTimeWindow(paper.publishedAt, filters.timeFilter)) {
      return false;
    }

    if (keyword) {
      const keywords = keywordList(paper, locale).map((item) => item.toLowerCase());
      if (!keywords.some((item) => item.includes(keyword))) {
        return false;
      }
    }

    if (!search) {
      return true;
    }

    return getPaperSearchIndex(paper).includes(search);
  });
};
