import type { PluralRule, PluralTranslation } from "../types";

export function getPluralRule(count: number, locale: string): PluralRule {
  const pluralRules = new Intl.PluralRules(locale);
  return pluralRules.select(count) as PluralRule;
}

export function pluralize(
  translations: PluralTranslation | string,
  count: number,
  locale: string
): string {
  if (typeof translations === "string") {
    return translations;
  }

  const rule = getPluralRule(count, locale);
  return translations[rule] ?? translations.other;
}

export function isPluralTranslation(
  value: unknown
): value is PluralTranslation {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (typeof obj.other !== "string") {
    return false;
  }

  const validKeys = ["zero", "one", "two", "few", "many", "other"];
  const keys = Object.keys(obj);

  return keys.every((key) => validKeys.includes(key));
}

export function parsePluralString(
  template: string,
  count: number,
  locale: string
): string {
  const parts = template.split("|").map((s) => s.trim());

  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return count === 1 ? parts[0] : parts[1];
  }

  if (parts.length === 3) {
    if (count === 0) return parts[0];
    if (count === 1) return parts[1];
    return parts[2];
  }

  const rule = getPluralRule(count, locale);
  const ruleIndex = ["zero", "one", "two", "few", "many", "other"].indexOf(
    rule
  );

  return parts[Math.min(ruleIndex, parts.length - 1)];
}