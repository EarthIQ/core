import { Button, Tooltip, Dropdown } from "@packages/ui";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Layers,
  Plus,
  FolderPlus,
  Search,
  X,
  Puzzle,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { useLayerDnd } from "./dndContext";
import { LayerTree } from "./LayerTree";

import type { TreeNode } from "./types";

interface LayerPanelProps {
  nodes: TreeNode[];
  childrenOf: (parentId: string | null) => TreeNode[];
  descendantLayers: (folderId: string) => TreeNode[];
  onToggleVisibility: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onOpenStyle: (layer: TreeNode) => void;
  onRemoveNode: (id: string) => void;
  onRenameNode: (id: string, name: string) => void;
  /** Edit a saved vector layer's shapes on the map (optional). */
  onEditLayer?: (layer: TreeNode) => void;
  onMoveNode: (
    id: string,
    newParentId: string | null,
    targetIndex: number
  ) => void;
  onAddFolder: (parentId: string | null) => void;
  onOpenImport: () => void;
  onOpenImportForFolder: (folderId: string) => void;
  canEdit: boolean;
  isAvailableModule: (id: string) => boolean;
  aiOpen?: boolean;
}

const RootDropZone = ({
  onMoveToRoot,
}: {
  onMoveToRoot: (id: string) => void;
}) => {
  const { draggingId, reset } = useLayerDnd();
  const [over, setOver] = useState(false);
  if (!draggingId) return null;
  return (
    <div
      className={`animate-fade-in flex h-8 items-center justify-center rounded-md border border-dashed text-[0.65rem] transition-colors ${
        over
          ? "border-primary/60 bg-primary/5 text-primary"
          : "border-border-secondary/50 text-subtle"
      }`}
      onDragLeave={() => setOver(false)}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onMoveToRoot(draggingId);
        reset();
      }}
    >
      Drop here to move to root
    </div>
  );
};

export const LayerPanel = ({
  nodes,
  childrenOf,
  descendantLayers,
  onToggleVisibility,
  onToggleCollapse,
  onOpenStyle,
  onEditLayer,
  onRemoveNode,
  onRenameNode,
  onMoveNode,
  onAddFolder,
  onOpenImport,
  onOpenImportForFolder,
  _canEdit,
  isAvailableModule,
  aiOpen,
}: LayerPanelProps) => {
  const [minimized, setMinimized] = useState(false);
  const [search, setSearch] = useState("");

  const totalLayers = nodes.filter((n) => n.kind === "layer").length;
  const totalFolders = nodes.filter((n) => n.kind === "folder").length;

  /* ── Search filter: matches + their ancestors + children of matched folders ── */
  const query = search.trim().toLowerCase();
  const filterIds = useMemo(() => {
    if (!query) return null;
    const set = new Set<string>();
    for (const n of nodes) {
      if (n.name.toLowerCase().includes(query)) set.add(n.id);
    }
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of nodes) {
        if (set.has(n.id)) {
          // Include ancestors of the match.
          if (n.parentId && !set.has(n.parentId)) {
            set.add(n.parentId);
            changed = true;
          }
          // Include children of a matched folder (show its contents).
          for (const child of nodes) {
            if (child.parentId === n.id && !set.has(child.id)) {
              set.add(child.id);
              changed = true;
            }
          }
        }
      }
    }
    return set;
  }, [nodes, query]);

  const matchedLayers = filterIds
    ? nodes.filter((n) => n.kind === "layer" && filterIds.has(n.id)).length
    : totalLayers;

  /* ── Drag-to-reposition ──────────────────────────────────────────────────
     The panel "homes" at the top-left of the map area (the anchor it used to
     have). Dragging the header moves it freely; collapsing snaps it back to
     that top-left home position. `offset` is stored home-relative so it stays
     correct when the AI side-panel shifts the home x-coordinate. */
  const HOME_LEFT = aiOpen ? 360 + 12 : 12;
  const HOME_TOP = 64; // matches the former `top-16` (4rem)
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  // Snap back to the top-left home position whenever the panel is collapsed.
  useEffect(() => {
    if (minimized) setOffset({ x: 0, y: 0 });
  }, [minimized]);

  // Keep the panel fully inside its (overflow-hidden) container while dragging.
  const clampWithinContainer = (left: number, top: number) => {
    const panel = panelRef.current;
    const container = panel?.offsetParent as HTMLElement | null;
    if (!panel || !container) return { left, top };
    const c = container.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    const maxLeft = Math.max(0, c.width - p.width);
    const maxTop = Math.max(0, c.height - p.height);
    return {
      left: Math.min(Math.max(left, 0), maxLeft),
      top: Math.min(Math.max(top, 0), maxTop),
    };
  };

  const onHeaderPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (minimized) return;
    // Don't start a drag when interacting with a control (Add, collapse, …).
    if (
      (e.target as HTMLElement).closest(
        "button, a, input, [role='menu'], [role='menuitem']"
      )
    ) {
      return;
    }
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onHeaderPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const rawLeft = HOME_LEFT + d.originX + (e.clientX - d.startX);
    const rawTop = HOME_TOP + d.originY + (e.clientY - d.startY);
    const clamped = clampWithinContainer(rawLeft, rawTop);
    setOffset({
      x: clamped.left - HOME_LEFT,
      y: clamped.top - HOME_TOP,
    });
  };

  const endHeaderDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const panelStyle = {
    left: HOME_LEFT + offset.x,
    top: HOME_TOP + offset.y,
  };

  const rootNodes = childrenOf(null);

  return (
    <div
      ref={panelRef}
      style={panelStyle}
      className={`bg-elevated border-border-primary shadow-elevated absolute z-20 flex flex-col rounded-xl border ${
        dragging ? "" : "transition-all duration-300 ease-in-out"
      } ${minimized ? "w-12" : "w-72"}`}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        className={`border-border-secondary flex shrink-0 items-center gap-2 border-b ${
          minimized
            ? "justify-center px-0 py-2"
            : "cursor-grab touch-none px-2.5 pt-2.5 pb-2 select-none active:cursor-grabbing"
        }`}
        onPointerCancel={endHeaderDrag}
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={endHeaderDrag}
      >
        {!minimized && (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="bg-primary/10 border-primary/20 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
              <Layers
                size={15}
                strokeWidth={1.75}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-0.5">
                <Dropdown
                  placement="bottom-start"
                  items={[
                    {
                      key: "add-data",
                      label: "Add Data…",
                      icon: <Plus size={15} />,
                      onClick: onOpenImport,
                    },
                    {
                      key: "new-folder",
                      label: "New Folder",
                      icon: <FolderPlus size={15} />,
                      onClick: () => onAddFolder(null),
                    },
                    ...(isAvailableModule("resource-module")
                      ? [
                          {
                            key: "resource",
                            label: "From Resource Module",
                            icon: <Puzzle size={15} />,
                            onClick: onOpenImport,
                          },
                        ]
                      : []),
                  ]}
                  trigger={
                    <button
                      aria-haspopup="menu"
                      aria-label="Add layer or folder"
                      className="text-text-tertiary hover:bg-primary/10 hover:text-primary flex items-center rounded-md p-1 transition-colors"
                      type="button"
                    >
                      Layers <ChevronDown className="ml-1 h-4 w-4" />
                    </button>
                  }
                />
              </div>
              <div className="text-subtle truncate text-[0.62rem] leading-tight">
                {totalLayers} layer{totalLayers !== 1 ? "s" : ""}
                {totalFolders > 0
                  ? ` · ${totalFolders} folder${totalFolders !== 1 ? "s" : ""}`
                  : ""}
              </div>
            </div>
          </div>
        )}

        <Tooltip
          content={minimized ? "Expand panel" : "Collapse panel"}
          placement="right"
        >
          <Button
            iconOnly
            aria-label={minimized ? "Expand panel" : "Collapse panel"}
            variant="ghost"
            onClick={() => setMinimized((v) => !v)}
          >
            {minimized ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </Tooltip>
      </div>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      {!minimized && (
        <div className="shrink-0 px-2.5 pt-2.5">
          <div className="bg-surface-hover border-border-secondary focus-within:border-primary/50 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors">
            <Search
              className="text-text-tertiary shrink-0"
              size={13}
            />
            <input
              className="text-text-primary placeholder:text-text-quaternary min-w-0 flex-1 border-none bg-transparent text-xs outline-none"
              placeholder="Filter layers…"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? (
              <button
                aria-label="Clear filter"
                className="text-text-quaternary hover:text-text-primary rounded p-0.5 transition-colors"
                type="button"
                onClick={() => setSearch("")}
              >
                <X size={12} />
              </button>
            ) : null}
          </div>
        </div>
      )}

      {!minimized && (
        <div className="flex max-h-[calc(100vh-14rem)] scrollbar-thin flex-col gap-3 overflow-y-auto p-3 pt-2.5">
          {rootNodes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-5 text-center">
              <Layers
                className="text-subtle opacity-40"
                size={24}
              />
              <div className="text-subtle text-[0.72rem] leading-snug">
                No layers yet.
              </div>
              <div className="mt-1 flex gap-1.5">
                <button
                  className="bg-primary/10 border-primary/25 text-primary hover:bg-primary/20 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
                  type="button"
                  onClick={onOpenImport}
                >
                  <Plus size={13} /> Add Data
                </button>
                <button
                  className="bg-warning/10 border-warning/25 text-warning hover:bg-warning/20 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
                  type="button"
                  onClick={() => onAddFolder(null)}
                >
                  <FolderPlus size={13} /> New Folder
                </button>
              </div>
            </div>
          ) : filterIds && matchedLayers === 0 ? (
            <div className="flex flex-col items-center gap-2 py-5 text-center">
              <Search
                className="text-subtle opacity-40"
                size={22}
              />
              <div className="text-subtle text-[0.72rem] leading-snug">
                No layers match “{search.trim()}”.
              </div>
              <button
                className="text-primary mt-1 text-[0.7rem] underline"
                type="button"
                onClick={() => setSearch("")}
              >
                Clear filter
              </button>
            </div>
          ) : (
            <LayerTree
              childrenOf={childrenOf}
              descendantLayers={descendantLayers}
              filterIds={filterIds}
              onAddDataToFolder={onOpenImportForFolder}
              onAddFolderInside={(parentId) => onAddFolder(parentId)}
              onEditLayer={onEditLayer}
              onMove={onMoveNode}
              onOpenStyle={onOpenStyle}
              onRemove={onRemoveNode}
              onRename={onRenameNode}
              onToggleCollapse={onToggleCollapse}
              onToggleVisibility={onToggleVisibility}
            />
          )}

          {rootNodes.length > 0 && (
            <RootDropZone
              onMoveToRoot={(id) =>
                onMoveNode(id, null, childrenOf(null).length)
              }
            />
          )}
        </div>
      )}
    </div>
  );
};
