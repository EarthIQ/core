import React, { forwardRef, useState } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../../utils/cn";

const inputVariants = cva(
  [
    "w-full border transition-all duration-200",
    "bg-[var(--input-bg)] text-[var(--text-primary)]",
    "placeholder:text-[var(--input-placeholder)]",
    "focus:outline-none",
    "disabled:cursor-not-allowed disabled:bg-[var(--button-disabled-bg)] disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        default: [
          "border-[var(--input-border)]",
          "hover:border-[var(--border-hover)]",
          "focus:border-[var(--input-focus-border)]",
          "focus:ring-2 focus:ring-[var(--primary)]/20",
        ],
        error: [
          "border-[var(--error)]",
          "focus:border-[var(--error)]",
          "focus:ring-2 focus:ring-[var(--error)]/20",
        ],
        success: [
          "border-[var(--success)]",
          "focus:border-[var(--success)]",
          "focus:ring-2 focus:ring-[var(--success)]/20",
        ],
        warning: [
          "border-[var(--warning)]",
          "focus:border-[var(--warning)]",
          "focus:ring-2 focus:ring-[var(--warning)]/20",
        ],
      },
      inputSize: {
        sm: "rounded-md px-3 py-1.5 text-sm",
        md: "rounded-lg px-3 py-2 text-sm",
        lg: "rounded-lg px-4 py-2.5 text-base",
        xl: "rounded-xl px-4 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "md",
    },
  }
);

const labelVariants = cva("block font-medium text-[var(--text-primary)]", {
  variants: {
    size: {
      sm: "mb-1 text-xs",
      md: "mb-1.5 text-sm",
      lg: "mb-1.5 text-sm",
      xl: "mb-2 text-base",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface TextareaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "size"
> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  warning?: string;
  required?: boolean;
  showCharCount?: boolean;
  containerClassName?: string;
  inputSize?: "sm" | "md" | "lg" | "xl";
  /** Auto-resize based on content */
  autoResize?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      inputSize = "md",
      label,
      description,
      error,
      success,
      warning,
      disabled,
      required,
      showCharCount,
      maxLength,
      value,
      id,
      containerClassName,
      autoResize,
      onChange,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState("");
    const inputId = id || `textarea-${React.useId()}`;

    const currentValue = value !== undefined ? String(value) : internalValue;

    const computedVariant = error
      ? "error"
      : success
        ? "success"
        : warning
          ? "warning"
          : "default";

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInternalValue(e.target.value);

      if (autoResize) {
        e.target.style.height = "auto";
        e.target.style.height = `${e.target.scrollHeight}px`;
      }

      onChange?.(e);
    };

    return (
      <div className={cn("w-full", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={labelVariants({ size: inputSize })}
          >
            {label}
            {required && (
              <span
                className="ml-1 text-[var(--error)]"
                aria-hidden="true"
              >
                *
              </span>
            )}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${inputId}-error`
              : description
                ? `${inputId}-description`
                : undefined
          }
          className={cn(
            inputVariants({
              variant: computedVariant,
              inputSize,
            }),
            "min-h-[80px] resize-y",
            autoResize && "resize-none overflow-hidden",
            className
          )}
          {...props}
        />

        <div className="mt-1.5 flex items-start justify-between gap-2">
          <div className="flex-1">
            {error && (
              <p
                id={`${inputId}-error`}
                className="text-sm text-[var(--error-text)]"
                role="alert"
              >
                {error}
              </p>
            )}
            {success && !error && (
              <p className="text-sm text-[var(--success-text)]">{success}</p>
            )}
            {warning && !error && !success && (
              <p className="text-sm text-[var(--warning-text)]">{warning}</p>
            )}
            {description && !error && !success && !warning && (
              <p
                id={`${inputId}-description`}
                className="text-sm text-[var(--text-tertiary)]"
              >
                {description}
              </p>
            )}
          </div>

          {showCharCount && maxLength && (
            <span
              className={cn(
                "text-xs tabular-nums",
                currentValue.length >= maxLength
                  ? "text-[var(--error)]"
                  : currentValue.length >= maxLength * 0.9
                    ? "text-[var(--warning)]"
                    : "text-[var(--text-tertiary)]"
              )}
            >
              {currentValue.length}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
