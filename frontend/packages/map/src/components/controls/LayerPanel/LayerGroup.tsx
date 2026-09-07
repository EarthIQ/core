// src/components/controls/LayerPanel/LayerGroup.tsx

import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import React, { memo, useCallback } from "react";

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
        aria-label={group.name}
        className="border-b border-[var(--border-secondary)] last:border-b-0"
        role="group"
      >
        {/* Group Header */}
        <div
          aria-expanded={group.expanded}
          className="flex cursor-pointer items-center gap-2 px-3 py-2.5 transition-colors select-none hover:bg-[var(--surface-hover)]"
          role="button"
          onClick={handleToggle}
        >
          {group.expanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-[var(--text-secondary)]" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--text-secondary)]" />
          )}

          <span style={{ color: group.color || "var(--primary)" }}>
            <GroupIcon
              className="h-4 w-4"
              expanded={group.expanded}
              icon={group.icon || "folder"}
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
            aria-label={`${group.visible ? "Hide" : "Show"} all in ${group.name}`}
            className="flex-shrink-0 rounded p-0.5 transition-colors hover:bg-[var(--surface-active)]"
            onClick={handleVisibility}
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
        {group.expanded ? <div className="pb-1">
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
                    allowDelete={allowDelete ? !group.locked : null}
                    allowReorder={allowReorder}
                    indentLevel={1}
                    isSelected={selectedLayerId === layer.id}
                    layer={layer}
                    showTypeBadge={showTypeBadges}
                    singleSelect={group.singleSelect}
                    onDelete={onLayerDelete}
                    onMoveDown={onLayerMoveDown}
                    onMoveUp={onLayerMoveUp}
                    onOpacityChange={onLayerOpacityChange}
                    onSelect={onSelectLayer}
                    onVisibilityChange={onLayerVisibilityChange}
                    onZoomTo={onLayerZoomTo}
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
                    allowDelete={allowDelete ? !group.locked : null}
                    allowReorder={allowReorder}
                    selectedLayerId={selectedLayerId}
                    showTypeBadges={showTypeBadges}
                    subGroup={subGroup}
                    onLayerDelete={onLayerDelete}
                    onLayerMoveDown={onLayerMoveDown}
                    onLayerMoveUp={onLayerMoveUp}
                    onLayerOpacityChange={onLayerOpacityChange}
                    onLayerVisibilityChange={onLayerVisibilityChange}
                    onLayerZoomTo={onLayerZoomTo}
                    onSelectLayer={onSelectLayer}
                    onToggleExpanded={onToggleSubGroupExpanded}
                    onToggleVisibility={onToggleSubGroupVisibility}
                  />
                ))}
              </div>
            )}
          </div> : null}
      </div>
    );
  }
);

LayerGroupComponent.displayName = "LayerGroupComponent";
