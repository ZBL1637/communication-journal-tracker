import { useMemo, useState } from 'react';

import { EmptyState, ErrorState, LoadingState } from '../components/DataState';
import { Filters } from '../components/Filters';
import { Pagination } from '../components/Pagination';
import { PaperCard } from '../components/PaperCard';
import { StatsStrip } from '../components/StatsStrip';
import { DEFAULT_PAGE_SIZE } from '../lib/constants';
import { filterPapers, type FilterState } from '../lib/filters';
import { useLocale } from '../providers/LocaleProvider';
import { useShellData } from '../components/AppShell';

const initialFilters: FilterState = {
  search: '',
  journalSlug: '',
  timeFilter: 'all',
  keyword: ''
};

export const HomePage = () => {
  const siteData = useShellData();
  const { locale, t } = useLocale();
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [page, setPage] = useState(1);

  const filteredPapers = useMemo(
    () => filterPapers(siteData.papers, filters, locale),
    [filters, locale, siteData.papers]
  );

  const keywordOptions = useMemo(
    () =>
      (locale === 'zh'
        ? siteData.trends?.high_frequency_keywords.map((item) => item.label_zh)
        : siteData.trends?.high_frequency_keywords.map((item) => item.label_en)) ?? [],
    [locale, siteData.trends]
  );

  const pageCount = Math.max(1, Math.ceil(filteredPapers.length / DEFAULT_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginated = filteredPapers.slice((currentPage - 1) * DEFAULT_PAGE_SIZE, currentPage * DEFAULT_PAGE_SIZE);

  if (siteData.isLoading) {
    return <LoadingState />;
  }

  if (siteData.error) {
    return <ErrorState message={siteData.error} onRetry={siteData.reload} />;
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <p className="eyebrow">{t.latestPapers}</p>
        <h2>{t.latestResearch}</h2>
        <p>{t.latestPapersDesc}</p>
      </section>

      <StatsStrip
        manifest={siteData.manifest}
        latestPaperCount={siteData.papers.length}
        journalCount={siteData.journals.length}
      />

      <Filters
        journals={siteData.journals}
        filters={filters}
        keywordOptions={keywordOptions}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
      />

      {paginated.length === 0 ? (
        <EmptyState title={t.emptyTitle} body={t.emptyBody} />
      ) : (
        <section className="paper-grid">
          {paginated.map((paper) => (
            <PaperCard key={paper.id} paper={paper} />
          ))}
        </section>
      )}

      <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
};
