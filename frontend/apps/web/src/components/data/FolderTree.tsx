import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Database,
  Folder,
  FolderOpen,
  FolderX,
  HardDrive,
  Layers,
  Sparkles,
  Tag,
} from "lucide-react";
import { cn } from "@packages/ui";
import { formatBytes } from "../../lib/datasets";
import { TYPES } from "./constants";
import { formatLucide, typeLabel, typeLucide } from "./helpers";
import type { DatasetItem } from "./types";

/** Current folder selection in the tree (single-select navigation). */
export interface FolderSelection {
  /** "all" or a dataset type value */
  type: string;
  /** active tag collection, or null. "__untagged__" = datasets without tags */
  tag: string | null;
}

interface Props {
  datasets: DatasetItem[];
  loading: boolean;
  selection: FolderSelection;
  onNavigate: (sel: FolderSelection) => void;
  /** Open a dataset's preview (leaf click). */
  onOpenDataset: (ds: DatasetItem) => void;
}

/**
 * Folder-tree browser for the dataset catalog.
 */
export default function FolderTree({
  datasets,
  loading,
  selection,
  onNavigate,
  onOpenDataset,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // ── Derived groups ─────────────────────────────────────────────────────────
  const tagGroups = useMemo(() => {
    const map = new Map<string, DatasetItem[]>();
    datasets.forEach((d) => {
      (d.tags ?? []).forEach((t) => {
        const list = map.get(t) ?? [];
        list.push(d);
        map.set(t, list);
      });
    });
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]) || b[1].length - a[1].length,
    );
  }, [datasets]);

  const untagged = useMemo(
    () => datasets.filter((d) => !d.tags || d.tags.length === 0),
    [datasets],
  );

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    TYPES.forEach((t) => (counts[t.value] = 0));
    datasets.forEach((d) => {
      counts[d.type] = (counts[d.type] ?? 0) + 1;
    });
    return counts;
  }, [datasets]);

  const totalBytes = useMemo(
    () => datasets.reduce((s, d) => s + (d.file_size_bytes ?? 0), 0),
    [datasets],
  );

  const tiledCount = useMemo(
    () =>
      datasets.filter(
        (d) => d.meta?.ingested || d.type === "vector" || d.type === "points",
      ).length,
    [datasets],
  );

  // ── Expansion helpers ──────────────────────────────────────────────────────
  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function expand(key: string) {
    setExpanded((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }

  const isAllActive = selection.type === "all" && !selection.tag;
  const activeTagActive = (tag: string) => selection.tag === tag;
  const activeTypeActive = (t: string) =>
    selection.type === t && selection.tag === null;

  // ── Row renderer ───────────────────────────────────────────────────────────
  function renderRow(opts: {
    key: string;
    icon: React.ReactNode;
    label: string;
    count?: number;
    active?: boolean;
    indent?: number;
    chevron?: "open" | "closed" | null;
    onChevron?: () => void;
    onClick: () => void;
    dim?: boolean;
  }) {
    const {
      key,
      icon,
      label,
      count,
      active,
      indent = 0,
      chevron = null,
      onChevron,
      onClick,
      dim,
    } = opts;
    return (
      <div
        key={key}
        className="flex items-center gap-1 rounded-lg group"
        style={{ paddingLeft: indent * 14 }}
      >
        {chevron !== null && (
          <button
            type="button"
            aria-label={
              chevron === "open" ? `Collapse ${label}` : `Expand ${label}`
            }
            onClick={(e) => {
              e.stopPropagation();
              onChevron?.();
            }}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
              "text-text-tertiary hover:bg-surface-hover hover:text-text-primary",
              "transition-colors cursor-pointer",
            )}
          >
            {chevron === "open" ? (
              <ChevronDown size={13} />
            ) : (
              <ChevronRight size={13} />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={onClick}
          aria-current={active ? "true" : undefined}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5",
            "text-left text-xs transition-all duration-150 cursor-pointer font-medium",
            active
              ? "bg-primary/10 text-primary font-semibold shadow-xs"
              : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
            dim && !active && "text-text-tertiary",
          )}
        >
          <span
            className={cn(
              "shrink-0 transition-colors",
              active
                ? "text-primary"
                : "text-text-tertiary group-hover:text-text-secondary",
            )}
          >
            {icon}
          </span>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {typeof count === "number" && (
            <span
              className={cn(
                "shrink-0 text-[0.65rem] px-1.5 py-0.5 rounded-full tabular-nums font-semibold",
                active
                  ? "bg-primary/20 text-primary"
                  : "bg-surface-hover text-text-tertiary group-hover:text-text-secondary",
              )}
            >
              {count}
            </span>
          )}
        </button>
      </div>
    );
  }

  // ── Dataset leaf rows ──────────────────────────────────────────────────────
  function renderLeafList(items: DatasetItem[]) {
    return (
      <div className="flex flex-col gap-0.5 mt-0.5">
        {items
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((ds) => {
            const FIcon = formatLucide(ds.format);
            return renderRow({
              key: `ds:${ds.id}`,
              indent: 1,
              icon: <FIcon size={13} />,
              label: ds.name,
              dim: true,
              onClick: () => onOpenDataset(ds),
            });
          })}
      </div>
    );
  }

  // ── Loading placeholder ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="card p-4 flex flex-col gap-3 bg-surface border border-border-primary rounded-xl" aria-busy="true">
        <div className="skeleton h-4 w-24 rounded" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="skeleton h-8 rounded-lg"
            style={{ width: `${92 - i * 8}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="card p-3 bg-surface border border-border-primary rounded-xl flex flex-col gap-4 shadow-xs">
      <nav
        aria-label="Dataset library"
        className="flex flex-col gap-4 max-h-[calc(100vh-20rem)] overflow-y-auto scrollbar-thin pr-1"
      >
        {/* ── Library ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <div className="px-2.5 pb-1 text-[0.65rem] font-bold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
            <Sparkles size={11} className="text-primary" />
            <span>Library</span>
          </div>
          {renderRow({
            key: "all",
            icon: <Database size={15} />,
            label: "All Datasets",
            count: datasets.length,
            active: isAllActive,
            onClick: () => onNavigate({ type: "all", tag: null }),
          })}
        </div>

        {/* ── Collections (tag folders) ─────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <div className="px-2.5 pb-1 text-[0.65rem] font-bold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
            <Tag size={11} className="text-accent" />
            <span>Collections</span>
          </div>

          {tagGroups.length === 0 && untagged.length === 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-surface-hover px-2.5 py-2">
              <FolderX size={14} className="mt-0.5 shrink-0 text-text-tertiary" />
              <p className="text-[0.7rem] leading-snug text-text-tertiary">
                No collections yet. Add tags to organize datasets as folders.
              </p>
            </div>
          )}

          {tagGroups.map(([tag, items]) => {
            const key = `tag:${tag}`;
            const isOpen = expanded.has(key);
            const active = activeTagActive(tag);
            return (
              <div key={key}>
                {renderRow({
                  key: `row:${key}`,
                  icon: isOpen ? <FolderOpen size={14} /> : <Folder size={14} />,
                  label: tag,
                  count: items.length,
                  active,
                  chevron: "open",
                  onChevron: () => toggleExpand(key),
                  onClick: () => {
                    onNavigate({ type: "all", tag });
                    expand(key);
                  },
                })}
                {isOpen && renderLeafList(items)}
              </div>
            );
          })}

          {untagged.length > 0 &&
            (() => {
              const key = "tag:untagged";
              const isOpen = expanded.has(key);
              const active = activeTagActive("__untagged__");
              return (
                <div>
                  {renderRow({
                    key: `row:${key}`,
                    icon: isOpen ? <FolderOpen size={14} /> : <FolderX size={14} />,
                    label: "Ungrouped",
                    count: untagged.length,
                    active,
                    chevron: "open",
                    onChevron: () => toggleExpand(key),
                    onClick: () => {
                      onNavigate({ type: "all", tag: "__untagged__" });
                      expand(key);
                    },
                  })}
                  {isOpen && renderLeafList(untagged)}
                </div>
              );
            })()}
        </div>

        {/* ── Types ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <div className="px-2.5 pb-1 text-[0.65rem] font-bold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
            <Layers size={11} className="text-secondary" />
            <span>Formats & Types</span>
          </div>
          {TYPES.map((t) => {
            const TIcon = typeLucide(t.value);
            return renderRow({
              key: `type:${t.value}`,
              icon: <TIcon size={14} />,
              label: typeLabel(t.value),
              count: typeCounts[t.value] ?? 0,
              active: activeTypeActive(t.value),
              onClick: () =>
                onNavigate({
                  type: activeTypeActive(t.value) ? "all" : t.value,
                  tag: null,
                }),
            });
          })}
        </div>
      </nav>

      {/* ── Storage meter footer ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-border-secondary bg-surface-hover/40 p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
          <div className="flex items-center gap-1.5">
            <HardDrive size={13} className="text-primary shrink-0" />
            <span>Catalog Usage</span>
          </div>
          <span className="text-[0.7rem] text-text-tertiary font-mono">
            {formatBytes(totalBytes)}
          </span>
        </div>
        <div className="w-full bg-border-secondary h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(8, datasets.length * 8))}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[0.68rem] text-text-tertiary">
          <span>{tiledCount} vectorized layer{tiledCount === 1 ? "" : "s"}</span>
          <span>{datasets.length} dataset{datasets.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}

