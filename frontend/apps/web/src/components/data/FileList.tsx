import { Checkbox, EmptyState, cn } from "@packages/ui";
import {
  Database,
  Folder,
  FolderOpen,
  Hash,
  Layers,
  MoreHorizontal,
  PackageOpen,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { formatBytes, type DataFolder } from "@/lib/datasets";

import {
  featureCountLabel,
  formatColor,
  formatLucide,
  isStoredAsset,
  isVectorized,
  typeLabel,
} from "./helpers";

import type { DatasetItem, ViewMode } from "./types";

export const DATASET_DND_MIME = "application/x-eartheniq-datasets";

interface Props {
  // Data
  folders: DataFolder[];
  items: DatasetItem[];
  loading: boolean;

  // Presentation / selection
  viewMode: ViewMode;
  selectedIds: Set<string>;
  activeDatasetId: string | null;
  allOnPageSelected: boolean;

  // Folder actions
  onOpenFolder: (id: string) => void;
  onFolderContextMenu: (
    folder: { id: string; name: string },
    pos: { clientX: number; clientY: number }
  ) => void;

  // Dataset selection / activation / menu
  onSingleSelect: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onActivate: (ds: DatasetItem) => void;
  onDatasetContextMenu: (
    ds: DatasetItem,
    pos: { clientX: number; clientY: number }
  ) => void;

  // Drag-and-drop (move dataset(s) into a folder)
  onDropDatasetsOnFolder: (folderId: string, ids: string[]) => void;

  // Empty / misc
  activeFilterCount: number;
  onClearFilters: () => void;
  onAddData: () => void;
}

/**
 * The main Explorer content pane: subfolders rendered as large tiles first
 * (open / new-subfolder / rename / delete, and drag-drop targets), then the
 * datasets in a Details table or Grid of cards. Handles single / multi
 * selection, activation (double-click or Enter), right-click menus, and
 * drag-and-drop moving of datasets into folders.
 */
export default function FileList(props: Props) {
  const {
    folders,
    items,
    loading,
    viewMode,
    selectedIds,
    activeDatasetId,
    allOnPageSelected,
    onOpenFolder,
    onFolderContextMenu,
    onSingleSelect,
    onToggleSelect,
    onToggleSelectAll,
    onActivate,
    onDatasetContextMenu,
    onDropDatasetsOnFolder,
    activeFilterCount,
    onClearFilters,
    onAddData,
  } = props;

  // Folder currently being hovered as a drop target.
  const [dropId, setDropId] = useState<string | null>(null);

  // ── Drag-and-drop helpers ──────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, ds: DatasetItem) => {
    const ids = selectedIds.has(ds.id) ? Array.from(selectedIds) : [ds.id];
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(DATASET_DND_MIME, JSON.stringify(ids));
    e.dataTransfer.setData("text/plain", ds.name);
  };

  const handleFolderDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDropId(null);
    const raw = e.dataTransfer.getData(DATASET_DND_MIME);
    if (!raw) return;
    try {
      const ids = JSON.parse(raw) as string[];
      if (Array.isArray(ids) && ids.length)
        onDropDatasetsOnFolder(folderId, ids);
    } catch {
      /* ignore malformed payloads */
    }
  };

  return (
    <div className="border-border-primary bg-surface overflow-hidden rounded-xl border shadow-xs">
      {/* ── Folders (tiles) ────────────────────────────────────────────────── */}
      {folders.length > 0 && (
        <div className="border-border-secondary border-b px-4 pt-4 pb-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-text-tertiary text-[0.68rem] font-bold tracking-wider uppercase">
              Folders
            </span>
            <span className="text-text-tertiary text-[0.68rem] tabular-nums">
              {folders.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {folders.map((f) => {
              const isDropTarget = dropId === f.id;
              const hasChildren = f.child_folder_count > 0;
              return (
                <div
                  key={f.id}
                  aria-label={`Open folder ${f.name}`}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "group relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-all select-none",
                    isDropTarget
                      ? "border-primary bg-primary/[0.08] ring-2 ring-[color-mix(in_oklch,var(--primary)_35%,transparent)]"
                      : "border-border-secondary bg-surface-hover/30 hover:border-border-hover hover:bg-surface-hover/60"
                  )}
                  onClick={() => onOpenFolder(f.id)}
                  onDoubleClick={() => onOpenFolder(f.id)}
                  onDrop={(e) => handleFolderDrop(e, f.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onFolderContextMenu(f, e);
                  }}
                  onDragLeave={() =>
                    setDropId((cur) => (cur === f.id ? null : cur))
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDropId(f.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpenFolder(f.id);
                    }
                  }}
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                      isDropTarget
                        ? "bg-primary/15 text-primary"
                        : "bg-primary/[0.08] text-primary group-hover:bg-primary/15"
                    )}
                  >
                    {hasChildren ? (
                      <FolderOpen size={24} />
                    ) : (
                      <Folder size={24} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-text-primary truncate text-xs font-semibold"
                      title={f.name}
                    >
                      {f.name}
                    </div>
                    <div className="text-text-tertiary mt-0.5 truncate text-[0.65rem]">
                      {f.dataset_count} dataset
                      {f.dataset_count === 1 ? "" : "s"}
                    </div>
                  </div>

                  {/* Hover quick-action: open the folder menu */}
                  <button
                    aria-label={`More actions for ${f.name}`}
                    className="text-text-tertiary hover:bg-surface-active hover:text-text-primary absolute top-2 right-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                    type="button"
                    onContextMenu={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const r = (
                        e.currentTarget as HTMLElement
                      ).getBoundingClientRect();
                      onFolderContextMenu(f, {
                        clientX: r.left,
                        clientY: r.bottom + 4,
                      });
                    }}
                  >
                    <MoreHorizontal size={15} />
                  </button>

                  {isDropTarget ? (
                    <span className="bg-primary text-[0.6rem] font-bold tracking-wide uppercase">
                      Drop to move
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* ── Datasets ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="border-border-secondary divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3.5"
            >
              <div className="skeleton h-9 w-9 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 w-1/3 rounded" />
                <div className="skeleton h-3 w-1/4 rounded" />
              </div>
              <div className="skeleton hidden h-3.5 w-16 rounded md:block" />
              <div className="skeleton hidden h-3.5 w-14 rounded lg:block" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        folders.length === 0 ? (
          <div className="p-6">
            <EmptyState
              action={
                activeFilterCount > 0
                  ? { label: "Clear all filters", onClick: onClearFilters }
                  : { label: "Upload dataset", onClick: onAddData }
              }
              description={
                activeFilterCount > 0
                  ? "Try adjusting your search or filters to find what you need."
                  : "Upload your first geospatial dataset to start building your catalog."
              }
              icon={
                <Database
                  className="text-primary"
                  size={28}
                />
              }
              title={
                activeFilterCount > 0
                  ? "No matching datasets"
                  : "No datasets yet"
              }
            />
          </div>
        ) : (
          <div className="text-text-tertiary flex flex-col items-center gap-1 px-4 py-8 text-center">
            <PackageOpen
              className="text-text-tertiary"
              size={22}
            />
            <span className="text-xs">
              No datasets in this folder — drop one here, or upload new data.
            </span>
          </div>
        )
      ) : viewMode === "details" ? (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead>
              <tr className="border-border-secondary bg-surface-hover/40 text-text-tertiary border-b text-[0.66rem] font-bold tracking-wider uppercase">
                <th className="w-11 px-3 py-2.5 text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      aria-label="Select all on page"
                      checked={allOnPageSelected}
                      indeterminate={selectedIds.size > 0 && !allOnPageSelected}
                      size="sm"
                      onChange={(e) => onToggleSelectAll(e.target.checked)}
                    />
                  </div>
                </th>
                <th className="px-3 py-2.5">Name</th>
                <th className="hidden px-3 py-2.5 lg:table-cell">Type</th>
                <th className="px-3 py-2.5">Format</th>
                <th className="hidden px-3 py-2.5 md:table-cell">Records</th>
                <th className="hidden px-3 py-2.5 text-right md:table-cell">
                  Size
                </th>
                <th className="hidden px-3 py-2.5 xl:table-cell">Modified</th>
                <th className="w-11 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className="border-border-secondary divide-y">
              {items.map((d) => {
                const selected = selectedIds.has(d.id);
                const active = activeDatasetId === d.id;
                const colors = formatColor(d.format);
                const FIcon = formatLucide(d.format);
                return (
                  <tr
                    key={d.id}
                    draggable
                    className={cn(
                      "group cursor-pointer transition-colors select-none",
                      active
                        ? "bg-primary/[0.08]"
                        : "hover:bg-surface-hover/50",
                      selected && !active && "bg-primary/[0.04]"
                    )}
                    onDoubleClick={() => onActivate(d)}
                    onDragStart={(e) => handleDragStart(e, d)}
                    onClick={(e) => {
                      const additive = e.ctrlKey || e.metaKey;
                      if (additive) onToggleSelect(d.id);
                      else onSingleSelect(d.id);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onDatasetContextMenu(d, e);
                    }}
                  >
                    <td
                      className="px-3 py-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-center">
                        <Checkbox
                          aria-label={`Select ${d.name}`}
                          checked={selected}
                          size="sm"
                          onChange={() => onToggleSelect(d.id)}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                            colors.bg,
                            colors.text,
                            colors.border
                          )}
                        >
                          <FIcon size={17} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-text-primary flex items-center gap-2 text-sm font-medium">
                            <span className="truncate">{d.name}</span>
                            {isVectorized(d) ? (
                              <span
                                className="bg-accent/10 text-accent hidden shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[0.58rem] font-semibold sm:inline-flex"
                                title="Tiled MVT layer"
                              >
                                <Layers size={9} /> Tiled
                              </span>
                            ) : null}
                          </div>
                          {d.tags && d.tags.length > 0 ? (
                            <div className="text-text-tertiary mt-0.5 truncate text-[0.66rem]">
                              {d.tags
                                .slice(0, 3)
                                .map((t) => `#${t}`)
                                .join("  ")}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 lg:table-cell">
                      <span className="text-text-secondary text-xs font-medium">
                        {typeLabel(d.type)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn("text-xs font-semibold", colors.text)}
                      >
                        {d.format}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 md:table-cell">
                      <span className="text-text-secondary text-xs tabular-nums">
                        {featureCountLabel(d)}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 text-right md:table-cell">
                      <span className="text-text-secondary text-xs tabular-nums">
                        {formatBytes(d.file_size_bytes)}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 xl:table-cell">
                      <span className="text-text-tertiary text-xs tabular-nums">
                        {d.updated_at ? d.updated_at.slice(0, 10) : "—"}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <button
                        aria-label={`More actions for ${d.name}`}
                        className="text-text-tertiary hover:bg-surface-active hover:text-text-primary flex h-7 w-7 cursor-pointer items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                        type="button"
                        onContextMenu={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          const r = (
                            e.currentTarget as HTMLElement
                          ).getBoundingClientRect();
                          onDatasetContextMenu(d, {
                            clientX: r.left,
                            clientY: r.bottom + 4,
                          });
                        }}
                      >
                        <MoreHorizontal size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((d) => {
            const selected = selectedIds.has(d.id);
            const active = activeDatasetId === d.id;
            const colors = formatColor(d.format);
            const FIcon = formatLucide(d.format);
            const stored = isStoredAsset(d);
            const vectorized = isVectorized(d);
            return (
              <div
                key={d.id}
                draggable
                aria-pressed={selected}
                role="button"
                tabIndex={0}
                className={cn(
                  "group relative flex cursor-pointer flex-col gap-3 rounded-xl border p-3.5 transition-all select-none",
                  active
                    ? "border-primary bg-primary/[0.06]"
                    : "border-border-secondary hover:border-border-hover hover:bg-surface-hover/40",
                  selected && !active && "border-primary/50 bg-primary/[0.03]"
                )}
                onDoubleClick={() => onActivate(d)}
                onDragStart={(e) => handleDragStart(e, d)}
                onClick={(e) => {
                  const additive = e.ctrlKey || e.metaKey;
                  if (additive) onToggleSelect(d.id);
                  else onSingleSelect(d.id);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onDatasetContextMenu(d, e);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onActivate(d);
                  } else if (e.key === " ") {
                    e.preventDefault();
                    onToggleSelect(d.id);
                  }
                }}
              >
                {/* Header: icon + name + menu */}
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
                      colors.bg,
                      colors.text,
                      colors.border
                    )}
                  >
                    <FIcon size={21} />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div
                      className="text-text-primary truncate text-sm font-semibold"
                      title={d.name}
                    >
                      {d.name}
                    </div>
                    <div className="text-text-tertiary mt-0.5 text-[0.68rem]">
                      {typeLabel(d.type)} · {d.format}
                    </div>
                  </div>
                  <button
                    aria-label={`More actions for ${d.name}`}
                    className="text-text-tertiary hover:bg-surface-active hover:text-text-primary flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                    type="button"
                    onContextMenu={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const r = (
                        e.currentTarget as HTMLElement
                      ).getBoundingClientRect();
                      onDatasetContextMenu(d, {
                        clientX: r.left,
                        clientY: r.bottom + 4,
                      });
                    }}
                  >
                    <MoreHorizontal size={15} />
                  </button>
                </div>
                {/* Badges: Tiled / Stored / tags */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {vectorized ? (
                    <span className="bg-accent/10 text-accent border-accent/20 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.62rem] font-medium">
                      <Layers size={10} /> Tiled
                    </span>
                  ) : null}
                  {stored ? (
                    <span className="bg-info/10 text-info border-info/20 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.62rem] font-medium">
                      <PackageOpen size={10} /> Stored
                    </span>
                  ) : null}
                  {d.tags
                    ? d.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="bg-surface-hover text-text-secondary border-border-secondary rounded border px-1.5 py-0.5 text-[0.62rem] font-medium"
                        >
                          #{t}
                        </span>
                      ))
                    : null}
                  {d.tags && d.tags.length > 3 ? (
                    <span className="text-text-tertiary text-[0.62rem]">
                      +{d.tags.length - 3}
                    </span>
                  ) : null}
                </div>

                {/* Meta footer */}
                <div className="border-border-secondary mt-auto flex items-center justify-between border-t pt-2.5 text-[0.68rem]">
                  <span className="text-text-secondary flex items-center gap-1.5">
                    <Hash
                      className="text-text-tertiary"
                      size={12}
                    />
                    <span className="font-medium">{featureCountLabel(d)}</span>
                  </span>
                  <span className="text-text-secondary flex items-center gap-1.5">
                    <Database
                      className="text-text-tertiary"
                      size={12}
                    />
                    <span className="font-medium tabular-nums">
                      {formatBytes(d.file_size_bytes)}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active-filter footer */}
      {activeFilterCount > 0 && !loading && items.length > 0 ? (
        <div className="border-border-secondary bg-surface-hover/30 text-text-secondary flex items-center justify-between border-t px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="bg-primary flex h-2 w-2 animate-pulse rounded-full" />
            <span>
              Filtered view:{" "}
              <strong className="text-text-primary font-semibold">
                {items.length}
              </strong>{" "}
              dataset{items.length === 1 ? "" : "s"} shown
            </span>
          </div>
          <button
            className="text-error hover:text-error/80 inline-flex cursor-pointer items-center gap-1 font-semibold transition-colors"
            type="button"
            onClick={onClearFilters}
          >
            <Trash2 size={12} /> Clear all filters
          </button>
        </div>
      ) : null}
    </div>
  );
}
