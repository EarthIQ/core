import { forwardRef } from 'react';
import { Icons } from './Icons';

interface TriggerButtonProps {
  isOpen: boolean;
  hasActiveSettings: boolean;
  label: string;
  onClick: () => void;
}

/**
 * Floating action button to open the accessibility panel
 */
export const TriggerButton = forwardRef<HTMLButtonElement, TriggerButtonProps>(
  ({ isOpen, hasActiveSettings, label, onClick }, ref) => {
    // Get the icon component
    const AccessibilityIcon = Icons.accessibility;
    const CheckIcon = Icons.check;

    return (
      <button
        ref={ref}
        onClick={onClick}
        className={`
          fixed bottom-6 left-6 z-[9999]
          flex h-14 w-14 items-center justify-center
          rounded-full shadow-lg
          transition-all duration-300
          hover:scale-110
          focus:outline-none focus:ring-4 focus:ring-primary/30
          ${hasActiveSettings
            ? 'bg-primary text-white'
            : 'border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)]'
          }
        `}
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {/* Call the icon as a function/component */}
        <AccessibilityIcon />
        
        {hasActiveSettings && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-primary text-xs font-bold shadow-md">
            <CheckIcon />
          </span>
        )}
      </button>
    );
  }
);

TriggerButton.displayName = 'TriggerButton';