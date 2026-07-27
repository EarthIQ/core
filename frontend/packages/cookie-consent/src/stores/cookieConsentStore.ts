import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { 
  CookiePreferences, 
  CookieConsentConfig,
  CookieCategoryConfig,
  CookieCategory,
  CookieConsentState,
} from '../types';
import { 
  saveConsentPreferences, 
  getConsentPreferences,
  clearNonEssentialStorage,
  dispatchConsentEvent,
} from '../utils/cookies';

const DEFAULT_CATEGORIES: CookieCategoryConfig[] = [
  {
    id: 'necessary',
    name: 'Strictly Necessary',
    description: 'These cookies are essential for the website to function properly. They enable basic functions like page navigation, secure areas access, and remembering your privacy preferences. The website cannot function properly without these cookies.',
    required: true,
    cookies: [
      {
        name: 'cookie_consent',
        provider: 'This Website',
        purpose: 'Stores your cookie consent preferences',
        expiry: '1 year',
        type: 'http',
      },
      {
        name: 'session_id',
        provider: 'This Website',
        purpose: 'Maintains your session state',
        expiry: 'Session',
        type: 'http',
      },
    ],
  },
  {
    id: 'functional',
    name: 'Functional',
    description: 'These cookies enable enhanced functionality and personalization, such as remembering your language preferences, region, or username. If you disable these cookies, some or all of these services may not function properly.',
    cookies: [
      {
        name: 'language',
        provider: 'This Website',
        purpose: 'Remembers your preferred language',
        expiry: '1 year',
        type: 'localStorage',
      },
      {
        name: 'theme',
        provider: 'This Website',
        purpose: 'Remembers your theme preference (light/dark)',
        expiry: '1 year',
        type: 'localStorage',
      },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve our website and services.',
    cookies: [
      {
        name: '_ga',
        provider: 'Google Analytics',
        purpose: 'Distinguishes users and tracks page views',
        expiry: '2 years',
        type: 'http',
      },
      {
        name: '_gid',
        provider: 'Google Analytics',
        purpose: 'Distinguishes users',
        expiry: '24 hours',
        type: 'http',
      },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'These cookies are used to track visitors across websites to display relevant advertisements. They help measure the effectiveness of advertising campaigns and limit the number of times you see an ad.',
    cookies: [
      {
        name: '_fbp',
        provider: 'Facebook',
        purpose: 'Used for Facebook advertising and retargeting',
        expiry: '3 months',
        type: 'http',
      },
      {
        name: 'ads_prefs',
        provider: 'Twitter',
        purpose: 'Used for Twitter advertising preferences',
        expiry: '10 years',
        type: 'http',
      },
    ],
  },
];

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

const DEFAULT_CONFIG: CookieConsentConfig = {
  privacyPolicyUrl: '/privacy-policy',
  cookiePolicyUrl: '/cookie-policy',
  consentVersion: '1.0',
  expiryDays: 365,
  position: 'bottom',
};

export const useCookieConsentStore = create<CookieConsentState>()(
  persist(
    (set, get) => ({
      // Initial State
      isVisible: false,
      isSettingsOpen: false,
      hasConsented: false,
      preferences: { ...DEFAULT_PREFERENCES },
      config: { ...DEFAULT_CONFIG },
      categories: DEFAULT_CATEGORIES,

      // Actions
      setVisible: (visible) => set({ isVisible: visible }),

      openSettings: () => set({ isSettingsOpen: true }),

      closeSettings: () => set({ isSettingsOpen: false }),

      setPreference: (category: CookieCategory, value: boolean) => {
        if (category === 'necessary') return;
        
        set((state) => ({
          preferences: {
            ...state.preferences,
            [category]: value,
          },
        }));
      },

      acceptAll: () => {
        const allAccepted: CookiePreferences = {
          necessary: true,
          functional: true,
          analytics: true,
          marketing: true,
        };
        
        const { config } = get();
        saveConsentPreferences(
          allAccepted, 
          config.consentVersion, 
          config.expiryDays
        );
        
        set({
          preferences: allAccepted,
          hasConsented: true,
          isVisible: false,
          isSettingsOpen: false,
        });

        dispatchConsentEvent('cookieConsentUpdate', allAccepted);
        config.onConsentChange?.(allAccepted);
      },

      rejectAll: () => {
        const onlyNecessary: CookiePreferences = {
          necessary: true,
          functional: false,
          analytics: false,
          marketing: false,
        };
        
        const { config } = get();
        saveConsentPreferences(
          onlyNecessary, 
          config.consentVersion, 
          config.expiryDays
        );
        
        clearNonEssentialStorage();
        
        set({
          preferences: onlyNecessary,
          hasConsented: true,
          isVisible: false,
          isSettingsOpen: false,
        });

        dispatchConsentEvent('cookieConsentUpdate', onlyNecessary);
        config.onConsentChange?.(onlyNecessary);
      },

      acceptSelected: () => {
        const { preferences, config } = get();
        
        saveConsentPreferences(
          preferences, 
          config.consentVersion, 
          config.expiryDays
        );
        
        if (!preferences.analytics || !preferences.marketing || !preferences.functional) {
          clearNonEssentialStorage();
        }
        
        set({
          hasConsented: true,
          isVisible: false,
          isSettingsOpen: false,
        });

        dispatchConsentEvent('cookieConsentUpdate', preferences);
        config.onConsentChange?.(preferences);
      },

      savePreferences: () => {
        get().acceptSelected();
      },

      resetPreferences: () => {
        set({
          preferences: { ...DEFAULT_PREFERENCES },
          hasConsented: false,
          isVisible: true,
        });
      },

      initialize: (customConfig) => {
        const existingConsent = getConsentPreferences();
        const config = { ...get().config, ...customConfig };
        
        const updates: Partial<CookieConsentState> = { config };
        
        if (customConfig?.categories) {
          updates.categories = customConfig.categories;
        }
        
        if (existingConsent && existingConsent.version === config.consentVersion) {
          updates.preferences = existingConsent.preferences;
          updates.hasConsented = true;
          updates.isVisible = false;
          
          set(updates as CookieConsentState);
          dispatchConsentEvent('cookieConsentInitialized', existingConsent.preferences, false);
          return;
        }
        
        updates.isVisible = true;
        updates.hasConsented = false;
        
        set(updates as CookieConsentState);
        dispatchConsentEvent('cookieConsentInitialized', DEFAULT_PREFERENCES, true);
      },
    }),
    {
      name: 'cookie-consent-store',
      storage: createJSONStorage(() => {
        // SSR-safe storage
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      partialize: (state) => ({
        preferences: state.preferences,
        hasConsented: state.hasConsented,
      }),
    }
  )
);

// Selector hooks for better performance
export const useCookiePreferences = () => 
  useCookieConsentStore((state) => state.preferences);

export const useHasConsented = () => 
  useCookieConsentStore((state) => state.hasConsented);

export const useCookieConsentVisible = () => 
  useCookieConsentStore((state) => state.isVisible);