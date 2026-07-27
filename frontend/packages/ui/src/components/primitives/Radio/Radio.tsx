import React, { forwardRef, type InputHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { cn } from "../../../utils/cn";

interface RadioProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> {
  label?: string;
  description?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    { className, label, description, size = "md", disabled, checked, ...props },
    ref
  ) => {
    return (
      <label
        className={cn(
          "inline-flex items-start gap-3",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        )}
      >
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            type="radio"
            disabled={disabled}
            checked={checked}
            className="peer sr-only"
            {...props}
          />
          <motion.div
            whileTap={disabled ? {} : { scale: 0.9 }}
            className={cn(
              "flex items-center justify-center rounded-full border-2 transition-all duration-200",
              sizeClasses[size],
              className
            )}
            style={{
              borderColor: checked ? "var(--primary)" : "var(--input-border)",
              backgroundColor: "var(--input-bg)",
            }}
            onFocus={(e) => {
              if (!disabled) {
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px oklch(from var(--primary) l c h / 0.2)";
                e.currentTarget.style.borderColor = checked
                  ? "var(--primary)"
                  : "oklch(from var(--primary) l c h / 0.5)";
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = checked
                ? "var(--primary)"
                : "var(--input-border)";
            }}
          >
            <motion.div
              initial={false}
              animate={{
                scale: checked ? 1 : 0,
                opacity: checked ? 1 : 0,
              }}
              className="h-1/2 w-1/2 rounded-full"
              style={{ backgroundColor: "var(--primary)" }}
            />
          </motion.div>
        </div>

        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {label}
              </span>
            )}
            {description && (
              <span
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Radio.displayName = "Radio";
