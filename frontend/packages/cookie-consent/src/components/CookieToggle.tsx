import React from 'react';
import { Check, X } from 'lucide-react';

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
      id={id}
      role="switch"
      type="button"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        cc-toggle
        ${checked ? 'cc-toggle--checked' : ''}
        ${disabled ? 'cc-toggle--disabled' : ''}
      `}
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