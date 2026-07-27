// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

import React, { useEffect, useId, useCallback, useRef } from "react";
import { useMap } from "../../hooks/useMap";
import * as pmtiles from "pmtiles";
import maplibregl from "maplibre-gl";
import type { MapMouseEvent, MapGeoJSONFeature } from "maplibre-gl";
import type { Feature } from "geojson";

/**
 * Supported layer types for PMTiles rendering
 */
export type PMTilesLayerType =
  | "fill"
  | "line"
  | "circle"
  | "symbol"
  | "fill-extrusion"
  | "heatmap"
  | "raster";

/**
 * Paint properties for each layer type
 */
export interface PaintProperties {
  // Fill
  "fill-color"?: string | any[];
  "fill-opacity"?: number | any[];
  "fill-outline-color"?: string | any[];
  "fill-pattern"?: string;

  // Line
  "line-color"?: string | any[];
  "line-width"?: number | any[];
  "line-opacity"?: number | any[];
  "line-dasharray"?: number[];
  "line-gap-width"?: number | any[];
  "line-blur"?: number | any[];

  // Circle
  "circle-radius"?: number | any[];
  "circle-color"?: string | any[];
  "circle-opacity"?: number | any[];
  "circle-stroke-color"?: string | any[];
  "circle-stroke-width"?: number | any[];
  "circle-stroke-opacity"?: number | any[];

  // Symbol
  "text-color"?: string | any[];
  "text-opacity"?: number | any[];
  "text-halo-color"?: string | any[];
  "text-halo-width"?: number | any[];
  "icon-color"?: string | any[];
  "icon-opacity"?: number | any[];

  // Fill Extrusion
  "fill-extrusion-color"?: string | any[];
  "fill-extrusion-height"?: number | any[];
  "fill-extrusion-base"?: number | any[];
  "fill-extrusion-opacity"?: number | any[];

  // Heatmap
  "heatmap-weight"?: number | any[];
  "heatmap-intensity"?: number | any[];
  "heatmap-color"?: any[];
  "heatmap-radius"?: number | any[];
  "heatmap-opacity"?: number | any[];

  [key: string]: any;
}

/**
 * Layout properties for each layer type
 */
export interface LayoutProperties {
  visibility?: "visible" | "none";
  "line-cap"?: "butt" | "round" | "square";
  "line-join"?: "bevel" | "round" | "miter";
  "text-field"?: string | any[];
  "text-size"?: number | any[];
  "text-font"?: string[];
  "text-anchor"?:
    | "center"
    | "left"
    | "right"
    | "top"
    | "bottom"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  "text-offset"?: [number, number];
  "icon-image"?: string | any[];
  "icon-size"?: number | any[];
  "symbol-placement"?: "point" | "line" | "line-center";
  [key: string]: any;
}

/**
 * Event data passed to interaction handlers
 */
export interface LayerEventData {
  /** The GeoJSON feature that was interacted with */
  feature: Feature;
  /** All features at the interaction point */
  features: Feature[];
  /** The original MapLibre mouse event */
  originalEvent: MapMouseEvent;
  /** Longitude and latitude of the interaction */
  lngLat: { lng: number; lat: number };
  /** Screen coordinates of the interaction */
  point: { x: number; y: number };
}

/**
 * Configuration for a single rendered layer from a PMTiles source
 */
export interface PMTilesLayerConfig {
  /**
   * Unique layer ID (will be namespaced with source ID internally)
   * @example "buildings-fill"
   */
  id: string;

  /**
   * The vector tile source-layer name to render
   * @example "buildings"
   */
  sourceLayer: string;

  /**
   * Layer render type
   */
  type: PMTilesLayerType;

  /**
   * Paint properties controlling visual appearance
   */
  paint?: PaintProperties;

  /**
   * Layout properties controlling positioning
   */
  layout?: LayoutProperties;

  /**
   * MapLibre filter expression
   * @example ['==', ['get', 'class'], 'residential']
   */
  filter?: any[];

  /**
   * Minimum zoom level for this layer
   */
  minZoom?: number;

  /**
   * Maximum zoom level for this layer
   */
  maxZoom?: number;

  /**
   * Insert this layer before an existing layer (z-ordering)
   */
  beforeId?: string;

  /**
   * Whether this layer is visible
   * @default true
   */
  visible?: boolean;

  /**
   * Enable hover feature-state (hover: true/false)
   * Use with: ['boolean', ['feature-state', 'hover'], false]
   * @default false
   */
  hoverable?: boolean;

  /**
   * Enable selection feature-state (selected: true/false)
   * @default false
   */
  selectable?: boolean;

  /**
   * Cursor style when hovering over features
   * @default 'pointer'
   */
  cursor?: string;

  /**
   * Hover opacity for fill layers
   * @default 0.8
   */
  hoverOpacity?: number;

  /**
   * Fired when a feature in this layer is clicked
   */
  onClick?: (data: LayerEventData) => void;

  /**
   * Fired when hovering over features in this layer.
   * Called with null when mouse leaves all features.
   */
  onHover?: (data: LayerEventData | null) => void;
}

/**
 * Props for the PMTilesSource component
 */
export interface PMTilesSourceProps {
  /**
   * Unique source ID
   * Auto-generated if not provided
   */
  id?: string;

  /**
   * PMTiles file URL (local or remote)
   * @example "https://example.com/tiles.pmtiles"
   * @example "/tiles/local.pmtiles"
   */
  url: string;

  /**
   * Layer configurations to render from this source
   */
  layers?: PMTilesLayerConfig[];

  /**
   * Attribution text shown in the map attribution control
   */
  attribution?: string;

  /**
   * Maximum zoom level for the source tiles
   * @default 22
   */
  maxZoom?: number;

  /**
   * Minimum zoom level for the source tiles
   * @default 0
   */
  minZoom?: number;

  /**
   * Fired once after the PMTiles header is successfully loaded
   */
  onLoad?: (metadata: pmtiles.Header) => void;

  /**
   * Fired if the PMTiles file fails to load
   */
  onError?: (error: Error) => void;
}

// ============================================================================
// PROTOCOL REGISTRATION
// ============================================================================

let protocolRegistered = false;

/**
 * Registers the pmtiles:// protocol with MapLibre once.
 * MapLibre v5 requires an async handler returning { data: ArrayBuffer }.
 */
function registerPMTilesProtocol(): void {
  if (protocolRegistered) return;

  const cache = new pmtiles.Protocol();

  maplibregl.addProtocol(
    "pmtiles",
    (params: { url: string }, abortController: AbortController) =>
      cache.tile(params, abortController)
  );

  protocolRegistered = true;
}

registerPMTilesProtocol();

// ============================================================================
// DEFAULT PAINT PROPERTIES
// ============================================================================

const DEFAULT_PAINT: Partial<Record<PMTilesLayerType, PaintProperties>> = {
  fill: {
    "fill-color": "#3388ff",
    "fill-opacity": 0.6,
    "fill-outline-color": "#2266cc",
  },
  line: {
    "line-color": "#3388ff",
    "line-width": 2,
    "line-opacity": 1,
  },
  circle: {
    "circle-radius": 6,
    "circle-color": "#3388ff",
    "circle-opacity": 1,
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2,
  },
  symbol: {
    "text-color": "#333333",
    "text-halo-color": "#ffffff",
    "text-halo-width": 1,
  },
  "fill-extrusion": {
    "fill-extrusion-color": "#3388ff",
    "fill-extrusion-height": 10,
    "fill-extrusion-base": 0,
    "fill-extrusion-opacity": 0.8,
  },
  heatmap: {
    "heatmap-opacity": 0.8,
  },
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Injects hover-state opacity expression into fill layer paint
 */
function withHoverPaint(
  paint: PaintProperties,
  hoverOpacity: number
): PaintProperties {
  const baseOpacity = paint["fill-opacity"] ?? 0.6;
  return {
    ...paint,
    "fill-opacity": [
      "case",
      ["boolean", ["feature-state", "hover"], false],
      hoverOpacity,
      baseOpacity,
    ],
  };
}

/**
 * Converts a MapGeoJSONFeature to a plain GeoJSON Feature
 */
function toFeature(f?: maplibregl.MapGeoJSONFeature): Feature {
  if (!f) {
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0, 0] },
      properties: {},
    };
  }
  return f.toJSON && typeof f.toJSON === "function"
    ? f.toJSON()
    : ({
        type: "Feature",
        id: f.id,
        properties: f.properties,
        geometry: (f as any).geometry,
      } as Feature);
}

// ============================================================================
// LAYER MANAGER — handles a single PMTilesLayerConfig on the map
// ============================================================================

interface LayerManagerOptions {
  map: maplibregl.Map;
  sourceId: string;
  layerConfig: PMTilesLayerConfig;
}

interface LayerManager {
  layerId: string;
  destroy: () => void;
  updateVisibility: (visible: boolean) => void;
  updatePaint: (paint: PaintProperties) => void;
  updateFilter: (filter?: any[]) => void;
  updateHandlers: (
    onClick?: (data: any) => void,
    onHover?: (data: any) => void
  ) => void;
}

function createLayerManager({
  map,
  sourceId,
  layerConfig,
}: LayerManagerOptions): LayerManager {
  const {
    id,
    sourceLayer,
    type,
    paint = {},
    layout = {},
    filter,
    minZoom,
    maxZoom,
    beforeId,
    visible = false,
    hoverable = false,
    selectable = false,
    cursor = "pointer",
    hoverOpacity = 0.8,
    onClick,
    onHover,
  } = layerConfig;

  const layerId = id.includes(sourceId) ? id : `${sourceId}--${id}`;

  // Track hover/selected feature IDs
  let hoveredId: string | number | null = null;
  let selectedId: string | number | null = null;

  // ── Build paint ───────────────────────────────────────────────────────────
  const mergedPaint = { ...(DEFAULT_PAINT[type] ?? {}), ...paint };
  const finalPaint =
    hoverable && type === "fill"
      ? withHoverPaint(mergedPaint, hoverOpacity)
      : mergedPaint;

  // ── Add layer ─────────────────────────────────────────────────────────────
  if (!map.getLayer(layerId)) {
    const config: any = {
      id: layerId,
      type,
      source: sourceId,
      "source-layer": sourceLayer,
      paint: finalPaint,
      layout: {
        ...layout,
        visibility: visible ? "visible" : "none",
      },
    };

    if (filter) config.filter = filter;
    if (minZoom !== undefined) config.minzoom = minZoom;
    if (maxZoom !== undefined) config.maxzoom = maxZoom;
    console.log("[PMTilesSource] Adding layer:", config);

    map.addLayer(config, beforeId);
  }

  // Mutable refs for handlers to avoid stale closures
  let currentOnClick = onClick;
  let currentOnHover = onHover;

  // ── Event handlers ────────────────────────────────────────────────────────
  const onMouseMove = (
    e: MapMouseEvent & { features?: MapGeoJSONFeature[] }
  ) => {
    if (!e.features?.length) return;

    const feature = e.features[0];
    if (!feature) return;
    const featureId = feature.id;

    if (hoverable) {
      if (hoveredId !== null && hoveredId !== featureId) {
        map.setFeatureState(
          { source: sourceId, id: hoveredId },
          { hover: false }
        );
      }
      if (featureId != null) {
        hoveredId = featureId;
        map.setFeatureState(
          { source: sourceId, id: featureId },
          { hover: true }
        );
      }
    }

    map.getCanvas().style.cursor = cursor;

    currentOnHover?.({
      feature: toFeature(feature),
      features: e.features.map(toFeature),
      originalEvent: e,
      lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
      point: { x: e.point.x, y: e.point.y },
    });
  };

  const onMouseLeave = () => {
    if (hoverable && hoveredId !== null) {
      map.setFeatureState(
        { source: sourceId, id: hoveredId },
        { hover: false }
      );
      hoveredId = null;
    }
    map.getCanvas().style.cursor = "";
    currentOnHover?.(null);
  };

  const onClickHandler = (
    e: MapMouseEvent & { features?: MapGeoJSONFeature[] }
  ) => {
    if (!e.features?.length) return;

    const feature = e.features[0];
    if (!feature) return;
    const featureId = feature.id;

    if (selectable && featureId != null) {
      if (selectedId !== null) {
        map.setFeatureState(
          { source: sourceId, id: selectedId },
          { selected: false }
        );
      }
      selectedId = featureId;
      map.setFeatureState(
        { source: sourceId, id: featureId },
        { selected: true }
      );
    }

    currentOnClick?.({
      feature: toFeature(feature),
      features: e.features.map(toFeature),
      originalEvent: e,
      lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
      point: { x: e.point.x, y: e.point.y },
    });
  };

  // Attach listeners
  if (hoverable || currentOnHover) {
    map.on("mousemove", layerId, onMouseMove);
    map.on("mouseleave", layerId, onMouseLeave);
  }
  if (currentOnClick) {
    map.on("click", layerId, onClickHandler);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    layerId,

    destroy() {
      try {
        if (hoverable || currentOnHover) {
          map.off("mousemove", layerId, onMouseMove);
          map.off("mouseleave", layerId, onMouseLeave);
        }
        if (currentOnClick) {
          map.off("click", layerId, onClickHandler);
        }
        if (map?.style && map.getLayer(layerId)) map.removeLayer(layerId);
      } catch (e) {
        console.warn("[PMTilesSource] Failed to destroy layer:", e);
      }
    },

    updateVisibility(v: boolean) {
      if (map.getLayer(layerId)) {
        const current = map.getLayoutProperty(layerId, "visibility");
        const next = v ? "visible" : "none";
        if (current !== next) {
          map.setLayoutProperty(layerId, "visibility", next);
        }
      }
    },

    updatePaint(p: PaintProperties) {
      if (!map.getLayer(layerId)) return;
      const merged = { ...(DEFAULT_PAINT[type] ?? {}), ...p };
      const final =
        hoverable && type === "fill"
          ? withHoverPaint(merged, hoverOpacity)
          : merged;
      Object.entries(final).forEach(([prop, val]) => {
        try {
          map.setPaintProperty(layerId, prop, val);
        } catch (err) {
          console.warn(
            `[PMTilesSource] setPaintProperty "${prop}" failed:`,
            err
          );
        }
      });
    },

    updateFilter(f?: any[]) {
      if (map.getLayer(layerId)) {
        map.setFilter(layerId, (f as any) ?? null);
      }
    },

    updateHandlers(newOnClick, newOnHover) {
      // Remove old listeners if they existed
      if (hoverable || currentOnHover) {
        map.off("mousemove", layerId, onMouseMove);
        map.off("mouseleave", layerId, onMouseLeave);
      }
      if (currentOnClick) {
        map.off("click", layerId, onClickHandler);
      }

      // Update references
      currentOnClick = newOnClick;
      currentOnHover = newOnHover;

      // Add new listeners if needed
      if (hoverable || currentOnHover) {
        map.on("mousemove", layerId, onMouseMove);
        map.on("mouseleave", layerId, onMouseLeave);
      }
      if (currentOnClick) {
        map.on("click", layerId, onClickHandler);
      }
    },
  };
}

// ============================================================================
// PMTILES SOURCE COMPONENT
// ============================================================================

/**
 * PMTilesSource — Declaratively render PMTiles vector tile layers on a MapLibre map.
 *
 * Handles protocol registration, source/layer lifecycle, interactivity
 * (hover & selection feature-state), and reactive prop updates — mirroring
 * the GeoJSONLayer component API.
 */
export const PMTilesSource: React.FC<PMTilesSourceProps> = ({
  id: propId,
  url,
  layers = [],
  attribution,
  maxZoom = 22,
  minZoom = 0,
  onLoad,
  onError,
}) => {
  // ── Hooks ────────────────────────────────────────────────────────────────
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const sourceId = propId ?? `pmtiles-${autoId.replace(/:/g, "")}`;

  // Track layer managers for cleanup and updates
  const managersRef = useRef<Map<string, LayerManager>>(new Map());
  const isSourceAddedRef = useRef(false);

  // ── Source setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !isLoaded) return;

    let cancelled = false;

    const setup = async () => {
      try {
        // Validate file and retrieve header
        const pt = new pmtiles.PMTiles(url);
        const header = await pt.getHeader();
        if (cancelled) return;

        onLoad?.(header);

        // Add vector source
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: "vector",
            url: `pmtiles://${url}`,
            attribution: attribution ?? "",
            minzoom: minZoom,
            maxzoom: maxZoom,
          } as any);
          isSourceAddedRef.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error("[PMTilesSource] Failed to load:", error.message);
          onError?.(error);
        }
      }
    };

    setup();

    return () => {
      cancelled = true;

      // Destroy all layer managers (removes layers + listeners)
      managersRef.current.forEach((manager) => manager.destroy());
      managersRef.current.clear();

      // Remove source
      try {
        if (isSourceAddedRef.current && map.style && map.getSource(sourceId)) {
          map.removeSource(sourceId);
          isSourceAddedRef.current = false;
        }
      } catch (e) {
        console.warn("[PMTilesSource] Failed to remove source:", e);
      }
    };
  }, [
    map,
    isLoaded,
    url,
    sourceId,
    attribution,
    minZoom,
    maxZoom,
    onLoad,
    onError,
  ]);

  // ── Layer management ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !isLoaded || !isSourceAddedRef.current) return;

    // Add new layers
    layers.forEach((layerConfig) => {
      if (!managersRef.current.has(layerConfig.id)) {
        const manager = createLayerManager({
          map,
          sourceId,
          layerConfig,
        });
        managersRef.current.set(layerConfig.id, manager);
      }
    });

    // Remove old layers
    const currentIds = new Set(layers.map((l) => l.id));
    managersRef.current.forEach((manager, id) => {
      if (!currentIds.has(id)) {
        manager.destroy();
        managersRef.current.delete(id);
      }
    });
  }, [map, isLoaded, layers, sourceId]);

  // ── Reactive prop updates ───────────────────────────────────────────────
  useEffect(() => {
    if (!map || !isLoaded) return;
    layers.forEach((layerConfig) => {
      const manager = managersRef.current.get(layerConfig.id);
      if (manager) {
        manager.updateVisibility(layerConfig.visible ?? true);
        manager.updatePaint(layerConfig.paint ?? {});
        manager.updateFilter(layerConfig.filter);
        manager.updateHandlers(layerConfig.onClick, layerConfig.onHover);
      }
    });
  }, [map, isLoaded, layers]);

  return null;
};

// ============================================================================
// DISPLAY NAME
// ============================================================================

PMTilesSource.displayName = "PMTilesSource";

export default PMTilesSource;
