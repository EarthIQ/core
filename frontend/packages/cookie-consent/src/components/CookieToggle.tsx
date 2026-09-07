import { Check, X } from 'lucide-react';
import React from 'react';

export interface CookieToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
}

export const CookieToggle: React.FC<CookieToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  id,
  'aria-label': ariaLabel,
}) => {
  return (
    <button
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      id={id}
      role="switch"
      type="button"
      className={`
        cc-toggle
        ${checked ? 'cc-toggle--checked' : ''}
        ${disabled ? 'cc-toggle--disabled' : ''}
      `}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span className="cc-sr-only">
        {checked ? 'Enabled' : 'Disabled'}
      </span>
      <span className={`cc-toggle__knob ${checked ? 'cc-toggle__knob--checked' : ''}`}>
        {checked ? (
          <Check className="cc-toggle__icon" strokeWidth={3} />
        ) : (
          <X className="cc-toggle__icon cc-toggle__icon--off" strokeWidth={3} />
        )}
      </span>
    </button>
  );
};