import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { cn } from "../../../utils/cn";
import { Button } from "../../primitives/Button/Button";

interface ErrorBoundaryProps {
  children: ReactNode;

  /**
   * Custom fallback UI:
   * - ReactNode: render as-is
   * - function: (error, resetError) => ReactNode
   */
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);

  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;

  /** When any reset key changes while in error state, boundary resets */
  resetKeys?: unknown[];

  className?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

function didResetKeysChange(prevKeys?: unknown[], nextKeys?: unknown[]) {
  if (!prevKeys || !nextKeys) return false;
  if (prevKeys.length !== nextKeys.length) return true;
  return prevKeys.some((key, i) => !Object.is(key, nextKeys[i]));
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    const isDev =
      (typeof import.meta !== "undefined" && (import.meta as any).env?.DEV) ||
      process.env.NODE_ENV === "development";

    if (isDev) {
      // eslint-disable-next-line no-console
      console.error("ErrorBoundary caught an error:", error);
      // eslint-disable-next-line no-console
      console.error("Component stack:", errorInfo.componentStack);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (!this.state.error) return;
    if (!this.props.resetKeys) return;

    if (didResetKeysChange(prevProps.resetKeys, this.props.resetKeys)) {
      this.resetError();
    }
  }

  resetError = () => {
    this.props.onReset?.();
    this.setState({ error: null, errorInfo: null });
  };

  render() {
    const { children, fallback, className } = this.props;
    const { error, errorInfo } = this.state;

    if (!error) return children;

    if (typeof fallback === "function") {
      return fallback(error, this.resetError);
    }

    if (fallback) {
      return fallback;
    }

    return (
      <DefaultErrorFallback
        error={error}
        errorInfo={errorInfo}
        resetError={this.resetError}
        className={className}
      />
    );
  }
}

// Default Error Fallback Component
interface DefaultErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  className?: string;
}

export function DefaultErrorFallback({
  error,
  errorInfo,
  resetError,
  className,
}: DefaultErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  const isDev =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.DEV) ||
    process.env.NODE_ENV === "development";

  return (
    <div
      className={cn(
        "flex min-h-[200px] items-center justify-center p-6",
        className
      )}
    >
      <div
        className={cn(
          "card w-full max-w-lg p-6",
          "border-[var(--error-border)] bg-[var(--error-bg)]"
        )}
      >
        <div className="flex flex-col items-center text-center">
          {/* Error Icon */}
          <div
            className={cn(
              "mb-4 flex h-16 w-16 items-center justify-center rounded-full",
              "bg-[var(--error-bg)] ring-1 ring-[var(--error-border)]"
            )}
          >
            <svg
              className="h-8 w-8 text-[var(--error)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Error Title */}
          <h3 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">
            Something went wrong
          </h3>

          {/* Error Message */}
          <p className="mb-6 text-sm text-[var(--text-secondary)]">
            {error.message || "An unexpected error occurred"}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant="primary"
              onClick={resetError}
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try Again
            </Button>

            <Button
              variant="ghost"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>

            {isDev && (
              <Button
                variant="outline"
                onClick={() => setShowDetails((v) => !v)}
                aria-expanded={showDetails}
              >
                {showDetails ? "Hide" : "Show"} Details
              </Button>
            )}
          </div>

          {/* Error Details (Development only) */}
          {isDev && showDetails && (
            <div className="mt-6 w-full">
              <div
                className={cn(
                  "max-h-64 overflow-auto rounded-xl p-4 text-left",
                  "border border-[var(--border-secondary)] bg-[var(--bg-tertiary)]"
                )}
              >
                <p className="mb-2 font-mono text-xs text-[var(--error)]">
                  {error.name}: {error.message}
                </p>

                {error.stack && (
                  <pre className="font-mono text-xs whitespace-pre-wrap text-[var(--text-secondary)]">
                    {error.stack}
                  </pre>
                )}

                {errorInfo?.componentStack && (
                  <>
                    <p className="mt-4 mb-2 font-mono text-xs text-[var(--text-primary)]">
                      Component Stack:
                    </p>
                    <pre className="font-mono text-xs whitespace-pre-wrap text-[var(--text-secondary)]">
                      {errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
