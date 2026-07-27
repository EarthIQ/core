import React from 'react';
import type { MultiLevelCardProps } from '../../types';

/**
 * Card for settings with multiple levels (e.g., font size: normal/large/larger/largest)
 */
export const MultiLevelCard: React.FC<MultiLevelCardProps> = ({
  icon,
  label,
  description,
  value,
  maxLevel,
  options,
  onChange,
}) => {
  const handleClick = () => {
    onChange((value + 1) % (maxLevel + 1));
  };

  const isActive = value > 0;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        group relative flex w-full flex-col
        rounded-2xl p-4 text-left
        transition-all duration-200
        ${isActive
          ? 'bg-primary text-white shadow-lg shadow-primary/30'
          : 'border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
        }
      `}
      aria-label={`${label}: ${options[value]}`}
      aria-pressed={isActive}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`
            flex h-10 w-10 items-center justify-center rounded-xl
            transition-colors
            ${isActive ? 'bg-white/20' : 'bg-[var(--bg-tertiary)]'}
          `}
        >
          {icon}
        </div>
        
        {/* Level indicators */}
        <div className="flex items-center gap-1">
          {Array.from({ length: maxLevel + 1 }).map((_, i) => (
            <div
              key={i}
              className={`
                h-1.5 w-4 rounded-full transition-all
                ${i <= value
                  ? isActive ? 'bg-white' : 'bg-primary'
                  : isActive ? 'bg-white/30' : 'bg-[var(--border-primary)]'
                }
              `}
            />
          ))}
        </div>
      </div>
      
      <div className="mt-3">
        <div className="text-sm font-semibold">{label}</div>
        <div
          className={`
            mt-0.5 text-xs
            ${isActive ? 'text-white/70' : 'text-[var(--text-tertiary)]'}
          `}
        >
          {options[value]}
        </div>
      </div>
    </button>
  );
};