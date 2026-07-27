import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFloating, offset, flip, shift } from "@floating-ui/react";
import { cn } from "../../../utils/cn";
import { useClickOutside } from "../../../hooks/useClickOutside";
import { IconButton } from "../../primitives/Button/IconButton";

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  label,
  error,
  disabled,
  minDate,
  maxDate,
  className,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value || new Date());

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    placement: "bottom-start",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });

  const containerRef = useClickOutside<HTMLDivElement>(
    () => setIsOpen(false),
    isOpen
  );

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const days = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const result: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) result.push(null);
    for (let i = 1; i <= daysInMonth; i++) result.push(i);

    return result;
  }, [currentYear, currentMonth]);

  const previousMonth = () =>
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () =>
    setViewDate(new Date(currentYear, currentMonth + 1, 1));

  const selectDate = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    onChange?.(newDate);
    setIsOpen(false);
  };

  const isDateDisabled = (day: number): boolean => {
    const date = new Date(currentYear, currentMonth, day);
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isToday = (day: number): boolean => {
    const today = new Date();
    return isSameDay(new Date(currentYear, currentMonth, day), today);
  };

  const isSelected = (day: number): boolean => {
    if (!value) return false;
    return isSameDay(new Date(currentYear, currentMonth, day), value);
  };

  const triggerText = value ? formatDate(value) : placeholder;

  return (
    <div
      ref={containerRef}
      className={cn("w-full", className)}
    >
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </label>
      )}

      <div ref={refs.setReference}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen((v) => !v)}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className={cn(
            "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left",
            "rounded-[var(--radius-md)] border transition-colors",
            "bg-[var(--input-bg)]",
            disabled && "cursor-not-allowed opacity-60",
            error
              ? "border-[var(--error-border)]"
              : isOpen
                ? "border-[var(--primary)]"
                : "border-[var(--input-border)]"
          )}
        >
          <span
            className={cn(
              "truncate",
              value
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)]"
            )}
          >
            {triggerText}
          </span>

          <svg
            className="h-5 w-5 shrink-0 text-[var(--text-tertiary)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>

      {error && (
        <p className="mt-1.5 text-sm text-[var(--error-text)]">{error}</p>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={refs.setFloating}
            style={floatingStyles}
            role="dialog"
            aria-label={label ? `${label} calendar` : "Calendar"}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn("z-[var(--z-popover)] w-72 p-4", "card-elevated")}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <IconButton
                icon={
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                }
                label="Previous month"
                variant="ghost"
                size="sm"
                onClick={previousMonth}
              />

              <span className="font-medium text-[var(--text-primary)]">
                {MONTHS[currentMonth]} {currentYear}
              </span>

              <IconButton
                icon={
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                }
                label="Next month"
                variant="ghost"
                size="sm"
                onClick={nextMonth}
              />
            </div>

            {/* Day Names */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="py-1 text-center text-xs font-medium text-[var(--text-tertiary)]"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => (
                <div
                  key={index}
                  className="aspect-square"
                >
                  {day !== null && (
                    <button
                      type="button"
                      onClick={() => !isDateDisabled(day) && selectDate(day)}
                      disabled={isDateDisabled(day)}
                      className={cn(
                        "h-full w-full rounded-lg text-sm font-medium transition-colors",
                        "text-[var(--text-primary)]",
                        "hover:bg-[var(--surface-hover)]",
                        isSelected(day) &&
                          "bg-[var(--primary)] text-[var(--text-on-primary)] hover:bg-[var(--primary-dark)]",
                        isToday(day) &&
                          !isSelected(day) &&
                          "border border-[var(--primary)]",
                        isDateDisabled(day) &&
                          "cursor-not-allowed opacity-40 hover:bg-transparent"
                      )}
                    >
                      {day}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Today Button */}
            <div className="mt-4 border-t border-[var(--border-secondary)] pt-3">
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  setViewDate(today);
                  onChange?.(today);
                  setIsOpen(false);
                }}
                className="w-full text-sm text-[var(--primary)] transition-colors hover:text-[var(--primary-dark)]"
              >
                Today
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
