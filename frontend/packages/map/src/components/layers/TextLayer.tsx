import React, { useEffect, useId } from 'react';
import { useMap } from '../../hooks/useMap';
import type { GeoJSON } from 'geojson';

export interface TextLayerProps {
  /** Unique layer ID */
  id?: string;
  /** GeoJSON data */
  data: GeoJSON.FeatureCollection | string;
  /** Text field property name */
  textField: string;
  /** Text size */
  size?: number | any[];
  /** Text color */
  color?: string | any[];
  /** Text opacity */
  opacity?: number;
  /** Text font */
  font?: string[];
  /** Text anchor */
  anchor?: 'center' | 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Text offset */
  offset?: [number, number];
  /** Text rotation */
  rotate?: number | string;
  /** Text max width */
  maxWidth?: number;
  /** Text line height */
  lineHeight?: number;
  /** Text letter spacing */
  letterSpacing?: number;
  /** Text transform */
  transform?: 'none' | 'uppercase' | 'lowercase';
  /** Text justify */
  justify?: 'auto' | 'left' | 'center' | 'right';
  /** Halo color */
  haloColor?: string;
  /** Halo width */
  haloWidth?: number;
  /** Halo blur */
  haloBlur?: number;
  /** Allow overlap */
  allowOverlap?: boolean;
  /** Ignore placement */
  ignorePlacement?: boolean;
  /** Symbol placement */
  placement?: 'point' | 'line' | 'line-center';
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
}

export const TextLayer: React.FC<TextLayerProps> = ({
  id: propId,
  data,
  textField,
  size = 14,
  color = '#000000',
  opacity = 1,
  font = ['Open Sans Regular', 'Arial Unicode MS Regular'],
  anchor = 'center',
  offset = [0, 0],
  rotate = 0,
  maxWidth = 10,
  lineHeight = 1.2,
  letterSpacing = 0,
  transform = 'none',
  justify = 'center',
  haloColor = '#ffffff',
  haloWidth = 1,
  haloBlur = 0,
  allowOverlap = false,
  ignorePlacement = false,
  placement = 'point',
  visible = true,
  minZoom,
  maxZoom,
  beforeId,
  onClick
}) => {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId || `text-layer-${autoId}`;
  const sourceId = `${id}-source`;

  useEffect(() => {
    if (!map || !isLoaded) return;

    // Add source
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: typeof data === 'string' ? data : data
      });
    }

    // Add layer
    if (!map.getLayer(id)) {
      map.addLayer({
        id,
        type: 'symbol',
        source: sourceId,
        layout: {
          'text-field': ['get', textField],
          'text-size': size,
          'text-font': font,
          'text-anchor': anchor,
          'text-offset': offset,
          'text-rotate': typeof rotate === 'string' ? ['get', rotate] : rotate,
          'text-max-width': maxWidth,
          'text-line-height': lineHeight,
          'text-letter-spacing': letterSpacing,
          'text-transform': transform,
          'text-justify': justify,
          'text-allow-overlap': allowOverlap,
          'text-ignore-placement': ignorePlacement,
          'symbol-placement': placement,
          visibility: visible ? 'visible' : 'none'
        },
        paint: {
          'text-color': color,
          'text-opacity': opacity,
          'text-halo-color': haloColor,
          'text-halo-width': haloWidth,
          'text-halo-blur': haloBlur
        },
        ...(minZoom && { minzoom: minZoom }),
        ...(maxZoom && { maxzoom: maxZoom })
      }, beforeId);
    }

    if (onClick) {
      map.on('click', id, (e) => {
        if (e.features?.length) {
          onClick(e.features[0] as any, e);
        }
      });

      map.on('mouseenter', id, () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', id, () => {
        map.getCanvas().style.cursor = '';
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