import { useLocale } from '../providers/LocaleProvider';

export const LanguageToggle = () => {
  const { locale, setLocale } = useLocale();

  return (
    <div className="language-toggle" role="group" aria-label="Language toggle">
      <button
        className={locale === 'zh' ? 'active' : ''}
        type="button"
        onClick={() => setLocale('zh')}
      >
        {'\u4e2d\u6587'}
      </button>
      <button
        className={locale === 'en' ? 'active' : ''}
        type="button"
        onClick={() => setLocale('en')}
      >
        EN
      </button>
    </div>
  );
};
