// src/hooks/useLayerPanel.ts

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useLayers } from "./useLayers";
import { useMap } from "./useMap";
import type {
  LayerDisplayInfo,
  LayerGroup,
  FilterMode,
  SortMode,
} from "../components/controls/LayerPanel/types";

/**
 * Derives a human-readable name from a MapLibre layer ID.
 * Converts "admin-boundaries-line-2" → "Admin Boundaries Line 2"
 */
function formatLayerName(id: string): string {
  return id
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

/**
 * Attempts to extract the primary color from a layer's paint properties.
 */
function extractLayerColor(
  map: maplibregl.Map,
  layerId: string,
  type: string
): string | undefined {
  try {
    const colorProps: Record<string, string> = {
      fill: "fill-color",
      line: "line-color",
      circle: "circle-color",
      symbol: "icon-color",
      "fill-extrusion": "fill-extrusion-color",
      background: "background-color",
    };

    const prop = colorProps[type];
    if (!prop) return undefined;

    const value = map.getPaintProperty(layerId, prop);

    // Handle simple string colors
    if (typeof value === "string") return value;

    // Handle arrays (expressions) — try to extract the first color-like value
    if (Array.isArray(value)) {
      const colorCandidate = value.find(
        (v) =>
          typeof v === "string" &&
          (v.startsWith("#") || v.startsWith("rgb") || v.startsWith("hsl"))
      );
      if (colorCandidate) return colorCandidate;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * List of source prefixes that are considered "base map" and should be locked.
 * Customize this based on your application's base style.
 */
const BASE_MAP_SOURCES = new Set([
  "openmaptiles",
  "maptiler",
  "mapbox",
  "composite",
  "",
]);

export function useLayerPanel() {
  const { map, isLoaded } = useMap();
  const {
    layers: rawLayers,
    setLayerVisibility,
    setLayerOpacity,
    moveLayer,
    removeLayer,
    refresh,
  } = useLayers();

  // ── Panel UI State ──
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [groupBySource, setGroupBySource] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // Track initial group expansion (expand groups that have visible layers)
  const initializedRef = useRef(false);

  // ── Transform raw LayerInfo → LayerDisplayInfo ──
  const displayLayers: LayerDisplayInfo[] = useMemo(() => {
    if (!map || !isLoaded) return [];

    return rawLayers.map((layer) => ({
      ...layer,
      displayName: formatLayerName(layer.id),
      locked: BASE_MAP_SOURCES.has(layer.source),
      color: extractLayerColor(map, layer.id, layer.type),
    }));
  }, [rawLayers, map, isLoaded]);

  // ── Auto-expand groups that contain visible layers on first load ──
  useEffect(() => {
    if (initializedRef.current || displayLayers.length === 0) return;
    initializedRef.current = true;

    const sourcesWithVisibleLayers = new Set<string>();
    displayLayers.forEach((layer) => {
      if (layer.visible) {
        sourcesWithVisibleLayers.add(layer.source || "__no_source__");
      }
    });
    setExpandedGroups(sourcesWithVisibleLayers);
  }, [displayLayers]);

  // ── Filter Layers ──
  const filteredLayers = useMemo(() => {
    let result = displayLayers;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (layer) =>
          layer.displayName.toLowerCase().includes(query) ||
          layer.id.toLowerCase().includes(query) ||
          layer.source.toLowerCase().includes(query) ||
          layer.type.toLowerCase().includes(query)
      );
    }

    // Visibility filter
    if (filterMode === "visible") {
      result = result.filter((layer) => layer.visible);
    } else if (filterMode === "hidden") {
      result = result.filter((layer) => !layer.visible);
    }

    return result;
  }, [displayLayers, searchQuery, filterMode]);

  // ── Sort Layers ──
  const sortedLayers = useMemo(() => {
    if (sortMode === "default") return filteredLayers;

    const sorted = [...filteredLayers];

    switch (sortMode) {
      case "name":
        sorted.sort((a, b) => a.displayName.localeCompare(b.displayName));
        break;
      case "type":
        sorted.sort((a, b) => a.type.localeCompare(b.type));
        break;
      case "source":
        sorted.sort((a, b) => a.source.localeCompare(b.source));
        break;
    }

    return sorted;
  }, [filteredLayers, sortMode]);

  // ── Group Layers by Source ──
  const layerGroups: LayerGroup[] = useMemo(() => {
    if (!groupBySource) return [];

    const groupMap = new Map<string, LayerDisplayInfo[]>();

    sortedLayers.forEach((layer) => {
      const sourceKey = layer.source || "__no_source__";
      if (!groupMap.has(sourceKey)) {
        groupMap.set(sourceKey, []);
      }
      groupMap.get(sourceKey)!.push(layer);
    });

    return Array.from(groupMap.entries()).map(
      ([source, layers]): LayerGroup => ({
        id: source,
        name:
          source === "__no_source__" ? "No Source" : formatLayerName(source),
        source,
        expanded: expandedGroups.has(source),
        layers,
        // Group is visible if at least one layer is visible
        visible: layers.some((l) => l.visible),
      })
    );
  }, [sortedLayers, groupBySource, expandedGroups]);

  // ── Actions ──

  const toggleGroupExpanded = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const toggleGroupVisibility = useCallback(
    (groupId: string) => {
      const group = layerGroups.find((g) => g.id === groupId);
      if (!group) return;

      // If any layer in the group is visible, hide all; otherwise show all
      const newVisibility = !group.visible;

      group.layers.forEach((layer) => {
        if (!layer.locked) {
          setLayerVisibility(layer.id, newVisibility);
        }
      });
    },
    [layerGroups, setLayerVisibility]
  );

  const toggleAllVisibility = useCallback(
    (visible: boolean) => {
      displayLayers.forEach((layer) => {
        if (!layer.locked) {
          setLayerVisibility(layer.id, visible);
        }
      });
    },
    [displayLayers, setLayerVisibility]
  );

  const expandAll = useCallback(() => {
    const allSources = new Set(
      displayLayers.map((l) => l.source || "__no_source__")
    );
    setExpandedGroups(allSources);
  }, [displayLayers]);

  const collapseAll = useCallback(() => {
    setExpandedGroups(new Set());
  }, []);

  const zoomToLayer = useCallback(
    (layerId: string) => {
      if (!map || !isLoaded) return;

      const layer = displayLayers.find((l) => l.id === layerId);
      if (!layer) return;

      try {
        const source = map.getSource(layer.source);
        if (!source) return;

        // For vector/geojson sources, try to get bounds
        if ("getBounds" in source && typeof source.getBounds === "function") {
          const bounds = source.getBounds();
          if (bounds) {
            map.fitBounds(bounds, { padding: 50, duration: 1000 });
          }
        }

        // For sources with bounds property
        const sourceSpec = source as any;
        if (sourceSpec.bounds) {
          map.fitBounds(sourceSpec.bounds, {
            padding: 50,
            duration: 1000,
          });
        }
      } catch (error) {
        console.warn(`Could not zoom to layer "${layerId}":`, error);
      }
    },
    [map, isLoaded, displayLayers]
  );

  const handleMoveLayer = useCallback(
    (layerId: string, direction: "up" | "down") => {
      if (!map || !isLoaded) return;

      const style = map.getStyle();
      if (!style?.layers) return;

      const layerIds = style.layers.map((l) => l.id);
      const currentIndex = layerIds.indexOf(layerId);

      if (currentIndex === -1) return;

      if (direction === "up" && currentIndex < layerIds.length - 1) {
        // Move up = render on top = move after the next layer
        const beforeId =
          currentIndex + 2 < layerIds.length
            ? layerIds[currentIndex + 2]
            : undefined;
        moveLayer(layerId, beforeId);
      } else if (direction === "down" && currentIndex > 0) {
        // Move down = render below = move before the previous layer
        const beforeId = layerIds[currentIndex - 1];
        moveLayer(layerId, beforeId);
      }
    },
    [map, isLoaded, moveLayer]
  );

  const handleDeleteLayer = useCallback(
    (layerId: string) => {
      const layer = displayLayers.find((l) => l.id === layerId);
      if (layer?.locked) return;
      removeLayer(layerId);
      if (selectedLayerId === layerId) {
        setSelectedLayerId(null);
      }
    },
    [displayLayers, removeLayer, selectedLayerId]
  );

  // ── Counts ──
  const counts = useMemo(() => {
    const total = displayLayers.length;
    const visible = displayLayers.filter((l) => l.visible).length;
    const hidden = total - visible;
    return { total, visible, hidden };
  }, [displayLayers]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setFilterMode("all");
  }, []);

  return {
    // Data
    displayLayers: groupBySource ? [] : sortedLayers,
    layerGroups,
    counts,

    // UI State
    searchQuery,
    filterMode,
    sortMode,
    groupBySource,
    selectedLayerId,

    // UI State Setters
    setSearchQuery,
    setFilterMode,
    setSortMode,
    setGroupBySource,
    setSelectedLayerId,
    clearFilters,

    // Group Actions
    toggleGroupExpanded,
    toggleGroupVisibility,

    // Layer Actions
    setLayerVisibility,
    setLayerOpacity,
    zoomToLayer,
    handleMoveLayer,
    handleDeleteLayer,

    // Bulk Actions
    toggleAllVisibility,
    expandAll,
    collapseAll,
    refresh,
  };
}
