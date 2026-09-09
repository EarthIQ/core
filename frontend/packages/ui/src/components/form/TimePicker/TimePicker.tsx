import { useFloating, offset, flip, shift } from "@floating-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";

import { useClickOutside } from "../../../hooks/useClickOutside";
import { cn } from "../../../utils/cn";

interface TimePickerProps {
  value?: string; // Format: "HH:mm"
  onChange?: (time: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  format?: "12h" | "24h";
  minuteStep?: number;
  className?: string;
}

export const TimePicker = ({
  value,
  onChange,
  placeholder = "Select time",
  label,
  error,
  disabled,
  format = "12h",
  minuteStep = 15,
  className,
}: TimePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    placement: "bottom-start",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });

  const containerRef = useClickOutside<HTMLDivElement>(
    () => setIsOpen(false),
    isOpen
  );

  // Parse current value
  const [hours, minutes] = value ? value.split(":").map(Number) : [12, 0];
  const isPM = hours >= 12;
  const display12Hour = format === "12h" ? hours % 12 || 12 : hours;

  // Generate hours
  const hourOptions =
    format === "12h"
      ? Array.from({ length: 12 }, (_, i) => i + 1)
      : Array.from({ length: 24 }, (_, i) => i);

  // Generate minutes
  const minuteOptions = Array.from(
    { length: 60 / minuteStep },
    (_, i) => i * minuteStep
  );

  const formatTime = (h: number, m: number, pm?: boolean): string => {
    let hour = h;
    if (format === "12h") {
      if (pm && h !== 12) hour = h + 12;
      if (!pm && h === 12) hour = 0;
    }
    return `${hour.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}`;
  };

  const displayValue = value
    ? `${display12Hour}:${minutes.toString().padStart(2, "0")}${
        format === "12h" ? (isPM ? " PM" : " AM") : ""
      }`
    : "";

  const selectHour = (h: number) => {
    const newTime = formatTime(h, minutes, isPM);
    onChange?.(newTime);
  };

  const selectMinute = (m: number) => {
    const newTime = formatTime(
      format === "12h" ? hours % 12 || 12 : hours,
      m,
      isPM
    );
    onChange?.(newTime);
  };

  const toggleAMPM = () => {
    const newPM = !isPM;
    const h = hours % 12 || 12;
    const newTime = formatTime(h, minutes, newPM);
    onChange?.(newTime);
  };

  return (
    <div
      ref={containerRef}
      className={cn("w-full", className)}
    >
      {label ? (
        <label
          className="mb-1.5 block text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
        </label>
      ) : null}

      <div ref={refs.setReference}>
        <button
          disabled={disabled}
          type="button"
          className={cn(
            "flex w-full items-center justify-between px-4 py-2.5 text-left",
            "rounded-xl transition-all duration-200",
            "focus:outline-none",
            disabled && "cursor-not-allowed opacity-50"
          )}
          style={{
            backgroundColor: "var(--input-bg)",
            border: `1px solid ${
              error
                ? "var(--error-border)"
                : isOpen
                  ? "var(--primary)"
                  : "var(--input-border)"
            }`,
            color: "var(--text-primary)",
            boxShadow: isOpen
              ? "0 0 0 3px oklch(from var(--primary) l c h / 0.15)"
              : undefined,
          }}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <span
            style={{
              color: !value
                ? "var(--input-placeholder)"
                : "var(--text-primary)",
            }}
          >
            {displayValue || placeholder}
          </span>
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            style={{ color: "var(--text-tertiary)" }}
            viewBox="0 0 24 24"
          >
            <path
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </button>
      </div>

      {error ? (
        <p
          className="mt-1.5 text-sm"
          style={{ color: "var(--error-text)" }}
        >
          {error}
        </p>
      ) : null}

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            ref={refs.setFloating}
            animate={{ opacity: 1, y: 0 }}
            className="z-50 rounded-2xl p-4"
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: -10 }}
            style={{
              ...floatingStyles,
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-primary)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div className="flex gap-4">
              {/* Hours */}
              <div className="flex-1">
                <p
                  className="mb-2 text-center text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Hour
                </p>
                <div className="h-48 space-y-1 overflow-y-auto">
                  {hourOptions.map((h) => {
                    const isSelected =
                      (format === "12h" ? display12Hour : hours) === h;
                    return (
                      <button
                        key={h}
                        className="w-full rounded-lg py-2 text-center text-sm transition-colors focus:outline-none"
                        type="button"
                        style={{
                          backgroundColor: isSelected
                            ? "var(--primary)"
                            : "transparent",
                          color: isSelected
                            ? "var(--text-on-primary)"
                            : "var(--text-primary)",
                        }}
                        onClick={() => selectHour(h)}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor =
                              "var(--surface-hover)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                          }
                        }}
                      >
                        {h.toString().padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minutes */}
              <div className="flex-1">
                <p
                  className="mb-2 text-center text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Minute
                </p>
                <div className="h-48 space-y-1 overflow-y-auto">
                  {minuteOptions.map((m) => {
                    const isSelected = minutes === m;
                    return (
                      <button
                        key={m}
                        className="w-full rounded-lg py-2 text-center text-sm transition-colors focus:outline-none"
                        type="button"
                        style={{
                          backgroundColor: isSelected
                            ? "var(--primary)"
                            : "transparent",
                          color: isSelected
                            ? "var(--text-on-primary)"
                            : "var(--text-primary)",
                        }}
                        onClick={() => selectMinute(m)}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor =
                              "var(--surface-hover)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                          }
                        }}
                      >
                        {m.toString().padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AM/PM */}
              {format === "12h" && (
                <div className="w-16">
                  <p
                    className="mb-2 text-center text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Period
                  </p>
                  <div className="space-y-1">
                    {(["AM", "PM"] as const).map((period) => {
                      const isSelected = period === "AM" ? !isPM : isPM;
                      return (
                        <button
                          key={period}
                          className="w-full rounded-lg py-2 text-center text-sm transition-colors focus:outline-none"
                          type="button"
                          style={{
                            backgroundColor: isSelected
                              ? "var(--primary)"
                              : "transparent",
                            color: isSelected
                              ? "var(--text-on-primary)"
                              : "var(--text-primary)",
                          }}
                          onClick={() => {
                            const shouldToggle = period === "AM" ? isPM : !isPM;
                            if (shouldToggle) toggleAMPM();
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor =
                                "var(--surface-hover)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                            }
                          }}
                        >
                          {period}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
