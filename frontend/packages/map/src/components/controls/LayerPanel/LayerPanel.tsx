import React, { useState, useCallback } from "react";
import {
  Layers,
  Eye,
  EyeOff,
  ChevronsUpDown,
  X,
  Filter,
  FolderOpen,
} from "lucide-react";
import { useLayerPanelConfig } from "../../../hooks/useLayerPanelConfig";
import { SearchBar } from "./SearchBar";
import { LayerGroupComponent } from "./LayerGroup";
import { LayerItem } from "./LayerItem";
import type { LayerPanelConfig } from "./types";

interface LayerPanelProps {
  /** JSON configuration defining groups, layers, and behavior */
  config: LayerPanelConfig;
  /** Additional CSS classes */
  className?: string;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Callback when panel collapses/expands */
  onToggle?: (collapsed: boolean) => void;
  /** Callback when panel is closed */
  onClose?: () => void;
  /** Callback when a layer is selected */
  onLayerSelect?: (layerId: string | null) => void;
  /** Callback when a layer visibility is toggled */
  onLayerVisibilityChange?: (layerId: string, visible: boolean) => void;
  /** Callback when a layer opacity is changed */
  onLayerOpacityChange?: (layerId: string, opacity: number) => void;
  /** Optional map instance to use instead of context */
  map?: maplibregl.Map | null;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  config: panelConfig,
  className = "",
  defaultCollapsed = false,
  style,
  onToggle,
  onClose,
  onLayerSelect,
  onLayerVisibilityChange,
  onLayerOpacityChange,
  map,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const {
    groups,
    unmatchedLayers,
    counts,
    config,

    searchQuery,
    filterMode,
    selectedLayerId,

    setSearchQuery,
    setFilterMode,
    setSelectedLayerId,
    clearFilters,

    toggleGroupExpanded,
    toggleSubGroupExpanded,
    toggleGroupVisibility,
    toggleSubGroupVisibility,

    setLayerVisibility,
    setLayerOpacity,
    zoomToLayer,
    handleMoveLayer,
    handleDeleteLayer,

    toggleAllVisibility,
    expandAll,
    collapseAll,
  } = useLayerPanelConfig(
    panelConfig,
    {
      onVisibilityChange: onLayerVisibilityChange,
      onOpacityChange: onLayerOpacityChange,
    },
    map
  );

  const handleToggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      onToggle?.(next);
      return next;
    });
  }, [onToggle]);

  const handleSelectLayer = useCallback(
    (layerId: string) => {
      const newId = selectedLayerId === layerId ? null : layerId;
      setSelectedLayerId(newId);
      onLayerSelect?.(newId);
    },
    [selectedLayerId, setSelectedLayerId, onLayerSelect]
  );

  const handleLayerVisibilityChange = useCallback(
    (layerId: string, visible: boolean) => {
      setLayerVisibility(layerId, visible);
      onLayerVisibilityChange?.(layerId, visible);
    },
    [setLayerVisibility, onLayerVisibilityChange]
  );

  const handleMoveUp = useCallback(
    (layerId: string) => handleMoveLayer(layerId, "up"),
    [handleMoveLayer]
  );

  const handleMoveDown = useCallback(
    (layerId: string) => handleMoveLayer(layerId, "down"),
    [handleMoveLayer]
  );

  const hasActiveFilters = !!searchQuery.trim() || filterMode !== "all";
  const hasResults = groups.length > 0 || unmatchedLayers.length > 0;

  // ── Collapsed ──
  if (isCollapsed) {
    return (
      <button
        onClick={handleToggleCollapsed}
        className={`flex items-center gap-2 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] px-3 py-2.5 shadow-lg transition-all hover:bg-[var(--surface-hover)] hover:shadow-xl ${className}`}
        style={style}
        aria-label="Open layer panel"
        aria-expanded="false"
      >
        <Layers className="h-5 w-5 text-[var(--primary)]" />
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {config.title || "Layers"}
        </span>
        <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-medium text-white">
          {counts.visible}
        </span>
      </button>
    );
  }

  // ── Expanded ──
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] shadow-lg ${!className.includes("max-h-") ? "max-h-[80vh]" : ""} ${!className.includes("w-") ? "w-80" : ""} ${className}`}
      style={style}
      role="region"
      aria-label={config.title || "Layer panel"}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-[var(--primary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            {config.title || "Layers"}
          </h2>
          <span className="rounded-full bg-[var(--bg-tertiary)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)] tabular-nums">
            {counts.visible}/{counts.total}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => toggleAllVisibility(true)}
            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--surface-hover)]"
            title="Show all"
            aria-label="Show all layers"
          >
            <Eye className="h-4 w-4 text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={() => toggleAllVisibility(false)}
            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--surface-hover)]"
            title="Hide all"
            aria-label="Hide all layers"
          >
            <EyeOff className="h-4 w-4 text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={() => {
              const allExpanded = groups.every((g) => g.expanded);
              allExpanded ? collapseAll() : expandAll();
            }}
            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--surface-hover)]"
            title="Expand/Collapse all"
            aria-label="Toggle expand all"
          >
            <ChevronsUpDown className="h-4 w-4 text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--surface-hover)]"
            title="Close"
            aria-label="Close layer panel"
          >
            <X className="h-4 w-4 text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

      {/* Search */}
      {config.showSearch !== false && (
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
          resultCount={
            groups.reduce((s, g) => s + g.totalCount, 0) +
            unmatchedLayers.length
          }
          totalCount={counts.total}
          showFilters={config.showFilters !== false}
        />
      )}

      {/* Layer List */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        role="tree"
        aria-label="Layer list"
      >
        {!hasResults ? (
          <EmptyState
            hasFilters={hasActiveFilters}
            onClear={clearFilters}
            hasTotalLayers={counts.total > 0}
          />
        ) : (
          <>
            {/* Configured Groups */}
            {groups.map((group) => (
              <LayerGroupComponent
                key={group.id}
                group={group}
                onToggleExpanded={toggleGroupExpanded}
                onToggleVisibility={toggleGroupVisibility}
                onToggleSubGroupExpanded={toggleSubGroupExpanded}
                onToggleSubGroupVisibility={toggleSubGroupVisibility}
                selectedLayerId={selectedLayerId}
                onSelectLayer={handleSelectLayer}
                onLayerVisibilityChange={handleLayerVisibilityChange}
                onLayerOpacityChange={setLayerOpacity}
                onLayerDelete={handleDeleteLayer}
                onLayerZoomTo={zoomToLayer}
                onLayerMoveUp={handleMoveUp}
                onLayerMoveDown={handleMoveDown}
                showTypeBadges={Boolean(config.showTypeBadges !== false)}
                allowReorder={Boolean(config.allowReorder !== false)}
                allowDelete={Boolean(config.allowDelete !== false)}
              />
            ))}

            {/* Unmatched Layers */}
            {/* {unmatchedLayers.length > 0 && (
              <div className="border-t border-[var(--border-secondary)]">
                <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] px-3 py-2">
                  <FolderOpen className="h-4 w-4 text-[var(--text-tertiary)]" />
                  <span className="text-xs font-semibold text-[var(--text-tertiary)]">
                    {config.unmatchedGroupName || "Other Layers"}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">
                    {unmatchedLayers.filter((l) => l.visible).length}/
                    {unmatchedLayers.length}
                  </span>
                </div>
                {unmatchedLayers.map((layer) => (
                  <LayerItem
                    key={layer.id}
                    layer={layer}
                    isSelected={selectedLayerId === layer.id}
                    onSelect={handleSelectLayer}
                    onVisibilityChange={handleLayerVisibilityChange}
                    onOpacityChange={setLayerOpacity}
                    onDelete={handleDeleteLayer}
                    onZoomTo={zoomToLayer}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    showTypeBadge={Boolean(config.showTypeBadges !== false)}
                    allowReorder={Boolean(config.allowReorder !== false)}
                    allowDelete={Boolean(config.allowDelete !== false)}
                  />
                ))}
              </div>
            )} */}
          </>
        )}
      </div>

      {/* Footer */}
      {config.showFooter !== false && (
        <div className="border-t border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-3 py-2">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
            <span className="tabular-nums">
              {counts.visible} of {counts.total} layers visible
            </span>
            {counts.hidden > 0 && (
              <span className="text-[var(--warning)] tabular-nums">
                {counts.hidden} hidden
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Empty State ──
const EmptyState: React.FC<{
  hasFilters: boolean;
  onClear: () => void;
  hasTotalLayers: boolean;
}> = ({ hasFilters, onClear, hasTotalLayers }) => (
  <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
      {hasTotalLayers ? (
        <Filter className="h-8 w-8 text-[var(--text-tertiary)]" />
      ) : (
        <Layers className="h-8 w-8 text-[var(--text-tertiary)]" />
      )}
    </div>
    <p className="text-sm font-medium text-[var(--text-secondary)]">
      {hasTotalLayers ? "No layers found" : "No layers"}
    </p>
    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
      {hasTotalLayers
        ? "Try adjusting your search or filters"
        : "Add layers to your map to see them here"}
    </p>
    {hasFilters && (
      <button
        onClick={onClear}
        className="mt-2 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
      >
        Clear filters
      </button>
    )}
  </div>
);

export default LayerPanel;
