// src/hooks/useLayerPanelConfig.ts

import { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { MapContext } from "../context/MapContext";
import { useLayers } from "./useLayers";
import type {
  LayerPanelConfig,
  LayerConfig,
  GroupConfig,
  SubGroupConfig,
  ResolvedLayer,
  ResolvedSubGroup,
  ResolvedGroup,
  FilterMode,
} from "../components/controls/LayerPanel/types";

function matchesPattern(layerId: string, pattern: string): boolean {
  if (pattern === "*") return true;
  if (pattern.startsWith("*") && pattern.endsWith("*")) {
    return layerId.includes(pattern.slice(1, -1));
  }
  if (pattern.startsWith("*")) {
    return layerId.endsWith(pattern.slice(1));
  }
  if (pattern.endsWith("*")) {
    return layerId.startsWith(pattern.slice(0, -1));
  }
  return layerId === pattern;
}

function extractMapLayerColor(
  map: maplibregl.Map,
  layerId: string,
  layerType: string
): string | undefined {
  const colorProps: Record<string, string> = {
    fill: "fill-color",
    line: "line-color",
    circle: "circle-color",
    symbol: "icon-color",
    "fill-extrusion": "fill-extrusion-color",
    background: "background-color",
  };
  const prop = colorProps[layerType];
  if (!prop) return undefined;
  try {
    const value = map.getPaintProperty(layerId, prop);
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      return value.find(
        (v) =>
          typeof v === "string" &&
          (v.startsWith("#") || v.startsWith("rgb") || v.startsWith("hsl"))
      );
    }
  } catch {}
  return undefined;
}

function formatLayerName(id: string): string {
  return id
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function resolveLayer(
  config: LayerConfig,
  map: maplibregl.Map | null,
  mapLayers: Map<string, any>,
  groupLocked: boolean
): ResolvedLayer {
  const mapLayer = mapLayers.get(config.id);
  const existsOnMap = !!mapLayer;

  const color = config.color || (existsOnMap && map ? extractMapLayerColor(map, config.id, mapLayer.type) : undefined);

  return {
    id: config.id,
    mapLayerId: config.id,
    displayName: config.displayName || formatLayerName(config.id),
    type: existsOnMap ? mapLayer.type : "unknown",
    source: existsOnMap ? mapLayer.source : "",
    visible: existsOnMap ? mapLayer.visible : (config.defaultVisible ?? true),
    opacity: existsOnMap ? mapLayer.opacity : (config.defaultOpacity ?? 1),
    locked: config.locked ?? groupLocked,
    allowToggleVisibility: config.allowToggleVisibility ?? true,
    allowChangeOpacity: config.allowChangeOpacity ?? true,
    existsOnMap,
    ...(existsOnMap && mapLayer.sourceLayer ? { sourceLayer: mapLayer.sourceLayer } : {}),
    ...(color ? { color } : {}),
    ...(config.icon ? { icon: config.icon } : {}),
    ...(config.metadata ? { metadata: config.metadata } : {}),
    ...(config.tags ? { tags: config.tags } : {}),
    ...(existsOnMap && mapLayer.minzoom !== undefined ? { minzoom: mapLayer.minzoom } : {}),
    ...(existsOnMap && mapLayer.maxzoom !== undefined ? { maxzoom: mapLayer.maxzoom } : {}),
  } as ResolvedLayer;
}

// ─────────────────────────────────────────────────────────────
// Data structure that maps every layer ID to the single-select
// scope it belongs to, so we can quickly find sibling layers.
// ─────────────────────────────────────────────────────────────
interface SingleSelectScope {
  /** All layer IDs in this scope */
  layerIds: string[];
  /**
   * Scope key for identification
   * (group-level scope uses group id, subgroup-level uses subgroup id)
   */
  scopeId: string;
}

export function useLayerPanelConfig(
  config: LayerPanelConfig,
  callbacks?: {
    onVisibilityChange?:
      | ((layerId: string, visible: boolean) => void)
      | undefined;
    onOpacityChange?: ((layerId: string, opacity: number) => void) | undefined;
  },
  externalMap?: maplibregl.Map | null
) {
  const context = useContext(MapContext);
  const map = externalMap ?? context?.map;
  const isLoaded = externalMap ? true : (context?.isLoaded ?? false);

  const {
    layers: rawLayers,
    setLayerVisibility: mapSetVisibility,
    setLayerOpacity: mapSetOpacity,
    moveLayer,
    removeLayer,
    refresh,
  } = useLayers(map);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedSubGroups, setExpandedSubGroups] = useState<Set<string>>(
    new Set()
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const initializedRef = useRef(false);
  const appliedDefaultsRef = useRef(false);

  const mapLayerMap = useMemo(() => {
    const result = new Map<string, any>();
    rawLayers.forEach((layer) => result.set(layer.id, layer));
    return result;
  }, [rawLayers]);

  // ── Initialize expand state ──
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const groups = new Set<string>();
    const subGroups = new Set<string>();

    config.groups.forEach((g) => {
      if (g.defaultExpanded !== false) groups.add(g.id);
      g.subGroups?.forEach((sg) => {
        if (sg.defaultExpanded !== false) subGroups.add(sg.id);
      });
    });

    setExpandedGroups(groups);
    setExpandedSubGroups(subGroups);
  }, [config]);

  // ── Apply defaults on first load ──
  // We only do this if it's the very first time this hook sees these layers
  // and they haven't been "seen" by the map style before in this session.
  useEffect(() => {
    if (!map || !isLoaded || appliedDefaultsRef.current) return;
    if (rawLayers.length === 0) return;
    
    // Instead of automatically applying, we should probably only apply
    // if the layer doesn't have a state yet.
    // However, to fix the "resetting" bug immediately, we'll skip this
    // automatic application if the layer already exists on the map.
    // The components (like CollectionLayer) should be responsible for their own defaults.
    appliedDefaultsRef.current = true;

    // Optional: Only apply if you explicitly want the panel to override map defaults
    /*
    const apply = (lc: LayerConfig) => {
      if (!mapLayerMap.has(lc.id)) return;
      if (lc.defaultVisible !== undefined)
        mapSetVisibility(lc.id, lc.defaultVisible);
      if (lc.defaultOpacity !== undefined)
        mapSetOpacity(lc.id, lc.defaultOpacity);
    };

    config.groups.forEach((g) => {
      g.layers?.forEach(apply);
      g.subGroups?.forEach((sg) => sg.layers.forEach(apply));
    });
    */
  }, [
    map,
    isLoaded,
    rawLayers.length,
    config,
    mapLayerMap,
    mapSetVisibility,
    mapSetOpacity,
  ]);

  // ─────────────────────────────────────────────────────────
  // BUILD SINGLE-SELECT SCOPE MAP
  //
  // This creates a lookup: layerId → SingleSelectScope
  // so that when a layer is toggled ON we can quickly find
  // every sibling that needs to be turned OFF.
  // ─────────────────────────────────────────────────────────
  const singleSelectScopeMap = useMemo(() => {
    const scopeMap = new Map<string, SingleSelectScope>();

    config.groups.forEach((group) => {
      if (group.singleSelect) {
        // ── Group-level single select ──
        // ALL layers in the entire group (direct + all subgroups)
        // share one scope. Only one can be visible at a time.
        const allLayerIds: string[] = [];

        group.layers?.forEach((lc) => {
          if (lc.showInPanel !== false) allLayerIds.push(lc.id);
        });
        group.subGroups?.forEach((sg) => {
          sg.layers.forEach((lc) => {
            if (lc.showInPanel !== false) allLayerIds.push(lc.id);
          });
        });

        const scope: SingleSelectScope = {
          scopeId: `group:${group.id}`,
          layerIds: allLayerIds,
        };

        allLayerIds.forEach((id) => scopeMap.set(id, scope));
      } else {
        // ── Check subgroup-level single select ──
        group.subGroups?.forEach((sg) => {
          if (sg.singleSelect) {
            const subGroupLayerIds = sg.layers
              .filter((lc) => lc.showInPanel !== false)
              .map((lc) => lc.id);

            const scope: SingleSelectScope = {
              scopeId: `subgroup:${sg.id}`,
              layerIds: subGroupLayerIds,
            };

            subGroupLayerIds.forEach((id) => scopeMap.set(id, scope));
          }
        });
      }
    });

    return scopeMap;
  }, [config]);

  // ─────────────────────────────────────────────────────────
  // VISIBILITY HELPER (triggers callbacks)
  // ─────────────────────────────────────────────────────────
  const updateVisibility = useCallback(
    (layerId: string, visible: boolean) => {
      mapSetVisibility(layerId, visible);
      callbacks?.onVisibilityChange?.(layerId, visible);
    },
    [mapSetVisibility, callbacks]
  );

  // ─────────────────────────────────────────────────────────
  // SINGLE-SELECT AWARE VISIBILITY HANDLER
  // ─────────────────────────────────────────────────────────
  const setLayerVisibility = useCallback(
    (layerId: string, visible: boolean) => {
      const scope = singleSelectScopeMap.get(layerId);

      if (scope && visible) {
        // Turning this layer ON in a single-select scope:
        // First, turn OFF every other layer in the scope
        scope.layerIds.forEach((siblingId) => {
          if (siblingId !== layerId) {
            updateVisibility(siblingId, false);
          }
        });
      }

      // Now apply the requested change
      updateVisibility(layerId, visible);
    },
    [singleSelectScopeMap, updateVisibility]
  );

  // ── Resolve groups ──
  const resolvedGroups: ResolvedGroup[] = useMemo(() => {
    return config.groups.map((groupConfig): ResolvedGroup => {
      const isGroupLocked = groupConfig.locked ?? false;
      const isGroupSingleSelect = groupConfig.singleSelect ?? false;

      const directLayers = (groupConfig.layers || [])
        .filter((lc) => lc.showInPanel !== false)
        .map((lc) => resolveLayer(lc, map, mapLayerMap, isGroupLocked));

      const subGroups = (groupConfig.subGroups || []).map(
        (subConfig): ResolvedSubGroup => {
          const subLayers = subConfig.layers
            .filter((lc) => lc.showInPanel !== false)
            .map((lc) => resolveLayer(lc, map, mapLayerMap, isGroupLocked));

          const visibleCount = subLayers.filter((l) => l.visible).length;

          return {
            id: subConfig.id,
            name: subConfig.name,
            expanded: expandedSubGroups.has(subConfig.id),
            layers: subLayers,
            visible: visibleCount > 0,
            visibleCount,
            totalCount: subLayers.length,
            singleSelect: isGroupSingleSelect || (subConfig.singleSelect ?? false),
            ...(subConfig.icon ? { icon: subConfig.icon } : {}),
          };
        }
      );

      const allLayers = [
        ...directLayers,
        ...subGroups.flatMap((sg) => sg.layers),
      ];
      const visibleCount = allLayers.filter((l) => l.visible).length;

      return {
        id: groupConfig.id,
        name: groupConfig.name,
        expanded: expandedGroups.has(groupConfig.id),
        locked: isGroupLocked,
        layers: directLayers,
        subGroups,
        visible: visibleCount > 0,
        visibleCount,
        totalCount: allLayers.length,
        singleSelect: isGroupSingleSelect,
        ...(groupConfig.icon ? { icon: groupConfig.icon } : {}),
        ...(groupConfig.color ? { color: groupConfig.color } : {}),
      };
    });
  }, [config.groups, map, mapLayerMap, expandedGroups, expandedSubGroups]);

  // ── Unmatched layers ──
  const unmatchedLayers: ResolvedLayer[] = useMemo(() => {
    if (config.unmatchedLayers === "hide") return [];

    const configuredIds = new Set<string>();
    config.groups.forEach((g) => {
      g.layers?.forEach((lc) => configuredIds.add(lc.id));
      g.subGroups?.forEach((sg) =>
        sg.layers.forEach((lc) => configuredIds.add(lc.id))
      );
    });

    return rawLayers
      .filter((ml) => {
        if (configuredIds.has(ml.id)) return false;
        if (config.excludePatterns?.some((p) => matchesPattern(ml.id, p)))
          return false;
        return true;
      })
      .map(
        (ml): ResolvedLayer => {
          const color = map ? extractMapLayerColor(map, ml.id, ml.type) : undefined;
          return {
            id: ml.id,
            mapLayerId: ml.id,
            displayName: formatLayerName(ml.id),
            type: ml.type,
            source: ml.source,
            visible: ml.visible,
            opacity: ml.opacity,
            locked: false,
            allowToggleVisibility: true,
            allowChangeOpacity: true,
            existsOnMap: true,
            ...(ml.sourceLayer ? { sourceLayer: ml.sourceLayer } : {}),
            ...(color ? { color } : {}),
            ...(ml.minzoom !== undefined ? { minzoom: ml.minzoom } : {}),
            ...(ml.maxzoom !== undefined ? { maxzoom: ml.maxzoom } : {}),
          };
        }
      );
  }, [rawLayers, config, map]);

  // ── Filters ──
  const applyFilters = useCallback(
    (layers: ResolvedLayer[]): ResolvedLayer[] => {
      let result = layers;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        result = result.filter(
          (l) =>
            l.displayName.toLowerCase().includes(q) ||
            l.id.toLowerCase().includes(q) ||
            l.type.toLowerCase().includes(q) ||
            l.tags?.some((t) => t.toLowerCase().includes(q))
        );
      }

      if (filterMode === "visible") result = result.filter((l) => l.visible);
      if (filterMode === "hidden") result = result.filter((l) => !l.visible);

      return result;
    },
    [searchQuery, filterMode]
  );

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim() && filterMode === "all") return resolvedGroups;

    return resolvedGroups
      .map((group): ResolvedGroup => {
        const filteredDirect = applyFilters(group.layers);
        const filteredSubs = group.subGroups
          .map((sg): ResolvedSubGroup => {
            const filtered = applyFilters(sg.layers);
            return {
              ...sg,
              layers: filtered,
              visibleCount: filtered.filter((l) => l.visible).length,
              totalCount: filtered.length,
              expanded: searchQuery.trim() ? true : sg.expanded,
            };
          })
          .filter((sg) => sg.layers.length > 0);

        const all = [
          ...filteredDirect,
          ...filteredSubs.flatMap((sg) => sg.layers),
        ];

        return {
          ...group,
          layers: filteredDirect,
          subGroups: filteredSubs,
          visibleCount: all.filter((l) => l.visible).length,
          totalCount: all.length,
          expanded: searchQuery.trim() ? true : group.expanded,
        };
      })
      .filter((g) => g.totalCount > 0);
  }, [resolvedGroups, applyFilters, searchQuery, filterMode]);

  const filteredUnmatched = useMemo(
    () => applyFilters(unmatchedLayers),
    [unmatchedLayers, applyFilters]
  );

  // ── Counts ──
  const counts = useMemo(() => {
    const all = [
      ...resolvedGroups.flatMap((g) => [
        ...g.layers,
        ...g.subGroups.flatMap((sg) => sg.layers),
      ]),
      ...unmatchedLayers,
    ];
    const visible = all.filter((l) => l.visible).length;
    return { total: all.length, visible, hidden: all.length - visible };
  }, [resolvedGroups, unmatchedLayers]);

  // ── Group Actions ──

  const toggleGroupExpanded = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  }, []);

  const toggleSubGroupExpanded = useCallback((subGroupId: string) => {
    setExpandedSubGroups((prev) => {
      const next = new Set(prev);
      next.has(subGroupId) ? next.delete(subGroupId) : next.add(subGroupId);
      return next;
    });
  }, []);

  // ─────────────────────────────────────────────────────────
  // GROUP VISIBILITY TOGGLE (respects single-select)
  // ─────────────────────────────────────────────────────────
  const toggleGroupVisibility = useCallback(
    (groupId: string) => {
      const group = resolvedGroups.find((g) => g.id === groupId);
      if (!group) return;

      if (group.singleSelect) {
        // In single-select mode, "show all" doesn't make sense.
        // Toggle: if any visible → hide all. If none visible → show first.
        if (group.visible) {
          // Hide all
          const all = [
            ...group.layers,
            ...group.subGroups.flatMap((sg) => sg.layers),
          ];
          all.forEach((l) => {
            if (l.allowToggleVisibility && l.existsOnMap) {
              updateVisibility(l.id, false);
            }
          });
        } else {
          // Show the first toggleable layer
          const all = [
            ...group.layers,
            ...group.subGroups.flatMap((sg) => sg.layers),
          ];
          const first = all.find(
            (l) => l.allowToggleVisibility && l.existsOnMap
          );
          if (first) {
            setLayerVisibility(first.id, true);
          }
        }
      } else {
        // Normal toggle: flip all
        const newVisible = !group.visible;
        const all = [
          ...group.layers,
          ...group.subGroups.flatMap((sg) => sg.layers),
        ];
        all.forEach((l) => {
          if (l.allowToggleVisibility && l.existsOnMap) {
            updateVisibility(l.id, newVisible);
          }
        });
      }
    },
    [resolvedGroups, mapSetVisibility, setLayerVisibility]
  );

  const toggleSubGroupVisibility = useCallback(
    (subGroupId: string) => {
      for (const group of resolvedGroups) {
        const subGroup = group.subGroups.find((sg) => sg.id === subGroupId);
        if (!subGroup) continue;

        if (group.singleSelect || subGroup.singleSelect) {
          // Single-select: toggle first or hide all
          if (subGroup.visible) {
            subGroup.layers.forEach((l) => {
              if (l.allowToggleVisibility && l.existsOnMap) {
                updateVisibility(l.id, false);
              }
            });
          } else {
            const first = subGroup.layers.find(
              (l) => l.allowToggleVisibility && l.existsOnMap
            );
            if (first) {
              setLayerVisibility(first.id, true);
            }
          }
        } else {
          const newVisible = !subGroup.visible;
          subGroup.layers.forEach((l) => {
            if (l.allowToggleVisibility && l.existsOnMap) {
              updateVisibility(l.id, newVisible);
            }
          });
        }
        break;
      }
    },
    [resolvedGroups, mapSetVisibility, setLayerVisibility]
  );

  const toggleAllVisibility = useCallback(
    (visible: boolean) => {
      const allLayers = [
        ...resolvedGroups.flatMap((g) => [
          ...g.layers,
          ...g.subGroups.flatMap((sg) => sg.layers),
        ]),
        ...unmatchedLayers,
      ];

      if (visible) {
        // For single-select groups, only turn on the first layer
        const handledScopes = new Set<string>();

        allLayers.forEach((layer) => {
          if (
            !layer.allowToggleVisibility ||
            layer.locked ||
            !layer.existsOnMap
          )
            return;

          const scope = singleSelectScopeMap.get(layer.id);
          if (scope) {
            if (handledScopes.has(scope.scopeId)) {
              // Already turned one on in this scope
              updateVisibility(layer.id, false);
            } else {
              handledScopes.add(scope.scopeId);
              updateVisibility(layer.id, true);
            }
          } else {
            updateVisibility(layer.id, true);
          }
        });
      } else {
        allLayers.forEach((layer) => {
          if (
            layer.allowToggleVisibility &&
            !layer.locked &&
            layer.existsOnMap
          ) {
            updateVisibility(layer.id, false);
          }
        });
      }
    },
    [resolvedGroups, unmatchedLayers, singleSelectScopeMap, mapSetVisibility]
  );

  // ── Other Actions ──

  const setLayerOpacity = useCallback(
    (layerId: string, opacity: number) => {
      mapSetOpacity(layerId, opacity);
      callbacks?.onOpacityChange?.(layerId, opacity);
    },
    [mapSetOpacity, callbacks]
  );

  const expandAll = useCallback(() => {
    setExpandedGroups(new Set(config.groups.map((g) => g.id)));
    setExpandedSubGroups(
      new Set(config.groups.flatMap((g) => g.subGroups?.map((s) => s.id) || []))
    );
  }, [config]);

  const collapseAll = useCallback(() => {
    setExpandedGroups(new Set());
    setExpandedSubGroups(new Set());
  }, []);

  const zoomToLayer = useCallback(
    (layerId: string) => {
      if (!map || !isLoaded) return;
      const info = rawLayers.find((l) => l.id === layerId);
      if (!info) return;
      try {
        const source = map.getSource(info.source);
        if (!source) return;
        if ("getBounds" in source && typeof source.getBounds === "function") {
          const bounds = source.getBounds();
          if (bounds) {
            map.fitBounds(bounds, { padding: 50, duration: 1000 });
            return;
          }
        }
        const spec = source as any;
        if (spec.bounds)
          map.fitBounds(spec.bounds, { padding: 50, duration: 1000 });
      } catch {}
    },
    [map, isLoaded, rawLayers]
  );

  const handleMoveLayer = useCallback(
    (layerId: string, direction: "up" | "down") => {
      if (!map || !isLoaded || !config.allowReorder) return;
      const style = map.getStyle();
      if (!style?.layers) return;
      const ids = style.layers.map((l) => l.id);
      const idx = ids.indexOf(layerId);
      if (idx === -1) return;
      if (direction === "up" && idx < ids.length - 1) {
        moveLayer(layerId, idx + 2 < ids.length ? ids[idx + 2] : undefined);
      } else if (direction === "down" && idx > 0) {
        moveLayer(layerId, ids[idx - 1]);
      }
    },
    [map, isLoaded, config.allowReorder, moveLayer]
  );

  const handleDeleteLayer = useCallback(
    (layerId: string) => {
      if (!config.allowDelete) return;
      const all = [
        ...resolvedGroups.flatMap((g) => [
          ...g.layers,
          ...g.subGroups.flatMap((sg) => sg.layers),
        ]),
        ...unmatchedLayers,
      ];
      const layer = all.find((l) => l.id === layerId);
      if (layer?.locked) return;
      removeLayer(layerId);
      if (selectedLayerId === layerId) setSelectedLayerId(null);
    },
    [
      config.allowDelete,
      resolvedGroups,
      unmatchedLayers,
      removeLayer,
      selectedLayerId,
    ]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setFilterMode("all");
  }, []);

  return {
    groups: filteredGroups,
    unmatchedLayers: filteredUnmatched,
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
    refresh,
  };
}
