import React from "react";

import { cn } from "../../../utils/cn";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  showFirstLast?: boolean;
  className?: string;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  showFirstLast = true,
  className,
}: PaginationProps) => {
  const generatePages = () => {
    const totalPageNumbers = siblingCount * 2 + 3;

    if (totalPages <= totalPageNumbers) {
      return range(1, totalPages);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      return [...range(1, leftItemCount), "dots", totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      return [1, "dots", ...range(totalPages - rightItemCount + 1, totalPages)];
    }

    return [
      1,
      "dots",
      ...range(leftSiblingIndex, rightSiblingIndex),
      "dots",
      totalPages,
    ];
  };

  const pages = generatePages();

  // Base classes without any color - colors applied via style prop
  const baseButtonClasses =
    "w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none";

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center gap-1", className)}
    >
      {/* Previous */}
      <PaginationButton
        aria-label="Previous page"
        className={baseButtonClasses}
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M15 19l-7-7 7-7"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      </PaginationButton>

      {/* First */}
      {showFirstLast && currentPage > siblingCount + 2 ? <PaginationButton
          aria-label="First page"
          className={baseButtonClasses}
          onClick={() => onPageChange(1)}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </PaginationButton> : null}

      {/* Pages */}
      {pages.map((page, index) => {
        if (page === "dots") {
          return (
            <span
              key={`dots-${index}`}
              className="flex h-10 w-10 items-center justify-center text-sm"
              style={{ color: "var(--text-tertiary)" }}
            >
              ...
            </span>
          );
        }

        const pageNumber = page as number;
        const isActive = pageNumber === currentPage;

        return (
          <PaginationButton
            key={pageNumber}
            aria-current={isActive ? "page" : undefined}
            className={baseButtonClasses}
            isActive={isActive}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </PaginationButton>
        );
      })}

      {/* Last */}
      {showFirstLast && currentPage < totalPages - siblingCount - 1 ? <PaginationButton
          aria-label="Last page"
          className={baseButtonClasses}
          onClick={() => onPageChange(totalPages)}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </PaginationButton> : null}

      {/* Next */}
      <PaginationButton
        aria-label="Next page"
        className={baseButtonClasses}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M9 5l7 7-7 7"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      </PaginationButton>
    </nav>
  );
}

// ─── Internal Button ────────────────────────────────────────────────────────

interface PaginationButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  children: React.ReactNode;
}

const PaginationButton = ({
  isActive = false,
  disabled = false,
  children,
  className,
  onMouseEnter,
  onMouseLeave,
  ...props
}: PaginationButtonProps) => {
  const getStyle = (): React.CSSProperties => {
    if (disabled) {
      return {
        color: "var(--text-tertiary)",
        opacity: 0.5,
        cursor: "not-allowed",
        backgroundColor: "transparent",
      };
    }
    if (isActive) {
      return {
        backgroundColor: "oklch(from var(--primary) l c h / 0.15)",
        color: "var(--primary)",
        border: "1px solid oklch(from var(--primary) l c h / 0.3)",
      };
    }
    return {
      color: "var(--text-secondary)",
      backgroundColor: "transparent",
    };
  };

  return (
    <button
      className={className}
      disabled={disabled}
      style={getStyle()}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
      onFocus={(e) => {
        if (!disabled) {
          e.currentTarget.style.boxShadow =
            "0 0 0 3px oklch(from var(--primary) l c h / 0.2)";
        }
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isActive) {
          e.currentTarget.style.backgroundColor = "var(--surface-hover)";
          e.currentTarget.style.color = "var(--text-primary)";
        }
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isActive) {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "var(--text-secondary)";
        }
        onMouseLeave?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}
