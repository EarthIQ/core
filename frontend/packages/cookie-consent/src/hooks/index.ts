export { 
  useCookieConsent,
  useConsentAwareScript,
  useHasConsent,
  type UseCookieConsentReturn,
} from './useCookieConsent';

export {
  useConsentListener,
  useConsentInitializedListener,
  addConsentListener,
  type ConsentChangeCallback,
  type ConsentInitializedCallback,
  type ConsentInitializedDetail,
} from './useConsentListener';