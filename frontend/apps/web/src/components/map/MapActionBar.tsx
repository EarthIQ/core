import { Tooltip } from "@packages/ui";
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
  MessageSquare,
  Undo2,
  Redo2,
  Save,
  ChevronDown,
  Toolbox,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
    { id: "shape", label: "Polygon", icon: Shapes, shortcut: "S" },
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
const ToolDropdown = ({
  variants,
  activeVariantId,
  onSelect,
}: {
  variants: ToolVariant[];
  activeVariantId: string;
  onSelect: (id: string) => void;
}) => {
  return (
    <div className="bg-elevated border-border-primary animate-fade-in-up absolute bottom-full left-0 z-50 mb-2 w-72 rounded-2xl border py-2 shadow-2xl">
      {variants.map((v) => {
        const Icon = v.icon;
        const active = v.id === activeVariantId;
        return (
          <button
            key={v.id}
            type="button"
            className={`mx-0 flex w-full items-center gap-3 px-4 py-2.5 transition-colors ${
              active
                ? "bg-primary/10 text-primary"
                : "text-text-primary hover:bg-surface-hover"
            }`}
            onClick={() => onSelect(v.id)}
          >
            <Icon
              className="shrink-0"
              size={19}
            />
            <span className="flex-1 text-left text-sm font-medium">
              {v.label}
            </span>
            {v.shortcut ? (
              <span className="text-text-quaternary shrink-0 text-xs tabular-nums">
                {v.shortcut}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────── */
/*  Tool group button - main icon + chevron, opens dropdown                  */
/* ──────────────────────────────────────────────────────────────────────── */
const ToolGroupButton = ({
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
}) => {
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
    <div
      ref={containerRef}
      className="relative"
    >
      <div
        className={`flex items-center rounded-full transition-colors ${
          isDropdownOpen && !isActiveTool ? "bg-surface-hover" : ""
        }`}
      >
        <Tooltip
          content={selected.label}
          placement="top"
        >
          <button
            aria-pressed={isActiveTool}
            type="button"
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              isActiveTool
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            }`}
            onClick={() => onSelectVariant(selected.id)}
          >
            <Icon size={18} />
          </button>
        </Tooltip>

        <button
          aria-label={`${group.id} tool options`}
          type="button"
          className={`flex h-9 w-5 items-center justify-center rounded-full transition-colors ${
            isActiveTool
              ? "text-primary hover:bg-primary/10"
              : "text-text-quaternary hover:bg-surface-hover hover:text-text-primary"
          }`}
          onClick={onOpenDropdown}
        >
          <ChevronDown
            className={`transition-transform duration-150 ${isDropdownOpen ? "rotate-180" : ""}`}
            size={13}
          />
        </button>
      </div>

      {isDropdownOpen ? (
        <ToolDropdown
          activeVariantId={selectedVariantId}
          variants={group.variants}
          onSelect={onSelectVariant}
        />
      ) : null}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────── */
/*  Main MapActionBar                                                        */
/* ──────────────────────────────────────────────────────────────────────── */
interface MapActionBarProps {
  /** Controlled active tool. When provided, the bar reflects this value. */
  activeTool?: ActiveTool | null;
  onToolChange?: (tool: ActiveTool) => void;
  /** Comment pin placement mode: click the map to drop a comment pin. */
  commentPlacement?: boolean;
  onToggleCommentPlacement?: () => void;
  toolboxActive?: boolean;
  onToggleToolbox?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onClearAnnotations?: () => void;
  /** A shape draw-session is active (drawing new / editing a saved layer).
      While true, the bar shows Save + contextual Undo/Redo. */
  sessionActive?: boolean;
  /** Persist the current session's shapes (Save). */
  onSave?: () => void;
  /** Save is in flight. */
  saving?: boolean;
}

export const MapActionBar = ({
  activeTool: controlledTool,
  onToolChange,
  commentPlacement = false,
  onToggleCommentPlacement,
  toolboxActive = false,
  onToggleToolbox,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  _onClearAnnotations,
  sessionActive = false,
  onSave,
  saving = false,
}: MapActionBarProps) => {
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
      className="bg-elevated border-border-primary absolute bottom-12 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border px-2 py-1.5 shadow-xl"
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
            isActiveTool={isActive}
            isDropdownOpen={openDropdownId === group.id}
            selectedVariantId={selectedVariantId}
            onSelectVariant={(variantId) => selectVariant(group.id, variantId)}
            onOpenDropdown={() =>
              setOpenDropdownId((prev) => (prev === group.id ? null : group.id))
            }
          />
        );
      })}

      {/* Toolbox - opens the right-side panel of module tools */}
      <Tooltip
        content="Toolbox"
        placement="top"
      >
        <button
          aria-pressed={toolboxActive}
          type="button"
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
            toolboxActive
              ? "bg-surface-hover text-primary"
              : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          }`}
          onClick={onToggleToolbox}
        >
          <Toolbox size={17} />
        </button>
      </Tooltip>

      {/* Standalone toggle buttons */}
      <Tooltip
        placement="top"
        content={
          commentPlacement
            ? "Click the map to place the comment"
            : "Add a comment to the map"
        }
      >
        <button
          aria-pressed={commentPlacement}
          type="button"
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
            commentPlacement
              ? "bg-primary text-white shadow-sm"
              : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          }`}
          onClick={onToggleCommentPlacement}
        >
          <MessageSquare size={17} />
        </button>
      </Tooltip>

      {/* Draw-session controls: appear only while shapes are being drawn
          (new layer) or edited (saved layer), and disappear once saved. */}
      {sessionActive ? (
        <>
          <div
            className="mx-0.5 h-5 w-px"
            style={{ background: "var(--border-secondary)" }}
          />

          <Tooltip
            content="Save shapes to the layer"
            placement="top"
          >
            <button
              className="bg-primary hover:bg-primary-dark flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              type="button"
              onClick={onSave}
            >
              <Save size={15} />
              {saving ? "Saving…" : "Save"}
            </button>
          </Tooltip>

          {canUndo ? (
            <Tooltip
              content="Undo(ctrl+z)"
              placement="top"
            >
              <button
                className="text-text-secondary hover:bg-surface-hover hover:text-text-primary flex h-9 w-9 items-center justify-center rounded-full transition-colors"
                type="button"
                onClick={onUndo}
              >
                <Undo2 size={17} />
              </button>
            </Tooltip>
          ) : null}

          {canRedo ? (
            <Tooltip
              content="Redo(ctrl+shift+z)"
              placement="top"
            >
              <button
                className="text-text-secondary hover:bg-surface-hover hover:text-text-primary flex h-9 w-9 items-center justify-center rounded-full transition-colors"
                type="button"
                onClick={onRedo}
              >
                <Redo2 size={17} />
              </button>
            </Tooltip>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

export default MapActionBar;
