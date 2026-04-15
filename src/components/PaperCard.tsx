import { Link } from 'react-router-dom';

import type { PaperIndexItem } from '../types/data';

import { useLocale } from '../providers/LocaleProvider';

const formatDate = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(value));

export const PaperCard = ({ paper }: { paper: PaperIndexItem }) => {
  const { locale, t } = useLocale();
  const keywords =
    locale === 'zh'
      ? paper.keywords_zh.concat(paper.inferred_keywords_zh)
      : paper.keywords_en.concat(paper.inferred_keywords_en);
  const summary = locale === 'zh' ? paper.plain_summary_zh : paper.plain_summary_en;
  const researchDirection = locale === 'zh' ? paper.research_direction_zh : paper.research_direction_en;

  return (
    <article className="paper-card">
      <div className="paper-card-header">
        <div>
          <p className="paper-journal">{paper.journalName}</p>
          <h3>{locale === 'zh' ? paper.title_zh : paper.title_en}</h3>
        </div>
        <span className="paper-date">{formatDate(paper.publishedAt, locale)}</span>
      </div>

      <p className="paper-authors">{paper.authors.join(', ') || 'Unknown authors'}</p>
      <p className="paper-summary">{summary}</p>
      <p className="paper-direction">
        <strong>{t.researchDirection}:</strong> {researchDirection}
      </p>

      <div className="chip-row">
        {keywords.slice(0, 5).map((keyword) => (
          <span key={keyword} className="chip">
            {keyword}
          </span>
        ))}
      </div>

      <div className="paper-card-footer">
        <div className="chip-row">
          {(locale === 'zh' ? paper.method_tags_zh : paper.method_tags_en).map((tag) => (
            <span key={tag} className="chip chip-muted">
              {tag}
            </span>
          ))}
        </div>
        <Link className="primary-link" to={`/papers/${paper.id}`}>
          {t.viewDetails}
        </Link>
      </div>
    </article>
  );
};
