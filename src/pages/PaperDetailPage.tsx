import { Link, useParams } from 'react-router-dom';

import { EmptyState, ErrorState, LoadingState } from '../components/DataState';
import { usePaperDetail } from '../hooks/useSiteData';
import { useLocale } from '../providers/LocaleProvider';

const formatDate = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(value));

export const PaperDetailPage = () => {
  const { paperId = '' } = useParams();
  const { paper, isLoading, error, reload } = usePaperDetail(paperId);
  const { locale, t } = useLocale();
  const chineseLabel = locale === 'zh' ? '\u4e2d\u6587' : 'Chinese';

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  if (!paper) {
    return (
      <EmptyState
        title={t.noPaper}
        body={t.detailDescription}
        action={
          <Link className="ghost-button" to="/">
            {t.backHome}
          </Link>
        }
      />
    );
  }

  const originalKeywords = locale === 'zh' ? paper.keywords_zh : paper.keywords_en;
  const inferredKeywords = locale === 'zh' ? paper.inferred_keywords_zh : paper.inferred_keywords_en;
  const methods = locale === 'zh' ? paper.method_tags_zh : paper.method_tags_en;

  return (
    <div className="page-stack">
      <section className="hero-card detail-hero">
        <p className="eyebrow">{paper.journalName}</p>
        <h2>{locale === 'zh' ? paper.title_zh : paper.title_en}</h2>
        <p>{locale === 'zh' ? paper.title_en : paper.title_zh}</p>

        <div className="detail-meta">
          <span>
            <strong>{t.publishedAt}:</strong> {formatDate(paper.publishedAt, locale)}
          </span>
          <span>
            <strong>{t.authors}:</strong> {paper.authors.join(', ')}
          </span>
        </div>

        <div className="detail-links">
          {paper.doi ? (
            <a className="ghost-button" href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer">
              {t.sourceDoi}
            </a>
          ) : null}
          <a className="ghost-button" href={paper.url} target="_blank" rel="noreferrer">
            {t.sourcePaper}
          </a>
        </div>
      </section>

      <section className="detail-grid">
        <article className="content-card">
          <h3>{t.bilingualTitle}</h3>
          <div className="bilingual-block">
            <div>
              <h4>{chineseLabel}</h4>
              <p>{paper.title_zh}</p>
            </div>
            <div>
              <h4>English</h4>
              <p>{paper.title_en}</p>
            </div>
          </div>
        </article>

        <article className="content-card">
          <h3>{t.bilingualAbstract}</h3>
          <div className="bilingual-block">
            <div>
              <h4>{chineseLabel}</h4>
              <p>{paper.abstract_zh}</p>
            </div>
            <div>
              <h4>English</h4>
              <p>{paper.abstract_en}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="detail-grid">
        <article className="content-card">
          <h3>{t.originalKeywords}</h3>
          <div className="chip-row">
            {originalKeywords.length > 0 ? (
              originalKeywords.map((keyword) => (
                <span key={keyword} className="chip">
                  {keyword}
                </span>
              ))
            ) : (
              <span className="muted">[]</span>
            )}
          </div>

          <h3>{t.inferredKeywords}</h3>
          <div className="chip-row">
            {inferredKeywords.length > 0 ? (
              inferredKeywords.map((keyword) => (
                <span key={keyword} className="chip chip-muted">
                  {keyword}
                </span>
              ))
            ) : (
              <span className="muted">[]</span>
            )}
          </div>

          <h3>{t.methods}</h3>
          <div className="chip-row">
            {methods.map((method) => (
              <span key={method} className="chip chip-muted">
                {method}
              </span>
            ))}
          </div>
        </article>

        <article className="content-card">
          <h3>{t.plainSummary}</h3>
          <div className="bilingual-block">
            <div>
              <h4>{chineseLabel}</h4>
              <p>{paper.plain_summary_zh}</p>
            </div>
            <div>
              <h4>English</h4>
              <p>{paper.plain_summary_en}</p>
            </div>
          </div>

          <h3>{t.researchDirection}</h3>
          <div className="bilingual-block">
            <div>
              <h4>{chineseLabel}</h4>
              <p>{paper.research_direction_zh}</p>
            </div>
            <div>
              <h4>English</h4>
              <p>{paper.research_direction_en}</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
};
