import type { ReactNode } from 'react';

import { useLocale } from '../providers/LocaleProvider';

export const LoadingState = () => {
  const { t } = useLocale();
  return <div className="state-card">{t.loading}</div>;
};

export const ErrorState = ({
  message,
  onRetry
}: {
  message: string;
  onRetry?: () => void;
}) => {
  const { t } = useLocale();

  return (
    <div className="state-card state-card-error">
      <h2>{t.errorTitle}</h2>
      <p>{message}</p>
      {onRetry ? (
        <button className="ghost-button" type="button" onClick={onRetry}>
          {t.retry}
        </button>
      ) : null}
    </div>
  );
};

export const EmptyState = ({
  title,
  body,
  action
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) => (
  <div className="state-card">
    <h2>{title}</h2>
    <p>{body}</p>
    {action}
  </div>
);
