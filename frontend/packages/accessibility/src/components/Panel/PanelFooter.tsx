import React from 'react';

interface PanelFooterProps {
  text: string;
}

/**
 * Footer for the accessibility panel
 */
export const PanelFooter: React.FC<PanelFooterProps> = ({ text }) => {
  return (
    <div className="border-t border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-6 py-3">
      <p className="text-center text-xs text-[var(--text-tertiary)]">
        {text}
      </p>
    </div>
  );
};