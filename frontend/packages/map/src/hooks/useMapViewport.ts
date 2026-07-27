import { useState, useEffect, useCallback } from 'react';
import { useMap } from './useMap';

export interface ViewportState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export const useMapViewport = () => {
  const { map, isLoaded } = useMap();
  const [viewport, setViewport] = useState<ViewportState>({
    longitude: 0,
    latitude: 0,
    zoom: 0,
    pitch: 0,
    bearing: 0
  });

  useEffect(() => {
    if (!map || !isLoaded) return;

    const updateViewport = () => {
      const center = map.getCenter();
      setViewport({
        longitude: center.lng,
        latitude: center.lat,
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing()
      });
    };

    updateViewport();
    map.on('move', updateViewport);

    return () => {
      map.off('move', updateViewport);
    };
  }, [map, isLoaded]);

  const setView = useCallback((
    newViewport: Partial<ViewportState>,
    animate: boolean = true
  ) => {
    if (!map) return;

    const options = {
      center: [
        newViewport.longitude ?? viewport.longitude,
        newViewport.latitude ?? viewport.latitude
      ] as [number, number],
      zoom: newViewport.zoom ?? viewport.zoom,
      pitch: newViewport.pitch ?? viewport.pitch,
      bearing: newViewport.bearing ?? viewport.bearing
    };

    if (animate) {
      map.flyTo(options);
    } else {
      map.jumpTo(options);
    }
  }, [map, viewport]);

  const flyTo = useCallback((
    options: {
      longitude: number;
      latitude: number;
      zoom?: number;
      duration?: number;
    }
  ) => {
    map?.flyTo({
      center: [options.longitude, options.latitude],
      zoom: options.zoom,
      duration: options.duration
    });
  }, [map]);

  const zoomIn = useCallback(() => map?.zoomIn(), [map]);
  const zoomOut = useCallback(() => map?.zoomOut(), [map]);
  const resetNorth = useCallback(() => map?.resetNorth(), [map]);

  return {
    ...viewport,
    setView,
    flyTo,
    zoomIn,
    zoomOut,
    resetNorth
  };
};