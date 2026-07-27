import React, { useEffect, useId } from 'react';
import { useMap } from '../../hooks/useMap';
import type { GeoJSON } from 'geojson';

export interface PolygonLayerProps {
  /** Unique layer ID */
  id?: string;
  /** GeoJSON polygon data */
  data: GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon> | string;
  /** Fill color */
  fillColor?: string | any[];
  /** Fill opacity */
  fillOpacity?: number | any[];
  /** Fill pattern image ID */
  fillPattern?: string;
  /** Outline color */
  outlineColor?: string | any[];
  /** Outline width */
  outlineWidth?: number;
  /** Outline opacity */
  outlineOpacity?: number;
  /** Outline dash pattern */
  outlineDashArray?: number[];
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
  /** Hover fill color */
  hoverFillColor?: string;
  /** Hover fill opacity */
  hoverFillOpacity?: number;
}

export const PolygonLayer: React.FC<PolygonLayerProps> = ({
  id: propId,
  data,
  fillColor = '#3b82f6',
  fillOpacity = 0.5,
  fillPattern,
  outlineColor = '#1d4ed8',
  outlineWidth = 2,
  outlineOpacity = 1,
  outlineDashArray,
  visible = true,
  minZoom,
  maxZoom,
  beforeId,
  onClick,
  onHover,
  hoverable = false,
  hoverFillColor = '#1d4ed8',
  hoverFillOpacity = 0.7
}) => {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId || `polygon-layer-${autoId}`;
  const sourceId = `${id}-source`;
  const fillLayerId = `${id}-fill`;
  const outlineLayerId = `${id}-outline`;

  useEffect(() => {
    if (!map || !isLoaded) return;

    // Add source
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: typeof data === 'string' ? data : data,
        generateId: true
      });
    }

    // Fill color with hover state
    const fill = hoverable
      ? ['case', ['boolean', ['feature-state', 'hover'], false], hoverFillColor, fillColor]
      : fillColor;

    const opacity = hoverable
      ? ['case', ['boolean', ['feature-state', 'hover'], false], hoverFillOpacity, fillOpacity]
      : fillOpacity;

    // Add fill layer
    if (!map.getLayer(fillLayerId)) {
      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        layout: {
          visibility: visible ? 'visible' : 'none'
        },
        paint: {
          'fill-color': fill,
          'fill-opacity': opacity,
          'fill-pattern': fillPattern
        },
        ...(minZoom && { minzoom: minZoom }),
        ...(maxZoom && { maxzoom: maxZoom })
      }, beforeId);
    }

    // Add outline layer
    if (outlineWidth > 0 && !map.getLayer(outlineLayerId)) {
      map.addLayer({
        id: outlineLayerId,
        type: 'line',
        source: sourceId,
        layout: {
          visibility: visible ? 'visible' : 'none'
        },
        paint: {
          'line-color': outlineColor,
          'line-width': outlineWidth,
          'line-opacity': outlineOpacity,
          'line-dasharray': outlineDashArray
        },
        ...(minZoom && { minzoom: minZoom }),
        ...(maxZoom && { maxzoom: maxZoom })
      });
    }

    // Hover handling
    let hoveredFeatureId: string | number | null = null;

    if (hoverable || onHover) {
      map.on('mousemove', fillLayerId, (e) => {
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

      map.on('mouseleave', fillLayerId, () => {
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
      map.on('click', fillLayerId, (e) => {
        if (e.features?.length) {
          onClick(e.features[0] as any, e);
        }
      });
    }

    return () => {
      if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
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