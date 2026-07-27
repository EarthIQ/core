export type CookieCategory = 'necessary' | 'functional' | 'analytics' | 'marketing';

export interface CookieInfo {
  /** Cookie or storage key name */
  name: string;
  /** Service provider name */
  provider: string;
  /** Purpose description */
  purpose: string;
  /** Expiry duration (e.g., "1 year", "Session") */
  expiry: string;
  /** Storage type */
  type: 'http' | 'localStorage' | 'sessionStorage';
}

export interface CookieCategoryConfig {
  /** Category identifier */
  id: CookieCategory;
  /** Display name */
  name: string;
  /** Description explaining the category's purpose */
  description: string;
  /** If true, cannot be disabled by user */
  required?: boolean;
  /** List of cookies in this category */
  cookies?: CookieInfo[];
}

export interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface ConsentRecord {
  preferences: CookiePreferences;
  timestamp: string;
  version: string;
}

export type BannerPosition = 'bottom' | 'bottom-left' | 'bottom-right' | 'top';

export interface CookieConsentConfig {
  /** URL to privacy policy page */
  privacyPolicyUrl?: string;
  /** URL to cookie policy page */
  cookiePolicyUrl?: string;
  /** Consent version - changing this will re-prompt users */
  consentVersion?: string;
  /** Number of days before consent expires */
  expiryDays?: number;
  /** Banner position on screen */
  position?: BannerPosition;
  /** Custom category configurations */
  categories?: CookieCategoryConfig[];
  /** Callback fired when consent is updated */
  onConsentChange?: (preferences: CookiePreferences) => void;
}

export interface CookieConsentState {
  isVisible: boolean;
  isSettingsOpen: boolean;
  hasConsented: boolean;
  preferences: CookiePreferences;
  config: CookieConsentConfig;
  categories: CookieCategoryConfig[];
  
  setVisible: (visible: boolean) => void;
  openSettings: () => void;
  closeSettings: () => void;
  setPreference: (category: CookieCategory, value: boolean) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  acceptSelected: () => void;
  savePreferences: () => void;
  resetPreferences: () => void;
  initialize: (config?: CookieConsentConfig) => void;
}

// Event types for external listeners
export interface CookieConsentEventMap {
  cookieConsentUpdate: CustomEvent<{ preferences: CookiePreferences }>;
  cookieConsentInitialized: CustomEvent<{ preferences: CookiePreferences; isNewUser: boolean }>;
}

declare global {
  interface WindowEventMap extends CookieConsentEventMap {}
}