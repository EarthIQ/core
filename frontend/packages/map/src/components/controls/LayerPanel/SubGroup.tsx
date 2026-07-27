// src/components/controls/LayerPanel/SubGroup.tsx

import React, { memo, useCallback } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, Radio } from "lucide-react";
import { GroupIcon } from "./GroupIcon";
import { LayerItem } from "./LayerItem";
import type { ResolvedSubGroup } from "./types";

interface SubGroupProps {
  subGroup: ResolvedSubGroup;
  onToggleExpanded: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onLayerVisibilityChange: (id: string, visible: boolean) => void;
  onLayerOpacityChange: (id: string, opacity: number) => void;
  onLayerDelete: (id: string) => void;
  onLayerZoomTo: (id: string) => void;
  onLayerMoveUp: (id: string) => void;
  onLayerMoveDown: (id: string) => void;
  showTypeBadges: boolean;
  allowReorder: boolean;
  allowDelete: boolean;
}

export const SubGroupComponent: React.FC<SubGroupProps> = memo(
  ({
    subGroup,
    onToggleExpanded,
    onToggleVisibility,
    selectedLayerId,
    onSelectLayer,
    onLayerVisibilityChange,
    onLayerOpacityChange,
    onLayerDelete,
    onLayerZoomTo,
    onLayerMoveUp,
    onLayerMoveDown,
    showTypeBadges,
    allowReorder,
    allowDelete,
  }) => {
    const handleToggle = useCallback(
      () => onToggleExpanded(subGroup.id),
      [subGroup.id, onToggleExpanded]
    );

    const handleVisibility = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleVisibility(subGroup.id);
      },
      [subGroup.id, onToggleVisibility]
    );

    return (
      <div
        role="group"
        aria-label={subGroup.name}
      >
        {/* Header */}
        <div
          onClick={handleToggle}
          className="flex cursor-pointer items-center gap-2 px-3 py-1.5 transition-colors select-none hover:bg-[var(--surface-hover)]"
          role="button"
          aria-expanded={subGroup.expanded}
        >
          {subGroup.expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          )}

          <GroupIcon
            icon={subGroup.icon || "folder"}
            expanded={subGroup.expanded}
            className="h-3.5 w-3.5 text-[var(--text-secondary)]"
          />

          <span className="flex-1 truncate text-xs font-semibold text-[var(--text-secondary)]">
            {subGroup.name}
          </span>

          {/* Single-select badge */}
          {subGroup.singleSelect && (
            <span
              className="flex items-center gap-0.5 rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-[var(--text-tertiary)] uppercase"
              title="Only one layer can be visible at a time"
            >
              <Radio className="h-2.5 w-2.5" />1
            </span>
          )}

          <button
            onClick={handleVisibility}
            className="flex-shrink-0 rounded p-0.5 transition-colors hover:bg-[var(--surface-active)]"
            aria-label={`${subGroup.visible ? "Hide" : "Show"} all in ${subGroup.name}`}
          >
            {subGroup.visible ? (
              <Eye className="h-3 w-3 text-[var(--text-tertiary)]" />
            ) : (
              <EyeOff className="h-3 w-3 text-[var(--text-tertiary)]" />
            )}
          </button>

          <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">
            {subGroup.visibleCount}/{subGroup.totalCount}
          </span>
        </div>

        {/* Layers */}
        {subGroup.expanded && (
          <div className="ml-6 border-l border-[var(--border-secondary)] pb-0.5">
            {subGroup.layers.map((layer) => (
              <LayerItem
                key={layer.id}
                layer={layer}
                isSelected={selectedLayerId === layer.id}
                onSelect={onSelectLayer}
                onVisibilityChange={onLayerVisibilityChange}
                onOpacityChange={onLayerOpacityChange}
                onDelete={onLayerDelete}
                onZoomTo={onLayerZoomTo}
                onMoveUp={onLayerMoveUp}
                onMoveDown={onLayerMoveDown}
                showTypeBadge={showTypeBadges}
                allowReorder={allowReorder}
                allowDelete={allowDelete && !layer.locked}
                singleSelect={subGroup.singleSelect}
                indentLevel={0}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

SubGroupComponent.displayName = "SubGroupComponent";
