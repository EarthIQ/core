import React from 'react';

import { Icons } from '../Icons';

interface PanelHeaderProps {
  title: string;
  subtitle: string;
  resetLabel: string;
  closeLabel: string;
  onReset: () => void;
  onClose: () => void;
}

/**
 * Header for the accessibility panel
 */
export const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  subtitle,
  resetLabel,
  closeLabel,
  onReset,
  onClose,
}) => {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-6 py-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-[var(--text-tertiary)]">
          {subtitle}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label={resetLabel}
          title={resetLabel}
          className="
            flex h-10 w-10 items-center justify-center rounded-xl
            text-[var(--text-secondary)]
            transition-colors
            hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]
          "
          onClick={onReset}
        >
          <Icons.reset />
        </button>
        <button
          aria-label={closeLabel}
          className="
            flex h-10 w-10 items-center justify-center rounded-xl
            text-[var(--text-secondary)]
            transition-colors
            hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]
          "
          onClick={onClose}
        >
          <Icons.close />
        </button>
      </div>
    </div>
  );
};