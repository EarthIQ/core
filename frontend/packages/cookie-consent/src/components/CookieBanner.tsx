import { Cookie, Settings, Shield } from "lucide-react";
import React, { useEffect } from "react";

import { CookieSettingsModal } from "./CookieSettingsModal";
import { useCookieConsentStore } from "../stores/cookieConsentStore";

import type { CookieConsentConfig, BannerPosition } from "../types";

export interface CookieBannerProps {
  config?: CookieConsentConfig;
}

const POSITION_CLASSES: Record<BannerPosition, string> = {
  bottom: "cc-banner--bottom",
  "bottom-left": "cc-banner--bottom-left",
  "bottom-right": "cc-banner--bottom-right",
  top: "cc-banner--top",
};

export const CookieBanner: React.FC<CookieBannerProps> = ({ config }) => {
  const {
    isVisible,
    initialize,
    acceptAll,
    rejectAll,
    openSettings,
    config: storeConfig,
  } = useCookieConsentStore();

  useEffect(() => {
    initialize(config);
  }, []);

  const position: BannerPosition =
    config?.position ?? storeConfig.position ?? "bottom";

  if (!isVisible) {
    return <CookieSettingsModal />;
  }

  return (
    <>
      <CookieSettingsModal />

      <div
        aria-describedby="cc-banner-description"
        aria-labelledby="cc-banner-title"
        aria-modal="false"
        className={`cc-banner ${POSITION_CLASSES[position]}`}
        role="dialog"
      >
        <div className="cc-banner__container">
          <div className="cc-banner__content">
            {/* Header */}
            <div className="cc-banner__header">
              <div className="cc-banner__icon">
                <Cookie className="cc-icon" />
              </div>
              <div className="cc-banner__text">
                <h2
                  className="cc-banner__title"
                  id="cc-banner-title"
                >
                  We value your privacy
                </h2>
                <p
                  className="cc-banner__description"
                  id="cc-banner-description"
                >
                  We use cookies to enhance your browsing experience, serve
                  personalized content, and analyze our traffic. By clicking
                  "Accept All", you consent to our use of cookies.
                </p>
              </div>
            </div>

            {/* Privacy highlights */}
            <div className="cc-banner__highlights">
              <div className="cc-badge cc-badge--success">
                <Shield className="cc-icon cc-icon--xs" />
                <span>Secure & Private</span>
              </div>
              <div className="cc-badge cc-badge--info">
                <Settings className="cc-icon cc-icon--xs" />
                <span>Customizable</span>
              </div>
            </div>

            {/* Actions */}
            <div className="cc-banner__actions">
              <button
                className="cc-btn cc-btn--ghost cc-banner__btn--reject"
                type="button"
                onClick={rejectAll}
              >
                Reject All
              </button>
              <button
                className="cc-btn cc-btn--secondary"
                type="button"
                onClick={openSettings}
              >
                <Settings className="cc-icon cc-icon--sm" />
                Customize
              </button>
              <button
                className="cc-btn cc-btn--primary cc-banner__btn--accept"
                type="button"
                onClick={acceptAll}
              >
                Accept All
              </button>
            </div>

            {/* Policy Links */}
            {storeConfig.privacyPolicyUrl || storeConfig.cookiePolicyUrl ? (
              <div className="cc-banner__policy-links">
                {storeConfig.privacyPolicyUrl ? (
                  <a
                    className="cc-banner__policy-link"
                    href={storeConfig.privacyPolicyUrl}
                  >
                    Privacy Policy
                  </a>
                ) : null}
                {storeConfig.cookiePolicyUrl ? (
                  <a
                    className="cc-banner__policy-link"
                    href={storeConfig.cookiePolicyUrl}
                  >
                    Cookie Policy
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};
