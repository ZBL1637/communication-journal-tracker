import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState, ErrorState, LoadingState } from '../components/DataState';
import { Filters } from '../components/Filters';
import { Pagination } from '../components/Pagination';
import { PaperCard } from '../components/PaperCard';
import { useShellData } from '../components/AppShell';
import { DEFAULT_PAGE_SIZE } from '../lib/constants';
import { filterPapers, type FilterState } from '../lib/filters';
import { useLocale } from '../providers/LocaleProvider';

export const JournalPage = () => {
  const { journalSlug = '' } = useParams();
  const siteData = useShellData();
  const { locale, t } = useLocale();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    journalSlug,
    timeFilter: 'all',
    keyword: ''
  });

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      journalSlug
    }));
    setPage(1);
  }, [journalSlug]);

  const journal = siteData.journals.find((item) => item.slug === journalSlug);
  const filteredPapers = useMemo(
    () => filterPapers(siteData.papers, { ...filters, journalSlug }, locale),
    [filters, journalSlug, locale, siteData.papers]
  );

  const keywordOptions = useMemo(
    () => (locale === 'zh' ? journal?.topKeywordsZh : journal?.topKeywordsEn) ?? [],
    [journal, locale]
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

  if (!journal) {
    return (
      <EmptyState
        title={t.emptyTitle}
        body={t.emptyBody}
        action={
          <Link className="ghost-button" to="/">
            {t.backHome}
          </Link>
        }
      />
    );
  }

  return (
    <div className="page-stack">
      <section className="hero-card journal-hero">
        <p className="eyebrow">{t.journalOverview}</p>
        <h2>{journal.name}</h2>
        <p>
          {journal.publisher} / ISSN {journal.issn}
        </p>
        <div className="chip-row">
          {(locale === 'zh' ? journal.topKeywordsZh : journal.topKeywordsEn).map((keyword) => (
            <span key={keyword} className="chip">
              {keyword}
            </span>
          ))}
        </div>
      </section>

      <Filters
        journals={siteData.journals}
        filters={{ ...filters, journalSlug }}
        keywordOptions={keywordOptions}
        onChange={(next) => {
          setFilters({ ...next, journalSlug });
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
