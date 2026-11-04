import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';
import { getSavedLanguage, getTranslation, changeLanguage } from '../utils/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => getSavedLanguage());

  const setLanguage = (lang: Language) => {
    const updatedLang = changeLanguage(lang);
    setLanguageState(updatedLang);
    localStorage.setItem('dbuy_lang', updatedLang);
    
    // Dispatch event to synchronize with other contexts/components
    window.dispatchEvent(new CustomEvent('languageChange', { detail: updatedLang }));
  };

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const newLang = customEvent.detail;
      setLanguageState(newLang);
    };

    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      changeLanguage(language);
    }
  }, [language]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    return getTranslation(language, key, params);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
