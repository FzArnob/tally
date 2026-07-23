import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { translations, type LangCode, type Translation } from './translations';
import { getCookie, setCookie } from '../lib/cookies';
import {
  formatCurrency as fmtCurrency,
  formatNumber as fmtNumber,
  formatSignedCurrency as fmtSigned,
  formatTimeFull as fmtTime,
  formatTimeShort as fmtTimeShort,
  localizeDigits as locDigits,
} from '../lib/format';

interface LanguageContextValue {
  lang: LangCode;
  setLang: (code: LangCode) => void;
  t: Translation;
  locale: string;
  formatCurrency: (value: number | string | null | undefined) => string;
  formatSignedCurrency: (value: number) => string;
  formatNumber: (value: number | string | null | undefined) => string;
  formatTimeFull: (value: Date | string | null | undefined) => string;
  formatTimeShort: (value: Date | string | null | undefined) => string;
  localizeDigits: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const COOKIE_KEY = 'selectedLanguage';

function initialLang(): LangCode {
  const saved = getCookie(COOKIE_KEY);
  return saved === 'bn' || saved === 'en' ? saved : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(initialLang);

  const setLang = useCallback((code: LangCode) => {
    setLangState(code);
    setCookie(COOKIE_KEY, code);
  }, []);

  const t = translations[lang];
  const locale = t.numberFormat;

  // Keep the document language + title in sync with the selection.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.pageTitle;
  }, [lang, t.pageTitle]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      t,
      locale,
      formatCurrency: (v) => fmtCurrency(v, locale),
      formatSignedCurrency: (v) => fmtSigned(v, locale),
      formatNumber: (v) => fmtNumber(v, locale),
      formatTimeFull: (v) => fmtTime(v, locale),
      formatTimeShort: (v) => fmtTimeShort(v, locale),
      localizeDigits: (s) => locDigits(s, locale),
    }),
    [lang, setLang, t, locale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useI18n must be used within a LanguageProvider');
  return ctx;
}
