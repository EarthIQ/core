import type { CookiePreferences, ConsentRecord } from '../types';

const CONSENT_COOKIE_NAME = 'cookie_consent';
const DEFAULT_EXPIRY_DAYS = 365;

/**
 * Sets a cookie with the specified name, value, and expiry
 */
export const setCookie = (
  name: string,
  value: string,
  days: number = DEFAULT_EXPIRY_DAYS
): void => {
  if (typeof document === 'undefined') return;
  
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  const secure = window.location.protocol === 'https:' ? ';Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/;SameSite=Lax${secure}`;
};

/**
 * Gets a cookie value by name
 */
export const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  
  const nameEQ = `${name}=`;
  const cookies = document.cookie.split(';');
  
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }
  return null;
};

/**
 * Deletes a cookie by name
 */
export const deleteCookie = (name: string): void => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
};

/**
 * Deletes all cookies except those matching exclude patterns
 */
export const deleteAllCookies = (excludePatterns: string[] = [CONSENT_COOKIE_NAME]): void => {
  if (typeof document === 'undefined') return;
  
  const cookies = document.cookie.split(';');
  
  for (const cookie of cookies) {
    const cookieName = cookie.split('=')[0].trim();
    const shouldExclude = excludePatterns.some(pattern => 
      cookieName.includes(pattern) || cookieName === pattern
    );
    
    if (!shouldExclude) {
      deleteCookie(cookieName);
    }
  }
};

/**
 * Saves consent preferences to a cookie
 */
export const saveConsentPreferences = (
  preferences: CookiePreferences,
  version: string = '1.0',
  expiryDays: number = DEFAULT_EXPIRY_DAYS
): void => {
  const record: ConsentRecord = {
    preferences,
    timestamp: new Date().toISOString(),
    version,
  };
  setCookie(CONSENT_COOKIE_NAME, JSON.stringify(record), expiryDays);
};

/**
 * Retrieves stored consent preferences
 */
export const getConsentPreferences = (): ConsentRecord | null => {
  const cookie = getCookie(CONSENT_COOKIE_NAME);
  if (!cookie) return null;
  
  try {
    return JSON.parse(cookie) as ConsentRecord;
  } catch {
    return null;
  }
};

/**
 * Clears non-essential storage items
 */
export const clearNonEssentialStorage = (essentialKeys: string[] = ['theme', 'language']): void => {
  if (typeof window === 'undefined') return;
  
  // Clear localStorage
  const localStorageKeysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !essentialKeys.includes(key) && !key.startsWith('cookie_consent')) {
      localStorageKeysToRemove.push(key);
    }
  }
  localStorageKeysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Clear sessionStorage
  const sessionStorageKeysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && !essentialKeys.includes(key)) {
      sessionStorageKeysToRemove.push(key);
    }
  }
  sessionStorageKeysToRemove.forEach(key => sessionStorage.removeItem(key));
};

/**
 * Dispatches a custom event for consent changes
 */
export const dispatchConsentEvent = (
  eventName: 'cookieConsentUpdate' | 'cookieConsentInitialized',
  preferences: CookiePreferences,
  isNewUser?: boolean
): void => {
  if (typeof window === 'undefined') return;
  
  const detail = isNewUser !== undefined 
    ? { preferences, isNewUser }
    : { preferences };
    
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
};

/**
 * Helper to initialize Google Analytics (if consent given)
 */
export const initializeGoogleAnalytics = (trackingId: string): void => {
  if (typeof window === 'undefined' || !trackingId) return;
  
  // Avoid double initialization
  if ((window as any).gtag) return;
  
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
  script.async = true;
  document.head.appendChild(script);

  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  (window as any).gtag = gtag;
  gtag('js', new Date());
  gtag('config', trackingId, { anonymize_ip: true });
};

/**
 * Helper to disable Google Analytics
 */
export const disableGoogleAnalytics = (trackingId: string): void => {
  if (typeof window === 'undefined' || !trackingId) return;
  (window as any)[`ga-disable-${trackingId}`] = true;
};