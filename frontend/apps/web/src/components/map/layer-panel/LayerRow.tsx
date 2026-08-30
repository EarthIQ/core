import { useRef, useState } from "react";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Palette,
  GripVertical,
  MapPin,
  Spline,
  Hexagon,
  Grid3x3,
  Layers,
  Shapes,
  type LucideIcon,
} from "lucide-react";
import { Dropdown } from "@packages/ui";
import type { LayerTreeNode, GeometryType } from "./types";
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
  /** Edit the layer's shapes on the map (vector layers with a dataset). */
  onEditLayer?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverRow: (pos: DropPos) => void;
  onDrop: (pos: DropPos) => void;
}

/** Vector type icons: point / line / polygon. */
const TYPE_ICONS: Record<GeometryType, LucideIcon> = {
  point: MapPin,
  line: Spline,
  polygon: Hexagon,
};

function TypeIcon({ layer }: { layer: LayerTreeNode }) {
  const Icon =
    layer.layerType === "raster"
      ? Grid3x3
      : (layer.geometryType && TYPE_ICONS[layer.geometryType]) || Layers;
  return (
    <Icon
      size={15}
      strokeWidth={1.75}
      className="shrink-0"
      style={{
        color: layer.color ?? "#22d3a0",
        opacity: layer.visible ? 1 : 0.35,
      }}
    />
  );
}

/** Raster style strip shown under the layer name (no "raster" tag). */
function RasterStyleLine({ layer }: { layer: LayerTreeNode }) {
  const color = layer.color ?? "#22d3a0";
  const opacity = layer.opacity ?? 0.8;
  const brightness = layer.brightness ?? 1;
  const contrast = layer.contrast;
  const extras: string[] = [];
  if (Math.abs(brightness - 1) > 0.001)
    extras.push(`brightness ${Math.round(brightness * 100)}%`);
  if (contrast !== undefined && Math.abs(contrast - 1) > 0.001)
    extras.push(`contrast ${Math.round(contrast * 100)}%`);
  return (
    <div className="mt-1 flex items-center gap-1.5 min-w-0">
      <span
        className="h-1.5 w-12 rounded-full shrink-0 border border-white/10"
        style={{
          background: `linear-gradient(90deg, ${color}22, ${color})`,
          opacity,
        }}
      />
      <span className="text-[0.6rem] text-subtle truncate leading-none">
        {Math.round(opacity * 100)}% opacity
        {extras.length > 0 ? ` · ${extras.join(" · ")}` : ""}
      </span>
    </div>
  );
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
  onEditLayer,
  onDragStart,
  onDragEnd,
  onDragOverRow,
  onDrop,
}: LayerRowProps) {
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(layer.name);
  const rowRef = useRef<HTMLDivElement>(null);

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
      className={`group relative flex items-center gap-1.5 py-1.5 pr-1 rounded-lg cursor-grab active:cursor-grabbing transition-colors duration-150 ${
        isDragging ? "opacity-40" : "hover:bg-surface-hover"
      } ${!layer.visible ? "opacity-80" : ""}`}
      style={{ paddingLeft: 4 + depth * 14 }}
    >
      {isDropTarget && dropPosition === "before" && (
        <div className="absolute left-2 right-2 -top-0.5 h-0.5 bg-primary rounded-full" />
      )}
      {isDropTarget && dropPosition === "after" && (
        <div className="absolute left-2 right-2 -bottom-0.5 h-0.5 bg-primary rounded-full" />
      )}

      <GripVertical
        size={11}
        className="opacity-35 text-text-quaternary shrink-0"
      />

      <TypeIcon layer={layer} />

      <div className="flex-1 min-w-0">
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
            className="w-full bg-surface-hover border border-primary/40 rounded px-1.5 py-0.5 text-xs text-text-primary outline-none"
          />
        ) : (
          <span
            className={`block truncate text-xs leading-tight ${
              layer.visible
                ? "text-text-primary"
                : "text-text-tertiary decoration-text-quaternary"
            }`}
            onDoubleClick={() => setEditing(true)}
            title={layer.name}
          >
            {layer.name}
          </span>
        )}
        {!editing && layer.layerType === "raster" && (
          <RasterStyleLine layer={layer} />
        )}
        {!editing && layer.pending && (
          <div className="mt-1 flex items-center gap-1.5 min-w-0">
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse shrink-0"
              style={{ background: "var(--warning)" }}
            />
            <span
              className="text-[0.6rem] leading-none truncate"
              style={{ color: "var(--warning-text)" }}
            >
              unsaved
            </span>
          </div>
        )}
      </div>

      {/* ── Right-side controls: always visible ──────────────────────────── */}
      <button
        type="button"
        onClick={onToggle}
        title={layer.visible ? "Hide layer" : "Show layer"}
        aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
        className={`p-1.5 rounded-md transition-colors shrink-0 ${
          layer.visible
            ? "text-text-secondary hover:text-text-primary"
            : "text-text-quaternary hover:text-text-primary"
        } hover:bg-surface-hover`}
      >
        {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>

      <Dropdown
        trigger={
          <button
            type="button"
            className="p-1.5 rounded-md text-text-quaternary hover:text-text-primary hover:bg-surface-hover transition-colors border-none bg-transparent cursor-pointer"
            title="Layer options"
            aria-label="Layer options"
          >
            <MoreHorizontal size={14} />
          </button>
        }
        placement="bottom-end"
        items={[
          {
            key: "style",
            label: "Layer Style",
            icon: <Palette size={15} />,
            onClick: onOpenStyle,
          },
          ...(onEditLayer
            ? [
                {
                  key: "edit",
                  label: "Edit Shapes",
                  icon: <Shapes size={15} />,
                  onClick: onEditLayer,
                },
              ]
            : []),
          {
            key: "rename",
            label: "Rename Layer",
            icon: <Pencil size={15} />,
            onClick: () => setEditing(true),
          },
          {
            key: "visibility",
            label: layer.visible ? "Hide Layer" : "Show Layer",
            icon: layer.visible ? <EyeOff size={15} /> : <Eye size={15} />,
            onClick: onToggle,
          },
          { key: "divider", divider: true },
          {
            key: "remove",
            label: "Remove Layer",
            icon: <Trash2 size={15} />,
            danger: true,
            onClick: onRemove,
          },
        ]}
      />
    </div>
  );
}
