import React, { useEffect, useRef } from 'react';
import { X, Shield, ExternalLink } from 'lucide-react';
import { CookieCategory } from './CookieCategory';
import { useCookieConsentStore } from '../stores/cookieConsentStore';
import type { CookieCategory as CookieCategoryType } from '../types';

export const CookieSettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    closeSettings,
    preferences,
    categories,
    config,
    setPreference,
    acceptAll,
    rejectAll,
    acceptSelected,
  } = useCookieConsentStore();

  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isSettingsOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSettings();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }, 0);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    };
  }, [isSettingsOpen, closeSettings]);

  if (!isSettingsOpen) return null;

  return (
    <div className="cc-modal-overlay">
      {/* Backdrop */}
      <div 
        className="cc-modal-backdrop"
        onClick={closeSettings}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cc-settings-title"
        className="cc-modal"
      >
        {/* Header */}
        <div className="cc-modal__header">
          <div className="cc-modal__header-content">
            <div className="cc-modal__header-icon">
              <Shield className="cc-icon" />
            </div>
            <div>
              <h2 id="cc-settings-title" className="cc-modal__title">
                Cookie Preferences
              </h2>
              <p className="cc-modal__subtitle">
                Manage your cookie settings
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeSettings}
            className="cc-modal__close-btn"
            aria-label="Close settings"
          >
            <X className="cc-icon" />
          </button>
        </div>

        {/* Content */}
        <div className="cc-modal__content">
          <div className="cc-modal__categories">
            {categories.map((category) => (
              <CookieCategory
                key={category.id}
                category={category}
                enabled={preferences[category.id]}
                onToggle={(enabled) => setPreference(category.id as CookieCategoryType, enabled)}
              />
            ))}
          </div>

          {/* Policy Links */}
          {(config.privacyPolicyUrl || config.cookiePolicyUrl) && (
            <div className="cc-modal__links">
              {config.privacyPolicyUrl && (
                <a
                  href={config.privacyPolicyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cc-link"
                >
                  Privacy Policy
                  <ExternalLink className="cc-icon cc-icon--xs" />
                </a>
              )}
              {config.cookiePolicyUrl && (
                <a
                  href={config.cookiePolicyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cc-link"
                >
                  Cookie Policy
                  <ExternalLink className="cc-icon cc-icon--xs" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="cc-modal__footer">
          <button
            type="button"
            onClick={rejectAll}
            className="cc-btn cc-btn--ghost"
          >
            Reject All
          </button>
          <button
            type="button"
            onClick={acceptSelected}
            className="cc-btn cc-btn--secondary"
          >
            Save Preferences
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="cc-btn cc-btn--primary"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};