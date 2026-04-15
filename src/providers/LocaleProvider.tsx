import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { ReactNode } from 'react';

import type { Locale } from '../lib/i18n';
import { messages } from '../lib/i18n';

type MessageCatalog = (typeof messages)[Locale];

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: MessageCatalog;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const getDefaultLocale = (): Locale => {
  if (typeof window === 'undefined') {
    return 'zh';
  }

  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
};

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === 'undefined') {
      return 'zh';
    }

    const persisted = window.localStorage.getItem('cjt-locale') as Locale | null;
    return persisted ?? getDefaultLocale();
  });

  useEffect(() => {
    window.localStorage.setItem('cjt-locale', locale);
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: messages[locale]
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }

  return context;
};
