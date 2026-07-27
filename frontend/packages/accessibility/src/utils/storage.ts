import type { AccessibilitySettings, Locale } from '../types';
import { defaultSettings } from '../constants/defaults';
import { translations } from '../constants/translations';

const SETTINGS_KEY = 'accessibility-settings';

/**
 * Get settings from localStorage
 */
export function getStoredSettings(
  storageKey: string = SETTINGS_KEY,
  customDefaults?: Partial<AccessibilitySettings>
): AccessibilitySettings {
  if (typeof window === 'undefined') {
    return { ...defaultSettings, ...customDefaults };
  }

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultSettings, ...customDefaults, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to parse accessibility settings:', error);
  }

  return { ...defaultSettings, ...customDefaults };
}

/**
 * Save settings to localStorage
 */
export function saveSettings(
  settings: AccessibilitySettings,
  storageKey: string = SETTINGS_KEY
): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save accessibility settings:', error);
  }
}

/**
 * Get locale from localStorage
 */
export function getStoredLocale(
  storageKey: string,
  defaultLocale: Locale = 'en'
): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale;
  }

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored && stored in translations) {
      return stored as Locale;
    }
  } catch (error) {
    console.warn('Failed to get stored locale:', error);
  }

  return defaultLocale;
}