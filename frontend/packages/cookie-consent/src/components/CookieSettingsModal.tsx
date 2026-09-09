import { X, Shield, ExternalLink } from "lucide-react";
import React, { useEffect, useRef } from "react";

import { CookieCategory } from "./CookieCategory";
import { useCookieConsentStore } from "../stores/cookieConsentStore";

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
      if (e.key === "Escape") {
        closeSettings();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements =
          modalRef.current.querySelectorAll<HTMLElement>(
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

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    setTimeout(() => {
      const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previousActiveElement.current?.focus();
    };
  }, [isSettingsOpen, closeSettings]);

  if (!isSettingsOpen) return null;

  return (
    <div className="cc-modal-overlay">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="cc-modal-backdrop"
        onClick={closeSettings}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        aria-labelledby="cc-settings-title"
        aria-modal="true"
        className="cc-modal"
        role="dialog"
      >
        {/* Header */}
        <div className="cc-modal__header">
          <div className="cc-modal__header-content">
            <div className="cc-modal__header-icon">
              <Shield className="cc-icon" />
            </div>
            <div>
              <h2
                className="cc-modal__title"
                id="cc-settings-title"
              >
                Cookie Preferences
              </h2>
              <p className="cc-modal__subtitle">Manage your cookie settings</p>
            </div>
          </div>
          <button
            aria-label="Close settings"
            className="cc-modal__close-btn"
            type="button"
            onClick={closeSettings}
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
                onToggle={(enabled) => setPreference(category.id, enabled)}
              />
            ))}
          </div>

          {/* Policy Links */}
          {config.privacyPolicyUrl || config.cookiePolicyUrl ? (
            <div className="cc-modal__links">
              {config.privacyPolicyUrl ? (
                <a
                  className="cc-link"
                  href={config.privacyPolicyUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Privacy Policy
                  <ExternalLink className="cc-icon cc-icon--xs" />
                </a>
              ) : null}
              {config.cookiePolicyUrl ? (
                <a
                  className="cc-link"
                  href={config.cookiePolicyUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Cookie Policy
                  <ExternalLink className="cc-icon cc-icon--xs" />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="cc-modal__footer">
          <button
            className="cc-btn cc-btn--ghost"
            type="button"
            onClick={rejectAll}
          >
            Reject All
          </button>
          <button
            className="cc-btn cc-btn--secondary"
            type="button"
            onClick={acceptSelected}
          >
            Save Preferences
          </button>
          <button
            className="cc-btn cc-btn--primary"
            type="button"
            onClick={acceptAll}
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};
