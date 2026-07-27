import React, { useEffect, useId } from 'react';
import { useMap } from '../../hooks/useMap';
import { useMapImage } from '../../hooks/useMapImage';
import type { GeoJSON } from 'geojson';

export interface IconLayerProps {
  /** Unique layer ID */
  id?: string;
  /** GeoJSON point data */
  data: GeoJSON.FeatureCollection<GeoJSON.Point> | string;
  /** Icon image URL or image ID */
  icon: string | { url: string; id?: string };
  /** Icon size */
  size?: number | any[];
  /** Icon rotation property or value */
  rotation?: number | string | any[];
  /** Allow icon overlap */
  allowOverlap?: boolean;
  /** Icon anchor */
  anchor?: 'center' | 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Icon offset */
  offset?: [number, number];
  /** Icon opacity */
  opacity?: number;
  /** Icon color (for SDF icons) */
  color?: string | any[];
  /** Text label field */
  labelField?: string;
  /** Text label size */
  labelSize?: number;
  /** Text label color */
  labelColor?: string;
  /** Text label offset */
  labelOffset?: [number, number];
  /** Text label anchor */
  labelAnchor?: 'center' | 'left' | 'right' | 'top' | 'bottom';
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
}

export const IconLayer: React.FC<IconLayerProps> = ({
  id: propId,
  data,
  icon,
  size = 1,
  rotation = 0,
  allowOverlap = false,
  anchor = 'center',
  offset = [0, 0],
  opacity = 1,
  color,
  labelField,
  labelSize = 12,
  labelColor = '#000000',
  labelOffset = [0, 1.5],
  labelAnchor = 'top',
  visible = true,
  minZoom,
  maxZoom,
  beforeId,
  onClick,
  onHover
}) => {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId || `icon-layer-${autoId}`;
  const sourceId = `${id}-source`;

  // Handle icon image
  const iconId = typeof icon === 'string' 
    ? (icon.startsWith('http') ? `${id}-icon` : icon)
    : (icon.id || `${id}-icon`);
  
  const iconUrl = typeof icon === 'string'
    ? (icon.startsWith('http') ? icon : null)
    : icon.url;

  // Load icon image if URL provided
  const { loaded: imageLoaded } = useMapImage(
    iconUrl ? { id: iconId, image: iconUrl } : { id: '', image: '' }
  );

  useEffect(() => {
    if (!map || !isLoaded) return;
    if (iconUrl && !imageLoaded) return;

    // Add source
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: typeof data === 'string' ? data : data
      });
    }

    // Add icon layer
    if (!map.getLayer(id)) {
      map.addLayer({
        id,
        type: 'symbol',
        source: sourceId,
        layout: {
          'icon-image': iconId,
          'icon-size': size,
          'icon-rotate': typeof rotation === 'string' ? ['get', rotation] : rotation,
          'icon-allow-overlap': allowOverlap,
          'icon-anchor': anchor,
          'icon-offset': offset,
          'text-field': labelField ? ['get', labelField] : undefined,
          'text-size': labelSize,
          'text-anchor': labelAnchor,
          'text-offset': labelOffset,
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          visibility: visible ? 'visible' : 'none'
        },
        paint: {
          'icon-opacity': opacity,
          'icon-color': color,
          'text-color': labelColor,
          'text-halo-color': '#ffffff',
          'text-halo-width': 1
        },
        ...(minZoom && { minzoom: minZoom }),
        ...(maxZoom && { maxzoom: maxZoom })
      }, beforeId);
    }

    // Event handlers
    if (onClick) {
      map.on('click', id, (e) => {
        if (e.features?.length) {
          onClick(e.features[0] as any, e);
        }
      });
    }

    if (onHover) {
      map.on('mouseenter', id, (e) => {
        map.getCanvas().style.cursor = 'pointer';
        if (e.features?.length) {
          onHover(e.features[0] as any, e);
        }
      });
      
      map.on('mouseleave', id, () => {
        map.getCanvas().style.cursor = '';
        onHover(null, null);
      });
    }

    return () => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, isLoaded, imageLoaded, iconUrl]);

  // Update data
  useEffect(() => {
    if (!map || !isLoaded) return;
    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(typeof data === 'string' ? data : data);
    }
  }, [data, map, isLoaded]);

  // Update visibility
  useEffect(() => {
    if (!map || !isLoaded || !map.getLayer(id)) return;
    map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  }, [visible, map, isLoaded]);

  return null;
};