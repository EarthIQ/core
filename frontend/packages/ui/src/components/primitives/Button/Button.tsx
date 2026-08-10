import React, {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../../utils/cn";
import { Spinner } from "../../feedback/Spinner/Spinner";

/**
 * Button variant styles using class-variance-authority
 *
 * Integrates with the CSS custom properties defined in the theme:
 * - Uses var(--primary), var(--surface), etc. for colors
 * - Uses var(--radius-*) for border radius
 * - Uses var(--shadow-*) for shadows
 * - Uses var(--transition-*) for transitions
 *
 * All variants automatically adapt to light/dark mode through CSS variables
 */
const buttonVariants = cva(
  // Base styles applied to all buttons
  [
    "inline-flex items-center justify-center gap-2",
    "font-medium",
    "transition-all duration-[var(--transition-fast)]",
    "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)] focus-visible:outline-none",
    "active:scale-[0.98]",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  ],
  {
    variants: {
      /**
       * Visual style variants
       *
       * @variant primary - Main call-to-action buttons (e.g., "Save", "Submit")
       * @variant secondary - Secondary actions (e.g., "Cancel", "Back")
       * @variant success - Positive actions (e.g., "Confirm", "Approve")
       * @variant warning - Cautionary actions (e.g., "Proceed with caution")
       * @variant error - Destructive actions (e.g., "Delete", "Remove")
       * @variant ghost - Minimal visual weight, for tertiary actions
       * @variant outline - Bordered style, alternative to ghost
       * @variant link - Appears as a text link
       */
      variant: {
        primary: [
          "bg-[var(--primary)] text-[var(--text-on-primary)]",
          "border border-transparent",
          "shadow-[var(--shadow-sm)]",
          "hover:bg-[var(--primary-dark)] hover:shadow-[var(--shadow-primary)]",
          "active:bg-[var(--primary-dark)]",
        ],
        secondary: [
          "bg-[var(--surface)] text-[var(--text-primary)]",
          "border border-[var(--border-primary)]",
          "shadow-[var(--shadow-xs)]",
          "hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-sm)]",
          "active:bg-[var(--surface-active)]",
        ],
        success: [
          "bg-[var(--success)] text-white",
          "border border-transparent",
          "shadow-[var(--shadow-sm)]",
          "hover:shadow-md hover:brightness-110",
          "active:brightness-95",
        ],
        warning: [
          "bg-[var(--warning)] text-[var(--warning-text)]",
          "border border-transparent",
          "shadow-[var(--shadow-sm)]",
          "hover:shadow-md hover:brightness-110",
          "active:brightness-95",
        ],
        error: [
          "bg-[var(--error)] text-white",
          "border border-transparent",
          "shadow-[var(--shadow-sm)]",
          "hover:shadow-md hover:brightness-110",
          "active:brightness-95",
        ],
        ghost: [
          "bg-transparent text-[var(--text-primary)]",
          "border border-transparent",
          "hover:bg-[var(--surface-hover)]",
          "active:bg-[var(--surface-active)]",
        ],
        outline: [
          "bg-transparent text-[var(--text-primary)]",
          "border-2 border-[var(--border-primary)]",
          "hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)]",
          "active:bg-[var(--surface-active)]",
        ],
        link: [
          "bg-transparent text-[var(--primary)]",
          "border border-transparent",
          "underline-offset-4",
          "hover:text-[var(--primary-dark)] hover:underline",
          "active:text-[var(--primary-dark)]",
          "h-auto p-0",
        ],
      },
      /**
       * Size variants
       *
       * @size xs - Extra small, for compact UIs (24px height)
       * @size sm - Small buttons (32px height)
       * @size md - Default size (40px height)
       * @size lg - Large buttons (48px height)
       * @size xl - Extra large, for prominent CTAs (56px height)
       */
      size: {
        xs: "h-6 rounded-lg px-2.5 py-1 text-xs",
        sm: "h-8 rounded-lg px-3 py-1.5 text-sm",
        md: "h-10 rounded-xl px-4 py-2 text-sm",
        lg: "h-12 rounded-xl px-5 py-2.5 text-base",
        xl: "h-14 rounded-2xl px-6 py-3 text-lg",
      },
      /**
       * Width behavior
       *
       * @fullWidth true - Button stretches to fill container width
       * @fullWidth false - Button sizes to content (default)
       */
      fullWidth: {
        true: "w-full",
        false: "w-auto",
      },
      /**
       * Icon-only mode
       * Adjusts padding for buttons that only contain an icon
       */
      iconOnly: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      // Icon-only size adjustments (square buttons with rounded corners)
      { iconOnly: true, size: "xs", className: "w-6 rounded-lg px-0" },
      { iconOnly: true, size: "sm", className: "w-8 rounded-lg px-0" },
      { iconOnly: true, size: "md", className: "w-10 rounded-xl px-0" },
      { iconOnly: true, size: "lg", className: "w-12 rounded-xl px-0" },
      { iconOnly: true, size: "xl", className: "w-14 rounded-2xl px-0" },
      // Link variant should not have size-based padding
      {
        variant: "link",
        size: "xs",
        className: "h-auto rounded-none px-0 py-0",
      },
      {
        variant: "link",
        size: "sm",
        className: "h-auto rounded-none px-0 py-0",
      },
      {
        variant: "link",
        size: "md",
        className: "h-auto rounded-none px-0 py-0",
      },
      {
        variant: "link",
        size: "lg",
        className: "h-auto rounded-none px-0 py-0",
      },
      {
        variant: "link",
        size: "xl",
        className: "h-auto rounded-none px-0 py-0",
      },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
      iconOnly: false,
    },
  }
);

/**
 * Button component props
 */
export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    VariantProps<typeof buttonVariants> {
  /**
   * Icon element to display before the button text
   * @example <Button leftIcon={<PlusIcon />}>Add Item</Button>
   */
  leftIcon?: ReactNode;

  /**
   * Icon element to display after the button text
   * @example <Button rightIcon={<ArrowRightIcon />}>Continue</Button>
   */
  rightIcon?: ReactNode;

  /**
   * Shows a loading spinner and disables the button
   * @default false
   */
  loading?: boolean;

  /**
   * Text to display while loading (replaces children)
   * If not provided, original children are shown alongside spinner
   * @example <Button loading loadingText="Saving...">Save</Button>
   */
  loadingText?: string;

  /**
   * Renders the button as an icon-only button with equal width/height
   * @default false
   */
  iconOnly?: boolean;

  /**
   * Disables the motion/animation effects
   * Useful for performance optimization or reduced motion preferences
   * @default false
   */
  disableAnimation?: boolean;
}

/**
 * Button Component
 *
 * A versatile button component that supports multiple variants, sizes, and states.
 * Automatically adapts to light/dark mode through CSS custom properties.
 *
 * @example
 * // Primary button (default)
 * <Button>Click Me</Button>
 *
 * @example
 * // Secondary button with icon
 * <Button variant="secondary" leftIcon={<SettingsIcon />}>
 *   Settings
 * </Button>
 *
 * @example
 * // Loading state
 * <Button loading loadingText="Saving...">
 *   Save Changes
 * </Button>
 *
 * @example
 * // Destructive action
 * <Button variant="error" leftIcon={<TrashIcon />}>
 *   Delete
 * </Button>
 *
 * @example
 * // Icon-only button
 * <Button variant="ghost" iconOnly aria-label="Close">
 *   <CloseIcon />
 * </Button>
 *
 * @example
 * // Full-width button
 * <Button fullWidth size="lg">
 *   Continue to Checkout
 * </Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      iconOnly,
      leftIcon,
      rightIcon,
      loading = false,
      loadingText,
      disabled,
      disableAnimation = false,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    // Motion animation variants
    const motionProps = disableAnimation
      ? {}
      : {
          whileHover: isDisabled ? {} : { scale: 1.02 },
          whileTap: isDisabled ? {} : { scale: 0.98 },
          transition: { duration: 0.15, ease: "easeOut" },
        };

    // Determine spinner size based on button size
    const spinnerSize = size === "xs" || size === "sm" ? "xs" : "sm";

    return (
      <motion.button
        ref={ref}
        type={type}
        className={cn(
          "cursor-pointer select-none",
          buttonVariants({ variant, size, fullWidth, iconOnly }),
          className
        )}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        {...motionProps}
        {...(props as unknown as HTMLMotionProps<"button">)}
      >
        {loading ? (
          <>
            <Spinner
              size={spinnerSize}
              className="flex-shrink-0"
            />
            <span>{loadingText ?? children}</span>
          </>
        ) : (
          <>
            {leftIcon && (
              <span className="inline-flex flex-shrink-0 items-center justify-center">
                {leftIcon}
              </span>
            )}
            {children && <span>{children}</span>}
            {rightIcon && (
              <span className="inline-flex flex-shrink-0 items-center justify-center">
                {rightIcon}
              </span>
            )}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

/**
 * Export buttonVariants for use in other components that need
 * button-like styling (e.g., Link styled as button)
 */
export { buttonVariants };
