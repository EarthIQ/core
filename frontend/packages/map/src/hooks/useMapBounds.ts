import { useState, useEffect, useCallback } from 'react';
import { useMap } from './useMap';
import { LngLatBounds } from 'maplibre-gl';

export interface MapBoundsState {
  bounds: LngLatBounds | null;
  north: number;
  south: number;
  east: number;
  west: number;
  center: { lng: number; lat: number };
}

export const useMapBounds = (debounceMs: number = 100): MapBoundsState & {
  fitBounds: (bounds: [[number, number], [number, number]], options?: any) => void;
} => {
  const { map, isLoaded } = useMap();
  const [state, setState] = useState<MapBoundsState>({
    bounds: null,
    north: 0,
    south: 0,
    east: 0,
    west: 0,
    center: { lng: 0, lat: 0 }
  });

  useEffect(() => {
    if (!map || !isLoaded) return;

    let timeoutId: NodeJS.Timeout;

    const updateBounds = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const bounds = map.getBounds();
        const center = map.getCenter();
        
        setState({
          bounds,
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
          center: { lng: center.lng, lat: center.lat }
        });
      }, debounceMs);
    };

    updateBounds();
    map.on('moveend', updateBounds);

    return () => {
      clearTimeout(timeoutId);
      map.off('moveend', updateBounds);
    };
  }, [map, isLoaded, debounceMs]);

  const fitBounds = useCallback((
    bounds: [[number, number], [number, number]],
    options?: any
  ) => {
    map?.fitBounds(bounds, options);
  }, [map]);

  return { ...state, fitBounds };
};