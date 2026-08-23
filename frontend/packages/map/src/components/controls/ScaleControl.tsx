import React, { useEffect } from 'react';
import * as maplibregl from 'maplibre-gl';
import { useMap } from '../../hooks/useMap';

export interface ScaleControlProps {
  /** Position on map */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Max width in pixels */
  maxWidth?: number;
  /** Unit system */
  unit?: 'imperial' | 'metric' | 'nautical';
}

export const ScaleControl: React.FC<ScaleControlProps> = ({
  position = 'bottom-left',
  maxWidth = 100,
  unit = 'metric'
}) => {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const control = new maplibregl.ScaleControl({
      maxWidth,
      unit
    });

    map.addControl(control, position);

    return () => {
      try {
        map.removeControl(control);
      } catch (e) {
        console.warn("Failed to remove scale control:", e);
      }
    };
  }, [map, isLoaded, position, maxWidth, unit]);

  return null;
};