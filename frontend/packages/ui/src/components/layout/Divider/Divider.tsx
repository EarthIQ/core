import { cn } from "../../../utils/cn";

/**
 * Divider component props
 */
interface DividerProps {
  /**
   * The orientation of the divider
   * @default "horizontal"
   */
  orientation?: "horizontal" | "vertical";

  /**
   * Optional label to display in the center of the divider
   * Only works with horizontal orientation
   */
  label?: string;

  /**
   * Visual style variant
   * @variant solid - Simple solid line using theme divider color
   * @variant gradient - Gradient that fades at the edges
   * @default "solid"
   */
  variant?: "solid" | "gradient";

  /**
   * Spacing around the divider
   * @default "md"
   */
  spacing?: "none" | "sm" | "md" | "lg";

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Divider Component
 *
 * A visual separator for content sections. Automatically adapts to light/dark mode
 * through CSS custom properties.
 *
 * @example
 * // Simple horizontal divider
 * <Divider />
 *
 * @example
 * // Vertical divider
 * <Divider orientation="vertical" />
 *
 * @example
 * // Divider with label
 * <Divider label="Or continue with" />
 *
 * @example
 * // Gradient divider with custom spacing
 * <Divider variant="gradient" spacing="lg" />
 */
export function Divider({
  orientation = "horizontal",
  label,
  variant = "solid",
  spacing = "md",
  className,
}: DividerProps) {
  // Spacing classes based on orientation
  const spacingClasses = {
    horizontal: {
      none: "",
      sm: "my-2",
      md: "my-4",
      lg: "my-6",
    },
    vertical: {
      none: "",
      sm: "mx-2",
      md: "mx-4",
      lg: "mx-6",
    },
  };

  // Vertical divider
  if (orientation === "vertical") {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn(
          "h-full w-px self-stretch",
          variant === "solid"
            ? "bg-[var(--divider)]"
            : "bg-gradient-to-b from-transparent via-[var(--divider)] to-transparent",
          spacingClasses.vertical[spacing],
          className
        )}
      />
    );
  }

  // Horizontal divider with label
  if (label) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={cn(
          "flex w-full items-center gap-4",
          spacingClasses.horizontal[spacing],
          className
        )}
      >
        <div
          className={cn(
            "h-px flex-1",
            variant === "solid"
              ? "bg-[var(--divider)]"
              : "bg-gradient-to-r from-transparent via-[var(--divider)] to-[var(--divider)]"
          )}
        />
        <span className="flex-shrink-0 text-sm font-medium text-[var(--text-tertiary)]">
          {label}
        </span>
        <div
          className={cn(
            "h-px flex-1",
            variant === "solid"
              ? "bg-[var(--divider)]"
              : "bg-gradient-to-r from-[var(--divider)] via-[var(--divider)] to-transparent"
          )}
        />
      </div>
    );
  }

  // Simple horizontal divider
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn(
        "h-px w-full",
        variant === "solid"
          ? "bg-[var(--divider)]"
          : "bg-gradient-to-r from-transparent via-[var(--divider)] to-transparent",
        spacingClasses.horizontal[spacing],
        className
      )}
    />
  );
}
