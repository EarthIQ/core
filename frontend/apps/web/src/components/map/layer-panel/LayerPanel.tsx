import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
import { Button, Tooltip, Dropdown } from "@packages/ui";
import { LayerTree } from "./LayerTree";
import { useLayerDnd } from "./dndContext";
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
    targetIndex: number,
  ) => void;
  onAddFolder: (parentId: string | null) => void;
  onOpenImport: () => void;
  onOpenImportForFolder: (folderId: string) => void;
  canEdit: boolean;
  isAvailableModule: (id: string) => boolean;
  aiOpen?: boolean;
}

function RootDropZone({
  onMoveToRoot,
}: {
  onMoveToRoot: (id: string) => void;
}) {
  const { draggingId, reset } = useLayerDnd();
  const [over, setOver] = useState(false);
  if (!draggingId) return null;
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onMoveToRoot(draggingId);
        reset();
      }}
      className={`h-8 rounded-md border border-dashed flex items-center justify-center text-[0.65rem] transition-colors animate-fade-in ${
        over
          ? "border-primary/60 bg-primary/5 text-primary"
          : "border-border-secondary/50 text-subtle"
      }`}
    >
      Drop here to move to root
    </div>
  );
}

export function LayerPanel({
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
  canEdit,
  isAvailableModule,
  aiOpen,
}: LayerPanelProps) {
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
        "button, a, input, [role='menu'], [role='menuitem']",
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
      className={`absolute z-20 flex flex-col bg-elevated border border-border-primary rounded-xl shadow-elevated ${
        dragging ? "" : "transition-all duration-300 ease-in-out"
      } ${minimized ? "w-12" : "w-72"}`}
      style={panelStyle}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        className={`flex items-center gap-2 border-b border-border-secondary shrink-0 ${
          minimized
            ? "justify-center px-0 py-2"
            : "cursor-grab active:cursor-grabbing touch-none select-none px-2.5 pt-2.5 pb-2"
        }`}
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={endHeaderDrag}
        onPointerCancel={endHeaderDrag}
      >
        {!minimized && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
              <Layers size={15} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-0.5">
                <Dropdown
                  trigger={
                    <button
                      type="button"
                      className="p-1 rounded-md text-text-tertiary hover:bg-primary/10 hover:text-primary transition-colors flex items-center"
                      aria-haspopup="menu"
                      aria-label="Add layer or folder"
                    >
                      Layers <ChevronDown className="ml-1 h-4 w-4" />
                    </button>
                  }
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
                />
              </div>
              <div className="text-[0.62rem] text-subtle leading-tight truncate">
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
            variant="ghost"
            onClick={() => setMinimized((v) => !v)}
            aria-label={minimized ? "Expand panel" : "Collapse panel"}
          >
            {minimized ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </Tooltip>
      </div>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      {!minimized && (
        <div className="px-2.5 pt-2.5 shrink-0">
          <div className="flex items-center gap-2 bg-surface-hover border border-border-secondary rounded-lg px-2.5 py-1.5 focus-within:border-primary/50 transition-colors">
            <Search size={13} className="text-text-tertiary shrink-0" />
            <input
              type="text"
              placeholder="Filter layers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs text-text-primary placeholder:text-text-quaternary"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-0.5 rounded text-text-quaternary hover:text-text-primary transition-colors"
                aria-label="Clear filter"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {!minimized && (
        <div className="flex flex-col gap-3 p-3 pt-2.5 overflow-y-auto max-h-[calc(100vh-14rem)] scrollbar-thin">
          {rootNodes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-5 text-center">
              <Layers size={24} className="text-subtle opacity-40" />
              <div className="text-[0.72rem] text-subtle leading-snug">
                No layers yet.
              </div>
              <div className="flex gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={onOpenImport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/25 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  <Plus size={13} /> Add Data
                </button>
                <button
                  type="button"
                  onClick={() => onAddFolder(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/25 text-xs font-semibold text-warning hover:bg-warning/20 transition-colors"
                >
                  <FolderPlus size={13} /> New Folder
                </button>
              </div>
            </div>
          ) : filterIds && matchedLayers === 0 ? (
            <div className="flex flex-col items-center gap-2 py-5 text-center">
              <Search size={22} className="text-subtle opacity-40" />
              <div className="text-[0.72rem] text-subtle leading-snug">
                No layers match “{search.trim()}”.
              </div>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-1 text-[0.7rem] text-primary underline"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <LayerTree
              childrenOf={childrenOf}
              descendantLayers={descendantLayers}
              onToggleVisibility={onToggleVisibility}
              onToggleCollapse={onToggleCollapse}
              onOpenStyle={onOpenStyle}
              onEditLayer={onEditLayer}
              onRemove={onRemoveNode}
              onRename={onRenameNode}
              onMove={onMoveNode}
              onAddFolderInside={(parentId) => onAddFolder(parentId)}
              onAddDataToFolder={onOpenImportForFolder}
              filterIds={filterIds}
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
}
