import React from 'react';
import { Icons } from '../Icons';

export interface AccordionItemProps {
  id: string;
  title: React.ReactNode;
  children: React.ReactNode;
  icon?: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  id,
  title,
  children,
  icon,
  isOpen = false,
  onToggle,
  className = '',
}) => {

  return (
    <div 
      className={`rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] overflow-hidden ${className}`}
      data-accordion-item={id}
    >
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-[var(--surface-hover)]"
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${id}`}
        id={`accordion-header-${id}`}
      >
        <div className="flex flex-1 items-center gap-3">
          {icon && (
            <span className="text-[var(--text-secondary)]">
              {icon}
            </span>
          )}
          {typeof title === 'string' ? (
            <span className="font-medium text-[var(--text-primary)]">
              {title}
            </span>
          ) : (
            <div className="flex-1 font-medium text-[var(--text-primary)]">
              {title}
            </div>
          )}
        </div>
        
        <span 
          className={`
            ml-2 text-[var(--text-tertiary)] transition-transform duration-200
            ${isOpen ? 'rotate-180' : 'rotate-0'}
          `}
        >
          <Icons.chevronDown />
        </span>
      </button>

      {/* Content - using display instead of max-height for reliability */}
      {isOpen && (
        <div
          id={`accordion-content-${id}`}
          role="region"
          aria-labelledby={`accordion-header-${id}`}
        >
          <div className="border-t border-[var(--border-primary)] p-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};