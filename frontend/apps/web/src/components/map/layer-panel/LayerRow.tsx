import { useEffect, useRef, useState } from "react";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Palette,
  GripVertical,
} from "lucide-react";
import { Switch } from "@packages/ui";
import type { LayerTreeNode } from "./types";
import type { DropPos } from "./dnd";
import { getDropPosition } from "./dnd";

interface LayerRowProps {
  layer: LayerTreeNode;
  depth: number;
  isDragging: boolean;
  isDropTarget: boolean;
  dropPosition: DropPos | null;
  onToggle: () => void;
  onOpenStyle: () => void;
  onRemove: () => void;
  onRename: (name: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverRow: (pos: DropPos) => void;
  onDrop: (pos: DropPos) => void;
}

export function LayerRow({
  layer,
  depth,
  isDragging,
  isDropTarget,
  dropPosition,
  onToggle,
  onOpenStyle,
  onRemove,
  onRename,
  onDragStart,
  onDragEnd,
  onDragOverRow,
  onDrop,
}: LayerRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(layer.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  function commitRename() {
    const trimmed = nameDraft.trim();
    onRename(trimmed || layer.name);
    setEditing(false);
  }

  return (
    <div
      ref={rowRef}
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!rowRef.current) return;
        onDragOverRow(getDropPosition(e, rowRef.current, false));
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!rowRef.current) return;
        onDrop(getDropPosition(e, rowRef.current, false));
      }}
      className={`group relative flex items-center gap-1.5 py-1.5 px-1 rounded-md cursor-grab active:cursor-grabbing transition-colors duration-150 ${
        isDragging ? "opacity-40" : "hover:bg-surface-hover"
      }`}
      style={{ paddingLeft: 2 + depth * 14 + 16 }}
    >
      {isDropTarget && dropPosition === "before" && (
        <div className="absolute left-2 right-2 -top-0.5 h-0.5 bg-primary rounded-full" />
      )}
      {isDropTarget && dropPosition === "after" && (
        <div className="absolute left-2 right-2 -bottom-0.5 h-0.5 bg-primary rounded-full" />
      )}

      <GripVertical
        size={10}
        className="opacity-0 group-hover:opacity-40 text-text-quaternary shrink-0"
      />

      <div
        className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/10"
        style={{
          background: layer.color ?? "#22d3a0",
          opacity: layer.opacity ?? 0.8,
        }}
      />

      <Switch
        size="sm"
        checked={layer.visible}
        onChange={onToggle}
        aria-label={layer.name}
      />

      {editing ? (
        <input
          autoFocus
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setNameDraft(layer.name);
              setEditing(false);
            }
          }}
          className="flex-1 min-w-0 bg-surface-hover border border-primary/40 rounded px-1 text-xs text-text-primary outline-none"
        />
      ) : (
        <span
          className="text-xs text-text-secondary truncate flex-1"
          onDoubleClick={() => setEditing(true)}
          title={layer.name}
        >
          {layer.name}
        </span>
      )}

      {layer.layerType === "raster" && (
        <span className="text-[0.55rem] uppercase tracking-wide text-text-quaternary bg-surface-hover px-1 rounded shrink-0">
          raster
        </span>
      )}

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded text-text-quaternary hover:text-text-primary hover:bg-surface-hover transition-all"
          title="Layer options"
        >
          <MoreHorizontal size={13} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-elevated border border-border-primary rounded-lg shadow-dropdown py-1 z-50 animate-fade-in">
            <button
              type="button"
              className="dropdown-item w-full gap-2"
              onClick={() => {
                onOpenStyle();
                setMenuOpen(false);
              }}
            >
              <Palette size={12} />
              <span>Open Style Panel</span>
            </button>
            <button
              type="button"
              className="dropdown-item w-full gap-2"
              onClick={() => {
                setEditing(true);
                setMenuOpen(false);
              }}
            >
              <Pencil size={12} />
              <span>Rename Layer</span>
            </button>
            <button
              type="button"
              className="dropdown-item w-full gap-2"
              onClick={() => {
                onToggle();
                setMenuOpen(false);
              }}
            >
              {layer.visible ? <EyeOff size={12} /> : <Eye size={12} />}
              <span>{layer.visible ? "Hide Layer" : "Show Layer"}</span>
            </button>
            <div className="h-px bg-border-secondary mx-2 my-1" />
            <button
              type="button"
              className="dropdown-item w-full gap-2 text-red-400 hover:bg-red-500/10"
              onClick={() => {
                onRemove();
                setMenuOpen(false);
              }}
            >
              <Trash2 size={12} />
              <span>Remove Layer</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
