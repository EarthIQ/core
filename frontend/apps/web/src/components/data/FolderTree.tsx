import { cn } from "@packages/ui";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderX,
  HardDrive,
  Layers,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { formatBytes, type DataFolder } from "@/lib/datasets";

import { TYPES } from "./constants";
import { typeLabel, typeLucide } from "./helpers";

/** Current catalog navigation (single-select). */
export interface FolderSelection {
  /**
   * - `null`    → all data (every folder + ungrouped)
   * - `"root"`  → only ungrouped datasets (no folder)
   * - folder id → that folder's datasets only
   */
  folderId: string | null;
  /** "all" or a dataset type value (quick filter). */
  type: string;
}

/** Special folderId value = "datasets not in any folder". */
export const ROOT_UNGROUPED = "root";

interface Props {
  folders: DataFolder[];
  loading: boolean;
  selection: FolderSelection;
  onNavigate: (sel: FolderSelection) => void;
  /** Create a folder (root when parentId is null). Handled by the page. */
  onCreateFolder: (name: string, parentId: string | null) => void;
  /** Rename a folder. Handled by the page. */
  onRenameFolder: (folderId: string, name: string) => void;
  /** Delete a folder (page shows a confirm dialog first). */
  onDeleteFolder: (folder: { id: string; name: string }) => void;
  /** Totals for the storage footer (from the page's dataset state). */
  totalDatasets: number;
  totalBytes: number;
  tiledCount: number;
}

interface TreeFolder extends DataFolder {
  children: TreeFolder[];
}

function buildTree(folders: DataFolder[]): TreeFolder[] {
  const map = new Map<string, TreeFolder>();
  folders.forEach((f) => map.set(f.id, { ...f, children: [] }));
  const roots: TreeFolder[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortLevel = (nodes: TreeFolder[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortLevel(n.children));
  };
  sortLevel(roots);
  return roots;
}

/**
 * File-explorer style folder tree for the dataset catalog.
 * Real, persisted folders: create / rename / delete / nested browsing.
 */
export default function FolderTree({
  folders,
  loading,
  selection,
  onNavigate,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  totalDatasets,
  totalBytes,
  tiledCount,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState<{ parentId: string | null } | null>(
    null
  );
  const [creatingName, setCreatingName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const tree = useMemo(() => buildTree(folders), [folders]);

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

  // ── Create / rename flows ──────────────────────────────────────────────────
  function startCreate(parentId: string | null) {
    setCreating({ parentId });
    setCreatingName("");
    if (parentId) expand(parentId);
  }

  function commitCreate() {
    const name = creatingName.trim();
    if (!name) {
      setCreating(null);
      return;
    }
    const parentId = creating?.parentId ?? null;
    setCreating(null);
    onCreateFolder(name, parentId);
  }

  function startRename(node: TreeFolder) {
    setRenaming(node.id);
    setRenameValue(node.name);
  }

  function commitRename() {
    const name = renameValue.trim();
    const id = renaming;
    setRenaming(null);
    if (id && name) onRenameFolder(id, name);
  }

  const isFolderActive = (id: string) => selection.folderId === id;
  const isAllActive = selection.folderId === null && selection.type === "all";
  const isUngroupedActive =
    selection.folderId === ROOT_UNGROUPED && selection.type === "all";
  const isTypeActive = (t: string) =>
    selection.type === t && selection.type !== "all";

  // ── Inline "new folder" input ──────────────────────────────────────────────
  function renderCreateInput(indent: number) {
    return (
      <div
        className="flex items-center gap-1.5 py-1"
        style={{ paddingLeft: `${10 + indent * 16}px` }}
      >
        <FolderPlus
          className="text-text-tertiary shrink-0"
          size={14}
        />
        <input
          autoFocus
          aria-label="New folder name"
          className="border-input-border bg-input-bg text-text-primary focus:border-input-focus-border h-7 min-w-0 flex-1 rounded-md border px-2 text-xs outline-none"
          placeholder="Folder name…"
          value={creatingName}
          onChange={(e) => setCreatingName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitCreate();
            if (e.key === "Escape") setCreating(null);
          }}
        />
        <button
          aria-label="Create folder"
          className="text-success hover:bg-success/10 shrink-0 cursor-pointer rounded-md p-1"
          type="button"
          onClick={commitCreate}
        >
          <Check size={14} />
        </button>
        <button
          aria-label="Cancel new folder"
          className="text-text-tertiary hover:bg-surface-hover shrink-0 cursor-pointer rounded-md p-1"
          type="button"
          onClick={() => setCreating(null)}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  // ── Folder row (recursive) ─────────────────────────────────────────────────
  function renderFolder(node: TreeFolder, depth: number) {
    const hasChildren = node.child_folder_count > 0 || node.children.length > 0;
    const isOpen = expanded.has(node.id);
    const active = isFolderActive(node.id);

    return (
      <div key={node.id}>
        <div
          role="button"
          style={{ paddingLeft: `${10 + depth * 16}px` }}
          tabIndex={0}
          className={cn(
            "group flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors select-none",
            active
              ? "bg-primary/[0.1] text-primary"
              : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          )}
          onClick={() => {
            if (renaming === node.id) return;
            onNavigate({ folderId: node.id, type: "all" });
            if (hasChildren) expand(node.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && renaming !== node.id)
              onNavigate({ folderId: node.id, type: "all" });
          }}
        >
          {hasChildren ? (
            <button
              aria-label={isOpen ? "Collapse" : "Expand"}
              className="text-text-tertiary hover:text-text-primary shrink-0 cursor-pointer rounded p-0.5"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
            >
              {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          ) : (
            <span className="w-[18px] shrink-0" />
          )}

          <span className="shrink-0">
            {isOpen && hasChildren ? (
              <FolderOpen
                className={active ? "text-primary" : "text-secondary"}
                size={15}
              />
            ) : (
              <Folder
                className={active ? "text-primary" : "text-secondary"}
                size={15}
              />
            )}
          </span>

          {renaming === node.id ? (
            <input
              autoFocus
              aria-label="Rename folder"
              className="border-input-border bg-input-bg text-text-primary focus:border-input-focus-border h-6 min-w-0 flex-1 rounded-md border px-1.5 text-xs outline-none"
              value={renameValue}
              onBlur={commitRename}
              onChange={(e) => setRenameValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenaming(null);
              }}
            />
          ) : (
            <span className="flex-1 truncate text-xs font-medium">
              {node.name}
            </span>
          )}

          <span className="text-text-tertiary shrink-0 text-[0.62rem] tabular-nums">
            {node.dataset_count}
          </span>

          {/* Hover actions (hidden while renaming this row) */}
          {renaming !== node.id && (
            <span
              className="hidden shrink-0 items-center gap-0.5 group-hover:flex"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                aria-label={`New subfolder in ${node.name}`}
                className="text-text-tertiary hover:text-text-primary cursor-pointer rounded p-0.5"
                title="New subfolder"
                type="button"
                onClick={() => startCreate(node.id)}
              >
                <Plus size={13} />
              </button>
              <button
                aria-label={`Rename ${node.name}`}
                className="text-text-tertiary hover:text-text-primary cursor-pointer rounded p-0.5"
                title="Rename"
                type="button"
                onClick={() => startRename(node)}
              >
                <Pencil size={12} />
              </button>
              <button
                aria-label={`Delete ${node.name}`}
                className="text-text-tertiary hover:text-error cursor-pointer rounded p-0.5"
                title="Delete"
                type="button"
                onClick={() => onDeleteFolder({ id: node.id, name: node.name })}
              >
                <Trash2 size={12} />
              </button>
            </span>
          )}
        </div>

        {/* Children */}
        {isOpen ? (
          <div>
            {creating?.parentId === node.id && renderCreateInput(depth + 1)}
            {node.children.map((child) => renderFolder(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="card bg-surface border-border-primary overflow-hidden rounded-xl border shadow-xs">
      <nav
        aria-label="Data catalog folders"
        className="flex max-h-[calc(100vh-16rem)] scrollbar-thin flex-col gap-4 overflow-y-auto p-3 pr-1"
      >
        {/* ── All data / ungrouped ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <div
            aria-current={isAllActive ? "true" : undefined}
            role="button"
            tabIndex={0}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-colors select-none",
              isAllActive
                ? "bg-primary/[0.1] text-primary"
                : "text-text-primary hover:bg-surface-hover"
            )}
            onClick={() => onNavigate({ folderId: null, type: "all" })}
            onKeyDown={(e) =>
              e.key === "Enter" && onNavigate({ folderId: null, type: "all" })
            }
          >
            <Database
              className={isAllActive ? "text-primary" : "text-secondary"}
              size={16}
            />
            <span className="flex-1 text-sm font-semibold">All Data</span>
          </div>

          <div
            aria-current={isUngroupedActive ? "true" : undefined}
            role="button"
            tabIndex={0}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors select-none",
              isUngroupedActive
                ? "bg-primary/[0.1] text-primary"
                : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            )}
            onClick={() =>
              onNavigate({ folderId: ROOT_UNGROUPED, type: "all" })
            }
            onKeyDown={(e) =>
              e.key === "Enter" &&
              onNavigate({ folderId: ROOT_UNGROUPED, type: "all" })
            }
          >
            <FolderX
              size={14}
              className={
                isUngroupedActive ? "text-primary" : "text-text-tertiary"
              }
            />
            <span className="flex-1 text-xs font-medium">Ungrouped</span>
          </div>
        </div>

        {/* ── Folders ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Sparkles
                className="text-secondary"
                size={11}
              />
              <span className="text-text-tertiary text-[0.65rem] font-bold tracking-wider uppercase">
                Folders
              </span>
            </div>
            <button
              aria-label="New folder"
              className="text-text-tertiary hover:bg-surface-hover hover:text-primary cursor-pointer rounded-md p-1"
              title="New folder"
              type="button"
              onClick={() => startCreate(null)}
            >
              <Plus size={14} />
            </button>
          </div>

          {loading ? (
            <div
              aria-busy="true"
              className="px-2 py-1"
            >
              <div className="skeleton h-6 rounded-md" />
              <div className="skeleton mt-1.5 h-6 rounded-md" />
              <div className="skeleton mt-1.5 h-6 w-4/5 rounded-md" />
            </div>
          ) : null}

          {!loading && tree.map((node) => renderFolder(node, 0))}

          {creating?.parentId === null && renderCreateInput(0)}

          {!loading && tree.length === 0 && creating === null && (
            <p className="text-text-tertiary px-1 text-[0.68rem] leading-relaxed">
              No folders yet. Press{" "}
              <span className="text-text-secondary font-semibold">+</span> to
              create your first folder and organise your datasets.
            </p>
          )}
        </div>

        {/* ── Types (quick filter) ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <div className="text-text-tertiary flex items-center gap-1.5 px-2.5 pb-1 text-[0.65rem] font-bold tracking-wider uppercase">
            <Layers
              className="text-secondary"
              size={11}
            />
            <span>Types</span>
          </div>
          {TYPES.map((t) => {
            const TIcon = typeLucide(t.value);
            const active = isTypeActive(t.value);
            return (
              <div
                key={t.value}
                aria-current={active ? "true" : undefined}
                role="button"
                tabIndex={0}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors select-none",
                  active
                    ? "bg-primary/[0.1] text-primary"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                )}
                onClick={() =>
                  onNavigate({
                    folderId: null,
                    type: active ? "all" : t.value,
                  })
                }
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  onNavigate({ folderId: null, type: active ? "all" : t.value })
                }
              >
                <TIcon
                  className={active ? "text-primary" : "text-text-tertiary"}
                  size={14}
                />
                <span className="text-xs font-medium">
                  {typeLabel(t.value)}
                </span>
              </div>
            );
          })}
        </div>
      </nav>

      {/* ── Storage meter footer ──────────────────────────────────────────── */}
      <div className="border-border-secondary bg-surface-hover/40 flex flex-col gap-2 rounded-b-xl border-t p-3">
        <div className="text-text-primary flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <HardDrive
              className="text-primary shrink-0"
              size={13}
            />
            <span>Catalog Usage</span>
          </div>
          <span className="text-text-tertiary font-mono text-[0.7rem]">
            {formatBytes(totalBytes)}
          </span>
        </div>
        <div className="bg-border-secondary h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, Math.max(8, (totalDatasets / 20) * 100))}%`,
            }}
          />
        </div>
        <div className="text-text-tertiary flex items-center justify-between text-[0.68rem]">
          <span>
            {tiledCount} vectorized layer{tiledCount === 1 ? "" : "s"}
          </span>
          <span>
            {totalDatasets} dataset{totalDatasets === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
}
