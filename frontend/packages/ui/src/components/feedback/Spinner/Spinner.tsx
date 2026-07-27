import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../../utils/cn";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "default" | "primary" | "secondary";
  className?: string;
  label?: string;
}

const sizeClasses = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

const variantClasses = {
  default: "border-[var(--border-primary)] border-t-[var(--text-primary)]",
  primary: "border-[var(--primary)]/30 border-t-[var(--primary)]",
  secondary: "border-[var(--secondary)]/30 border-t-[var(--secondary)]",
};

export function Spinner({
  size = "md",
  variant = "default",
  className,
  label = "Loading",
}: SpinnerProps) {
  return (
    <div
      className="inline-flex items-center justify-center"
      role="status"
      aria-label={label}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className={cn(
          "rounded-full border-2",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

// Dots Spinner Variant
export function DotsSpinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dotSizes = { sm: "w-1.5 h-1.5", md: "w-2 h-2", lg: "w-3 h-3" };
  const gaps = { sm: "gap-1", md: "gap-1.5", lg: "gap-2" };

  return (
    <div
      className={cn("inline-flex items-center", gaps[size], className)}
      role="status"
      aria-label="Loading"
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
          }}
          className={cn("rounded-full bg-[var(--primary)]", dotSizes[size])}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}
