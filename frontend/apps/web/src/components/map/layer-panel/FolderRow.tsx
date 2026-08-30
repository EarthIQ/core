import { useRef, useState } from "react";
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
import { Dropdown } from "@packages/ui";
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
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(folder.name);
  const rowRef = useRef<HTMLDivElement>(null);

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
        className={`group relative flex items-center gap-1 py-1.5 pr-1 rounded-lg cursor-grab active:cursor-grabbing transition-colors duration-150 ${
          isDragging ? "opacity-40" : "hover:bg-surface-hover"
        }`}
        style={{ paddingLeft: 4 + depth * 14 }}
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
          size={11}
          className="opacity-35 text-text-quaternary shrink-0"
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

        {folder.collapsed ? (
          <Folder size={14} strokeWidth={1.75} className="text-warning shrink-0" />
        ) : (
          <FolderOpen size={14} strokeWidth={1.75} className="text-warning shrink-0" />
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

        {/* ── Right-side visibility toggle: always visible ──────────────── */}
        <button
          type="button"
          onClick={onToggleVisibility}
          className={`p-1.5 rounded-md transition-colors shrink-0 hover:bg-surface-hover ${
            anyVisible
              ? "text-text-secondary hover:text-text-primary"
              : "text-text-quaternary hover:text-text-primary"
          }`}
          title={anyVisible ? "Hide folder layers" : "Show folder layers"}
          aria-label={
            anyVisible ? "Hide all folder layers" : "Show all folder layers"
          }
        >
          {anyVisible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>

        <Dropdown
          trigger={
            <button
              type="button"
              className="p-1.5 rounded-md text-text-quaternary hover:text-text-primary hover:bg-surface-hover transition-colors border-none bg-transparent cursor-pointer"
              title="Folder options"
              aria-label="Folder options"
            >
              <MoreHorizontal size={14} />
            </button>
          }
          placement="bottom-end"
          items={[
            { key: "add-data", label: "Add Data Here", icon: <FolderInput size={15} />, onClick: onAddDataHere },
            { key: "subfolder", label: "New Subfolder", icon: <FolderPlus size={15} />, onClick: onAddSubfolder },
            { key: "rename", label: "Rename Folder", icon: <Pencil size={15} />, onClick: () => setEditing(true) },
            {
              key: "visibility",
              label: anyVisible ? "Hide All Layers" : "Show All Layers",
              icon: anyVisible ? <EyeOff size={15} /> : <Eye size={15} />,
              onClick: onToggleVisibility,
            },
            { key: "divider", divider: true },
            { key: "delete", label: "Delete Folder", icon: <Trash2 size={15} />, danger: true, onClick: onRemove },
          ]}
        />
      </div>

      {!folder.collapsed && (
        <div className="border-l border-border-secondary/60 ml-3">
          {children}
        </div>
      )}
    </div>
  );
}
