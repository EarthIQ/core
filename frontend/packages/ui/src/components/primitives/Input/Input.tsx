import React, {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useState,
  cloneElement,
  isValidElement,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../../utils/cn";

// ============================================================================
// Input Variants
// ============================================================================

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

// ============================================================================
// Icon Size & Padding Classes
// ============================================================================

const iconSizeClasses = {
  sm: "w-4 h-4",
  md: "w-4 h-4",
  lg: "w-5 h-5",
  xl: "w-5 h-5",
};

const iconPaddingClasses = {
  sm: { left: "pl-10", right: "pr-8" },
  md: { left: "pl-11", right: "pr-9" },
  lg: { left: "pl-12", right: "pr-10" },
  xl: { left: "pl-14", right: "pr-11" },
};

const iconPositionClasses = {
  sm: "pl-2.5",
  md: "pl-3",
  lg: "pl-3",
  xl: "pl-3.5",
};

const rightIconPositionClasses = {
  sm: "pr-2.5",
  md: "pr-3",
  lg: "pr-3",
  xl: "pr-3.5",
};

// ============================================================================
// Icons
// ============================================================================

const EyeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const EyeOffIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
    />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ExclamationCircleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const WarningIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

// ============================================================================
// Input Props
// ============================================================================

export interface InputProps
  extends
    Omit<InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  /** Label text displayed above the input */
  label?: string;
  /** Helper text displayed below the input */
  description?: string;
  /** Error message - also sets variant to error */
  error?: string | undefined;
  /** Success message - also sets variant to success */
  success?: string;
  /** Warning message - also sets variant to warning */
  warning?: string;
  /** Icon displayed on the left side of the input */
  leftIcon?: ReactNode;
  /** Icon displayed on the right side of the input */
  rightIcon?: ReactNode;
  /** Addon element on the left side (e.g., currency symbol) */
  leftAddon?: ReactNode;
  /** Addon element on the right side (e.g., domain) */
  rightAddon?: ReactNode;
  /** Makes the label required with an asterisk */
  required?: boolean;
  /** Show character count */
  showCharCount?: boolean;
  /** Container className */
  containerClassName?: string;
  /** Whether to show the clear button */
  clearable?: boolean;
  /** Callback when clear button is clicked */
  onClear?: () => void;
}

// ============================================================================
// Input Component
// ============================================================================

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      inputSize = "md",
      type = "text",
      label,
      description,
      error,
      success,
      warning,
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      disabled,
      required,
      showCharCount,
      maxLength,
      value,
      id,
      containerClassName,
      clearable,
      onClear,
      onChange,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [internalValue, setInternalValue] = useState("");

    const inputId = id || `input-${React.useId()}`;
    const size = inputSize || "md";

    // Determine the current value (controlled or uncontrolled)
    const currentValue = value !== undefined ? String(value) : internalValue;

    // Determine variant based on validation state
    const computedVariant = error
      ? "error"
      : success
        ? "success"
        : warning
          ? "warning"
          : variant;

    // Determine if this is a password field
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    // Helper function to render icon with proper sizing
    const renderIcon = (icon: ReactNode) => {
      if (isValidElement(icon)) {
        return cloneElement(
          icon as React.ReactElement<{ className?: string }>,
          {
            className: cn(
              iconSizeClasses[size],
              "text-[var(--text-tertiary)]",
              (icon.props as { className?: string }).className
            ),
          }
        );
      }
      return icon;
    };

    // Get status icon based on validation state
    const getStatusIcon = () => {
      if (error) {
        return (
          <ExclamationCircleIcon
            className={cn(iconSizeClasses[size], "text-[var(--error)]")}
          />
        );
      }
      if (success) {
        return (
          <CheckCircleIcon
            className={cn(iconSizeClasses[size], "text-[var(--success)]")}
          />
        );
      }
      if (warning) {
        return (
          <WarningIcon
            className={cn(iconSizeClasses[size], "text-[var(--warning)]")}
          />
        );
      }
      return null;
    };

    // Determine what to show on the right side
    const hasStatusIcon = error || success || warning;
    const showClearButton = clearable && currentValue && !disabled;
    const hasRightContent =
      rightIcon || isPassword || hasStatusIcon || showClearButton;

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value);
      onChange?.(e);
    };

    // Handle clear
    const handleClear = () => {
      setInternalValue("");
      onClear?.();
    };

    return (
      <div className={cn("w-full", containerClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={labelVariants({ size })}
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

        {/* Input Container */}
        <div className="relative flex">
          {/* Left Addon */}
          {leftAddon && (
            <div
              className={cn(
                "flex items-center border border-r-0 px-3",
                "border-[var(--input-border)] bg-[var(--bg-tertiary)]",
                "text-sm text-[var(--text-secondary)]",
                size === "sm" && "rounded-l-md",
                size === "md" && "rounded-l-lg",
                (size === "lg" || size === "xl") && "rounded-l-lg"
              )}
            >
              {leftAddon}
            </div>
          )}

          {/* Input Wrapper */}
          <div className="relative flex-1">
            {/* Left Icon */}
            {leftIcon && (
              <div
                className={cn(
                  "pointer-events-none absolute top-1/2 left-0 flex -translate-y-1/2 items-center justify-center",
                  iconPositionClasses[size]
                )}
              >
                {renderIcon(leftIcon)}
              </div>
            )}

            {/* Input Element */}
            <input
              ref={ref}
              id={inputId}
              type={inputType}
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
                leftIcon && iconPaddingClasses[size].left,
                hasRightContent && iconPaddingClasses[size].right,
                leftAddon && "rounded-l-none border-l-0",
                rightAddon && "rounded-r-none border-r-0",
                className
              )}
              {...props}
            />

            {/* Right Side Icons Container */}
            {hasRightContent && (
              <div
                className={cn(
                  "absolute top-1/2 right-0 flex -translate-y-1/2 items-center gap-1",
                  rightIconPositionClasses[size]
                )}
              >
                {/* Clear Button */}
                {showClearButton && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className={cn(
                      "flex items-center justify-center rounded p-0.5",
                      "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
                      "transition-colors duration-150",
                      "focus:ring-2 focus:ring-[var(--primary)]/20 focus:outline-none"
                    )}
                    aria-label="Clear input"
                  >
                    <svg
                      className={iconSizeClasses[size]}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}

                {/* Custom Right Icon */}
                {rightIcon && !hasStatusIcon && !isPassword && (
                  <div className="pointer-events-none flex items-center justify-center">
                    {renderIcon(rightIcon)}
                  </div>
                )}

                {/* Status Icon */}
                {hasStatusIcon && !isPassword && (
                  <div className="pointer-events-none flex items-center justify-center">
                    {getStatusIcon()}
                  </div>
                )}

                {/* Password Toggle */}
                {isPassword && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={cn(
                      "flex items-center justify-center rounded p-0.5",
                      "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
                      "transition-colors duration-150",
                      "focus:ring-2 focus:ring-[var(--primary)]/20 focus:outline-none"
                    )}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOffIcon className={iconSizeClasses[size]} />
                    ) : (
                      <EyeIcon className={iconSizeClasses[size]} />
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Addon */}
          {rightAddon && (
            <div
              className={cn(
                "flex items-center border border-l-0 px-3",
                "border-[var(--input-border)] bg-[var(--bg-tertiary)]",
                "text-sm text-[var(--text-secondary)]",
                size === "sm" && "rounded-r-md",
                size === "md" && "rounded-r-lg",
                (size === "lg" || size === "xl") && "rounded-r-lg"
              )}
            >
              {rightAddon}
            </div>
          )}
        </div>

        {/* Bottom Row: Description/Error/Success/Warning & Character Count */}
        <div className="mt-1.5 flex items-start justify-between gap-2">
          <div className="flex-1">
            {/* Error Message */}
            {error && (
              <p
                id={`${inputId}-error`}
                className="text-sm text-[var(--error-text)]"
                role="alert"
              >
                {error}
              </p>
            )}

            {/* Success Message */}
            {success && !error && (
              <p
                id={`${inputId}-success`}
                className="text-sm text-[var(--success-text)]"
              >
                {success}
              </p>
            )}

            {/* Warning Message */}
            {warning && !error && !success && (
              <p
                id={`${inputId}-warning`}
                className="text-sm text-[var(--warning-text)]"
              >
                {warning}
              </p>
            )}

            {/* Description */}
            {description && !error && !success && !warning && (
              <p
                id={`${inputId}-description`}
                className="text-sm text-[var(--text-tertiary)]"
              >
                {description}
              </p>
            )}
          </div>

          {/* Character Count */}
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

Input.displayName = "Input";

// ============================================================================
// Export Types
// ============================================================================

export type { VariantProps };
