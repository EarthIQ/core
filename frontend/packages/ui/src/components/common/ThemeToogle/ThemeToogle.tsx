import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../../context/ThemeContext";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@packages/ui";

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

export function ThemeToggle({
  variant = "icon",
  size = "md",
  showLabel = false,
  className,
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  const s = sizes[size];
  const isDark = resolvedTheme === "dark";

  // ─── Icon variant ───────────────────────────────────────────────
  if (variant === "icon") {
    return (
      <motion.button
        onClick={toggleTheme}
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
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      >
        <AnimatePresence
          mode="wait"
          initial={false}
        >
          <motion.div
            key={isDark ? "dark" : "light"}
            initial={{ y: -16, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 16, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center"
          >
            {isDark ? (
              <Moon
                size={s.icon}
                className="text-[var(--primary-light)]"
              />
            ) : (
              <Sun
                size={s.icon}
                className="text-[var(--warning)]"
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
        {showLabel && (
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {isDark ? "Dark" : "Light"}
          </span>
        )}
        <button
          onClick={toggleTheme}
          className={cn(
            "relative cursor-pointer rounded-full",
            s.switch,
            "bg-[var(--toggle-bg-off)]",
            "transition-colors duration-[var(--transition-fast)]",
            "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)]",
            "focus:outline-none",
            isDark && "bg-[var(--toggle-bg-on)]"
          )}
          role="switch"
          aria-checked={isDark}
          aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        >
          <motion.div
            className={cn(
              "absolute top-1 left-1",
              s.knob,
              "flex items-center justify-center rounded-full",
              "bg-[var(--toggle-knob)]",
              "shadow-[var(--shadow-sm)]"
            )}
            animate={{ x: isDark ? s.knobTravel : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {isDark ? (
              <Moon
                size={s.knobIcon}
                className="text-[var(--primary)]"
              />
            ) : (
              <Sun
                size={s.knobIcon}
                className="text-[var(--warning)]"
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
              onClick={() => setTheme(option.value)}
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
              aria-label={`Use ${option.label} theme`}
              aria-pressed={isActive}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTheme"
                  className={cn(
                    "absolute inset-0 rounded-[var(--radius-md)]",
                    "bg-[var(--surface)]",
                    "shadow-[var(--shadow-sm)]",
                    "border border-[var(--border-secondary)]"
                  )}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {option.icon}
                {showLabel && option.label}
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
        onClick={toggleTheme}
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
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      >
        <motion.div
          initial={false}
          animate={{ rotate: isDark ? 0 : 180 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="flex items-center justify-center"
        >
          {isDark ? (
            <Moon
              size={s.icon}
              className="text-[var(--primary-light)]"
            />
          ) : (
            <Sun
              size={s.icon}
              className="text-[var(--warning)]"
            />
          )}
        </motion.div>
        {showLabel && (
          <span className="text-sm font-medium">
            {isDark ? "Dark mode" : "Light mode"}
          </span>
        )}
      </button>
    );
  }

  return null;
}

export default ThemeToggle;
