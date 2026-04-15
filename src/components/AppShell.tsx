import { NavLink, Outlet, useOutletContext } from 'react-router-dom';

import { APP_TITLE_EN, APP_TITLE_ZH } from '../lib/constants';
import { useSiteData } from '../hooks/useSiteData';
import { useLocale } from '../providers/LocaleProvider';
import { JournalBadge } from './JournalBadge';
import { LanguageToggle } from './LanguageToggle';

type ShellContext = ReturnType<typeof useSiteData>;

export const AppShell = () => {
  const siteData = useSiteData();
  const { locale, t } = useLocale();
  const footerText =
    locale === 'zh'
      ? '\u9759\u6001\u7ad9\u70b9 + GitHub Actions \u81ea\u52a8\u66f4\u65b0\uff0c\u9002\u5408\u957f\u671f\u7ef4\u62a4\u3002'
      : 'Static site + GitHub Actions updates, designed for long-term use.';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <p className="brand-kicker">{locale === 'zh' ? APP_TITLE_ZH : APP_TITLE_EN}</p>
          <h1>{t.latestResearch}</h1>
        </div>

        <nav className="top-nav">
          <NavLink to="/">{t.home}</NavLink>
          <NavLink to="/trends">{t.trends}</NavLink>
        </nav>

        <LanguageToggle />
      </header>

      <section className="journal-strip">
        {siteData.journals.slice(0, 6).map((journal) => (
          <JournalBadge key={journal.slug} journal={journal} />
        ))}
      </section>

      <main className="page-shell">
        <Outlet context={siteData} />
      </main>

      <footer className="app-footer">
        <p>{footerText}</p>
      </footer>
    </div>
  );
};

export const useShellData = () => useOutletContext<ShellContext>();
