import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import type { FrequencyItem, TrendSnapshot, TrendsData } from '../types/data';

import { useLocale } from '../providers/LocaleProvider';

const chartData = (items: FrequencyItem[], locale: 'zh' | 'en') =>
  items.map((item) => ({
    name: locale === 'zh' ? item.label_zh : item.label_en,
    count: item.count
  }));

export const TrendCharts = ({ trends }: { trends: TrendsData }) => {
  const { locale, t } = useLocale();
  const snapshot = trends.snapshots[1] ?? trends.snapshots[0];

  if (!snapshot) {
    return null;
  }

  return (
    <section className="chart-grid">
      <ChartCard
        title={t.keywords}
        items={snapshot.high_frequency_keywords}
        locale={locale}
      />
      <ChartCard
        title={t.methods}
        items={snapshot.high_frequency_methods}
        locale={locale}
      />
    </section>
  );
};

const ChartCard = ({
  title,
  items,
  locale
}: {
  title: string;
  items: FrequencyItem[];
  locale: 'zh' | 'en';
}) => (
  <div className="chart-card">
    <h3>{title}</h3>
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData(items, locale)} layout="vertical" margin={{ left: 8, right: 16 }}>
          <XAxis type="number" allowDecimals={false} stroke="#6e7888" />
          <YAxis type="category" dataKey="name" width={120} stroke="#6e7888" />
          <Tooltip />
          <Bar dataKey="count" fill="#2f5671" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export const TrendSnapshotCards = ({ snapshots }: { snapshots: TrendSnapshot[] }) => {
  const { locale } = useLocale();

  return (
    <div className="trend-snapshot-grid">
      {snapshots.map((snapshot) => (
        <article key={snapshot.key} className="trend-card">
          <div className="trend-card-header">
            <h3>{locale === 'zh' ? snapshot.label_zh : snapshot.label_en}</h3>
            <span>{snapshot.paperCount}</span>
          </div>
          <p>{locale === 'zh' ? snapshot.overview_zh : snapshot.overview_en}</p>
          <div className="chip-row">
            {(locale === 'zh' ? snapshot.hot_topics_zh : snapshot.hot_topics_en).map((topic) => (
              <span key={topic} className="chip">
                {topic}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
};
