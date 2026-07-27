import type { InterpolationValues, TranslationValue } from "../types";

function formatValue(value: TranslationValue): string {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}

export function interpolate(
  template: string,
  values?: InterpolationValues
): string {
  if (!values) {
    return template;
  }

  return template.replace(/\{\{?\s*(\w+)\s*\}?\}/g, (match, key: string) => {
    const value = values[key];

    if (value === undefined) {
      console.warn(`Missing interpolation value for key: ${key}`);
      return match;
    }

    return formatValue(value);
  });
}

export function extractInterpolationKeys(template: string): string[] {
  const matches = template.matchAll(/\{\{?\s*(\w+)\s*\}?\}/g);
  return [...matches].map((match) => match[1]);
}