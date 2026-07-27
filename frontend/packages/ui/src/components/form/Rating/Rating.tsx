import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../../utils/cn";

interface RatingProps {
  value?: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
  allowHalf?: boolean;
  icon?: "star" | "heart" | "circle";
  label?: string;
  showValue?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

const gapClasses = {
  sm: "gap-0.5",
  md: "gap-1",
  lg: "gap-1.5",
};

const icons = {
  star: {
    filled: (
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    ),
    empty: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      />
    ),
  },
  heart: {
    filled: (
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    ),
    empty: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      />
    ),
  },
  circle: {
    filled: (
      <circle
        cx="12"
        cy="12"
        r="10"
      />
    ),
    empty: (
      <circle
        cx="12"
        cy="12"
        r="10"
        strokeWidth={1.5}
        fill="none"
      />
    ),
  },
};

export function Rating({
  value = 0,
  onChange,
  max = 5,
  size = "md",
  readonly = false,
  allowHalf = false,
  icon = "star",
  label,
  showValue = false,
  className,
}: RatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue !== null ? hoverValue : value;

  const handleClick = (index: number, isHalf: boolean = false) => {
    if (readonly) return;
    const newValue = isHalf ? index + 0.5 : index + 1;
    onChange?.(newValue);
  };

  const handleMouseMove = (
    e: React.MouseEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (readonly) return;

    if (allowHalf) {
      const rect = e.currentTarget.getBoundingClientRect();
      const isHalf = e.clientX - rect.left < rect.width / 2;
      setHoverValue(isHalf ? index + 0.5 : index + 1);
    } else {
      setHoverValue(index + 1);
    }
  };

  const isActive = (index: number) =>
    displayValue >= index + 1 || (allowHalf && displayValue >= index + 0.5);

  const renderIcon = (index: number) => {
    const isFilled = displayValue >= index + 1;
    const isHalfFilled =
      allowHalf && displayValue >= index + 0.5 && displayValue < index + 1;

    return (
      <svg
        className={cn(sizeClasses[size], "transition-colors duration-150")}
        viewBox="0 0 24 24"
        fill={isFilled ? "currentColor" : "none"}
        stroke="currentColor"
      >
        {isHalfFilled ? (
          <>
            <defs>
              <linearGradient id={`half-${index}`}>
                <stop
                  offset="50%"
                  stopColor="currentColor"
                />
                <stop
                  offset="50%"
                  stopColor="transparent"
                />
              </linearGradient>
            </defs>
            <g fill={`url(#half-${index})`}>{icons[icon].filled}</g>
            <g
              fill="none"
              stroke="currentColor"
            >
              {icons[icon].empty}
            </g>
          </>
        ) : isFilled ? (
          icons[icon].filled
        ) : (
          icons[icon].empty
        )}
      </svg>
    );
  };

  return (
    <div className={cn("flex items-center", gapClasses[size], className)}>
      {label && (
        <span
          className="mr-2 text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
        </span>
      )}

      <div
        className={cn("flex items-center", gapClasses[size])}
        onMouseLeave={() => setHoverValue(null)}
      >
        {Array.from({ length: max }).map((_, index) => (
          <motion.button
            key={index}
            type="button"
            whileHover={readonly ? {} : { scale: 1.1 }}
            whileTap={readonly ? {} : { scale: 0.95 }}
            onClick={(e) => {
              if (allowHalf) {
                const rect = e.currentTarget.getBoundingClientRect();
                const isHalf = e.clientX - rect.left < rect.width / 2;
                handleClick(index, isHalf);
              } else {
                handleClick(index);
              }
            }}
            onMouseMove={(e) => handleMouseMove(e, index)}
            disabled={readonly}
            className={cn(
              "rounded focus:outline-none",
              readonly ? "cursor-default" : "cursor-pointer"
            )}
            style={
              {
                // Active (filled) stars use the warning color,
                // inactive stars use the tertiary text color at low opacity
                color: isActive(index)
                  ? "var(--warning)"
                  : "var(--text-tertiary)",
                // Focus ring via box-shadow to avoid Tailwind class conflicts
                "--tw-ring-color": "var(--primary)",
              } as React.CSSProperties
            }
            onFocus={(e) => {
              e.currentTarget.style.boxShadow =
                "0 0 0 2px var(--bg-primary), 0 0 0 4px var(--primary)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {renderIcon(index)}
          </motion.button>
        ))}
      </div>

      {showValue && (
        <span
          className="ml-2 text-sm"
          style={{ color: "var(--text-tertiary)" }}
        >
          {value.toFixed(allowHalf ? 1 : 0)} / {max}
        </span>
      )}
    </div>
  );
}
