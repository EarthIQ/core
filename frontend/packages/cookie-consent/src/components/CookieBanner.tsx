import React, { useEffect } from 'react';
import { Cookie, Settings, Shield } from 'lucide-react';
import { useCookieConsentStore } from '../stores/cookieConsentStore';
import { CookieSettingsModal } from './CookieSettingsModal';
import type { CookieConsentConfig, BannerPosition } from '../types';

export interface CookieBannerProps {
  config?: CookieConsentConfig;
}

const POSITION_CLASSES: Record<BannerPosition, string> = {
  'bottom': 'cc-banner--bottom',
  'bottom-left': 'cc-banner--bottom-left',
  'bottom-right': 'cc-banner--bottom-right',
  'top': 'cc-banner--top',
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

  const position: BannerPosition = config?.position ?? storeConfig.position ?? 'bottom';

  if (!isVisible) {
    return <CookieSettingsModal />;
  }

  return (
    <>
      <CookieSettingsModal />
      
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="cc-banner-title"
        aria-describedby="cc-banner-description"
        className={`cc-banner ${POSITION_CLASSES[position]}`}
      >
        <div className="cc-banner__container">
          <div className="cc-banner__content">
            {/* Header */}
            <div className="cc-banner__header">
              <div className="cc-banner__icon">
                <Cookie className="cc-icon" />
              </div>
              <div className="cc-banner__text">
                <h2 id="cc-banner-title" className="cc-banner__title">
                  We value your privacy
                </h2>
                <p id="cc-banner-description" className="cc-banner__description">
                  We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
                  By clicking "Accept All", you consent to our use of cookies.
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
                type="button"
                onClick={rejectAll}
                className="cc-btn cc-btn--ghost cc-banner__btn--reject"
              >
                Reject All
              </button>
              <button
                type="button"
                onClick={openSettings}
                className="cc-btn cc-btn--secondary"
              >
                <Settings className="cc-icon cc-icon--sm" />
                Customize
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="cc-btn cc-btn--primary cc-banner__btn--accept"
              >
                Accept All
              </button>
            </div>

            {/* Policy Links */}
            {(storeConfig.privacyPolicyUrl || storeConfig.cookiePolicyUrl) && (
              <div className="cc-banner__policy-links">
                {storeConfig.privacyPolicyUrl && (
                  <a href={storeConfig.privacyPolicyUrl} className="cc-banner__policy-link">
                    Privacy Policy
                  </a>
                )}
                {storeConfig.cookiePolicyUrl && (
                  <a href={storeConfig.cookiePolicyUrl} className="cc-banner__policy-link">
                    Cookie Policy
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};