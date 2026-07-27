// src/components/controls/LayerPanel/LayerItem.tsx

import React, { useState, useCallback, memo } from "react";
import {
  Eye,
  EyeOff,
  MoreVertical,
  GripVertical,
  Lock,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Info,
  Calendar,
  Database,
  Tag,
  Shield,
  Hash,
} from "lucide-react";
import { LayerTypeIcon } from "./LayerTypeIcon";
import { OpacitySlider } from "./OpacitySlider";
import { LayerContextMenu } from "./LayerContextMenu";
import type { ResolvedLayer } from "./types";

interface LayerItemProps {
  layer: ResolvedLayer;
  isSelected: boolean;
  onSelect: (layerId: string) => void;
  onVisibilityChange: (layerId: string, visible: boolean) => void;
  onOpacityChange: (layerId: string, opacity: number) => void;
  onDelete: (layerId: string) => void;
  onZoomTo: (layerId: string) => void;
  onMoveUp: (layerId: string) => void;
  onMoveDown: (layerId: string) => void;
  showTypeBadge?: boolean;
  allowReorder?: boolean;
  allowDelete?: boolean;
  /** When true, renders a radio-style indicator instead of checkbox-style */
  singleSelect?: boolean;
  indentLevel?: number;
}

export const LayerItem: React.FC<LayerItemProps> = memo(
  ({
    layer,
    isSelected,
    onSelect,
    onVisibilityChange,
    onOpacityChange,
    onDelete,
    onZoomTo,
    onMoveUp,
    onMoveDown,
    showTypeBadge = true,
    allowReorder = true,
    allowDelete = true,
    singleSelect = false,
    indentLevel = 0,
  }) => {
    const [showOpacity, setShowOpacity] = useState(false);
    const [showContextMenu, setShowContextMenu] = useState(false);

    const handleVisibilityClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!layer.allowToggleVisibility) return;

        if (singleSelect && layer.visible) {
          // In single-select mode, allow turning off the active layer
          // (results in nothing selected)
          onVisibilityChange(layer.id, false);
        } else {
          onVisibilityChange(layer.id, !layer.visible);
        }
      },
      [
        layer.id,
        layer.visible,
        layer.allowToggleVisibility,
        singleSelect,
        onVisibilityChange,
      ]
    );

    const handleRowClick = useCallback(
      () => onSelect(layer.id),
      [layer.id, onSelect]
    );

    const handleOpacityToggle = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setShowOpacity((prev) => !prev);
    }, []);

    const handleContextMenuToggle = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setShowContextMenu((prev) => !prev);
    }, []);

    const handleOpacityChange = useCallback(
      (val: number) => {
        if (!layer.allowChangeOpacity) return;
        onOpacityChange(layer.id, val);
      },
      [layer.id, layer.allowChangeOpacity, onOpacityChange]
    );

    const paddingLeft = 8 + indentLevel * 16;
    // const isMissing = !layer.existsOnMap;
    const isMissing = false;

    return (
      <div
        className="select-none"
        role="treeitem"
        aria-selected={isSelected}
      >
        {/* Main Row */}
        <div
          onClick={handleRowClick}
          className={`group relative flex cursor-pointer items-center gap-1.5 py-1.5 pr-2 transition-colors ${
            isSelected
              ? "border-l-2 border-l-[var(--primary)] bg-[var(--primary)]/10"
              : "border-l-2 border-l-transparent hover:bg-[var(--surface-hover)]"
          } ${!layer.visible ? "opacity-50" : ""} ${isMissing ? "opacity-40" : ""}`}
          style={{ paddingLeft }}
        >
          {/* Drag Handle */}
          {allowReorder && !layer.locked ? (
            <GripVertical
              className="h-3.5 w-3.5 flex-shrink-0 cursor-grab text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            />
          ) : (
            <div className="w-3.5 flex-shrink-0" />
          )}

          {/* ─── Visibility Toggle: Radio vs Checkbox ─── */}
          <button
            onClick={handleVisibilityClick}
            disabled={!layer.allowToggleVisibility || isMissing}
            className="flex-shrink-0 rounded p-0.5 transition-colors hover:bg-[var(--surface-active)] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`${layer.visible ? "Hide" : "Show"} ${layer.displayName}`}
          >
            {singleSelect ? (
              /* ── Radio Button Style ── */
              <div
                className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                  layer.visible
                    ? "border-[var(--primary)] bg-[var(--primary)]"
                    : "border-[var(--text-tertiary)] bg-transparent"
                }`}
              >
                {layer.visible && (
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </div>
            ) : /* ── Checkbox / Eye Style ── */
            layer.visible ? (
              <Eye className="h-4 w-4 text-[var(--primary)]" />
            ) : (
              <EyeOff className="h-4 w-4 text-[var(--text-tertiary)]" />
            )}
          </button>

          {/* Layer Type Icon */}
          <LayerTypeIcon
            type={layer.type}
            className="h-4 w-4 text-[var(--text-secondary)]"
          />

          {/* Color Swatch */}
          {layer.color && (
            <div
              className="h-3 w-3 flex-shrink-0 rounded border border-[var(--border-primary)]"
              style={{ backgroundColor: layer.color }}
            />
          )}

          {/* Layer Name */}
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <span
              onClick={handleVisibilityClick}
              className={`block cursor-pointer truncate text-sm font-medium text-[var(--text-primary)] transition-opacity hover:opacity-75 ${isMissing ? "italic" : ""} ${!layer.allowToggleVisibility ? "cursor-default hover:opacity-100" : ""}`}
              title={`${layer.displayName} (${layer.id})\nClick to toggle visibility`}
            >
              {layer.displayName}
            </span>
            {isMissing && (
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-[var(--warning)]" />
            )}
          </div>

          {/* Metadata badge */}
          {layer.metadata?.featureCount && (
            <span className="flex-shrink-0 rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)] tabular-nums">
              {Number(layer.metadata.featureCount).toLocaleString()}
            </span>
          )}

          {/* Type Badge */}
          {showTypeBadge && layer.existsOnMap && (
            <span className="hidden flex-shrink-0 rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[var(--text-tertiary)] uppercase sm:inline-block">
              {layer.type}
            </span>
          )}

          {/* Lock */}
          {layer.locked && (
            <Lock className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-tertiary)]" />
          )}

          {/* Actions */}
          <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {layer.allowChangeOpacity && (
              <button
                onClick={handleOpacityToggle}
                disabled={isMissing}
                className={`rounded p-1 transition-colors hover:bg-[var(--surface-active)] disabled:cursor-not-allowed disabled:opacity-40 ${showOpacity ? "text-[var(--primary)]" : "text-[var(--text-tertiary)]"}`}
                aria-label="Toggle opacity"
                aria-expanded={showOpacity}
              >
                {showOpacity ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            <div className="relative">
              <button
                onClick={handleContextMenuToggle}
                className="rounded p-1 transition-colors hover:bg-[var(--surface-active)]"
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={showContextMenu}
              >
                <MoreVertical className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              </button>
              <LayerContextMenu
                isOpen={showContextMenu}
                onClose={() => setShowContextMenu(false)}
                onZoomTo={() => onZoomTo(layer.id)}
                onDelete={
                  allowDelete && !layer.locked
                    ? () => onDelete(layer.id)
                    : undefined
                }
                onMoveUp={allowReorder ? () => onMoveUp(layer.id) : undefined}
                onMoveDown={
                  allowReorder ? () => onMoveDown(layer.id) : undefined
                }
                locked={layer.locked}
                layerName={layer.displayName}
              />
            </div>
          </div>
        </div>

        {/* Opacity Slider & Details */}
        {showOpacity && (
          <div
            className="flex flex-col gap-2 rounded-b-lg bg-[var(--bg-tertiary)]/50 px-3 py-3"
            style={{ paddingLeft: paddingLeft + 24 }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Full Name (Untruncated) */}
            <div className="mb-1">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {layer.displayName}
              </span>
              <div className="text-[10px] text-[var(--text-tertiary)] tabular-nums">
                ID: {layer.id}
              </div>
            </div>

            {layer.allowChangeOpacity && (
              <OpacitySlider
                value={layer.opacity}
                onChange={handleOpacityChange}
                disabled={!layer.visible || isMissing}
              />
            )}

            {/* Collection Details */}
            {layer.metadata && (
              <div className="mt-2 flex flex-col gap-2 border-t border-[var(--border-primary)] pt-2">
                {layer.metadata["description"] && (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-[10px] font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
                      <Info className="h-3 w-3" />
                      About
                    </div>
                    <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
                      {(layer.metadata["description"] as string).split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
                        if (part.match(/https?:\/\/[^\s]+/)) {
                          return (
                            <a
                              key={i}
                              href={part}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--primary)] hover:underline break-all"
                            >
                              {part}
                            </a>
                          );
                        }
                        return part;
                      })}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {layer.metadata["count"] !== undefined && (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 text-[9px] font-medium text-[var(--text-tertiary)] uppercase opacity-70">
                        <Hash className="h-2.5 w-2.5" />
                        Assets
                      </div>
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] tabular-nums">
                        {Number(layer.metadata["count"]).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {layer.metadata["format"] && (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 text-[9px] font-medium text-[var(--text-tertiary)] uppercase opacity-70">
                        <Database className="h-2.5 w-2.5" />
                        Format
                      </div>
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">
                        {layer.metadata["format"] as string}
                      </span>
                    </div>
                  )}

                  {layer.metadata["tags"] && (
                    <div className="col-span-2 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 text-[9px] font-medium text-[var(--text-tertiary)] uppercase opacity-70">
                        <Tag className="h-2.5 w-2.5" />
                        Tags
                      </div>
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                        {layer.metadata["tags"] as string}
                      </span>
                    </div>
                  )}

                  {layer.metadata["license"] && (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 text-[9px] font-medium text-[var(--text-tertiary)] uppercase opacity-70">
                        <Shield className="h-2.5 w-2.5" />
                        License
                      </div>
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                        {layer.metadata["license"] as string}
                      </span>
                    </div>
                  )}

                  {(layer.metadata["start"] || layer.metadata["end"]) && (
                    <div className="col-span-2 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 text-[9px] font-medium text-[var(--text-tertiary)] uppercase opacity-70">
                        <Calendar className="h-2.5 w-2.5" />
                        Temporal Coverage
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-secondary)] tabular-nums">
                        <span>
                          {layer.metadata["start"]
                            ? new Date(
                                layer.metadata["start"] as string
                              ).toLocaleDateString()
                            : "..."}
                        </span>
                        <span className="px-1 text-[var(--text-tertiary)]">
                          →
                        </span>
                        <span>
                          {layer.metadata["end"]
                            ? new Date(
                                layer.metadata["end"] as string
                              ).toLocaleDateString()
                            : "Now"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

LayerItem.displayName = "LayerItem";
