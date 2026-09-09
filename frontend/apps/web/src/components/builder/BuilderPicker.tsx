import { cn, useClickOutside } from "@packages/ui";
import { ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import {
  ENABLED_BUILDERS,
  buildBuilderUrl,
  type ProjectBuilder,
} from "@/lib/builders";

interface BuilderPickerProps {
  /** Project the builders belong to - used to scope navigation URLs. */
  projectId: string;
  /** Id of the currently open builder (e.g. "map", "story-map") for highlighting. */
  hostId: string;
  /** The clickable trigger rendered in the top bar. */
  trigger: ReactNode;
  /**
   * Optional extra content rendered at the bottom of the picker
   * (e.g. a "Published maps" control on the Map builder top bar).
   */
  footer?: ReactNode;
  /** Extra classes applied to the popover panel. */
  className?: string;
}

/**
 * "General builder" top-bar picker.
 *
 * Opens a small panel listing every enabled project builder. Clicking one
 * navigates to that builder's page, scoped to the current project via
 * `?projectId=`. Because it renders from `ENABLED_BUILDERS`, new builders
 * declared in `lib/builders.tsx` appear here automatically.
 */
export const BuilderPicker = ({
  projectId,
  hostId,
  trigger,
  footer,
  className,
}: BuilderPickerProps) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useClickOutside<HTMLDivElement>(
    () => setIsOpen(false),
    isOpen
  );

  function handleSelect(builder: ProjectBuilder) {
    setIsOpen(false);
    navigate(buildBuilderUrl(builder.id, projectId, builder.openParams));
  }

  return (
    <div
      ref={containerRef}
      aria-expanded={isOpen}
      aria-haspopup="menu"
      className="relative inline-block"
      role="button"
      tabIndex={0}
      onClick={() => setIsOpen((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsOpen((v) => !v);
        }
        if (e.key === "Escape") setIsOpen(false);
      }}
    >
      {trigger}

      {isOpen ? (
        <div
          aria-label="Project builders"
          role="menu"
          className={cn(
            "absolute top-full right-0 z-50 mt-2 w-80",
            "rounded-2xl border border-[var(--border-primary)]",
            "bg-[var(--bg-elevated)] shadow-[var(--shadow-xl)]",
            "animate-fade-in-up overflow-hidden",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Picker header */}
          <div className="px-4 pt-3.5 pb-2">
            <div className="text-xs font-semibold tracking-widest text-[var(--text-tertiary)] uppercase">
              Builders
            </div>
            <div className="mt-0.5 text-[0.7rem] text-[var(--text-tertiary)]">
              Open a builder for this project
            </div>
          </div>

          {/* Builder list */}
          <div className="flex flex-col gap-0.5 px-1.5 pb-1.5">
            {ENABLED_BUILDERS.map((builder) => {
              const Icon = builder.icon;
              const isActive = builder.id === hostId;
              return (
                <button
                  key={builder.id}
                  role="menuitem"
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left",
                    "cursor-pointer transition-colors duration-150",
                    "hover:bg-[var(--surface-hover)]",
                    isActive && "bg-[var(--surface-active)]"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(builder);
                  }}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      builder.iconClassName ?? "text-primary bg-primary/10"
                    )}
                  >
                    <Icon size={17} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-sm font-semibold",
                        "text-[var(--text-primary)]"
                      )}
                    >
                      {builder.label}
                    </span>
                    <span className="block text-xs leading-snug text-[var(--text-tertiary)]">
                      {builder.description}
                    </span>
                  </span>

                  <ChevronRight
                    className="shrink-0 text-[var(--text-tertiary)]"
                    size={15}
                  />
                </button>
              );
            })}
          </div>

          {/* Optional footer slot */}
          {footer ? (
            <div className="border-t border-[var(--border-primary)] px-1.5 py-1.5">
              {footer}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
