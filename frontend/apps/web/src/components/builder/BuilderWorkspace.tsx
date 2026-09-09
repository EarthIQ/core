import { cn } from "@packages/ui";
import { Plus, Trash2 } from "lucide-react";
import { type ReactNode } from "react";

import type { BuilderIcon } from "@/lib/builders";

interface BuilderWorkspaceProps {
  /** Left rail - the builder's own list (scenes/slides/sections/forms). */
  sidebar: ReactNode;
  /** Main editor canvas. */
  main: ReactNode;
  className?: string;
  sidebarClassName?: string;
}

/**
 * Two-column shell shared by every builder editor:
 *
 *   ┌──────────────┬────────────────────────────┐
 *   │ sidebar      │  main editor canvas        │
 *   │ (list + add) │  (editor / preview)        │
 *   └──────────────┴────────────────────────────┘
 *
 * Builders pass their own sidebar and canvas here so every page gets the same
 * structure (list on the left, workspace on the right) while staying fully
 * self-contained and easy to extend later.
 */
export const BuilderWorkspace = ({
  sidebar,
  main,
  className,
  _sidebarClassName,
}: BuilderWorkspaceProps) => {
  return (
    <div className={cn("mt-6 flex items-start gap-5", className)}>
      <aside
        className={cn(
          "w-64 shrink-0 rounded-2xl border border-[var(--border-primary)]",
          "bg-[var(--bg-elevated)] p-3",
          "sticky top-6 max-h-[calc(100vh-9rem)] overflow-y-auto"
        )}
      >
        {sidebar}
      </aside>
      <main className="min-w-0 flex-1">{main}</main>
    </div>
  );
};

/* ── Reusable sidebar pieces ────────────────────────────────────────────── */

interface SidebarHeaderProps {
  icon?: BuilderIcon;
  title: string;
  addLabel?: string;
  onAdd?: () => void;
}

/** Label row + "Add" action at the top of a builder sidebar. */
export const SidebarHeader = ({
  icon: Icon,
  title,
  addLabel = "Add",
  onAdd,
}: SidebarHeaderProps) => {
  return (
    <div className="flex items-center justify-between gap-2 px-1 pb-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-[var(--text-tertiary)] uppercase">
        {Icon ? <Icon size={13} /> : null}
        {title}
      </div>
      {onAdd ? (
        <button
          aria-label={`${addLabel} ${title}`}
          className="text-primary hover:bg-primary/10 flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors"
          type="button"
          onClick={onAdd}
        >
          <Plus size={13} />
          {addLabel}
        </button>
      ) : null}
    </div>
  );
};

interface SidebarItemProps {
  icon?: BuilderIcon;
  title: string;
  subtitle?: string;
  active?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}

/** One row in a builder sidebar list - click to open, trash to remove. */
export const SidebarItem = ({
  icon: Icon,
  title,
  subtitle,
  active = false,
  onClick,
  onDelete,
}: SidebarItemProps) => {
  return (
    <div
      className={cn(
        "group relative flex w-full items-start gap-1 rounded-xl pr-1 transition-colors duration-150",
        active
          ? "bg-[var(--surface-active)]"
          : "hover:bg-[var(--surface-hover)]"
      )}
    >
      <button
        className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 rounded-xl px-2.5 py-2 text-left"
        type="button"
        onClick={onClick}
      >
        {Icon ? (
          <span
            className={cn(
              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
              active
                ? "bg-primary/10 text-primary"
                : "bg-[var(--surface-hover)] text-[var(--text-secondary)]"
            )}
          >
            <Icon size={14} />
          </span>
        ) : null}
        <span className="min-w-0">
          <span
            className={cn(
              "block truncate text-sm font-medium",
              active
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-secondary)]"
            )}
          >
            {title}
          </span>
          {subtitle ? (
            <span className="block truncate text-xs text-[var(--text-tertiary)]">
              {subtitle}
            </span>
          ) : null}
        </span>
      </button>
      {onDelete ? (
        <button
          aria-label={`Remove ${title}`}
          className="mt-2 shrink-0 cursor-pointer rounded-md p-1 text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--surface-hover)] hover:text-[var(--error-text)]"
          type="button"
          onClick={onDelete}
        >
          <Trash2 size={13} />
        </button>
      ) : null}
    </div>
  );
};

/* ── Reusable editor canvas ─────────────────────────────────────────────── */

interface EditorPlaceholderProps {
  icon: BuilderIcon;
  title: string;
  description: string;
  actions?: ReactNode;
}

/** A builder's main canvas before the real editor is implemented. */
export const EditorPlaceholder = ({
  icon: Icon,
  title,
  description,
  actions,
}: EditorPlaceholderProps) => {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-primary)] bg-[var(--bg-secondary)] px-6 py-12 text-center">
      <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl">
        <Icon size={24} />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--text-tertiary)]">
        {description}
      </p>
      {actions}
    </div>
  );
};
