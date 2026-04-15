import type { JournalSummary } from '../types/data';

import { TIME_FILTERS } from '../lib/constants';
import type { FilterState, TimeFilter } from '../lib/filters';
import { useLocale } from '../providers/LocaleProvider';

interface FiltersProps {
  journals: JournalSummary[];
  filters: FilterState;
  onChange: (next: FilterState) => void;
  keywordOptions: string[];
}

const timeLabel = (value: TimeFilter, locale: 'zh' | 'en') => {
  if (value === '7d') {
    return locale === 'zh' ? '\u6700\u8fd1 7 \u5929' : 'Last 7 days';
  }

  if (value === '30d') {
    return locale === 'zh' ? '\u6700\u8fd1 30 \u5929' : 'Last 30 days';
  }

  if (value === '180d') {
    return locale === 'zh' ? '\u6700\u8fd1\u534a\u5e74' : 'Last 6 months';
  }

  return locale === 'zh' ? '\u5168\u90e8\u65f6\u95f4' : 'All time';
};

export const Filters = ({ journals, filters, onChange, keywordOptions }: FiltersProps) => {
  const { locale, t } = useLocale();

  return (
    <section className="filter-panel">
      <div className="filter-grid">
        <label>
          <span>{t.searchAndFilter}</span>
          <input
            value={filters.search}
            placeholder={t.searchPlaceholder}
            onChange={(event) =>
              onChange({
                ...filters,
                search: event.target.value
              })
            }
          />
        </label>

        <label>
          <span>{t.journals}</span>
          <select
            value={filters.journalSlug}
            onChange={(event) =>
              onChange({
                ...filters,
                journalSlug: event.target.value
              })
            }
          >
            <option value="">{t.allJournals}</option>
            {journals.map((journal) => (
              <option key={journal.slug} value={journal.slug}>
                {journal.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>{t.publishedAt}</span>
          <select
            value={filters.timeFilter}
            onChange={(event) =>
              onChange({
                ...filters,
                timeFilter: event.target.value as TimeFilter
              })
            }
          >
            {TIME_FILTERS.map((timeFilter) => (
              <option key={timeFilter} value={timeFilter}>
                {timeLabel(timeFilter, locale)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="keyword-filter">
        <span>{t.keywords}</span>
        <div className="chip-row">
          {keywordOptions.slice(0, 10).map((keyword) => (
            <button
              key={keyword}
              className={filters.keyword === keyword ? 'chip chip-active' : 'chip'}
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  keyword: filters.keyword === keyword ? '' : keyword
                })
              }
            >
              {keyword}
            </button>
          ))}

          {filters.keyword ? (
            <button
              className="chip chip-muted"
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  keyword: ''
                })
              }
            >
              {t.clearKeyword}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
};
