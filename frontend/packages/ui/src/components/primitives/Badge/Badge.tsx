import React, { type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../../utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 border font-medium backdrop-blur-sm transition-all duration-200",
  {
    variants: {
      variant: {
        default:
          "border-[--border-primary] bg-[--surface] text-[--text-primary]",
        primary: "border-[--border-primary] bg-[--primary]/10 text-[--primary]",
        secondary:
          "border-[--border-primary] bg-[--secondary]/10 text-[--secondary]",
        success:
          "border-[--success-border] bg-[--success-bg] text-[--success-text]",
        warning:
          "border-[--warning-border] bg-[--warning-bg] text-[--warning-text]",
        error: "border-[--error-border] bg-[--error-bg] text-[--error-text]",
        info: "border-[--info-border] bg-[--info-bg] text-[--info-text]",
        outline:
          "border-[--border-primary] bg-transparent text-[--text-primary]",
      },
      size: {
        xs: "rounded px-1.5 py-0.5 text-[10px]",
        sm: "rounded-md px-2 py-0.5 text-xs",
        md: "rounded-lg px-2.5 py-1 text-sm",
        lg: "rounded-lg px-3 py-1.5 text-base",
      },
      glow: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "primary",
        glow: true,
        className:
          "shadow-[0_0_10px_color-mix(in_oklch,var(--primary)_30%,transparent)]",
      },
      {
        variant: "success",
        glow: true,
        className:
          "shadow-[0_0_10px_color-mix(in_oklch,var(--success)_30%,transparent)]",
      },
      {
        variant: "error",
        glow: true,
        className:
          "shadow-[0_0_10px_color-mix(in_oklch,var(--error)_30%,transparent)]",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "md",
      glow: false,
    },
  }
);

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: ReactNode;
  className?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  removable?: boolean;
  onRemove?: () => void;
  dot?: boolean;
  dotColor?: "primary" | "success" | "warning" | "error";
}

const dotColors = {
  primary: "bg-[--primary]",
  success: "bg-[--success]",
  warning: "bg-[--warning]",
  error: "bg-[--error]",
};

export function Badge({
  children,
  className,
  variant,
  size,
  glow,
  leftIcon,
  rightIcon,
  removable,
  onRemove,
  dot,
  dotColor = "primary",
}: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size, glow }), className)}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 animate-pulse rounded-full",
            dotColors[dotColor]
          )}
        />
      )}
      {leftIcon}
      {children}
      {rightIcon}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 rounded-full p-0.5 transition-colors hover:bg-[--surface-hover]"
          aria-label="Remove"
        >
          <svg
            className="h-3 w-3"
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
    </span>
  );
}
