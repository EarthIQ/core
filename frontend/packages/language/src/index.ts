// Core
export { createLanguage } from "./create-language";

// Types
export type {
  CurrencyFormatOptions,
  DateFormatOptions,
  InterpolationValues,
  LanguageConfig,
  LanguageInstance,
  Locale,
  NestedKeyOf,
  NestedTranslations,
  NumberFormatOptions,
  PluralRule,
  PluralTranslation,
  TranslateFunction,
  TranslateOptions,
  TranslationKeys,
  Translations,
  TranslationValue,
} from "./types";

// Utilities
export {
  extractInterpolationKeys,
  flattenTranslations,
  formatBytes,
  formatCurrency,
  formatDate,
  formatList,
  formatNumber,
  formatRelativeTime,
  getNestedTranslations,
  getNestedValue,
  getPluralRule,
  interpolate,
  isPluralTranslation,
  parsePluralString,
  pluralize,
} from "./utils";