import { useEffect, useCallback, useMemo } from 'react';
import { useCookieConsentStore } from '../stores/cookieConsentStore';
import type { CookieCategory, CookieConsentConfig, CookiePreferences } from '../types';

import type { CookieCategoryConfig } from '../types';

export interface UseCookieConsentReturn {
  // State
  isVisible: boolean;
  isSettingsOpen: boolean;
  hasConsented: boolean;
  preferences: CookiePreferences;
  categories: CookieCategoryConfig[];
  config: CookieConsentConfig;
  
  // Actions
  openSettings: () => void;
  closeSettings: () => void;
  acceptAll: () => void;
  rejectAll: () => void;
  acceptSelected: () => void;
  setPreference: (category: CookieCategory, value: boolean) => void;
  resetPreferences: () => void;
  
  // Helpers
  hasConsent: (category: CookieCategory) => boolean;
  canTrack: () => boolean;
  canShowAds: () => boolean;
  canUseFunctional: () => boolean;
}

export const useCookieConsent = (config?: CookieConsentConfig): UseCookieConsentReturn => {
  const store = useCookieConsentStore();

  useEffect(() => {
    store.initialize(config);
  }, []);

  const hasConsent = useCallback((category: CookieCategory): boolean => {
    return store.preferences[category];
  }, [store.preferences]);

  const canTrack = useCallback((): boolean => {
    return store.preferences.analytics;
  }, [store.preferences.analytics]);

  const canShowAds = useCallback((): boolean => {
    return store.preferences.marketing;
  }, [store.preferences.marketing]);

  const canUseFunctional = useCallback((): boolean => {
    return store.preferences.functional;
  }, [store.preferences.functional]);

  return useMemo(() => ({
    // State
    isVisible: store.isVisible,
    isSettingsOpen: store.isSettingsOpen,
    hasConsented: store.hasConsented,
    preferences: store.preferences,
    categories: store.categories,
    config: store.config,
    
    // Actions
    openSettings: store.openSettings,
    closeSettings: store.closeSettings,
    acceptAll: store.acceptAll,
    rejectAll: store.rejectAll,
    acceptSelected: store.acceptSelected,
    setPreference: store.setPreference,
    resetPreferences: store.resetPreferences,
    
    // Helpers
    hasConsent,
    canTrack,
    canShowAds,
    canUseFunctional,
  }), [
    store.isVisible,
    store.isSettingsOpen,
    store.hasConsented,
    store.preferences,
    store.categories,
    store.config,
    store.openSettings,
    store.closeSettings,
    store.acceptAll,
    store.rejectAll,
    store.acceptSelected,
    store.setPreference,
    store.resetPreferences,
    hasConsent,
    canTrack,
    canShowAds,
    canUseFunctional,
  ]);
};

/**
 * Hook for conditionally running scripts based on consent
 */
export const useConsentAwareScript = (
  category: CookieCategory,
  callback: () => void | (() => void),
  deps: React.DependencyList = []
): void => {
  const preferences = useCookieConsentStore((state) => state.preferences);
  const hasConsent = preferences[category];

  useEffect(() => {
    if (hasConsent) {
      const cleanup = callback();
      return cleanup;
    }
  }, [hasConsent, ...deps]);
};

/**
 * Hook that returns whether a specific category has consent
 */
export const useHasConsent = (category: CookieCategory): boolean => {
  return useCookieConsentStore((state) => state.preferences[category]);
};