import React, { type ReactNode } from "react";
import { cn } from "../../../utils/cn";

interface KbdProps {
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "text-[10px] px-1 py-0.5 min-w-[18px]",
  md: "text-xs px-1.5 py-0.5 min-w-[22px]",
  lg: "text-sm px-2 py-1 min-w-[28px]",
};

export function Kbd({ children, size = "md", className }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center",
        "font-mono font-medium",
        "rounded border border-[var(--border-primary)] bg-[var(--bg-tertiary)]",
        "text-[var(--text-secondary)]",
        // Subtle bottom shadow to mimic physical key appearance
        "shadow-[0_2px_0_0_var(--border-primary)]",
        sizeClasses[size],
        className
      )}
    >
      {children}
    </kbd>
  );
}

// Keyboard Shortcut Group
interface KeyboardShortcutProps {
  keys: string[];
  separator?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function KeyboardShortcut({
  keys,
  separator = "+",
  size = "md",
  className,
}: KeyboardShortcutProps) {
  // Map common key names to symbols
  const keySymbols: Record<string, string> = {
    cmd: "⌘",
    command: "⌘",
    ctrl: "⌃",
    control: "⌃",
    alt: "⌥",
    option: "⌥",
    shift: "⇧",
    enter: "↵",
    return: "↵",
    backspace: "⌫",
    delete: "⌦",
    escape: "Esc",
    esc: "Esc",
    tab: "⇥",
    space: "␣",
    up: "↑",
    down: "↓",
    left: "←",
    right: "→",
  };

  const formatKey = (key: string): string => {
    const lowerKey = key.toLowerCase();
    return keySymbols[lowerKey] || key.toUpperCase();
  };

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <Kbd size={size}>{formatKey(key)}</Kbd>
          {index < keys.length - 1 && (
            <span className="text-xs text-[var(--text-tertiary)]">
              {separator}
            </span>
          )}
        </React.Fragment>
      ))}
    </span>
  );
}
