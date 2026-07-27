import { useContext, useMemo } from "react";

import { LanguageContext } from "../context";
import type {
  CurrencyFormatOptions,
  DateFormatOptions,
  NumberFormatOptions,
} from "../types";

export interface UseFormatReturn {
  formatDate: (
    date: Date | number | string,
    options?: DateFormatOptions
  ) => string;
  formatNumber: (value: number, options?: NumberFormatOptions) => string;
  formatCurrency: (value: number, options: CurrencyFormatOptions) => string;
  formatRelativeTime: (
    date: Date | number,
    options?: Intl.RelativeTimeFormatOptions
  ) => string;
  formatList: (items: string[], options?: Intl.ListFormatOptions) => string;
}

export function useFormat(): UseFormatReturn {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useFormat must be used within a LanguageProvider");
  }

  const {
    formatDate,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    formatList,
  } = context;

  return useMemo(
    () => ({
      formatDate,
      formatNumber,
      formatCurrency,
      formatRelativeTime,
      formatList,
    }),
    [formatDate, formatNumber, formatCurrency, formatRelativeTime, formatList]
  );
}