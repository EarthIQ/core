import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Monitor } from "lucide-react";

import { cn } from "@packages/ui";

import { useTheme } from "../../../context/ThemeContext";

type Theme = "light" | "dark" | "system";

interface ThemeToggleProps {
  variant?: "icon" | "switch" | "pill" | "minimal";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const sizes = {
  sm: {
    icon: 14,
    button: "h-8 w-8",
    switch: "h-6 w-11",
    knob: "h-4 w-4",
    knobIcon: 10,
    knobTravel: 20,
  },
  md: {
    icon: 18,
    button: "h-9 w-9",
    switch: "h-7 w-14",
    knob: "h-5 w-5",
    knobIcon: 12,
    knobTravel: 28,
  },
  lg: {
    icon: 22,
    button: "h-11 w-11",
    switch: "h-8 w-16",
    knob: "h-6 w-6",
    knobIcon: 14,
    knobTravel: 32,
  },
} as const;

export const ThemeToggle = ({
  variant = "icon",
  size = "md",
  showLabel = false,
  className,
}: ThemeToggleProps) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  const s = sizes[size];
  const isDark = resolvedTheme === "dark";

  // ─── Icon variant ───────────────────────────────────────────────
  if (variant === "icon") {
    return (
      <motion.button
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        className={cn(
          "relative flex cursor-pointer items-center justify-center rounded-full",
          s.button,
          "bg-[var(--bg-tertiary)]",
          "border border-[var(--border-primary)]",
          "text-[var(--text-secondary)]",
          "hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
          "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)]",
          "focus:outline-none",
          "transition-colors duration-[var(--transition-fast)]",
          className
        )}
        onClick={toggleTheme}
      >
        <AnimatePresence
          initial={false}
          mode="wait"
        >
          <motion.div
            key={isDark ? "dark" : "light"}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            className="flex items-center justify-center"
            exit={{ y: 16, opacity: 0, rotate: 90 }}
            initial={{ y: -16, opacity: 0, rotate: -90 }}
            transition={{ duration: 0.15 }}
          >
            {isDark ? (
              <Moon
                className="text-[var(--primary-light)]"
                size={s.icon}
              />
            ) : (
              <Sun
                className="text-[var(--warning)]"
                size={s.icon}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.button>
    );
  }

  // ─── Switch variant ─────────────────────────────────────────────
  if (variant === "switch") {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        {showLabel ? (
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {isDark ? "Dark" : "Light"}
          </span>
        ) : null}
        <button
          aria-checked={isDark}
          aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
          role="switch"
          className={cn(
            "relative cursor-pointer rounded-full",
            s.switch,
            "bg-[var(--toggle-bg-off)]",
            "transition-colors duration-[var(--transition-fast)]",
            "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)]",
            "focus:outline-none",
            isDark && "bg-[var(--toggle-bg-on)]"
          )}
          onClick={toggleTheme}
        >
          <motion.div
            animate={{ x: isDark ? s.knobTravel : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={cn(
              "absolute top-1 left-1",
              s.knob,
              "flex items-center justify-center rounded-full",
              "bg-[var(--toggle-knob)]",
              "shadow-[var(--shadow-sm)]"
            )}
          >
            {isDark ? (
              <Moon
                className="text-[var(--primary)]"
                size={s.knobIcon}
              />
            ) : (
              <Sun
                className="text-[var(--warning)]"
                size={s.knobIcon}
              />
            )}
          </motion.div>
        </button>
      </div>
    );
  }

  // ─── Pill variant (light / dark / system) ───────────────────────
  if (variant === "pill") {
    const options: { value: Theme; icon: React.ReactNode; label: string }[] = [
      {
        value: "light",
        icon: <Sun size={14} />,
        label: "Light",
      },
      {
        value: "dark",
        icon: <Moon size={14} />,
        label: "Dark",
      },
      {
        value: "system",
        icon: <Monitor size={14} />,
        label: "System",
      },
    ];

    return (
      <div
        className={cn(
          "inline-flex rounded-[var(--radius-lg)] p-1",
          "bg-[var(--bg-tertiary)]",
          "border border-[var(--border-primary)]",
          className
        )}
      >
        {options.map((option) => {
          const isActive = theme === option.value;

          return (
            <button
              key={option.value}
              aria-label={`Use ${option.label} theme`}
              aria-pressed={isActive}
              className={cn(
                "relative cursor-pointer rounded-[var(--radius-md)] px-3 py-1.5",
                "text-sm font-medium",
                "transition-colors duration-[var(--transition-fast)]",
                "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-inset",
                "focus:outline-none",
                isActive
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              )}
              onClick={() => setTheme(option.value)}
            >
              {isActive ? (
                <motion.div
                  layoutId="activeTheme"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={cn(
                    "absolute inset-0 rounded-[var(--radius-md)]",
                    "bg-[var(--surface)]",
                    "shadow-[var(--shadow-sm)]",
                    "border border-[var(--border-secondary)]"
                  )}
                />
              ) : null}
              <span className="relative z-10 flex items-center gap-1.5">
                {option.icon}
                {showLabel ? option.label : null}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // ─── Minimal variant ────────────────────────────────────────────
  if (variant === "minimal") {
    return (
      <button
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        className={cn(
          "group flex cursor-pointer items-center gap-2",
          "rounded-[var(--radius-lg)] px-3 py-2",
          "text-[var(--text-secondary)]",
          "hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
          "focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          "focus:outline-none",
          "transition-colors duration-[var(--transition-fast)]",
          className
        )}
        onClick={toggleTheme}
      >
        <motion.div
          animate={{ rotate: isDark ? 0 : 180 }}
          className="flex items-center justify-center"
          initial={false}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          {isDark ? (
            <Moon
              className="text-[var(--primary-light)]"
              size={s.icon}
            />
          ) : (
            <Sun
              className="text-[var(--warning)]"
              size={s.icon}
            />
          )}
        </motion.div>
        {showLabel ? (
          <span className="text-sm font-medium">
            {isDark ? "Dark mode" : "Light mode"}
          </span>
        ) : null}
      </button>
    );
  }

  return null;
};

export default ThemeToggle;
