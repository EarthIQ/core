import React, { type ReactNode } from "react";
import { cn } from "../../../utils/cn";
import { Button } from "../../primitives/Button/Button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeConfig = {
  sm: {
    icon: "w-12 h-12",
    title: "text-lg",
    description: "text-sm",
    padding: "py-8",
  },
  md: {
    icon: "w-16 h-16",
    title: "text-xl",
    description: "text-base",
    padding: "py-12",
  },
  lg: {
    icon: "w-24 h-24",
    title: "text-2xl",
    description: "text-lg",
    padding: "py-16",
  },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = "md",
  className,
}: EmptyStateProps) {
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        config.padding,
        className
      )}
    >
      {/* Icon */}
      {icon ? (
        <div
          className={cn(
            "mb-4 flex items-center justify-center rounded-full bg-[var(--surface-active)]",
            config.icon
          )}
        >
          {icon}
        </div>
      ) : (
        <div
          className={cn(
            "mb-4 flex items-center justify-center rounded-full bg-[var(--surface-active)]",
            config.icon
          )}
        >
          <svg
            className="h-1/2 w-1/2 text-[var(--text-tertiary)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
      )}

      {/* Title */}
      <h3
        className={cn(
          "mb-2 font-semibold text-[var(--text-primary)]",
          config.title
        )}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className={cn(
            "mb-6 max-w-sm text-[var(--text-secondary)]",
            config.description
          )}
        >
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button
              variant="primary"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-built empty states
export function NoDataEmptyState(props: Partial<EmptyStateProps>) {
  return (
    <EmptyState
      title="No data available"
      description="There's nothing to display here yet."
      {...props}
    />
  );
}

export function NoSearchResultsEmptyState({
  query,
  ...props
}: Partial<EmptyStateProps> & { query?: string }) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-8 w-8 text-[var(--text-tertiary)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      }
      title="No results found"
      description={
        query
          ? `We couldn't find anything matching "${query}"`
          : "Try adjusting your search or filters"
      }
      {...props}
    />
  );
}

export function ErrorEmptyState({
  onRetry,
  ...props
}: Partial<EmptyStateProps> & { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-8 w-8 text-[var(--error)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      }
      title="Something went wrong"
      description="We encountered an error while loading. Please try again."
      action={onRetry ? { label: "Try Again", onClick: onRetry } : undefined}
      {...props}
    />
  );
}
