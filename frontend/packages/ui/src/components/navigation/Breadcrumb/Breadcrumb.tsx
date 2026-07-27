import React, { type ReactNode } from "react";
import { cn } from "../../../utils/cn";

interface BreadcrumbItem {
  key: string;
  label: ReactNode;
  href?: string;
  icon?: ReactNode;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  className?: string;
}

export function Breadcrumb({
  items,
  separator = (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      style={{ color: "var(--text-tertiary)" }}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  ),
  className,
}: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={className}
    >
      <ol className="flex items-center gap-2 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li
              key={item.key}
              className="flex items-center gap-2"
            >
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  onClick={item.onClick}
                  className="flex items-center gap-1.5 transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-tertiary)";
                  }}
                >
                  {item.icon}
                  {item.label}
                </a>
              ) : (
                <span
                  className="flex items-center gap-1.5"
                  style={{
                    color: isLast
                      ? "var(--text-primary)"
                      : "var(--text-tertiary)",
                    fontWeight: isLast ? 500 : undefined,
                  }}
                >
                  {item.icon}
                  {item.label}
                </span>
              )}

              {!isLast && (
                <span style={{ color: "var(--text-tertiary)" }}>
                  {separator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
