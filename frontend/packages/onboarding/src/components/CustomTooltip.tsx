import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Check } from "lucide-react";
import React from "react";

import type { TooltipRenderProps } from "react-joyride";

export const CustomTooltip = ({
  _continuous,
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
    <div
      {...tooltipProps}
      className="w-[350px] max-w-sm outline-none"
    >
      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {/* Progress bar at the top */}
          <div className="absolute top-0 left-0 h-1 w-full bg-[var(--surface-hover)]">
            <motion.div
              animate={{ width: `${((index + 1) / size) * 100}%` }}
              className="h-full bg-[var(--primary)]"
              initial={{ width: 0 }}
            />
          </div>

          <div className="p-6 pt-8">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <span className="mb-2 inline-block rounded-md border border-[var(--primary-border)] bg-[var(--primary-muted)] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[var(--primary)] uppercase">
                  Step {index + 1} of {size}
                </span>
                <h3 className="text-lg leading-tight font-bold text-[var(--text-primary)]">
                  {step.title}
                </h3>
              </div>
              <button
                {...closeProps}
                className="rounded-lg p-1 text-[var(--text-tertiary)] transition-all hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-8 text-sm leading-relaxed text-[var(--text-secondary)]">
              {step.content}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                {!isLastStep && (
                  <button
                    {...skipProps}
                    className="text-xs font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    Skip Tour
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {index > 0 && (
                  <button
                    {...backProps}
                    className="flex items-center gap-1 rounded-xl border border-[var(--border-primary)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-hover)]"
                  >
                    <ChevronLeft size={16} />
                    <span>Back</span>
                  </button>
                )}

                <button
                  {...primaryProps}
                  className="flex items-center gap-1 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-bold text-[var(--text-on-primary)] shadow-lg shadow-blue-500/20 transition-all hover:bg-[var(--primary-dark)] active:scale-[0.98]"
                >
                  <span>{isLastStep ? "Get Started" : "Next"}</span>
                  {isLastStep ? (
                    <Check size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
