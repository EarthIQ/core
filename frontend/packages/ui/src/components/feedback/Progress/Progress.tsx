import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../../utils/cn";

interface ProgressProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "primary" | "success" | "warning" | "error";
  showValue?: boolean;
  label?: string;
  animated?: boolean;
  striped?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

const variantClasses = {
  default: "bg-[var(--text-secondary)]",
  primary: "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)]",
  success: "bg-gradient-to-r from-[var(--success)] to-[var(--success)]",
  warning: "bg-gradient-to-r from-[var(--warning)] to-[var(--warning)]",
  error: "bg-gradient-to-r from-[var(--error)] to-[var(--error)]",
};

export function Progress({
  value,
  max = 100,
  size = "md",
  variant = "primary",
  showValue = false,
  label,
  animated = true,
  striped = false,
  className,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-2 flex items-center justify-between">
          {label && (
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-sm text-[var(--text-secondary)] tabular-nums">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]",
          sizeClasses[size]
        )}
      >
        <motion.div
          initial={animated ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full transition-all",
            variantClasses[variant]
          )}
          style={
            striped
              ? {
                  backgroundImage:
                    "linear-gradient(45deg, oklch(from var(--primary) l c h / 0.15) 25%, transparent 25%, transparent 50%, oklch(from var(--primary) l c h / 0.15) 50%, oklch(from var(--primary) l c h / 0.15) 75%, transparent 75%, transparent)",
                  backgroundSize: "1rem 1rem",
                  animation: "shimmer 1s linear infinite",
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
