import type { NestedTranslations } from "../types";

export function getNestedValue(
  obj: NestedTranslations,
  path: string
): string | NestedTranslations | undefined {
  const keys = path.split(".");
  let current: string | NestedTranslations | undefined = obj;

  for (const key of keys) {
    if (current === undefined || typeof current === "string") {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

export function getNestedTranslations(
  obj: NestedTranslations,
  prefix: string
): NestedTranslations | undefined {
  const value = getNestedValue(obj, prefix);

  if (typeof value === "object") {
    return value;
  }

  return undefined;
}

export function flattenTranslations(
  obj: NestedTranslations,
  prefix = ""
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      result[newKey] = value;
    } else {
      Object.assign(result, flattenTranslations(value, newKey));
    }
  }

  return result;
}