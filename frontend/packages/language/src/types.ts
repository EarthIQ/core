// ━━━ Core Types ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type Locale = string;

export type TranslationValue = string | number | boolean;

export type InterpolationValues = Record<string, TranslationValue>;

export type NestedTranslations = {
  [key: string]: string | NestedTranslations;
};

export type Translations = Record<Locale, NestedTranslations>;

// ━━━ Plural Types ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type PluralRule = "zero" | "one" | "two" | "few" | "many" | "other";

export interface PluralTranslation {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

// ━━━ Format Types ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface DateFormatOptions extends Intl.DateTimeFormatOptions {
  preset?: "short" | "medium" | "long" | "full" | "relative";
}

export interface NumberFormatOptions extends Intl.NumberFormatOptions {
  preset?: "decimal" | "currency" | "percent" | "compact";
}

export interface CurrencyFormatOptions extends NumberFormatOptions {
  currency: string;
}

// ━━━ Configuration Types ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface LanguageConfig<T extends Translations = Translations> {
  translations: T;
  defaultLocale: keyof T & string;
  fallbackLocale?: keyof T & string;
  onMissingTranslation?: (key: string, locale: Locale) => string;
  onLocaleChange?: (locale: Locale) => void;
}

export interface LanguageInstance<T extends Translations = Translations> {
  locale: keyof T & string;
  locales: (keyof T & string)[];
  setLocale: (locale: keyof T & string) => void;
  t: TranslateFunction;
  translate: TranslateFunction;
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
  getTranslation: (key: string) => string | undefined;
  hasTranslation: (key: string) => boolean;
  getNestedTranslations: (prefix: string) => NestedTranslations | undefined;
}

export type TranslateFunction = (
  key: string,
  values?: InterpolationValues,
  options?: TranslateOptions
) => string;

export interface TranslateOptions {
  count?: number;
  defaultValue?: string;
  locale?: Locale;
}

// ━━━ Type Helpers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
        : `${K}`;
    }[keyof T & string]
  : never;

export type TranslationKeys<T extends Translations> = NestedKeyOf<T[keyof T]>;
