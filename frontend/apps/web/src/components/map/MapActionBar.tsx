import { useEffect, useRef, useState } from "react";
import {
  MousePointer2,
  Hand,
  Shapes,
  Spline,
  Circle as CircleIcon,
  Square,
  Pen,
  Highlighter,
  Type,
  StickyNote,
  Image as ImageIcon,
  Link2,
  Play,
  Bookmark,
  MessageSquare,
  Undo2,
  Redo2,
  ChevronDown,
} from "lucide-react";
import { Tooltip } from "@packages/ui";

/* ──────────────────────────────────────────────────────────────────────── */
/*  Types                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */
type IconType = React.ComponentType<{ size?: number; className?: string }>;

interface ToolVariant {
  id: string;
  label: string;
  icon: IconType;
  shortcut?: string;
}

interface ToolGroupDef {
  id: string;
  variants: ToolVariant[];
}

export interface ActiveTool {
  groupId: string;
  variantId: string;
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Tool group definitions                                                   */
/* ──────────────────────────────────────────────────────────────────────── */
const NAVIGATE_GROUP: ToolGroupDef = {
  id: "navigate",
  variants: [
    { id: "select", label: "Select", icon: MousePointer2, shortcut: "V" },
    { id: "pan", label: "Pan", icon: Hand, shortcut: "⇧H" },
  ],
};

const DRAW_GROUP: ToolGroupDef = {
  id: "draw",
  variants: [
    { id: "shape", label: "Shape", icon: Shapes, shortcut: "S" },
    { id: "line", label: "Line", icon: Spline, shortcut: "L" },
    { id: "circle", label: "Circle", icon: CircleIcon, shortcut: "C" },
    { id: "rectangle", label: "Rectangle", icon: Square, shortcut: "R" },
  ],
};

const ANNOTATE_GROUP: ToolGroupDef = {
  id: "annotate",
  variants: [
    { id: "marker", label: "Marker", icon: Pen, shortcut: "M" },
    {
      id: "highlighter",
      label: "Highlighter",
      icon: Highlighter,
      shortcut: "H",
    },
    { id: "text", label: "Text", icon: Type, shortcut: "T" },
    { id: "note", label: "Note", icon: StickyNote, shortcut: "N" },
    { id: "image", label: "Image", icon: ImageIcon, shortcut: "I" },
    { id: "link", label: "Link & embed", icon: Link2, shortcut: "⇧L" },
    { id: "video", label: "Video", icon: Play, shortcut: "⇧V" },
  ],
};

const TOOL_GROUPS: ToolGroupDef[] = [
  NAVIGATE_GROUP,
  DRAW_GROUP,
  ANNOTATE_GROUP,
];

/* ──────────────────────────────────────────────────────────────────────── */
/*  Dropdown menu (flyout above the bar)                                     */
/* ──────────────────────────────────────────────────────────────────────── */
function ToolDropdown({
  variants,
  activeVariantId,
  onSelect,
}: {
  variants: ToolVariant[];
  activeVariantId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="absolute bottom-full left-0 mb-2 w-72 bg-elevated border border-border-primary rounded-2xl shadow-2xl py-2 z-50 animate-fade-in-up">
      {variants.map((v) => {
        const Icon = v.icon;
        const active = v.id === activeVariantId;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onSelect(v.id)}
            className={`flex items-center w-full gap-3 px-4 py-2.5 mx-0 transition-colors ${
              active
                ? "bg-primary/10 text-primary"
                : "text-text-primary hover:bg-surface-hover"
            }`}
          >
            <Icon size={19} className="shrink-0" />
            <span className="text-sm font-medium flex-1 text-left">
              {v.label}
            </span>
            {v.shortcut && (
              <span className="text-xs text-text-quaternary tabular-nums shrink-0">
                {v.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Tool group button — main icon + chevron, opens dropdown                  */
/* ──────────────────────────────────────────────────────────────────────── */
function ToolGroupButton({
  group,
  selectedVariantId,
  isActiveTool,
  isDropdownOpen,
  onOpenDropdown,
  onSelectVariant,
}: {
  group: ToolGroupDef;
  selectedVariantId: string;
  isActiveTool: boolean;
  isDropdownOpen: boolean;
  onOpenDropdown: () => void;
  onSelectVariant: (variantId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selected =
    group.variants.find((v) => v.id === selectedVariantId) ?? group.variants[0];
  const Icon = selected.icon;

  useEffect(() => {
    if (!isDropdownOpen) return;
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onOpenDropdown(); // parent toggles closed since it's already open
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDropdownOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={`flex items-center rounded-full transition-colors ${
          isDropdownOpen && !isActiveTool ? "bg-surface-hover" : ""
        }`}
      >
        <Tooltip content={selected.label} placement="top">
          <button
            type="button"
            onClick={() => onSelectVariant(selected.id)}
            aria-pressed={isActiveTool}
            className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
              isActiveTool
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            }`}
          >
            <Icon size={18} />
          </button>
        </Tooltip>

        <button
          type="button"
          onClick={onOpenDropdown}
          aria-label={`${group.id} tool options`}
          className={`flex items-center justify-center w-5 h-9 rounded-full transition-colors ${
            isActiveTool
              ? "text-primary hover:bg-primary/10"
              : "text-text-quaternary hover:bg-surface-hover hover:text-text-primary"
          }`}
        >
          <ChevronDown
            size={13}
            className={`transition-transform duration-150 ${isDropdownOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {isDropdownOpen && (
        <ToolDropdown
          variants={group.variants}
          activeVariantId={selectedVariantId}
          onSelect={onSelectVariant}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Main MapActionBar                                                        */
/* ──────────────────────────────────────────────────────────────────────── */
interface MapActionBarProps {
  /** Controlled active tool. When provided, the bar reflects this value. */
  activeTool?: ActiveTool | null;
  onToolChange?: (tool: ActiveTool) => void;
  bookmarkActive?: boolean;
  onToggleBookmark?: () => void;
  commentsActive?: boolean;
  onToggleComments?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onClearAnnotations?: () => void;
}

export function MapActionBar({
  activeTool: controlledTool,
  onToolChange,
  bookmarkActive = false,
  onToggleBookmark,
  commentsActive = false,
  onToggleComments,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onClearAnnotations,
}: MapActionBarProps) {
  // Fallback internal tool for uncontrolled usage.
  const [internalTool] = useState<ActiveTool>({
    groupId: NAVIGATE_GROUP.id,
    variantId: NAVIGATE_GROUP.variants[0].id,
  });
  const activeTool = controlledTool ?? internalTool;

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  function selectVariant(groupId: string, variantId: string) {
    setOpenDropdownId(null);
    onToolChange?.({ groupId, variantId });
  }

  return (
    <div
      className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-1.5 bg-elevated/95 backdrop-blur-xl border border-border-primary rounded-full shadow-xl"
      id="map-action-bar"
    >
      {TOOL_GROUPS.map((group) => {
        const isActive = activeTool.groupId === group.id;
        const selectedVariantId = isActive
          ? activeTool.variantId
          : group.variants[0].id;
        return (
          <ToolGroupButton
            key={group.id}
            group={group}
            selectedVariantId={selectedVariantId}
            isActiveTool={isActive}
            isDropdownOpen={openDropdownId === group.id}
            onOpenDropdown={() =>
              setOpenDropdownId((prev) => (prev === group.id ? null : group.id))
            }
            onSelectVariant={(variantId) => selectVariant(group.id, variantId)}
          />
        );
      })}

      <div className="w-px h-6 bg-border-primary mx-1 shrink-0" />

      {/* Standalone toggle buttons */}
      <Tooltip content="Bookmark" placement="top">
        <button
          type="button"
          onClick={onToggleBookmark}
          aria-pressed={bookmarkActive}
          className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
            bookmarkActive
              ? "bg-surface-hover text-primary"
              : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          }`}
        >
          <Bookmark size={17} fill={bookmarkActive ? "currentColor" : "none"} />
        </button>
      </Tooltip>

      <Tooltip content="Comment" placement="top">
        <button
          type="button"
          onClick={onToggleComments}
          aria-pressed={commentsActive}
          className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
            commentsActive
              ? "bg-surface-hover text-primary"
              : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          }`}
        >
          <MessageSquare size={17} />
        </button>
      </Tooltip>

      <div className="w-px h-6 bg-border-primary mx-1 shrink-0" />

      {/* Undo / Redo */}
      <Tooltip content="Undo" placement="top">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center justify-center w-9 h-9 rounded-full text-text-secondary hover:bg-surface-hover hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
        >
          <Undo2 size={17} />
        </button>
      </Tooltip>

      <Tooltip content="Redo" placement="top">
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="flex items-center justify-center w-9 h-9 rounded-full text-text-secondary hover:bg-surface-hover hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
        >
          <Redo2 size={17} />
        </button>
      </Tooltip>
    </div>
  );
}

export default MapActionBar;
