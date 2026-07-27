import React, { useEffect, useId, useCallback } from 'react';
import { useMap } from '../../hooks/useMap';

export interface VectorTileLayerProps {
  /** Unique layer ID */
  id?: string;
  /** Source ID (must be a vector tile source) */
  source: string;
  /** Source layer name within the vector tiles */
  sourceLayer: string;
  /** Layer type */
  type: 'fill' | 'line' | 'circle' | 'symbol' | 'fill-extrusion' | 'heatmap';
  /** Paint properties */
  paint?: Record<string, any>;
  /** Layout properties */
  layout?: Record<string, any>;
  /** Filter expression */
  filter?: any[];
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Before layer ID (for ordering) */
  beforeId?: string;
  /** Visibility */
  visible?: boolean;
  /** Interactive (responds to mouse events) */
  interactive?: boolean;
  /** Click handler */
  onClick?: (feature: any, event: any) => void;
  /** Hover handler */
  onHover?: (feature: any | null, event: any) => void;
  /** Enable hover state */
  hoverable?: boolean;
  /** Hover paint properties */
  hoverPaint?: Record<string, any>;
  /** Enable selection state */
  selectable?: boolean;
  /** Metadata */
  metadata?: Record<string, any>;
}

export const VectorTileLayer: React.FC<VectorTileLayerProps> = ({
  id: propId,
  source,
  sourceLayer,
  type,
  paint = {},
  layout = {},
  filter,
  minZoom,
  maxZoom,
  beforeId,
  visible = true,
  interactive = true,
  onClick,
  onHover,
  hoverable = false,
  hoverPaint,
  selectable = false,
  metadata
}) => {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId || `vector-tile-layer-${autoId}`;

  // Build paint with hover state support
  const buildPaint = useCallback(() => {
    if (!hoverable || !hoverPaint) return paint;

    const enhancedPaint: Record<string, any> = { ...paint };

    // Add hover state expressions
    Object.entries(hoverPaint).forEach(([key, hoverValue]) => {
      const baseValue = paint[key];
      if (baseValue !== undefined) {
        enhancedPaint[key] = [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          hoverValue,
          baseValue
        ];
      }
    });

    return enhancedPaint;
  }, [paint, hoverable, hoverPaint]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    // Check if source exists
    if (!map.getSource(source)) {
      console.warn(`VectorTileLayer: Source "${source}" not found`);
      return;
    }

    // Add layer
    if (!map.getLayer(id)) {
      const layerConfig: any = {
        id,
        type,
        source,
        'source-layer': sourceLayer,
        paint: buildPaint(),
        layout: {
          ...layout,
          visibility: visible ? 'visible' : 'none'
        },
        metadata
      };

      if (filter) {
        layerConfig.filter = filter;
      }

      if (minZoom !== undefined) {
        layerConfig.minzoom = minZoom;
      }

      if (maxZoom !== undefined) {
        layerConfig.maxzoom = maxZoom;
      }

      map.addLayer(layerConfig, beforeId);
    }

    // Hover handling
    let hoveredFeatureId: string | number | null = null;

    if (hoverable || onHover) {
      const handleMouseMove = (e: any) => {
        if (e.features && e.features.length > 0) {
          // Clear previous hover state
          if (hoveredFeatureId !== null) {
            map.setFeatureState(
              { source, sourceLayer, id: hoveredFeatureId },
              { hover: false }
            );
          }

          hoveredFeatureId = e.features[0].id;
          
          if (hoveredFeatureId !== null && hoveredFeatureId !== undefined) {
            map.setFeatureState(
              { source, sourceLayer, id: hoveredFeatureId },
              { hover: true }
            );
          }

          map.getCanvas().style.cursor = 'pointer';
          onHover?.(e.features[0], e);
        }
      };

      const handleMouseLeave = () => {
        if (hoveredFeatureId !== null) {
          map.setFeatureState(
            { source, sourceLayer, id: hoveredFeatureId },
            { hover: false }
          );
        }
        hoveredFeatureId = null;
        map.getCanvas().style.cursor = '';
        onHover?.(null, null);
      };

      map.on('mousemove', id, handleMouseMove);
      map.on('mouseleave', id, handleMouseLeave);
    }

    // Click handling
    if (onClick && interactive) {
      const handleClick = (e: any) => {
        if (e.features && e.features.length > 0) {
          onClick(e.features[0], e);
        }
      };

      map.on('click', id, handleClick);
    }

    return () => {
      // Clear hover state
      if (hoveredFeatureId !== null) {
        try {
          map.setFeatureState(
            { source, sourceLayer, id: hoveredFeatureId },
            { hover: false }
          );
        } catch {
          // Ignore errors during cleanup
        }
      }

      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
    };
  }, [map, isLoaded, id, source, sourceLayer, type, beforeId, buildPaint, interactive]);

  // Update visibility
  useEffect(() => {
    if (!map || !isLoaded || !map.getLayer(id)) return;
    map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  }, [map, isLoaded, id, visible]);

  // Update filter
  useEffect(() => {
    if (!map || !isLoaded || !map.getLayer(id)) return;
    map.setFilter(id, filter || null);
  }, [map, isLoaded, id, filter]);

  // Update paint properties
  useEffect(() => {
    if (!map || !isLoaded || !map.getLayer(id)) return;

    const enhancedPaint = buildPaint();
    Object.entries(enhancedPaint).forEach(([key, value]) => {
      try {
        map.setPaintProperty(id, key, value);
      } catch (error) {
        console.warn(`Failed to set paint property ${key}:`, error);
      }
    });
  }, [map, isLoaded, id, paint, buildPaint]);

  // Update layout properties
  useEffect(() => {
    if (!map || !isLoaded || !map.getLayer(id)) return;

    Object.entries(layout).forEach(([key, value]) => {
      if (key !== 'visibility') {
        try {
          map.setLayoutProperty(id, key, value);
        } catch (error) {
          console.warn(`Failed to set layout property ${key}:`, error);
        }
      }
    });
  }, [map, isLoaded, id, layout]);

  return null;
};

// Hook for vector tile layer access
export const useVectorTileLayer = (id: string) => {
  const { map, isLoaded } = useMap();

  const getLayer = useCallback(() => {
    if (!map || !isLoaded) return null;
    return map.getLayer(id);
  }, [map, isLoaded, id]);

  const setFilter = useCallback((filter: any[] | null) => {
    if (!map || !isLoaded || !map.getLayer(id)) return;
    map.setFilter(id, filter);
  }, [map, isLoaded, id]);

  const setPaintProperty = useCallback((name: string, value: any) => {
    if (!map || !isLoaded || !map.getLayer(id)) return;
    map.setPaintProperty(id, name, value);
  }, [map, isLoaded, id]);

  const setLayoutProperty = useCallback((name: string, value: any) => {
    if (!map || !isLoaded || !map.getLayer(id)) return;
    map.setLayoutProperty(id, name, value);
  }, [map, isLoaded, id]);

  const queryFeatures = useCallback((filter?: any[]) => {
    if (!map || !isLoaded) return [];
    return map.queryRenderedFeatures(undefined, {
      layers: [id],
      filter
    });
  }, [map, isLoaded, id]);

  const setFeatureState = useCallback((
    featureId: string | number,
    state: Record<string, any>
  ) => {
    if (!map || !isLoaded) return;
    const layer = map.getLayer(id) as any;
    if (layer) {
      map.setFeatureState(
        { source: layer.source, sourceLayer: layer['source-layer'], id: featureId },
        state
      );
    }
  }, [map, isLoaded, id]);

  return {
    layer: getLayer(),
    setFilter,
    setPaintProperty,
    setLayoutProperty,
    queryFeatures,
    setFeatureState
  };
};