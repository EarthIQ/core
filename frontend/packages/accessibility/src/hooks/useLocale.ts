import { useState, useCallback, useEffect } from 'react';
import type { Locale, TranslationKey } from '../types';
import { translations } from '../constants/translations';
import { getStoredLocale } from '../utils/storage';

interface UseLocaleOptions {
  storageKey?: string;
  defaultLocale?: Locale;
}

/**
 * Hook for managing locale and translations
 */
export function useLocale(options: UseLocaleOptions = {}) {
  const { storageKey = 'app-locale', defaultLocale = 'en' } = options;

  const [locale, setLocale] = useState<Locale>(() => 
    getStoredLocale(storageKey, defaultLocale)
  );

  // Watch for locale changes in localStorage (from other tabs or components)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue && e.newValue in translations) {
        setLocale(e.newValue as Locale);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also poll for same-tab changes
    const interval = setInterval(() => {
      const stored = localStorage.getItem(storageKey);
      if (stored && stored in translations && stored !== locale) {
        setLocale(stored as Locale);
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [storageKey, locale]);

  // Translation function
  const t = useCallback((key: TranslationKey): string => {
    const translation = translations[locale]?.[key] || translations.en[key];
    if (Array.isArray(translation)) {
      return translation.join(', ');
    }
    return translation as string;
  }, [locale]);

  // Get options array for multi-level settings
  const getOptions = useCallback((key: TranslationKey): string[] => {
    const translation = translations[locale]?.[key] || translations.en[key];
    if (Array.isArray(translation)) {
      return [...translation];
    }
    return [];
  }, [locale]);

  return {
    locale,
    t,
    getOptions,
  };
}