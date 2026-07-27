import { forwardRef, useEffect, useRef, type InputHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { cn } from "../../../utils/cn";

/**
 * Checkbox component props
 */
interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> {
  /**
   * Label text displayed next to the checkbox
   */
  label?: string;

  /**
   * Additional description text displayed below the label
   */
  description?: string;

  /**
   * Size variant of the checkbox
   * @default "md"
   */
  size?: "sm" | "md" | "lg";

  /**
   * Whether the checkbox is in an indeterminate state
   * Used for "select all" scenarios where some items are selected
   * @default false
   */
  indeterminate?: boolean;

  /**
   * Error state - shows error styling
   * @default false
   */
  error?: boolean;

  /**
   * Error message to display
   */
  errorMessage?: string;
}

/**
 * Size classes for checkbox dimensions
 */
const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

/**
 * Label text size classes
 */
const labelSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

/**
 * Description text size classes
 */
const descriptionSizeClasses = {
  sm: "text-xs",
  md: "text-xs",
  lg: "text-sm",
};

/**
 * Checkbox Component
 *
 * A customizable checkbox input with support for labels, descriptions,
 * and indeterminate states. Automatically adapts to light/dark mode
 * through CSS custom properties.
 *
 * @example
 * // Simple checkbox
 * <Checkbox />
 *
 * @example
 * // With label
 * <Checkbox label="Accept terms and conditions" />
 *
 * @example
 * // With label and description
 * <Checkbox
 *   label="Email notifications"
 *   description="Receive updates about your account"
 * />
 *
 * @example
 * // Controlled checkbox
 * const [checked, setChecked] = useState(false);
 * <Checkbox
 *   checked={checked}
 *   onChange={(e) => setChecked(e.target.checked)}
 *   label="Subscribe to newsletter"
 * />
 *
 * @example
 * // Indeterminate state (for select all)
 * <Checkbox
 *   indeterminate={someSelected && !allSelected}
 *   checked={allSelected}
 *   label="Select all"
 * />
 *
 * @example
 * // With error
 * <Checkbox
 *   error
 *   errorMessage="You must accept the terms"
 *   label="I agree to the terms"
 * />
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      description,
      size = "md",
      indeterminate = false,
      disabled,
      checked,
      error = false,
      errorMessage,
      id,
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<HTMLInputElement>(null);
    const resolvedRef =
      (ref as React.RefObject<HTMLInputElement>) || internalRef;

    // Generate unique ID if not provided
    const checkboxId =
      id || `checkbox-${Math.random().toString(36).slice(2, 9)}`;

    // Handle indeterminate state
    useEffect(() => {
      if (resolvedRef.current) {
        resolvedRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate, resolvedRef]);

    const isChecked = checked || indeterminate;

    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <label
          htmlFor={checkboxId}
          className={cn(
            "group inline-flex cursor-pointer items-start gap-3",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          {/* Checkbox input and visual */}
          <div className={cn("relative flex-shrink-0", sizeClasses[size])}>
            {/* Hidden native input for accessibility */}
            <input
              ref={resolvedRef}
              id={checkboxId}
              type="checkbox"
              disabled={disabled}
              checked={checked}
              aria-invalid={error}
              aria-describedby={
                errorMessage ? `${checkboxId}-error` : undefined
              }
              className={cn(
                "peer absolute inset-0 z-10 cursor-pointer opacity-0",
                disabled && "cursor-not-allowed"
              )}
              {...props}
            />

            {/* Custom checkbox visual */}
            <motion.div
              {...(!disabled && { whileTap: { scale: 0.9 } })}
              className={cn(
                // Base styles
                "absolute inset-0 rounded-md border-2 transition-all duration-[var(--transition-fast)]",
                // Unchecked state
                "border-[var(--input-border)] bg-[var(--input-bg)]",
                // Checked state
                isChecked && "border-[var(--primary)] bg-[var(--primary)]",
                // Hover state (unchecked)
                !isChecked &&
                  !disabled &&
                  "group-hover:border-[var(--border-hover)]",
                // Focus state (using peer)
                "peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--ring)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--ring-offset)]",
                // Error state
                error &&
                  !isChecked &&
                  "border-[var(--error)] bg-[var(--error-bg)]",
                error && isChecked && "border-[var(--error)] bg-[var(--error)]"
              )}
            >
              {/* Checkmark or indeterminate icon */}
              <motion.svg
                initial={false}
                animate={{
                  scale: isChecked ? 1 : 0,
                  opacity: isChecked ? 1 : 0,
                }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="h-full w-full p-0.5 text-[var(--text-on-primary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {indeterminate ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M20 12H4"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                )}
              </motion.svg>
            </motion.div>
          </div>

          {/* Label and description */}
          {(label || description) && (
            <div className="flex flex-col gap-0.5">
              {label && (
                <span
                  className={cn(
                    "font-medium text-[var(--text-primary)]",
                    labelSizeClasses[size],
                    disabled && "text-[var(--text-tertiary)]"
                  )}
                >
                  {label}
                </span>
              )}
              {description && (
                <span
                  className={cn(
                    "text-[var(--text-secondary)]",
                    descriptionSizeClasses[size],
                    disabled && "text-[var(--text-tertiary)]"
                  )}
                >
                  {description}
                </span>
              )}
            </div>
          )}
        </label>

        {/* Error message */}
        {error && errorMessage && (
          <p
            id={`${checkboxId}-error`}
            className="ml-8 text-xs text-[var(--error-text)]"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
