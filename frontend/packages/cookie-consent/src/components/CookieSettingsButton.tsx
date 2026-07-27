import React from 'react';
import { Cookie } from 'lucide-react';
import { useCookieConsentStore } from '../stores/cookieConsentStore';

export interface CookieSettingsButtonProps {
  position?: 'bottom-left' | 'bottom-right';
  className?: string;
  'aria-label'?: string;
}

export const CookieSettingsButton: React.FC<CookieSettingsButtonProps> = ({
  position = 'bottom-left',
  className = '',
  'aria-label': ariaLabel = 'Cookie Settings',
}) => {
  const { hasConsented, isVisible, openSettings } = useCookieConsentStore();

  if (!hasConsented || isVisible) return null;

  return (
    <button
      type="button"
      onClick={openSettings}
      className={`cc-settings-btn cc-settings-btn--${position} ${className}`}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Cookie className="cc-icon" />
    </button>
  );
};