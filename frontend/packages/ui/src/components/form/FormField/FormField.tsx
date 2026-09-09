import { motion, AnimatePresence } from "framer-motion";
import React, { type ReactNode } from "react";

import { cn } from "../../../utils/cn";

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

export const FormFieldWrapper = ({
  label,
  description,
  error,
  required,
  children,
  className,
  labelClassName,
  horizontal = false,
}: FormFieldWrapperProps) => {
  return (
    <div
      className={cn(
        horizontal ? "flex items-start gap-4" : "space-y-1.5",
        className
      )}
    >
      {label ? (
        <label
          style={{ color: "var(--text-secondary)" }}
          className={cn(
            "block text-sm font-medium",
            horizontal && "w-1/3 pt-2.5",
            labelClassName
          )}
        >
          {label}
          {required ? (
            <span
              className="ml-1"
              style={{ color: "var(--error)" }}
            >
              *
            </span>
          ) : null}
        </label>
      ) : null}

      <div className={cn(horizontal && "flex-1")}>
        {children}

        <AnimatePresence mode="wait">
          {error || description ? (
            <motion.p
              key={error ? "error" : "description"}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              className="mt-1.5 text-sm"
              exit={{ opacity: 0, y: -5, height: 0 }}
              initial={{ opacity: 0, y: -5, height: 0 }}
              style={{
                color: error ? "var(--error-text)" : "var(--text-tertiary)",
              }}
            >
              {error || description}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};
