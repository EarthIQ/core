import type {
  CurrencyFormatOptions,
  DateFormatOptions,
  InterpolationValues,
  LanguageConfig,
  LanguageInstance,
  NestedTranslations,
  NumberFormatOptions,
  TranslateFunction,
  TranslateOptions,
  Translations,
} from "./types";
import {
  formatCurrency as formatCurrencyUtil,
  formatDate as formatDateUtil,
  formatList as formatListUtil,
  formatNumber as formatNumberUtil,
  formatRelativeTime as formatRelativeTimeUtil,
  getNestedTranslations as getNestedTrans,
  getNestedValue,
  interpolate,
  isPluralTranslation,
  parsePluralString,
  pluralize,
} from "./utils";

export function createLanguage<T extends Translations>(
  config: LanguageConfig<T>
): LanguageInstance<T> {
  const {
    translations,
    defaultLocale,
    fallbackLocale = defaultLocale,
    onMissingTranslation,
    onLocaleChange,
  } = config;

  let currentLocale: keyof T & string = defaultLocale;

  const locales = Object.keys(translations) as (keyof T & string)[];

  function setLocale(locale: keyof T & string): void {
    if (!locales.includes(locale)) {
      console.warn(
        `Locale "${locale}" not found. Available: ${locales.join(", ")}`
      );
      return;
    }

    currentLocale = locale;
    onLocaleChange?.(locale);
  }

  function getTranslation(key: string, locale?: string): string | undefined {
    const targetLocale = locale || currentLocale;
    const localeTranslations = translations[targetLocale];

    if (!localeTranslations) {
      return undefined;
    }

    const value = getNestedValue(localeTranslations, key);

    if (typeof value === "string") {
      return value;
    }

    return undefined;
  }

  function hasTranslation(key: string, locale?: string): boolean {
    return getTranslation(key, locale) !== undefined;
  }

  function getNestedTranslations(
    prefix: string
  ): NestedTranslations | undefined {
    const localeTranslations = translations[currentLocale];
    return getNestedTrans(localeTranslations, prefix);
  }

  const translate: TranslateFunction = (
    key: string,
    values?: InterpolationValues,
    options?: TranslateOptions
  ): string => {
    const { count, defaultValue, locale } = options || {};
    const targetLocale = locale || currentLocale;

    let translation = getTranslation(key, targetLocale);

    if (translation === undefined && targetLocale !== fallbackLocale) {
      translation = getTranslation(key, fallbackLocale);
    }

    if (translation === undefined) {
      if (onMissingTranslation) {
        return onMissingTranslation(key, targetLocale);
      }

      if (defaultValue !== undefined) {
        return interpolate(defaultValue, values);
      }

      console.warn(
        `Missing translation for key: "${key}" in locale: "${targetLocale}"`
      );
      return key;
    }

    if (count !== undefined) {
      const rawValue = getNestedValue(translations[targetLocale], key);

      if (isPluralTranslation(rawValue)) {
        translation = pluralize(rawValue, count, targetLocale);
      } else if (translation.includes("|")) {
        translation = parsePluralString(translation, count, targetLocale);
      }
    }

    const interpolationValues =
      count !== undefined ? { count, ...values } : values;

    return interpolate(translation, interpolationValues);
  };

  function formatDate(
    date: Date | number | string,
    options?: DateFormatOptions
  ): string {
    return formatDateUtil(date, currentLocale, options);
  }

  function formatNumber(value: number, options?: NumberFormatOptions): string {
    return formatNumberUtil(value, currentLocale, options);
  }

  function formatCurrency(
    value: number,
    options: CurrencyFormatOptions
  ): string {
    return formatCurrencyUtil(value, currentLocale, options);
  }

  function formatRelativeTime(
    date: Date | number,
    options?: Intl.RelativeTimeFormatOptions
  ): string {
    return formatRelativeTimeUtil(date, currentLocale, options);
  }

  function formatList(
    items: string[],
    options?: Intl.ListFormatOptions
  ): string {
    return formatListUtil(items, currentLocale, options);
  }

  return {
    get locale() {
      return currentLocale;
    },
    locales,
    setLocale,
    t: translate,
    translate,
    formatDate,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    formatList,
    getTranslation,
    hasTranslation,
    getNestedTranslations,
  };
}