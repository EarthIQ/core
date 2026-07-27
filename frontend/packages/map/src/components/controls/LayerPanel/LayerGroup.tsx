// src/components/controls/LayerPanel/LayerGroup.tsx

import React, { memo, useCallback } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, Radio } from "lucide-react";
import { GroupIcon } from "./GroupIcon";
import { LayerItem } from "./LayerItem";
import { SubGroupComponent } from "./SubGroup";
import type { ResolvedGroup } from "./types";

interface LayerGroupProps {
  group: ResolvedGroup;
  onToggleExpanded: (groupId: string) => void;
  onToggleVisibility: (groupId: string) => void;
  onToggleSubGroupExpanded: (subGroupId: string) => void;
  onToggleSubGroupVisibility: (subGroupId: string) => void;
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  onLayerVisibilityChange: (layerId: string, visible: boolean) => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerZoomTo: (layerId: string) => void;
  onLayerMoveUp: (layerId: string) => void;
  onLayerMoveDown: (layerId: string) => void;
  showTypeBadges: boolean;
  allowReorder: boolean;
  allowDelete: boolean;
}

export const LayerGroupComponent: React.FC<LayerGroupProps> = memo(
  ({
    group,
    onToggleExpanded,
    onToggleVisibility,
    onToggleSubGroupExpanded,
    onToggleSubGroupVisibility,
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
      () => onToggleExpanded(group.id),
      [group.id, onToggleExpanded]
    );

    const handleVisibility = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleVisibility(group.id);
      },
      [group.id, onToggleVisibility]
    );

    return (
      <div
        className="border-b border-[var(--border-secondary)] last:border-b-0"
        role="group"
        aria-label={group.name}
      >
        {/* Group Header */}
        <div
          onClick={handleToggle}
          className="flex cursor-pointer items-center gap-2 px-3 py-2.5 transition-colors select-none hover:bg-[var(--surface-hover)]"
          role="button"
          aria-expanded={group.expanded}
        >
          {group.expanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-[var(--text-secondary)]" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--text-secondary)]" />
          )}

          <span style={{ color: group.color || "var(--primary)" }}>
            <GroupIcon
              icon={group.icon || "folder"}
              expanded={group.expanded}
              className="h-4 w-4"
            />
          </span>

          <span className="flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">
            {group.name}
          </span>

          {/* Single-select indicator */}
          {/* {group.singleSelect && (
            <span
              className="flex items-center gap-0.5 rounded-md bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[var(--text-tertiary)] uppercase"
              title="Single selection: only one layer visible at a time"
            >
              <Radio className="h-3 w-3" />
              Single
            </span>
          )} */}

          <button
            onClick={handleVisibility}
            className="flex-shrink-0 rounded p-0.5 transition-colors hover:bg-[var(--surface-active)]"
            aria-label={`${group.visible ? "Hide" : "Show"} all in ${group.name}`}
          >
            {group.visible ? (
              <Eye className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            )}
          </button>

          <span
            className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-white tabular-nums"
            style={{ backgroundColor: group.color || "var(--primary)" }}
          >
            {group.visibleCount}/{group.totalCount}
          </span>
        </div>

        {/* Content */}
        {group.expanded && (
          <div className="pb-1">
            {/* Direct Layers */}
            {group.layers.length > 0 && (
              <div
                className="ml-5 border-l-2 pb-0.5"
                style={{
                  borderColor: group.color
                    ? `${group.color}40`
                    : "var(--primary)",
                }}
              >
                {group.layers.map((layer) => (
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
                    allowDelete={allowDelete && !group.locked}
                    singleSelect={group.singleSelect}
                    indentLevel={1}
                  />
                ))}
              </div>
            )}

            {/* SubGroups */}
            {group.subGroups?.length > 0 && (
              <div className="ml-3">
                {group.subGroups.map((subGroup) => (
                  <SubGroupComponent
                    key={subGroup.id}
                    subGroup={subGroup}
                    onToggleExpanded={onToggleSubGroupExpanded}
                    onToggleVisibility={onToggleSubGroupVisibility}
                    selectedLayerId={selectedLayerId}
                    onSelectLayer={onSelectLayer}
                    onLayerVisibilityChange={onLayerVisibilityChange}
                    onLayerOpacityChange={onLayerOpacityChange}
                    onLayerDelete={onLayerDelete}
                    onLayerZoomTo={onLayerZoomTo}
                    onLayerMoveUp={onLayerMoveUp}
                    onLayerMoveDown={onLayerMoveDown}
                    showTypeBadges={showTypeBadges}
                    allowReorder={allowReorder}
                    allowDelete={allowDelete && !group.locked}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

LayerGroupComponent.displayName = "LayerGroupComponent";
