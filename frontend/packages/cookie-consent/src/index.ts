// Components
export {
  CookieBanner,
  CookieSettingsModal,
  CookieSettingsButton,
  CookieCategory as CookieCategoryComponent,
  CookieToggle,
  type CookieBannerProps,
  type CookieSettingsButtonProps,
  type CookieCategoryProps,
  type CookieToggleProps,
} from './components';

// Hooks
export {
  useCookieConsent,
  useConsentAwareScript,
  useHasConsent,
  useConsentListener,
  useConsentInitializedListener,
  addConsentListener,
  type UseCookieConsentReturn,
  type ConsentChangeCallback,
  type ConsentInitializedCallback,
  type ConsentInitializedDetail,
} from './hooks';

// Store
export {
  useCookieConsentStore,
  useCookiePreferences,
  useHasConsented,
  useCookieConsentVisible,
} from './stores';

// Utils
export {
  setCookie,
  getCookie,
  deleteCookie,
  deleteAllCookies,
  saveConsentPreferences,
  getConsentPreferences,
  clearNonEssentialStorage,
  dispatchConsentEvent,
  initializeGoogleAnalytics,
  disableGoogleAnalytics,
} from './utils';

// Types
export type {
  CookieCategory,
  CookieInfo,
  CookieCategoryConfig,
  CookiePreferences,
  ConsentRecord,
  BannerPosition,
  CookieConsentConfig,
  CookieConsentState,
} from './types';