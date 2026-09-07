import { motion } from "framer-motion";
import React, { type ReactNode } from "react";

import { cn } from "../../../utils/cn";

interface StatProps {
  label: string;
  value: string | number;
  previousValue?: string | number;
  change?: number; // Percentage change
  changeLabel?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeConfig = {
  sm: {
    label: "text-xs",
    value: "text-xl",
    change: "text-xs",
    icon: "w-8 h-8",
  },
  md: {
    label: "text-sm",
    value: "text-3xl",
    change: "text-sm",
    icon: "w-10 h-10",
  },
  lg: {
    label: "text-base",
    value: "text-4xl",
    change: "text-base",
    icon: "w-12 h-12",
  },
};

export const Stat = ({
  label,
  value,
  previousValue,
  change,
  changeLabel,
  icon,
  trend,
  size = "md",
  className,
}: StatProps) => {
  const config = sizeConfig[size];

  const getTrendColor = () => {
    if (!trend || trend === "neutral") return "text-[var(--text-tertiary)]";
    return trend === "up" ? "text-[var(--success)]" : "text-[var(--error)]";
  };

  const getTrendBg = () => {
    if (!trend || trend === "neutral") return "var(--surface-active)";
    return trend === "up" ? "var(--success-bg)" : "var(--error-bg)";
  };

  const getTrendIcon = () => {
    if (!trend || trend === "neutral") {
      return (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M20 12H4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      );
    }

    return trend === "up" ? (
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          d="M7 17l9.2-9.2M17 17V7H7"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </svg>
    ) : (
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          d="M17 7l-9.2 9.2M7 7v10h10"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </svg>
    );
  };

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn("card p-6", className)}
      initial={{ opacity: 0, y: 20 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Label */}
          <p
            className={cn(
              "mb-1 font-medium text-[var(--text-secondary)]",
              config.label
            )}
          >
            {label}
          </p>

          {/* Value */}
          <p
            className={cn("font-bold text-[var(--text-primary)]", config.value)}
          >
            {value}
          </p>

          {/* Change */}
          {(change !== undefined || changeLabel) ? <div
              style={{ backgroundColor: getTrendBg() }}
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                config.change,
                getTrendColor()
              )}
            >
              {trend ? getTrendIcon() : null}
              {change !== undefined && (
                <span className="font-medium">
                  {change > 0 ? "+" : ""}
                  {change}%
                </span>
              )}
              {changeLabel ? <span className="text-[var(--text-tertiary)]">
                  {changeLabel}
                </span> : null}
            </div> : null}

          {/* Previous Value */}
          {previousValue ? <p
              className={cn("mt-1 text-[var(--text-tertiary)]", config.change)}
            >
              Previous: {previousValue}
            </p> : null}
        </div>

        {/* Icon */}
        {icon ? <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl",
              "bg-[var(--info-bg)] text-[var(--primary)]",
              config.icon
            )}
          >
            {icon}
          </div> : null}
      </div>
    </motion.div>
  );
}

// Stat Group
interface StatGroupProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export const StatGroup = ({
  children,
  columns = 4,
  className,
}: StatGroupProps) => {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}
