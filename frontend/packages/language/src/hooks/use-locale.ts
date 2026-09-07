import { useContext } from "react";

import { LanguageContext } from "../context";

import type { Translations } from "../types";

export interface UseLocaleReturn<T extends Translations = Translations> {
  locale: keyof T & string;
  locales: (keyof T & string)[];
  setLocale: (locale: keyof T & string) => void;
  isLoading: boolean;
}

export function useLocale<
  T extends Translations = Translations,
>(): UseLocaleReturn<T> {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLocale must be used within a LanguageProvider");
  }

  const { locale, locales, setLocale, isLoading = false } = context;

  return {
    locale: locale,
    locales: locales,
    setLocale: setLocale,
    isLoading,
  };
}