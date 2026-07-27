import { useEffect, useRef } from 'react';
import type { CookiePreferences } from '../types';

export type ConsentChangeCallback = (preferences: CookiePreferences) => void;

export interface ConsentInitializedDetail {
  preferences: CookiePreferences;
  isNewUser: boolean;
}

export type ConsentInitializedCallback = (detail: ConsentInitializedDetail) => void;

/**
 * Listen for consent changes
 */
export const useConsentListener = (callback: ConsentChangeCallback): void => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handleConsentUpdate = (event: CustomEvent<{ preferences: CookiePreferences }>) => {
      callbackRef.current(event.detail.preferences);
    };

    window.addEventListener(
      'cookieConsentUpdate', 
      handleConsentUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        'cookieConsentUpdate', 
        handleConsentUpdate as EventListener
      );
    };
  }, []);
};

/**
 * Listen for consent initialization
 */
export const useConsentInitializedListener = (callback: ConsentInitializedCallback): void => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handleInitialized = (event: CustomEvent<ConsentInitializedDetail>) => {
      callbackRef.current(event.detail);
    };

    window.addEventListener(
      'cookieConsentInitialized',
      handleInitialized as EventListener
    );

    return () => {
      window.removeEventListener(
        'cookieConsentInitialized',
        handleInitialized as EventListener
      );
    };
  }, []);
};

/**
 * Imperative function to add a consent listener (useful outside React)
 */
export const addConsentListener = (
  callback: ConsentChangeCallback
): (() => void) => {
  const handler = (event: CustomEvent<{ preferences: CookiePreferences }>) => {
    callback(event.detail.preferences);
  };

  window.addEventListener('cookieConsentUpdate', handler as EventListener);

  return () => {
    window.removeEventListener('cookieConsentUpdate', handler as EventListener);
  };
};