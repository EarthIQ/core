import React, { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../utils/cn";

interface BannerProps {
  children: ReactNode;
  variant?: "info" | "success" | "warning" | "error" | "neutral";
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  onDismiss?: () => void;
  position?: "top" | "bottom";
  fixed?: boolean;
  className?: string;
}

const variantStyles = {
  info: "bg-[var(--info-bg)] border-[var(--info-border)] text-[var(--info-text)]",
  success:
    "bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success-text)]",
  warning:
    "bg-[var(--warning-bg)] border-[var(--warning-border)] text-[var(--warning-text)]",
  error:
    "bg-[var(--error-bg)] border-[var(--error-border)] text-[var(--error-text)]",
  neutral:
    "bg-[var(--surface)] border-[var(--border-primary)] text-[var(--text-primary)]",
};

const iconColorMap: Record<string, string> = {
  info: "var(--info)",
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--error)",
  neutral: "var(--text-secondary)",
};

function InfoIcon({ variant }: { variant: string }) {
  return (
    <svg
      className="h-5 w-5"
      style={{ color: iconColorMap[variant] }}
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
  return (
    <svg
      className="h-5 w-5"
      style={{ color: iconColorMap[variant] }}
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
  return (
    <svg
      className="h-5 w-5"
      style={{ color: iconColorMap[variant] }}
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
  return (
    <svg
      className="h-5 w-5"
      style={{ color: iconColorMap[variant] }}
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

function NeutralIcon({ variant }: { variant: string }) {
  return (
    <svg
      className="h-5 w-5"
      style={{ color: iconColorMap[variant] }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
      />
    </svg>
  );
}

const variantIcons: Record<string, (variant: string) => ReactNode> = {
  info: (variant) => <InfoIcon variant={variant} />,
  success: (variant) => <SuccessIcon variant={variant} />,
  warning: (variant) => <WarningIcon variant={variant} />,
  error: (variant) => <ErrorIcon variant={variant} />,
  neutral: (variant) => <NeutralIcon variant={variant} />,
};

export function Banner({
  children,
  variant = "info",
  icon,
  action,
  dismissible = true,
  onDismiss,
  position = "top",
  fixed = false,
  className,
}: BannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: position === "top" ? -20 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === "top" ? -20 : 20 }}
          className={cn(
            "w-full border-b",
            variantStyles[variant],
            fixed && "fixed right-0 left-0 z-50",
            fixed && position === "top" && "top-0",
            fixed && position === "bottom" && "bottom-0 border-t border-b-0",
            className
          )}
        >
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {(icon || variantIcons[variant]) && (
                  <span className="flex-shrink-0">
                    {icon || variantIcons[variant](variant)}
                  </span>
                )}
                <p className="text-sm leading-relaxed">{children}</p>
              </div>

              <div className="flex flex-shrink-0 items-center gap-3">
                {action && (
                  <button
                    type="button"
                    onClick={action.onClick}
                    className="text-sm font-medium underline-offset-4 transition-opacity hover:underline hover:opacity-80"
                  >
                    {action.label}
                  </button>
                )}

                {dismissible && (
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="rounded-lg p-1 transition-colors hover:bg-[var(--surface-hover)]"
                    aria-label="Dismiss banner"
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
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
