import { Cookie } from "lucide-react";
import React from "react";

import { useCookieConsentStore } from "../stores/cookieConsentStore";

export interface CookieSettingsButtonProps {
  position?: "bottom-left" | "bottom-right";
  className?: string;
  "aria-label"?: string;
}

export const CookieSettingsButton: React.FC<CookieSettingsButtonProps> = ({
  position = "bottom-left",
  className = "",
  "aria-label": ariaLabel = "Cookie Settings",
}) => {
  const { hasConsented, isVisible, openSettings } = useCookieConsentStore();

  if (!hasConsented || isVisible) return null;

  return (
    <button
      aria-label={ariaLabel}
      className={`cc-settings-btn cc-settings-btn--${position} ${className}`}
      title={ariaLabel}
      type="button"
      onClick={openSettings}
    >
      <Cookie className="cc-icon" />
    </button>
  );
};
