import { Link } from 'react-router-dom';

import { useLocale } from '../providers/LocaleProvider';

export const NotFoundPage = () => {
  const { t } = useLocale();

  return (
    <div className="state-card">
      <h2>404</h2>
      <p>{t.noPaper}</p>
      <Link className="ghost-button" to="/">
        {t.backHome}
      </Link>
    </div>
  );
};
