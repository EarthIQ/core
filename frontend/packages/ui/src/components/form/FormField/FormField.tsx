import React, { type ReactNode } from "react";
import { cn } from "../../../utils/cn";
import { motion, AnimatePresence } from "framer-motion";

interface FormFieldWrapperProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
  horizontal?: boolean;
}

export function FormFieldWrapper({
  label,
  description,
  error,
  required,
  children,
  className,
  labelClassName,
  horizontal = false,
}: FormFieldWrapperProps) {
  return (
    <div
      className={cn(
        horizontal ? "flex items-start gap-4" : "space-y-1.5",
        className
      )}
    >
      {label && (
        <label
          className={cn(
            "block text-sm font-medium",
            horizontal && "w-1/3 pt-2.5",
            labelClassName
          )}
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
          {required && (
            <span
              className="ml-1"
              style={{ color: "var(--error)" }}
            >
              *
            </span>
          )}
        </label>
      )}

      <div className={cn(horizontal && "flex-1")}>
        {children}

        <AnimatePresence mode="wait">
          {(error || description) && (
            <motion.p
              key={error ? "error" : "description"}
              initial={{ opacity: 0, y: -5, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -5, height: 0 }}
              className="mt-1.5 text-sm"
              style={{
                color: error ? "var(--error-text)" : "var(--text-tertiary)",
              }}
            >
              {error || description}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
