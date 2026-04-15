import type { ManifestData } from '../types/data';

import { useLocale } from '../providers/LocaleProvider';

export const StatsStrip = ({
  manifest,
  latestPaperCount,
  journalCount
}: {
  manifest: ManifestData | null;
  latestPaperCount: number;
  journalCount: number;
}) => {
  const { t, locale } = useLocale();
  const formattedDate = manifest
    ? new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(manifest.generatedAt))
    : '--';

  return (
    <div className="stats-strip">
      <div>
        <span>{t.totalPapers}</span>
        <strong>{manifest?.papersCount ?? latestPaperCount}</strong>
      </div>
      <div>
        <span>{t.trackedJournals}</span>
        <strong>{journalCount}</strong>
      </div>
      <div>
        <span>{t.generatedAt}</span>
        <strong>{formattedDate}</strong>
      </div>
    </div>
  );
};
