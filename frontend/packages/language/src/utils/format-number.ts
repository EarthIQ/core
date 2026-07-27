import type { CurrencyFormatOptions, NumberFormatOptions } from "../types";

function getNumberPresetOptions(
  preset?: "decimal" | "currency" | "percent" | "compact"
): Intl.NumberFormatOptions {
  switch (preset) {
    case "decimal":
      return {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      };
    case "percent":
      return {
        style: "percent",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      };
    case "compact":
      return {
        notation: "compact",
        compactDisplay: "short",
      };
    default:
      return {};
  }
}

export function formatNumber(
  value: number,
  locale: string,
  options: NumberFormatOptions = {}
): string {
  const { preset, ...formatOptions } = options;
  const presetOptions = getNumberPresetOptions(preset);
  const finalOptions = { ...presetOptions, ...formatOptions };

  return new Intl.NumberFormat(locale, finalOptions).format(value);
}

export function formatCurrency(
  value: number,
  locale: string,
  options: CurrencyFormatOptions
): string {
  const { currency, ...rest } = options;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    ...rest,
  }).format(value);
}

export function formatList(
  items: string[],
  locale: string,
  options: Intl.ListFormatOptions = {}
): string {
  const defaultOptions: Intl.ListFormatOptions = {
    style: "long",
    type: "conjunction",
  };

  return new Intl.ListFormat(locale, { ...defaultOptions, ...options }).format(
    items
  );
}

export function formatBytes(
  bytes: number,
  locale: string,
  decimals = 2
): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  return `${formatNumber(value, locale, { maximumFractionDigits: decimals })} ${sizes[i]}`;
}