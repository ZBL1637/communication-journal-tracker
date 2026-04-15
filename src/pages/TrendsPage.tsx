import { EmptyState, ErrorState, LoadingState } from '../components/DataState';
import { useShellData } from '../components/AppShell';
import { TrendCharts, TrendSnapshotCards } from '../components/TrendCharts';
import { useLocale } from '../providers/LocaleProvider';

export const TrendsPage = () => {
  const siteData = useShellData();
  const { locale, t } = useLocale();
  const heroCopy =
    locale === 'zh'
      ? '\u4ece\u6700\u8fd1 7 \u5929\u300130 \u5929\u548c\u534a\u5e74\u4e09\u4e2a\u7a97\u53e3\uff0c\u603b\u7ed3\u4f20\u64ad\u5b66\u8bba\u6587\u91cc\u7684\u70ed\u70b9\u8bae\u9898\u3001\u7814\u7a76\u65b9\u6cd5\u548c\u671f\u520a\u504f\u5411\u3002'
      : 'Summaries of the hottest themes, methods, and journal-specific emphases across 7-day, 30-day, and 6-month windows.';

  if (siteData.isLoading) {
    return <LoadingState />;
  }

  if (siteData.error) {
    return <ErrorState message={siteData.error} onRetry={siteData.reload} />;
  }

  if (!siteData.trends) {
    return <EmptyState title={t.emptyTitle} body={t.emptyBody} />;
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <p className="eyebrow">{t.recentTrends}</p>
        <h2>{t.recentTrends}</h2>
        <p>{heroCopy}</p>
      </section>

      <TrendSnapshotCards snapshots={siteData.trends.snapshots} />
      <TrendCharts trends={siteData.trends} />

      <section className="journal-bias-grid">
        {siteData.trends.journal_bias.map((journal) => (
          <article key={journal.journalSlug} className="content-card">
            <h3>{journal.journalName}</h3>
            <p>
              {t.paperCount}: {journal.paperCount}
            </p>
            <div className="bias-section">
              <strong>{t.keywords}</strong>
              <div className="chip-row">
                {(locale === 'zh' ? journal.topic_bias_zh : journal.topic_bias_en).map((topic) => (
                  <span key={topic} className="chip">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
            <div className="bias-section">
              <strong>{t.methods}</strong>
              <div className="chip-row">
                {(locale === 'zh' ? journal.method_bias_zh : journal.method_bias_en).map((method) => (
                  <span key={method} className="chip chip-muted">
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};
