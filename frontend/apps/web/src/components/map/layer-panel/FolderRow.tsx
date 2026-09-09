import { Dropdown } from "@packages/ui";
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
import { useRef, useState } from "react";

import { getDropPosition, type DropPos } from "./dnd";

import type { FolderTreeNode } from "./types";

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

export const FolderRow = ({
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
}: FolderRowProps) => {
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
        style={{ paddingLeft: 4 + depth * 14 }}
        className={`group relative flex cursor-grab items-center gap-1 rounded-lg py-1.5 pr-1 transition-colors duration-150 active:cursor-grabbing ${
          isDragging ? "opacity-40" : "hover:bg-surface-hover"
        }`}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!rowRef.current) return;
          onDragOverRow(getDropPosition(e, rowRef.current, true));
        }}
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!rowRef.current) return;
          onDrop(getDropPosition(e, rowRef.current, true));
        }}
      >
        {isDropTarget && dropPosition === "before" ? (
          <div className="bg-primary absolute -top-0.5 right-2 left-2 h-0.5 rounded-full" />
        ) : null}
        {isDropTarget && dropPosition === "after" ? (
          <div className="bg-primary absolute right-2 -bottom-0.5 left-2 h-0.5 rounded-full" />
        ) : null}
        {isDropTarget && dropPosition === "inside" ? (
          <div className="ring-primary/60 pointer-events-none absolute inset-0.5 rounded-md ring-2" />
        ) : null}

        <GripVertical
          className="text-text-quaternary shrink-0 opacity-35"
          size={11}
        />

        <button
          className="text-text-quaternary hover:text-text-primary shrink-0 rounded p-0.5"
          type="button"
          onClick={onToggleCollapse}
        >
          {folder.collapsed ? (
            <ChevronRight size={12} />
          ) : (
            <ChevronDown size={12} />
          )}
        </button>

        {folder.collapsed ? (
          <Folder
            className="text-warning shrink-0"
            size={14}
            strokeWidth={1.75}
          />
        ) : (
          <FolderOpen
            className="text-warning shrink-0"
            size={14}
            strokeWidth={1.75}
          />
        )}

        {editing ? (
          <input
            autoFocus
            className="bg-surface-hover border-primary/40 text-text-primary min-w-0 flex-1 rounded border px-1 text-xs outline-none"
            value={nameDraft}
            onBlur={commitRename}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setNameDraft(folder.name);
                setEditing(false);
              }
            }}
          />
        ) : (
          <span
            className="text-text-primary flex-1 truncate text-xs font-semibold"
            title={folder.name}
            onDoubleClick={() => setEditing(true)}
          >
            {folder.name}
          </span>
        )}

        <span className="text-text-quaternary shrink-0 font-mono text-[0.6rem]">
          {childCount}
        </span>

        {/* ── Right-side visibility toggle: always visible ──────────────── */}
        <button
          title={anyVisible ? "Hide folder layers" : "Show folder layers"}
          type="button"
          aria-label={
            anyVisible ? "Hide all folder layers" : "Show all folder layers"
          }
          className={`hover:bg-surface-hover shrink-0 rounded-md p-1.5 transition-colors ${
            anyVisible
              ? "text-text-secondary hover:text-text-primary"
              : "text-text-quaternary hover:text-text-primary"
          }`}
          onClick={onToggleVisibility}
        >
          {anyVisible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>

        <Dropdown
          placement="bottom-end"
          items={[
            {
              key: "add-data",
              label: "Add Data Here",
              icon: <FolderInput size={15} />,
              onClick: onAddDataHere,
            },
            {
              key: "subfolder",
              label: "New Subfolder",
              icon: <FolderPlus size={15} />,
              onClick: onAddSubfolder,
            },
            {
              key: "rename",
              label: "Rename Folder",
              icon: <Pencil size={15} />,
              onClick: () => setEditing(true),
            },
            {
              key: "visibility",
              label: anyVisible ? "Hide All Layers" : "Show All Layers",
              icon: anyVisible ? <EyeOff size={15} /> : <Eye size={15} />,
              onClick: onToggleVisibility,
            },
            { key: "divider", divider: true },
            {
              key: "delete",
              label: "Delete Folder",
              icon: <Trash2 size={15} />,
              danger: true,
              onClick: onRemove,
            },
          ]}
          trigger={
            <button
              aria-label="Folder options"
              className="text-text-quaternary hover:text-text-primary hover:bg-surface-hover cursor-pointer rounded-md border-none bg-transparent p-1.5 transition-colors"
              title="Folder options"
              type="button"
            >
              <MoreHorizontal size={14} />
            </button>
          }
        />
      </div>

      {!folder.collapsed && (
        <div className="border-border-secondary/60 ml-3 border-l">
          {children}
        </div>
      )}
    </div>
  );
};
