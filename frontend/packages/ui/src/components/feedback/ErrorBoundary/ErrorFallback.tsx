import React from "react";
import { cn } from "../../../utils/cn";
import { Button } from "../../primitives/Button/Button";

interface ErrorFallbackProps {
  error: Error;
  resetError?: () => void;
  title?: string;
  description?: string;
  showReload?: boolean;
  showHome?: boolean;
  homeUrl?: string;
  variant?: "default" | "minimal" | "full-page";
  className?: string;
}

export function ErrorFallback({
  error,
  resetError,
  title = "Oops! Something went wrong",
  description,
  showReload = true,
  showHome = false,
  homeUrl = "/",
  variant = "default",
  className,
}: ErrorFallbackProps) {
  if (variant === "minimal") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl p-4",
          "border border-[var(--error-border)] bg-[var(--error-bg)]",
          className
        )}
        role="alert"
      >
        <svg
          className="h-5 w-5 flex-shrink-0 text-[var(--error)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="flex-1 text-sm text-[var(--error-text)]">
          {error.message || "An error occurred"}
        </span>
        {resetError && (
          <Button
            size="sm"
            variant="ghost"
            onClick={resetError}
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (variant === "full-page") {
    return (
      <div
        className={cn(
          "flex min-h-screen items-center justify-center p-6",
          "bg-[var(--bg-primary)]",
          className
        )}
      >
        <div className="w-full max-w-md text-center">
          {/* Animated Error Icon */}
          <div className="relative mx-auto mb-8 h-24 w-24">
            <div
              className="absolute inset-0 animate-pulse rounded-full"
              style={{ backgroundColor: "var(--error-bg)" }}
            />
            <div
              className={cn(
                "relative flex h-24 w-24 items-center justify-center rounded-full border"
              )}
              style={{
                backgroundColor: "var(--error-bg)",
                borderColor: "var(--error-border)",
              }}
            >
              <svg
                className="h-12 w-12 text-[var(--error)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          <h1 className="mb-4 text-3xl font-bold text-[var(--text-primary)]">
            {title}
          </h1>
          <p className="mb-8 text-[var(--text-secondary)]">
            {description ||
              error.message ||
              "An unexpected error has occurred. Please try again."}
          </p>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            {resetError && (
              <Button
                variant="primary"
                size="lg"
                onClick={resetError}
              >
                Try Again
              </Button>
            )}
            {showReload && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            )}
            {showHome && (
              <Button
                variant="ghost"
                size="lg"
                onClick={() => (window.location.href = homeUrl)}
              >
                Go Home
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        "card p-6",
        "border-[var(--error-border)] bg-[var(--error-bg)]",
        className
      )}
      role="alert"
    >
      <div className="flex flex-col items-center text-center">
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full ring-1"
          style={{
            backgroundColor: "var(--error-bg)",
            borderColor: "var(--error-border)",
          }}
        >
          <svg
            className="h-6 w-6 text-[var(--error)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
          {title}
        </h3>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          {description || error.message}
        </p>

        <div className="flex gap-3">
          {resetError && (
            <Button
              variant="primary"
              size="sm"
              onClick={resetError}
            >
              Try Again
            </Button>
          )}
          {showReload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Reload
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
