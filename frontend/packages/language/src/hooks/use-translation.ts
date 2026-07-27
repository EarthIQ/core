import { useCallback, useContext } from "react";

import { LanguageContext } from "../context";
import type { InterpolationValues, TranslateOptions } from "../types";

export interface UseTranslationReturn {
  t: (
    key: string,
    values?: InterpolationValues,
    options?: TranslateOptions
  ) => string;
  locale: string;
  isLoading: boolean;
}

export function useTranslation(namespace?: string): UseTranslationReturn {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }

  const { t: translate, locale, isLoading = false } = context;

  const t = useCallback(
    (
      key: string,
      values?: InterpolationValues,
      options?: TranslateOptions
    ) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      return translate(fullKey, values, options);
    },
    [translate, namespace]
  );

  return {
    t,
    locale,
    isLoading,
  };
}