import React, { useEffect, useId, useCallback, useRef } from "react";
import { useMap } from "../../hooks/useMap";
import type { GeoJSON, Feature } from "geojson";
import type {
  Map as MapLibreMap,
  GeoJSONSource,
  MapMouseEvent,
  MapGeoJSONFeature,
} from "maplibre-gl";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Supported layer types for GeoJSON rendering
 * - 'fill': Filled polygons (countries, regions, buildings)
 * - 'line': Lines and paths (roads, rivers, boundaries)
 * - 'circle': Point data as circles (markers, POIs)
 * - 'symbol': Text labels and icons
 * - 'fill-extrusion': 3D extruded polygons (3D buildings)
 */
export type GeoJSONLayerType =
  | "fill"
  | "line"
  | "circle"
  | "symbol"
  | "fill-extrusion";

/**
 * Paint properties for each layer type
 * These control the visual appearance of features
 */
export interface PaintProperties {
  // Fill properties
  "fill-color"?: string | any[];
  "fill-opacity"?: number | any[];
  "fill-outline-color"?: string | any[];
  "fill-pattern"?: string;

  // Line properties
  "line-color"?: string | any[];
  "line-width"?: number | any[];
  "line-opacity"?: number | any[];
  "line-dasharray"?: number[];
  "line-gap-width"?: number | any[];
  "line-blur"?: number | any[];

  // Circle properties
  "circle-radius"?: number | any[];
  "circle-color"?: string | any[];
  "circle-opacity"?: number | any[];
  "circle-stroke-color"?: string | any[];
  "circle-stroke-width"?: number | any[];
  "circle-stroke-opacity"?: number | any[];
  "circle-blur"?: number | any[];

  // Symbol properties
  "text-color"?: string | any[];
  "text-opacity"?: number | any[];
  "text-halo-color"?: string | any[];
  "text-halo-width"?: number | any[];
  "icon-color"?: string | any[];
  "icon-opacity"?: number | any[];

  // Fill extrusion properties
  "fill-extrusion-color"?: string | any[];
  "fill-extrusion-height"?: number | any[];
  "fill-extrusion-base"?: number | any[];
  "fill-extrusion-opacity"?: number | any[];

  // Allow additional properties
  [key: string]: any;
}

/**
 * Layout properties for each layer type
 * These control the positioning and arrangement of features
 */
export interface LayoutProperties {
  // Common
  visibility?: "visible" | "none";

  // Line layout
  "line-cap"?: "butt" | "round" | "square";
  "line-join"?: "bevel" | "round" | "miter";

  // Symbol layout
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
  "text-rotation-alignment"?: "map" | "viewport" | "auto";
  "icon-image"?: string | any[];
  "icon-size"?: number | any[];
  "icon-anchor"?: string;
  "icon-rotation-alignment"?: "map" | "viewport" | "auto";
  "symbol-placement"?: "point" | "line" | "line-center";
  "symbol-spacing"?: number;

  // Allow additional properties
  [key: string]: any;
}

/**
 * Event data passed to click and hover handlers
 */
export interface LayerEventData {
  /** The GeoJSON feature that was interacted with */
  feature: Feature;
  /** Array of all features at the interaction point */
  features: Feature[];
  /** The original MapLibre mouse event */
  originalEvent: MapMouseEvent;
  /** Longitude and latitude of the interaction point */
  lngLat: { lng: number; lat: number };
  /** Screen coordinates of the interaction point */
  point: { x: number; y: number };
}

/**
 * Props for the GeoJSONLayer component
 */
export interface GeoJSONLayerProps {
  /**
   * Unique identifier for the layer
   * If not provided, an auto-generated ID will be used
   * @example "my-polygon-layer"
   */
  id?: string;

  /**
   * GeoJSON data to render
   * Can be a GeoJSON object or a URL string pointing to a GeoJSON file
   * @example { type: 'FeatureCollection', features: [...] }
   * @example "https://example.com/data.geojson"
   */
  data: GeoJSON | string;

  /**
   * Type of layer to render
   * Determines how the GeoJSON geometry is visualized
   */
  type: GeoJSONLayerType;

  /**
   * Paint properties controlling visual appearance
   * @see https://maplibre.org/maplibre-style-spec/layers/
   */
  paint?: PaintProperties;

  /**
   * Layout properties controlling positioning
   * @see https://maplibre.org/maplibre-style-spec/layers/
   */
  layout?: LayoutProperties;

  /**
   * Filter expression to show only matching features
   * Uses MapLibre expression syntax
   * @example ['==', ['get', 'type'], 'highway']
   * @example ['>=', ['get', 'population'], 1000000]
   */
  filter?: any[];

  /**
   * Minimum zoom level at which the layer is visible
   * Layer will be hidden when zoomed out beyond this level
   * @example 8
   */
  minZoom?: number;

  /**
   * Maximum zoom level at which the layer is visible
   * Layer will be hidden when zoomed in beyond this level
   * @example 18
   */
  maxZoom?: number;

  /**
   * ID of an existing layer to insert this layer before
   * Used to control layer stacking order
   * @example "road-label"
   */
  beforeId?: string;

  /**
   * Whether the layer is visible
   * @default true
   */
  visible?: boolean;

  /**
   * Callback fired when a feature is clicked
   */
  onClick?: (data: LayerEventData) => void;

  /**
   * Callback fired when hovering over features
   * Called with null when mouse leaves all features
   */
  onHover?: (data: LayerEventData | null) => void;

  /**
   * Enable hover state styling
   * When true, hovered features will have feature-state.hover = true
   * Use with expressions like: ['case', ['boolean', ['feature-state', 'hover'], false], ...]
   * @default false
   */
  hoverable?: boolean;

  /**
   * Enable selection state
   * When true, clicked features will have feature-state.selected = true
   * @default false
   */
  selectable?: boolean;

  /**
   * Custom cursor to show when hovering over features
   * @default 'pointer' when onClick or hoverable is set
   */
  cursor?: string;

  /**
   * Optional outline layer configuration for polygon rendering
   */
  outlineLayer?: {
    type: "line";
    paint?: PaintProperties;
    layout?: LayoutProperties;
  };
}

// ============================================================================
// DEFAULT PAINT PROPERTIES
// ============================================================================

/**
 * Default paint properties for each layer type
 * These provide sensible defaults when no paint prop is specified
 */
const DEFAULT_PAINT: Record<GeoJSONLayerType, PaintProperties> = {
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
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates paint properties with hover state support for fill layers
 * Modifies opacity to respond to feature-state.hover
 */
function createHoverablePaint(
  type: GeoJSONLayerType,
  paint: PaintProperties,
  hoverOpacity: number
): PaintProperties {
  if (type !== "fill") return paint;

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
 * Converts a MapGeoJSONFeature to a standard GeoJSON Feature
 */
function toGeoJSONFeature(feature?: MapGeoJSONFeature): Feature {
  if (!feature) {
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0, 0] },
      properties: {},
    };
  }
  return feature && feature.toJSON && typeof feature.toJSON === "function"
    ? feature.toJSON()
    : ({
      type: "Feature",
      id: feature?.id,
      properties: feature?.properties,
      geometry: feature?.geometry,
    } as Feature);
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * GeoJSONLayer - Render GeoJSON data on a MapLibre GL map
 *
 * This component provides a declarative way to add GeoJSON layers to a map.
 * It handles source and layer creation, updates, and cleanup automatically.
 * It is safe against map style changes and remounting.
 *
 * @example
 * // Basic fill layer
 * <GeoJSONLayer
 *   id="regions"
 *   type="fill"
 *   data={geojsonData}
 *   paint={{ 'fill-color': '#ff0000', 'fill-opacity': 0.5 }}
 * />
 *
 * @example
 * // Interactive layer with click handler
 * <GeoJSONLayer
 *   id="points"
 *   type="circle"
 *   data="https://example.com/points.geojson"
 *   hoverable
 *   onClick={({ feature }) => console.log(feature.properties)}
 * />
 */
export const GeoJSONLayer: React.FC<GeoJSONLayerProps> = ({
  id: propId,
  data,
  type,
  paint = {},
  layout = {},
  filter,
  minZoom,
  maxZoom,
  beforeId,
  visible = true,
  onClick,
  onHover,
  hoverable = false,
  selectable = false,
  cursor = "pointer",
  hoverOpacity = 0.8,
  outlineLayer,
}) => {
  // -------------------------------------------------------------------------
  // HOOKS & REFS
  // -------------------------------------------------------------------------
  console.log("Rendering GeoJSONLayer with props:", {
    id: propId,
    data,
    type,
    paint,
    layout,
    filter,
    minZoom,
    maxZoom,
    beforeId,
    visible,
    hoverable,
    selectable,
    cursor,
    hoverOpacity,
  });

  const { map, isLoaded } = useMap();
  const autoId = useId();

  // Generate stable IDs for source and layer
  const id = propId || `geojson-layer-${autoId.replace(/:/g, "-")}`;
  const sourceId = `${id}-source`;

  // Track feature state IDs for cleanup
  const hoveredFeatureIdRef = useRef<string | number | null>(null);
  const selectedFeatureIdRef = useRef<string | number | null>(null);

  // -------------------------------------------------------------------------
  // EVENT HANDLERS
  // -------------------------------------------------------------------------

  /**
   * Handle mouse move events for hover effects
   */
  const handleMouseMove = useCallback(
    (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
      if (!map || !e.features || e.features.length === 0) return;

      const feature = e.features[0];
      const featureId = feature.id;

      // Clear previous hover state
      if (
        hoveredFeatureIdRef.current !== null &&
        hoveredFeatureIdRef.current !== featureId
      ) {
        map.setFeatureState(
          { source: sourceId, id: hoveredFeatureIdRef.current },
          { hover: false }
        );
      }

      // Set new hover state
      if (featureId !== undefined && featureId !== null) {
        hoveredFeatureIdRef.current = featureId;
        map.setFeatureState(
          { source: sourceId, id: featureId },
          { hover: true }
        );
      }

      // Update cursor
      map.getCanvas().style.cursor = cursor;

      // Call hover callback
      onHover?.({
        feature: toGeoJSONFeature(feature),
        features: e.features.map(toGeoJSONFeature),
        originalEvent: e,
        lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
        point: { x: e.point.x, y: e.point.y },
      });
    },
    [map, sourceId, cursor, onHover]
  );

  /**
   * Handle mouse leave events to clear hover state
   */
  const handleMouseLeave = useCallback(() => {
    if (!map) return;

    // Clear hover state
    if (hoveredFeatureIdRef.current !== null) {
      map.setFeatureState(
        { source: sourceId, id: hoveredFeatureIdRef.current },
        { hover: false }
      );
      hoveredFeatureIdRef.current = null;
    }

    // Reset cursor
    map.getCanvas().style.cursor = "";

    // Call hover callback with null
    onHover?.(null);
  }, [map, sourceId, onHover]);

  /**
   * Handle click events on features
   */
  const handleClick = useCallback(
    (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
      if (!map || !e.features || e.features.length === 0) return;

      const feature = e.features[0];
      const featureId = feature.id;

      // Handle selection state
      if (selectable && featureId !== undefined && featureId !== null) {
        // Clear previous selection
        if (selectedFeatureIdRef.current !== null) {
          map.setFeatureState(
            { source: sourceId, id: selectedFeatureIdRef.current },
            { selected: false }
          );
        }

        // Set new selection
        selectedFeatureIdRef.current = featureId;
        map.setFeatureState(
          { source: sourceId, id: featureId },
          { selected: true }
        );
      }

      // Call click callback
      onClick?.({
        feature: toGeoJSONFeature(feature),
        features: e.features.map(toGeoJSONFeature),
        originalEvent: e,
        lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
        point: { x: e.point.x, y: e.point.y },
      });
    },
    [map, sourceId, selectable, onClick]
  );

  // -------------------------------------------------------------------------
  // LAYER SETUP & CLEANUP
  // -------------------------------------------------------------------------

  /**
   * Initialize source and layer when map is ready.
   * Handles map style changes (sources/layers removed) by re-adding if missing.
   */
  useEffect(() => {
    if (!map || !isLoaded || !data) return;

    // Safety check: Ensure map is not removed/partially destroyed
    try {
      if (!map.getContainer()) return;
    } catch (e) {
      return;
    }

    try {
      // Add source if it doesn't exist (e.g., after style change)
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: "geojson",
          data: typeof data === "string" ? data : data,
          generateId: true, // Required for feature-state to work
        });
      }

      // Merge default paint with provided paint
      const mergedPaint = { ...DEFAULT_PAINT[type], ...paint };

      // Add hover opacity handling for fill layers
      const finalPaint =
        hoverable && type === "fill"
          ? createHoverablePaint(type, mergedPaint, hoverOpacity)
          : mergedPaint;

      // Add layer if it doesn't exist
      if (!map.getLayer(id)) {
        const layerConfig: any = {
          id,
          type,
          source: sourceId,
          paint: finalPaint,
          layout: {
            ...layout,
            visibility: visible ? "visible" : "none",
          },
        };

        // Add optional properties
        if (filter) layerConfig.filter = filter;
        if (minZoom !== undefined) layerConfig.minzoom = minZoom;
        if (maxZoom !== undefined) layerConfig.maxzoom = maxZoom;

        map.addLayer(layerConfig, beforeId);
      }

      if (outlineLayer && !map.getLayer(`${id}-outline`)) {
        map.addLayer({
          id: `${id}-outline`,
          type: "line",
          source: sourceId,
          paint: outlineLayer.paint || {},
          layout: {
            ...outlineLayer.layout,
            visibility: visible ? "visible" : "none",
          },
        }, beforeId);
      }
    } catch (e) {
      console.warn("Error initializing GeoJSONLayer:", e);
    }

    // Cleanup function – remove layer and source on unmount or before re-run
    return () => {
      try {
        if (!map || !isLoaded || !map.getContainer()) return;

        // Remove layer first, then source
        if (map.getLayer(id)) {
          map.removeLayer(id);
        }
        if (map.getLayer(`${id}-outline`)) {
          map.removeLayer(`${id}-outline`);
        }

        if (map.getSource(sourceId)) {
          // Clear any stored feature states before removing source
          if (hoveredFeatureIdRef.current !== null) {
            try {
              map.setFeatureState(
                { source: sourceId, id: hoveredFeatureIdRef.current },
                { hover: false }
              );
            } catch (e) {
              // ignore if source already gone
            }
            hoveredFeatureIdRef.current = null;
          }
          if (selectedFeatureIdRef.current !== null) {
            try {
              map.setFeatureState(
                { source: sourceId, id: selectedFeatureIdRef.current },
                { selected: false }
              );
            } catch (e) {
              // ignore
            }
            selectedFeatureIdRef.current = null;
          }
          map.removeSource(sourceId);
        }
      } catch (err) {
        // Silent catch for cleanup
      }
    };
  }, [
    map,
    isLoaded,
    data,
    id,
    sourceId,
    type,
    // paint,
    // layout,
    // filter,
    minZoom,
    maxZoom,
    beforeId,
    visible,
    hoverable,
    hoverOpacity,
  ]);

  // -------------------------------------------------------------------------
  // DATA UPDATES
  // -------------------------------------------------------------------------

  /**
   * Update source data when data prop changes (without recreating source/layer)
   */
  useEffect(() => {
    try {
      if (!map || !isLoaded || !data || !map.getContainer()) return;

      const source = map.getSource(sourceId) as GeoJSONSource | undefined;
      if (source) {
        source.setData(typeof data === "string" ? data : data);
      }
    } catch (e) {
      // Map might be in a removed state, ignore
    }
  }, [data, map, isLoaded, sourceId]);

  // -------------------------------------------------------------------------
  // EVENT LISTENERS
  // -------------------------------------------------------------------------

  /**
   * Update event listeners when handlers change.
   * Only attach if the layer actually exists (handles map style changes).
   */
  useEffect(() => {
    try {
      if (!map || !isLoaded || !map.getContainer() || !map.getLayer(id)) return;
    } catch (e) {
      return;
    }

    if (hoverable || onHover) {
      map.on("mousemove", id, handleMouseMove);
      map.on("mouseleave", id, handleMouseLeave);
      if (outlineLayer) {
        map.on("mousemove", `${id}-outline`, handleMouseMove);
        map.on("mouseleave", `${id}-outline`, handleMouseLeave);
      }
    }

    if (onClick) {
      map.on("click", id, handleClick);
    }

    return () => {
      if (hoverable || onHover) {
        map.off("mousemove", id, handleMouseMove);
        map.off("mouseleave", id, handleMouseLeave);
        if (outlineLayer) {
          map.off("mousemove", `${id}-outline`, handleMouseMove);
          map.off("mouseleave", `${id}-outline`, handleMouseLeave);
        }
      }

      if (onClick) {
        map.off("click", id, handleClick);
      }
    };
  }, [
    map,
    isLoaded,
    id,
    onClick,
    onHover,
    hoverable,
    handleClick,
    handleMouseMove,
    handleMouseLeave,
  ]);

  // -------------------------------------------------------------------------
  // VISIBILITY UPDATES
  // -------------------------------------------------------------------------

  /**
   * Update layer visibility when visible prop changes
   */
  useEffect(() => {
    try {
      if (!map || !isLoaded || !map.getContainer() || !map.getLayer(id)) return;
    } catch (e) {
      return;
    }
    try {
      const current = map.getLayoutProperty(id, "visibility");
      const next = visible ? "visible" : "none";
      if (current !== next) {
        map.setLayoutProperty(id, "visibility", next);
      }
      if (outlineLayer && map.getLayer(`${id}-outline`)) {
        map.setLayoutProperty(`${id}-outline`, "visibility", next);
      }
    } catch (e) {
      console.warn("Failed to update GeoJSONLayer visibility:", e);
    }
  }, [visible, map, isLoaded, id]);

  // -------------------------------------------------------------------------
  // PAINT UPDATES
  // -------------------------------------------------------------------------

  /**
   * Update paint properties when paint prop changes
   */
  useEffect(() => {
    try {
      if (!map || !isLoaded || !map.getContainer() || !map.getLayer(id)) return;
    } catch (e) {
      return;
    }

    const mergedPaint = { ...DEFAULT_PAINT[type], ...paint };
    const finalPaint =
      hoverable && type === "fill"
        ? createHoverablePaint(type, mergedPaint, hoverOpacity)
        : mergedPaint;

    // Update each paint property
    Object.entries(finalPaint).forEach(([property, value]) => {
      try {
        map.setPaintProperty(id, property, value);
      } catch (error) {
        console.warn(`Failed to set paint property ${property}:`, error);
      }
    });

    if (outlineLayer && outlineLayer.paint) {
      Object.entries(outlineLayer.paint).forEach(([property, value]) => {
        try {
          if (map.getLayer(`${id}-outline`)) {
            map.setPaintProperty(`${id}-outline`, property, value);
          }
        } catch (error) {
          console.warn(`Failed to set outline paint property ${property}:`, error);
        }
      });
    }
  }, [paint, outlineLayer, map, isLoaded, id, type, hoverable, hoverOpacity]);

  // -------------------------------------------------------------------------
  // FILTER UPDATES
  // -------------------------------------------------------------------------

  /**
   * Update filter when filter prop changes
   */
  useEffect(() => {
    try {
      if (!map || !isLoaded || !map.getContainer() || !map.getLayer(id)) return;
    } catch (e) {
      return;
    }
    try {
      map.setFilter(id, filter || null);
    } catch (e) {
      console.warn("Failed to update GeoJSONLayer filter:", e);
    }
  }, [filter, map, isLoaded, id]);

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  // This component doesn't render any DOM elements
  // It only manages MapLibre sources and layers
  return null;
};

// ============================================================================
// DISPLAY NAME
// ============================================================================

GeoJSONLayer.displayName = "GeoJSONLayer";

// ============================================================================
// EXPORTS
// ============================================================================

export default GeoJSONLayer;
