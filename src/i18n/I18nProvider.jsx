import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from './translations';

const I18nContext = createContext(null);
const STORAGE_KEY = 'artifactLogger.language';

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'en';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const value = useMemo(() => {
    const t = (key) => translations[language]?.[key] || translations.en[key] || key;
    return { language, setLanguage, t };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return ctx;
}