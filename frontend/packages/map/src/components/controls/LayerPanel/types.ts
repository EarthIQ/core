// src/components/controls/LayerPanel/types.ts

export interface LayerDisplayInfo {
  id: string;
  type: string;
  source: string;
  sourceLayer?: string;
  visible: boolean;
  opacity: number;
  minzoom?: number;
  maxzoom?: number;
  /** User-friendly display name derived from the layer ID */
  displayName: string;
  /** Whether this layer is locked (non-deletable, e.g., base map layers) */
  locked: boolean;
  /** Color extracted from paint properties, if available */
  color?: string;
}

export interface LayerGroup {
  id: string;
  name: string;
  source: string;
  expanded: boolean;
  layers: LayerDisplayInfo[];
  visible: boolean;
}

export type FilterMode = "all" | "visible" | "hidden";

export type SortMode = "default" | "name" | "type" | "source";

export interface LayerPanelState {
  searchQuery: string;
  filterMode: FilterMode;
  sortMode: SortMode;
  groupBySource: boolean;
  expandedGroups: Set<string>;
  selectedLayerId: string | null;
}

export interface LayerConfig {
  /** MapLibre layer ID to match */
  id: string;
  /** Custom display name (overrides auto-generated name) */
  displayName?: string;
  /** Whether this layer should appear in the panel at all */
  showInPanel?: boolean;
  /** Initial visibility */
  defaultVisible?: boolean;
  /** Initial opacity (0–1) */
  defaultOpacity?: number;
  /** Whether the user can delete this layer */
  locked?: boolean;
  /** Whether the user can toggle visibility */
  allowToggleVisibility?: boolean;
  /** Whether the user can change opacity */
  allowChangeOpacity?: boolean;
  /** Custom color override for the legend swatch */
  color?: string;
  /** Custom icon override */
  icon?: string;
  /** Metadata shown in properties dialog */
  metadata?: Record<string, string | number | boolean>;
  /** Tags for additional filtering */
  tags?: string[];
}

export interface SubGroupConfig {
  /** Unique subgroup ID */
  id: string;
  /** Display name */
  name: string;
  /** Whether expanded by default */
  defaultExpanded?: boolean;
  /** Layer configurations in this subgroup */
  layers: LayerConfig[];
  /** Icon name */
  icon?: string;
  /** Whether only a single layer can be selected in this subgroup */
  singleSelect?: boolean;
}

export interface GroupConfig {
  /** Unique group ID */
  id: string;
  /** Display name */
  name: string;
  /** Whether expanded by default */
  defaultExpanded?: boolean;
  /** Icon name: "map" | "folder" | "layers" | "database" | "globe" | custom */
  icon?: string;
  /** Direct layers in this group */
  layers?: LayerConfig[];
  /** Subgroups within this group */
  subGroups?: SubGroupConfig[];
  /** Whether all layers in this group are locked */
  locked?: boolean;
  /** Custom color for group header accent */
  color?: string;
  /** Whether only a single layer can be selected in this group */
  singleSelect?: boolean;
}

export interface LayerPanelConfig {
  /** Panel title */
  title?: string;
  /** Groups of layers */
  groups: GroupConfig[];
  /**
   * Layers not listed in any group:
   * "hide" = don't show them
   * "show" = show in an "Other" group
   * "show-ungrouped" = show as flat list at the bottom
   */
  unmatchedLayers?: "hide" | "show" | "show-ungrouped";
  /** Label for the unmatched layers group */
  unmatchedGroupName?: string;
  /** Whether to show the search bar */
  showSearch?: boolean;
  /** Whether to show the filter buttons */
  showFilters?: boolean;
  /** Whether to show layer type badges */
  showTypeBadges?: boolean;
  /** Whether to show the footer */
  showFooter?: boolean;
  /** Whether layers can be reordered */
  allowReorder?: boolean;
  /** Whether layers can be deleted */
  allowDelete?: boolean;
  /** Global layer ID patterns to always exclude from the panel */
  excludePatterns?: string[];
}

// ─── Internal Runtime Types ───

export interface ResolvedLayer {
  id: string;
  mapLayerId: string;
  displayName: string;
  type: string;
  source: string;
  sourceLayer?: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
  allowToggleVisibility: boolean;
  allowChangeOpacity: boolean;
  color?: string;
  icon?: string;
  metadata?: Record<string, string | number | boolean>;
  tags?: string[];
  minzoom?: number;
  maxzoom?: number;
  /** Whether this layer exists in the current map style */
  existsOnMap: boolean;
}

export interface ResolvedSubGroup {
  id: string;
  name: string;
  icon?: string;
  expanded: boolean;
  layers: ResolvedLayer[];
  visible: boolean;
  visibleCount: number;
  totalCount: number;
  singleSelect: boolean;
}

export interface ResolvedGroup {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  expanded: boolean;
  locked: boolean;
  layers: ResolvedLayer[];
  subGroups: ResolvedSubGroup[];
  visible: boolean;
  visibleCount: number;
  totalCount: number;
  singleSelect: boolean;
}
