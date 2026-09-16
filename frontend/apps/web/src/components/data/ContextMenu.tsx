import { cn } from "@packages/ui";
import { useEffect } from "react";

import type { ReactNode } from "react";

export interface ContextMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
  disabled?: boolean;
}

interface Props {
  /** Viewport (client) coordinates where the menu was invoked. */
  x: number;
  y: number;
  /** Optional bold heading shown above the items (e.g. the item name). */
  title?: string;
  items: ContextMenuItem[];
  onClose: () => void;
}

/**
 * Lightweight right-click context menu rendered at a viewport coordinate.
 * Closes on outside click, Escape, scroll, or resize. Deliberately kept
 * dependency-free (no portal lib) so it works inside the Explorer list.
 */
export default function ContextMenu({ x, y, title, items, onClose }: Props) {
  const menuW = 232;

  // Clamp the menu inside the viewport on both axes.
  const estH =
    12 + (title ? 34 : 0) + items.filter((i) => !i.divider).length * 34;
  const left = Math.max(8, Math.min(x, window.innerWidth - menuW - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - estH - 8));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    const onDismiss = () => onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onDismiss, true);
    window.addEventListener("resize", onDismiss);
    window.addEventListener("blur", onDismiss);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onDismiss, true);
      window.removeEventListener("resize", onDismiss);
      window.removeEventListener("blur", onDismiss);
    };
  }, [onClose]);

  return (
    <>
      {/* Full-screen, transparent backdrop that swallows the outside click. */}
      <div
        className="fixed inset-0 z-[1000]"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="border-border-primary bg-surface animate-scale-in fixed z-[1001] overflow-hidden rounded-xl border shadow-2xl"
        role="menu"
        style={{
          left,
          top,
          width: menuW,
          maxHeight: "calc(100vh - 16px)",
          overflowY: "auto",
        }}
      >
        {title ? (
          <div className="border-border-secondary bg-surface-hover/40 border-b px-3.5 py-2.5 text-[0.72rem] font-semibold text-[var(--text-secondary)]">
            <span className="text-text-primary truncate font-semibold">
              {title}
            </span>
          </div>
        ) : null}
        <div className="p-1">
          {items.map((item) =>
            item.divider ? (
              <div
                key={item.key}
                className="border-border-secondary mx-1 my-1 h-px border-t"
              />
            ) : (
              <button
                key={item.key}
                disabled={item.disabled}
                role="menuitem"
                type="button"
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors select-none disabled:pointer-events-none disabled:opacity-40",
                  item.danger
                    ? "text-error hover:bg-error/10"
                    : "text-text-primary hover:bg-surface-hover"
                )}
                onClick={() => {
                  item.onClick?.();
                  onClose();
                }}
              >
                {item.icon ? (
                  <span
                    className={cn(
                      "shrink-0",
                      item.danger ? "text-error" : "text-text-tertiary"
                    )}
                  >
                    {item.icon}
                  </span>
                ) : null}
                <span className="truncate">{item.label}</span>
              </button>
            )
          )}
        </div>
      </div>
    </>
  );
}
