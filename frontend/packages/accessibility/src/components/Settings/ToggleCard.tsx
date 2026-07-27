import React from 'react';
import { Icons } from '../Icons';
import type { ToggleCardProps } from '../../types';

/**
 * Card for boolean toggle settings
 */
export const ToggleCard: React.FC<ToggleCardProps> = ({
  icon,
  label,
  description,
  active,
  onChange,
}) => {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`
        group relative flex w-full flex-col
        rounded-2xl p-4 text-left
        transition-all duration-200
        ${active
          ? 'bg-primary text-white shadow-lg shadow-primary/30'
          : 'border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
        }
      `}
      aria-pressed={active}
      aria-label={`${label}: ${active ? 'On' : 'Off'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`
            flex h-10 w-10 items-center justify-center rounded-xl
            transition-colors
            ${active ? 'bg-white/20' : 'bg-[var(--bg-tertiary)]'}
          `}
        >
          {icon}
        </div>
        
        {/* Check indicator */}
        <div
          className={`
            flex h-6 w-6 items-center justify-center rounded-full
            transition-all
            ${active ? 'bg-white' : 'border-2 border-[var(--border-primary)]'}
          `}
        >
          {active && <span className="text-primary">{<Icons.check />}</span>}
        </div>
      </div>
      
      <div className="mt-3">
        <div className="text-sm font-semibold">{label}</div>
        <div
          className={`
            mt-0.5 text-xs
            ${active ? 'text-white/70' : 'text-[var(--text-tertiary)]'}
          `}
        >
          {description}
        </div>
      </div>
    </button>
  );
};