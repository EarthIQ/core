import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { LanguageContext, type LanguageContextValue } from "./context";
import { createLanguage } from "./create-language";
import type { LanguageConfig, Translations } from "./types";

export interface LanguageProviderProps<T extends Translations> {
  children: ReactNode;
  config: LanguageConfig<T>;
  initialLocale?: keyof T & string;
  persistKey?: string;
  onLocaleChange?: (locale: keyof T & string) => void;
}

export function LanguageProvider<T extends Translations>({
  children,
  config,
  initialLocale,
  persistKey = "app-locale",
  onLocaleChange,
}: LanguageProviderProps<T>): ReactNode {
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocale, setCurrentLocale] = useState<keyof T & string>(
    initialLocale || config.defaultLocale
  );

  const language = useMemo(() => {
    return createLanguage({
      ...config,
      onLocaleChange: (locale) => {
        config.onLocaleChange?.(locale);
      },
    });
  }, [config]);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    const stored = localStorage.getItem(persistKey);

    if (stored && language.locales.includes(stored as keyof T & string)) {
      setCurrentLocale(stored as keyof T & string);
      language.setLocale(stored as keyof T & string);
    }

    setIsLoading(false);
  }, [language, persistKey]);

  const handleSetLocale = useCallback(
    (locale: keyof T & string) => {
      setCurrentLocale(locale);
      language.setLocale(locale);

      if (typeof window !== "undefined") {
        localStorage.setItem(persistKey, locale);
      }

      onLocaleChange?.(locale);
    },
    [language, persistKey, onLocaleChange]
  );

  const contextValue = useMemo<LanguageContextValue<T>>(
    () => ({
      ...language,
      locale: currentLocale,
      setLocale: handleSetLocale,
      isLoading,
    }),
    [language, currentLocale, handleSetLocale, isLoading]
  );

  return (
    <LanguageContext.Provider value={contextValue as unknown as LanguageContextValue}>
      {children}
    </LanguageContext.Provider>
  );
}