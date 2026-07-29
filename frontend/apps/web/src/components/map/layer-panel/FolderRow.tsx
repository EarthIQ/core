import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderInput,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react";
import type { FolderTreeNode } from "./types";
import type { DropPos } from "./dnd";
import { getDropPosition } from "./dnd";

interface FolderRowProps {
  folder: FolderTreeNode;
  depth: number;
  childCount: number;
  anyVisible: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  dropPosition: DropPos | null;
  onToggleCollapse: () => void;
  onToggleVisibility: () => void;
  onRemove: () => void;
  onRename: (name: string) => void;
  onAddSubfolder: () => void;
  onAddDataHere: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverRow: (pos: DropPos) => void;
  onDrop: (pos: DropPos) => void;
  children?: React.ReactNode;
}

export function FolderRow({
  folder,
  depth,
  childCount,
  anyVisible,
  isDragging,
  isDropTarget,
  dropPosition,
  onToggleCollapse,
  onToggleVisibility,
  onRemove,
  onRename,
  onAddSubfolder,
  onAddDataHere,
  onDragStart,
  onDragEnd,
  onDragOverRow,
  onDrop,
  children,
}: FolderRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(folder.name);
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
    onRename(trimmed || folder.name);
    setEditing(false);
  }

  return (
    <div>
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
          onDragOverRow(getDropPosition(e, rowRef.current, true));
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!rowRef.current) return;
          onDrop(getDropPosition(e, rowRef.current, true));
        }}
        className={`group relative flex items-center gap-1 py-1.5 px-1 rounded-md cursor-grab active:cursor-grabbing transition-colors duration-150 ${
          isDragging ? "opacity-40" : "hover:bg-surface-hover"
        }`}
        style={{ paddingLeft: 2 + depth * 14 }}
      >
        {isDropTarget && dropPosition === "before" && (
          <div className="absolute left-2 right-2 -top-0.5 h-0.5 bg-primary rounded-full" />
        )}
        {isDropTarget && dropPosition === "after" && (
          <div className="absolute left-2 right-2 -bottom-0.5 h-0.5 bg-primary rounded-full" />
        )}
        {isDropTarget && dropPosition === "inside" && (
          <div className="absolute inset-0.5 rounded-md ring-2 ring-primary/60 pointer-events-none" />
        )}

        <GripVertical
          size={10}
          className="opacity-0 group-hover:opacity-40 text-text-quaternary shrink-0"
        />

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-0.5 rounded text-text-quaternary hover:text-text-primary shrink-0"
        >
          {folder.collapsed ? (
            <ChevronRight size={12} />
          ) : (
            <ChevronDown size={12} />
          )}
        </button>

        <button
          type="button"
          onClick={onToggleVisibility}
          className="p-0.5 rounded text-text-tertiary hover:text-text-primary shrink-0"
          title={anyVisible ? "Hide folder layers" : "Show folder layers"}
        >
          {anyVisible ? (
            <Eye size={12} />
          ) : (
            <EyeOff size={12} className="opacity-40" />
          )}
        </button>

        {folder.collapsed ? (
          <Folder size={13} className="text-warning shrink-0" />
        ) : (
          <FolderOpen size={13} className="text-warning shrink-0" />
        )}

        {editing ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setNameDraft(folder.name);
                setEditing(false);
              }
            }}
            className="flex-1 min-w-0 bg-surface-hover border border-primary/40 rounded px-1 text-xs text-text-primary outline-none"
          />
        ) : (
          <span
            className="text-xs font-semibold text-text-primary truncate flex-1"
            onDoubleClick={() => setEditing(true)}
            title={folder.name}
          >
            {folder.name}
          </span>
        )}

        <span className="text-[0.6rem] font-mono text-text-quaternary shrink-0">
          {childCount}
        </span>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded text-text-quaternary hover:text-text-primary hover:bg-surface-hover transition-all"
            title="Folder options"
          >
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-elevated border border-border-primary rounded-lg shadow-dropdown py-1 z-50 animate-fade-in">
              <button
                type="button"
                className="dropdown-item w-full gap-2"
                onClick={() => {
                  onAddDataHere();
                  setMenuOpen(false);
                }}
              >
                <FolderInput size={12} />
                <span>Add Data Here</span>
              </button>
              <button
                type="button"
                className="dropdown-item w-full gap-2"
                onClick={() => {
                  onAddSubfolder();
                  setMenuOpen(false);
                }}
              >
                <FolderPlus size={12} />
                <span>New Subfolder</span>
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
                <span>Rename Folder</span>
              </button>
              <button
                type="button"
                className="dropdown-item w-full gap-2"
                onClick={() => {
                  onToggleVisibility();
                  setMenuOpen(false);
                }}
              >
                {anyVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                <span>
                  {anyVisible ? "Hide All Layers" : "Show All Layers"}
                </span>
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
                <span>Delete Folder</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {!folder.collapsed && (
        <div className="border-l border-border-secondary/60 ml-3">
          {children}
        </div>
      )}
    </div>
  );
}
