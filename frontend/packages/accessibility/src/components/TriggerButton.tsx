import { forwardRef } from "react";

import { Icons } from "./Icons";

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
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={label}
        className={`focus:ring-primary/30 fixed bottom-6 left-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-110 focus:ring-4 focus:outline-none ${
          hasActiveSettings
            ? "bg-primary text-white"
            : "border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)]"
        } `}
        onClick={onClick}
      >
        {/* Call the icon as a function/component */}
        <AccessibilityIcon />

        {hasActiveSettings ? (
          <span className="text-primary absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold shadow-md">
            <CheckIcon />
          </span>
        ) : null}
      </button>
    );
  }
);

TriggerButton.displayName = "TriggerButton";
