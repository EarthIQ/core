import React, { useEffect, useId } from 'react';
import { useMap } from '../../hooks/useMap';
import type { GeoJSON } from 'geojson';

export interface ExtrusionLayerProps {
  /** Unique layer ID */
  id?: string;
  /** GeoJSON polygon data */
  data: GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon> | string;
  /** Height property name or value */
  height: string | number;
  /** Base height property name or value */
  baseHeight?: string | number;
  /** Fill color */
  color?: string | any[];
  /** Opacity */
  opacity?: number;
  /** Visibility */
  visible?: boolean;
  /** Click handler */
  onClick?: (feature: GeoJSON.Feature, event: any) => void;
}

export const ExtrusionLayer: React.FC<ExtrusionLayerProps> = ({
  id: propId,
  data,
  height,
  baseHeight = 0,
  color = '#3b82f6',
  opacity = 0.8,
  visible = true,
  onClick
}) => {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId || `extrusion-layer-${autoId}`;
  const sourceId = `${id}-source`;

  useEffect(() => {
    if (!map || !isLoaded) return;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: typeof data === 'string' ? data : data
      });
    }

    if (!map.getLayer(id)) {
      map.addLayer({
        id,
        type: 'fill-extrusion',
        source: sourceId,
        paint: {
          'fill-extrusion-color': typeof color === 'string' ? color : color,
          'fill-extrusion-height': typeof height === 'number' ? height : ['get', height],
          'fill-extrusion-base': typeof baseHeight === 'number' ? baseHeight : ['get', baseHeight],
          'fill-extrusion-opacity': opacity
        },
        layout: {
          visibility: visible ? 'visible' : 'none'
        }
      });
    }

    if (onClick) {
      map.on('click', id, (e) => {
        if (e.features && e.features.length > 0) {
          onClick(e.features[0] as any, e);
        }
      });
    }

    return () => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, isLoaded]);

  return null;
};