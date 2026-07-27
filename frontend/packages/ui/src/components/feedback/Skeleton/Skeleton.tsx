import React from "react";
import { cn } from "../../../utils/cn";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  lines?: number;
  animate?: boolean;
}

export function Skeleton({
  className,
  variant = "text",
  width,
  height,
  lines = 1,
  animate = true,
}: SkeletonProps) {
  const baseClasses = cn(
    "skeleton",
    !animate && "bg-[var(--bg-tertiary)]",
    variant === "text" && "h-4 rounded",
    variant === "circular" && "rounded-full",
    variant === "rectangular" && "rounded-none",
    variant === "rounded" && "rounded-xl"
  );

  const style = {
    width: width ?? (variant === "circular" ? height : "100%"),
    height: height ?? (variant === "circular" ? width : undefined),
  };

  if (variant === "text" && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseClasses, className)}
            style={{
              ...style,
              width: i === lines - 1 ? "75%" : style.width,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseClasses, className)}
      style={style}
    />
  );
}

// Pre-built skeleton patterns
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("card space-y-4 p-6", className)}>
      <div className="flex items-center space-x-4">
        <Skeleton
          variant="circular"
          width={48}
          height={48}
        />
        <div className="flex-1 space-y-2">
          <Skeleton
            width="60%"
            height={16}
          />
          <Skeleton
            width="40%"
            height={12}
          />
        </div>
      </div>
      <Skeleton
        variant="text"
        lines={3}
      />
      <div className="flex gap-2">
        <Skeleton
          variant="rounded"
          width={80}
          height={32}
        />
        <Skeleton
          variant="rounded"
          width={80}
          height={32}
        />
      </div>
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 border-b border-[var(--border-primary)] pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={i}
            width={`${100 / cols}%`}
            height={16}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 py-2"
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              width={`${100 / cols}%`}
              height={14}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
