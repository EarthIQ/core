import React, { useEffect, useId } from 'react';
import { useMap } from '../../hooks/useMap';

export interface PathLayerProps {
  /** Unique layer ID */
  id?: string;
  /** GeoJSON line data */
  data: GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.MultiLineString> | string;
  /** Line color */
  color?: string | any[];
  /** Line width */
  width?: number | any[];
  /** Line opacity */
  opacity?: number;
  /** Dash pattern */
  dashArray?: number[];
  /** Line cap style */
  cap?: 'butt' | 'round' | 'square';
  /** Line join style */
  join?: 'bevel' | 'round' | 'miter';
  /** Blur amount */
  blur?: number;
  /** Gap width (for cased lines) */
  gapWidth?: number;
  /** Gradient (requires line-gradient property in source) */
  gradient?: any[];
  /** Visibility */
  visible?: boolean;
  /** Min zoom */
  minZoom?: number;
  /** Max zoom */
  maxZoom?: number;
  /** Before layer ID */
  beforeId?: string;
  /** Click handler */
  onClick?: (feature: GeoJSON.Feature, event: any) => void;
  /** Hover handler */
  onHover?: (feature: GeoJSON.Feature | null, event: any) => void;
  /** Enable hover highlighting */
  hoverable?: boolean;
  /** Hover color */
  hoverColor?: string;
  /** Hover width multiplier */
  hoverWidthMultiplier?: number;
}

export const PathLayer: React.FC<PathLayerProps> = ({
  id: propId,
  data,
  color = '#3b82f6',
  width = 3,
  opacity = 1,
  dashArray,
  cap = 'round',
  join = 'round',
  blur = 0,
  gapWidth,
  gradient,
  visible = true,
  minZoom,
  maxZoom,
  beforeId,
  onClick,
  onHover,
  hoverable = false,
  hoverColor = '#1d4ed8',
  hoverWidthMultiplier = 1.5
}) => {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId || `path-layer-${autoId}`;
  const sourceId = `${id}-source`;

  useEffect(() => {
    if (!map || !isLoaded) return;

    // Add source
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: typeof data === 'string' ? data : data,
        lineMetrics: !!gradient
      });
    }

    // Determine line color and width with hover state
    const lineColor = hoverable
      ? ['case', ['boolean', ['feature-state', 'hover'], false], hoverColor, color]
      : color;

    const lineWidth = hoverable
      ? ['case', ['boolean', ['feature-state', 'hover'], false], 
          typeof width === 'number' ? width * hoverWidthMultiplier : width, 
          width]
      : width;

    // Add layer
    if (!map.getLayer(id)) {
      map.addLayer({
        id,
        type: 'line',
        source: sourceId,
        layout: {
          'line-cap': cap,
          'line-join': join,
          visibility: visible ? 'visible' : 'none'
        },
        paint: {
          'line-color': gradient ? undefined : lineColor,
          'line-gradient': gradient,
          'line-width': lineWidth,
          'line-opacity': opacity,
          'line-blur': blur,
          'line-gap-width': gapWidth,
          'line-dasharray': dashArray
        },
        ...(minZoom && { minzoom: minZoom }),
        ...(maxZoom && { maxzoom: maxZoom })
      }, beforeId);
    }

    // Hover state management
    let hoveredFeatureId: string | number | null = null;

    if (hoverable || onHover) {
      map.on('mousemove', id, (e) => {
        if (e.features?.length) {
          if (hoveredFeatureId !== null) {
            map.setFeatureState(
              { source: sourceId, id: hoveredFeatureId },
              { hover: false }
            );
          }
          hoveredFeatureId = e.features[0].id!;
          map.setFeatureState(
            { source: sourceId, id: hoveredFeatureId },
            { hover: true }
          );
          map.getCanvas().style.cursor = 'pointer';
          onHover?.(e.features[0] as any, e);
        }
      });

      map.on('mouseleave', id, () => {
        if (hoveredFeatureId !== null) {
          map.setFeatureState(
            { source: sourceId, id: hoveredFeatureId },
            { hover: false }
          );
        }
        hoveredFeatureId = null;
        map.getCanvas().style.cursor = '';
        onHover?.(null, null);
      });
    }

    if (onClick) {
      map.on('click', id, (e) => {
        if (e.features?.length) {
          onClick(e.features[0] as any, e);
        }
      });
    }

    return () => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, isLoaded]);

  // Update data
  useEffect(() => {
    if (!map || !isLoaded) return;
    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(typeof data === 'string' ? data : data);
    }
  }, [data, map, isLoaded]);

  return null;
};