import type { DateFormatOptions } from "../types";

function getDatePresetOptions(
  preset?: "short" | "medium" | "long" | "full"
): Intl.DateTimeFormatOptions {
  switch (preset) {
    case "short":
      return {
        year: "2-digit",
        month: "numeric",
        day: "numeric",
      };
    case "medium":
      return {
        year: "numeric",
        month: "short",
        day: "numeric",
      };
    case "long":
      return {
        year: "numeric",
        month: "long",
        day: "numeric",
      };
    case "full":
      return {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
    default:
      return {};
  }
}

export function formatRelativeTime(
  date: Date | number,
  locale: string,
  options: Intl.RelativeTimeFormatOptions = {}
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);
  const diffWeeks = Math.round(diffDays / 7);
  const diffMonths = Math.round(diffDays / 30);
  const diffYears = Math.round(diffDays / 365);

  const rtf = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
    ...options,
  });

  if (Math.abs(diffSecs) < 60) {
    return rtf.format(diffSecs, "second");
  }
  if (Math.abs(diffMins) < 60) {
    return rtf.format(diffMins, "minute");
  }
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }
  if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, "day");
  }
  if (Math.abs(diffWeeks) < 4) {
    return rtf.format(diffWeeks, "week");
  }
  if (Math.abs(diffMonths) < 12) {
    return rtf.format(diffMonths, "month");
  }
  return rtf.format(diffYears, "year");
}

export function formatDate(
  date: Date | number | string,
  locale: string,
  options: DateFormatOptions = {}
): string {
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    console.warn("Invalid date provided to formatDate");
    return String(date);
  }

  const { preset, ...formatOptions } = options;

  if (preset === "relative") {
    return formatRelativeTime(dateObj, locale);
  }

  const presetOptions = getDatePresetOptions(preset);
  const finalOptions = { ...presetOptions, ...formatOptions };

  return new Intl.DateTimeFormat(locale, finalOptions).format(dateObj);
}