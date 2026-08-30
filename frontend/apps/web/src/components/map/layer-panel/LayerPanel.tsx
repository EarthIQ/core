import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Layers,
  Plus,
  FolderPlus,
} from "lucide-react";
import { Button, Tooltip } from "@packages/ui";
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
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);
  const layersMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!layersMenuOpen) return;
    function handler(e: MouseEvent) {
      if (
        layersMenuRef.current &&
        !layersMenuRef.current.contains(e.target as Node)
      ) {
        setLayersMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [layersMenuOpen]);

  const leftStyle = minimized
    ? aiOpen
      ? { left: 360 + 12 }
      : { left: 12 }
    : aiOpen
      ? { left: 360 + 12 }
      : undefined;

  const totalLayers = nodes.filter((n) => n.kind === "layer").length;
  const rootNodes = childrenOf(null);

  return (
    <div
      className={`absolute top-16 z-20 flex flex-col bg-elevated border border-border-primary rounded-xl shadow-elevated transition-all duration-300 ease-in-out ${
        minimized ? "w-10" : "w-64"
      }`}
      style={leftStyle}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1 py-1 border-b border-border-secondary shrink-0">
        {!minimized && (
          <div className="relative flex items-center" ref={layersMenuRef}>
            <button
              type="button"
              onClick={() => setLayersMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-surface-hover transition-colors group"
            >
              <Layers size={14} className="text-muted" />
              <span className="text-xs font-bold text-text-primary">
                Layers
              </span>
              {totalLayers > 0 && (
                <span className="text-[0.6rem] font-mono bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                  {totalLayers}
                </span>
              )}
              <ChevronDown
                size={12}
                className={`text-subtle transition-transform duration-200 ${
                  layersMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {layersMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-52 bg-elevated border border-border-primary rounded-xl shadow-elevated py-1.5 z-50 animate-fade-in">
                <button
                  type="button"
                  className="dropdown-item flex w-full gap-2.5 justify-start align-center p-2.5"
                  onClick={() => {
                    setLayersMenuOpen(false);
                    onOpenImport();
                  }}
                >
                  <Plus size={13} className="text-primary" />
                  <span>Add Data</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item flex w-full gap-2.5 justify-start align-center p-2.5"
                  onClick={() => {
                    setLayersMenuOpen(false);
                    onAddFolder(null);
                  }}
                >
                  <FolderPlus size={13} className="text-warning" />
                  <span>New Folder</span>
                </button>

                {isAvailableModule("resource-module") && (
                  <button
                    type="button"
                    className="dropdown-item flex w-full gap-2.5 justify-start align-center p-2.5"
                    onClick={() => {
                      setLayersMenuOpen(false);
                      onOpenImport();
                    }}
                  >
                    <span>🧩</span>
                    <span>From Resource Module</span>
                  </button>
                )}

                {totalLayers > 0 && (
                  <>
                    <div className="h-px bg-divider mx-2 my-1" />
                    <div className="px-3 py-1 text-[0.7rem] text-subtle">
                      📋 {totalLayers} layer{totalLayers !== 1 ? "s" : ""}{" "}
                      loaded
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <Tooltip
          content={minimized ? "Expand panel" : "Collapse panel"}
          placement="right"
        >
          <Button
            iconOnly
            onClick={() => setMinimized((v) => !v)}
            aria-label={minimized ? "Expand panel" : "Collapse panel"}
          >
            {minimized ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </Tooltip>
      </div>

      {!minimized && (
        <div className="flex flex-col gap-3 p-3 overflow-y-auto max-h-[calc(100vh-12rem)] scrollbar-thin">
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
          ) : (
            <LayerTree
              childrenOf={childrenOf}
              descendantLayers={descendantLayers}
              onToggleVisibility={onToggleVisibility}
              onToggleCollapse={onToggleCollapse}
              onOpenStyle={onOpenStyle}
              onRemove={onRemoveNode}
              onRename={onRenameNode}
              onMove={onMoveNode}
              onAddFolderInside={(parentId) => onAddFolder(parentId)}
              onAddDataToFolder={onOpenImportForFolder}
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
