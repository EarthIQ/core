import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from '../../hooks/useMap';

export interface GeolocateControlProps {
  /** Position on map */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Tracking mode */
  trackUserLocation?: boolean;
  /** Show accuracy circle */
  showAccuracyCircle?: boolean;
  /** Show user heading */
  showUserHeading?: boolean;
  /** Fit bounds to include position and current view */
  fitBoundsOptions?: maplibregl.FitBoundsOptions;
  /** Position options for browser geolocation API */
  positionOptions?: PositionOptions;
  /** Callback when geolocate */
  onGeolocate?: (position: GeolocationPosition) => void;
  /** Callback on error */
  onError?: (error: GeolocationPositionError) => void;
  /** Callback on tracking start */
  onTrackingStart?: () => void;
  /** Callback on tracking end */
  onTrackingEnd?: () => void;
}

export const GeolocateControl: React.FC<GeolocateControlProps> = ({
  position = 'top-right',
  trackUserLocation = true,
  showAccuracyCircle = true,
  showUserHeading = false,
  fitBoundsOptions,
  positionOptions = {
    enableHighAccuracy: true,
    timeout: 6000
  },
  onGeolocate,
  onError,
  onTrackingStart,
  onTrackingEnd
}) => {
  const { map, isLoaded } = useMap();
  const controlRef = useRef<maplibregl.GeolocateControl | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const control = new maplibregl.GeolocateControl({
      trackUserLocation,
      showAccuracyCircle,
      showUserHeading,
      fitBoundsOptions,
      positionOptions
    });

    controlRef.current = control;

    // Event handlers
    control.on('geolocate', (e: any) => {
      onGeolocate?.(e);
    });

    control.on('error', (e: any) => {
      onError?.(e);
    });

    control.on('trackuserlocationstart', () => {
      onTrackingStart?.();
    });

    control.on('trackuserlocationend', () => {
      onTrackingEnd?.();
    });

    map.addControl(control, position);

    return () => {
      map.removeControl(control);
    };
  }, [map, isLoaded, position, trackUserLocation, showAccuracyCircle, showUserHeading]);

  return null;
};

// Hook for programmatic access
export const useGeolocateControl = () => {
  const controlRef = useRef<maplibregl.GeolocateControl | null>(null);

  const trigger = useCallback(() => {
    controlRef.current?.trigger();
  }, []);

  return { controlRef, trigger };
};