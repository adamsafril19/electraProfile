import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';

export type Locale = 'id' | 'en';

interface LanguageContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  t: (idText: string, enText: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'id',
  setLocale: () => {},
  toggleLocale: () => {},
  t: (idText, _) => idText,
});

const STORAGE_KEY = 'electra_preferred_locale';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>('id');

  useEffect(() => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
        if (saved === 'id' || saved === 'en') {
          setLocaleState(saved);
        }
      } catch (e) {
        // ignore storage errors
      }
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, l);
      } catch (e) {
        // ignore
      }
    }
  };

  const toggleLocale = () => {
    setLocale(locale === 'id' ? 'en' : 'id');
  };

  const t = (idText: string, enText: string): string => {
    return locale === 'en' ? enText : idText;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
