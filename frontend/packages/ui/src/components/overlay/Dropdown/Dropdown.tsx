import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import { cn } from "../../../utils/cn";
import { useClickOutside } from "../../../hooks/useClickOutside";

interface DropdownItem {
  key: string;
  label?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick?: () => void;
  divider?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
  className?: string;
}

const DropdownMenuItem = ({
  item,
  closeDropdown,
}: {
  item: DropdownItem;
  closeDropdown: () => void;
}) => {
  if (item.divider) {
    return (
      <div
        className="mx-2 my-1 border-t"
        style={{ borderColor: "var(--divider)" }}
        role="separator"
      />
    );
  }

  const enabled = !item.disabled;

  return (
    <button
      type="button"
      role="menuitem"
      disabled={item.disabled}
      onClick={() => {
        if (!item.disabled) {
          item.onClick?.();
          closeDropdown();
        }
      }}
      className={cn(
        "flex w-full items-center gap-3",
        "rounded-[var(--radius-md)] px-3 py-2",
        "text-left text-sm leading-5",
        "transition-colors select-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)]",
        enabled &&
          !item.danger &&
          "cursor-pointer text-[var(--text-primary)] hover:bg-[var(--surface-hover)]",
        enabled &&
          item.danger &&
          "cursor-pointer text-[var(--error-text)] hover:bg-[var(--error-bg)]",
        item.disabled && "cursor-not-allowed opacity-50"
      )}
      style={{ transitionDuration: "var(--transition-fast)" }}
    >
      {/* fixed icon slot (always present to keep label aligned) */}
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center",
          item.icon ? "visible" : "invisible",
          // normalize svg/img size so they don’t mess up alignment
          "[&>svg]:block [&>svg]:h-5 [&>svg]:w-5",
          "[&>img]:block [&>img]:h-5 [&>img]:w-5"
        )}
      >
        {item.icon ?? null}
      </span>

      {/* wrap label so it doesn't create its own block row weirdness */}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </button>
  );
};

export function Dropdown({
  trigger,
  items,
  placement = "bottom-end",
  className,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { x, y, strategy, refs } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    strategy: "fixed",
    middleware: [offset(8), flip(), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  });

  const containerRef = useClickOutside<HTMLDivElement>(
    () => setIsOpen(false),
    isOpen
  );

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
    >
      {/* Keep wrapper as div to avoid nesting <button> if trigger is already a button */}
      <div
        ref={refs.setReference}
        onClick={() => setIsOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((v) => !v);
          }
          if (e.key === "Escape") setIsOpen(false);
        }}
        tabIndex={0}
        className="inline-flex cursor-pointer"
        role="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={refs.setFloating}
            role="menu"
            aria-orientation="vertical"
            style={{
              position: strategy,
              top: y ?? 0,
              left: x ?? 0,
            }}
            className={cn(
              // UI fixes: padding around items, consistent min width, proper z-index
              "z-[var(--z-dropdown)] min-w-48 p-1",
              "bg-[var(--bg-elevated)]",
              "border border-[var(--border-primary)]",
              "rounded-xl shadow-[var(--shadow-lg)]",
              "overflow-hidden",
              className
            )}
            initial={{ opacity: 0, scale: 0.98, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
          >
            {items.map((item) => (
              <DropdownMenuItem
                key={item.key}
                item={item}
                closeDropdown={() => setIsOpen(false)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
