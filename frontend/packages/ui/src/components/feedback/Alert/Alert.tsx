import React, { type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "../../../utils/cn";

const alertVariants = cva("flex items-start gap-4 rounded-xl border p-4", {
  variants: {
    variant: {
      default:
        "border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)]",
      info: "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-text)]",
      success:
        "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]",
      warning:
        "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)]",
      error:
        "border-[var(--error-border)] bg-[var(--error-bg)] text-[var(--error-text)]",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const iconColorMap: Record<string, string> = {
  info: "var(--info)",
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--error)",
};

function InfoIcon({ variant }: { variant: string }) {
  const color = iconColorMap[variant] || "var(--text-secondary)";

  return (
    <svg
      className="h-5 w-5"
      style={{ color }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function SuccessIcon({ variant }: { variant: string }) {
  const color = iconColorMap[variant];

  return (
    <svg
      className="h-5 w-5"
      style={{ color }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function WarningIcon({ variant }: { variant: string }) {
  const color = iconColorMap[variant];

  return (
    <svg
      className="h-5 w-5"
      style={{ color }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function ErrorIcon({ variant }: { variant: string }) {
  const color = iconColorMap[variant];

  return (
    <svg
      className="h-5 w-5"
      style={{ color }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

const icons: Record<string, (variant: string) => ReactNode> = {
  info: (variant) => <InfoIcon variant={variant} />,
  success: (variant) => <SuccessIcon variant={variant} />,
  warning: (variant) => <WarningIcon variant={variant} />,
  error: (variant) => <ErrorIcon variant={variant} />,
};

export interface AlertProps extends VariantProps<typeof alertVariants> {
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
  showIcon?: boolean;
  onClose?: () => void;
  className?: string;
}

export function Alert({
  variant = "default",
  title,
  children,
  icon,
  showIcon = true,
  onClose,
  className,
}: AlertProps) {
  const defaultIcon =
    variant && variant !== "default" ? icons[variant]?.(variant) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(alertVariants({ variant }), className)}
      role="alert"
    >
      {showIcon && (icon || defaultIcon) && (
        <div className="mt-0.5 flex-shrink-0">{icon || defaultIcon}</div>
      )}

      <div className="min-w-0 flex-1">
        {title && <h4 className="mb-1 font-semibold">{title}</h4>}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-lg p-1 transition-colors hover:bg-[var(--surface-hover)]"
          aria-label="Close alert"
        >
          <svg
            className="h-4 w-4"
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
    </motion.div>
  );
}
