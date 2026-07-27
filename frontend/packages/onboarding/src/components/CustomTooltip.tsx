import React from 'react';
import type { TooltipRenderProps } from 'react-joyride';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

export const CustomTooltip = ({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
  size,
}: TooltipRenderProps) => {
  return (
    <div {...tooltipProps} className="max-w-sm w-[350px] outline-none">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border-primary)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
        >
          {/* Progress bar at the top */}
          <div className="absolute top-0 left-0 w-full h-1 bg-[var(--surface-hover)]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${((index + 1) / size) * 100}%` }}
              className="h-full bg-[var(--primary)]"
            />
          </div>

          <div className="p-6 pt-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="inline-block px-2 py-0.5 mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] bg-[var(--primary-muted)] rounded-md border border-[var(--primary-border)]">
                  Step {index + 1} of {size}
                </span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] leading-tight">
                  {step.title}
                </h3>
              </div>
              <button 
                {...closeProps} 
                className="p-1 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8">
              {step.content}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                {!isLastStep && (
                  <button 
                    {...skipProps} 
                    className="text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    Skip Tour
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {index > 0 && (
                  <button 
                    {...backProps} 
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] rounded-xl border border-[var(--border-primary)] hover:bg-[var(--surface-hover)] transition-all"
                  >
                    <ChevronLeft size={16} />
                    <span>Back</span>
                  </button>
                )}
                
                <button 
                  {...primaryProps} 
                  className="flex items-center gap-1 px-5 py-2 text-sm font-bold bg-[var(--primary)] text-[var(--text-on-primary)] rounded-xl hover:bg-[var(--primary-dark)] transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                >
                  <span>{isLastStep ? 'Get Started' : 'Next'}</span>
                  {isLastStep ? <Check size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
