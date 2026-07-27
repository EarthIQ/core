import React, {
  useState,
  useRef,
  useCallback,
  type MouseEvent,
  type KeyboardEvent,
} from "react";
import { motion } from "framer-motion";
import { cn } from "../../../utils/cn";

interface SliderProps {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  disabled?: boolean;
  className?: string;
  formatValue?: (value: number) => string;
  showMinMax?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Slider({
  value = 0,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = true,
  disabled = false,
  className,
  formatValue,
  showMinMax = false,
  size = "md",
}: SliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const percentage = Math.max(
    0,
    Math.min(100, ((value - min) / (max - min)) * 100)
  );

  const displayValue = formatValue ? formatValue(value) : value;

  const clampAndStep = useCallback(
    (raw: number): number => {
      const stepped = Math.round((raw - min) / step) * step + min;
      return Math.max(min, Math.min(max, stepped));
    },
    [min, max, step]
  );

  const getValueFromClientX = useCallback(
    (clientX: number): number => {
      if (!trackRef.current) return value;
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      );
      return clampAndStep(percent * (max - min) + min);
    },
    [clampAndStep, max, min, value]
  );

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();

    setIsDragging(true);
    thumbRef.current?.focus();

    const newValue = getValueFromClientX(e.clientX);
    onChange?.(newValue);

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const newValue = getValueFromClientX(e.clientX);
      onChange?.(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    const stepMultiplier = e.shiftKey ? 10 : 1;
    let newValue = value;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        e.preventDefault();
        newValue = clampAndStep(value + step * stepMultiplier);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        e.preventDefault();
        newValue = clampAndStep(value - step * stepMultiplier);
        break;
      case "Home":
        e.preventDefault();
        newValue = min;
        break;
      case "End":
        e.preventDefault();
        newValue = max;
        break;
      default:
        return;
    }

    onChange?.(newValue);
  };

  const trackHeightClass = {
    sm: "h-1",
    md: "h-1.5",
    lg: "h-2",
  }[size];

  const thumbSizeClass = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  }[size];

  const thumbOffset = {
    sm: 7,
    md: 8,
    lg: 10,
  }[size];

  return (
    <div className={cn("w-full select-none", className)}>
      {/* Label Row */}
      {(label || showValue) && (
        <div className="mb-3 flex items-center justify-between">
          {label && (
            <label
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {label}
            </label>
          )}
          {showValue && (
            <motion.span
              key={value}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                isDragging
                  ? "bg-[var(--primary)] text-[var(--text-on-primary)]"
                  : "bg-[var(--surface-hover)] text-[var(--text-secondary)]"
              )}
              style={{
                transition:
                  "background-color var(--transition-fast) ease, color var(--transition-fast) ease",
              }}
            >
              {displayValue}
            </motion.span>
          )}
        </div>
      )}

      {/* Track Container */}
      <div className="relative flex items-center py-2">
        <div
          ref={trackRef}
          onMouseDown={handleMouseDown}
          className={cn(
            "relative w-full rounded-full",
            trackHeightClass,
            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          )}
          style={{ backgroundColor: "var(--border-primary)" }}
        >
          {/* Filled Track */}
          <motion.div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{
              width: `${percentage}%`,
              background: disabled
                ? "var(--text-tertiary)"
                : "linear-gradient(to right, var(--primary), var(--secondary))",
              transition: isDragging
                ? "none"
                : "width var(--transition-fast) ease",
            }}
          />

          {/* Thumb */}
          <motion.div
            ref={thumbRef}
            role="slider"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-label={label}
            aria-disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            animate={{
              scale: isDragging ? 1.25 : isFocused ? 1.1 : 1,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 rounded-full",
              "outline-none",
              thumbSizeClass,
              disabled
                ? "cursor-not-allowed"
                : "cursor-grab active:cursor-grabbing"
            )}
            style={{
              left: `calc(${percentage}% - ${thumbOffset}px)`,
              backgroundColor: "var(--surface)",
              border: `2px solid ${isDragging || isFocused ? "var(--primary)" : "var(--border-hover)"}`,
              boxShadow: isDragging
                ? "var(--shadow-primary), var(--shadow-md)"
                : isFocused
                  ? "0 0 0 3px oklch(from var(--primary) l c h / 0.2), var(--shadow-sm)"
                  : "var(--shadow-sm)",
              transition:
                "border-color var(--transition-fast) ease, box-shadow var(--transition-fast) ease",
            }}
          >
            {/* Inner dot for visual polish */}
            <div
              className="absolute inset-0 m-auto rounded-full"
              style={{
                width: "35%",
                height: "35%",
                backgroundColor:
                  isDragging || isFocused
                    ? "var(--primary)"
                    : "var(--border-hover)",
                transition: "background-color var(--transition-fast) ease",
              }}
            />
          </motion.div>
        </div>
      </div>

      {/* Min / Max Labels */}
      {showMinMax && (
        <div className="mt-1 flex justify-between">
          <span
            className="text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            {formatValue ? formatValue(min) : min}
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            {formatValue ? formatValue(max) : max}
          </span>
        </div>
      )}
    </div>
  );
}
