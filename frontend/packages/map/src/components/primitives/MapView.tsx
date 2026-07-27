// primitives/MapView.tsx
import React, { useEffect, useRef } from 'react';
import { useMap } from '../../hooks/useMap';

export interface MapViewProps {
  /** Center longitude */
  longitude: number;
  /** Center latitude */
  latitude: number;
  /** Zoom level */
  zoom: number;
  /** Pitch angle */
  pitch?: number;
  /** Bearing angle */
  bearing?: number;
  /** Padding */
  padding?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  /** Animation options */
  animation?: {
    duration?: number;
    easing?: (t: number) => number;
    animate?: boolean;
  };
  /** Transition type */
  transitionType?: 'jumpTo' | 'easeTo' | 'flyTo';
  /** Callback when move ends */
  onMoveEnd?: () => void;
}

export const MapView: React.FC<MapViewProps> = ({
  longitude,
  latitude,
  zoom,
  pitch = 0,
  bearing = 0,
  padding,
  animation = { duration: 1000, animate: true },
  transitionType = 'flyTo',
  onMoveEnd
}) => {
  const { map, isLoaded } = useMap();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const options = {
      center: [longitude, latitude] as [number, number],
      zoom,
      pitch,
      bearing,
      padding,
      duration: animation.duration,
      essential: true
    };

    if (isFirstRender.current || !animation.animate) {
      map.jumpTo(options);
      isFirstRender.current = false;
    } else {
      switch (transitionType) {
        case 'jumpTo':
          map.jumpTo(options);
          break;
        case 'easeTo':
          map.easeTo(options);
          break;
        case 'flyTo':
        default:
          map.flyTo(options);
          break;
      }
    }

    if (onMoveEnd) {
      const handler = () => onMoveEnd();
      map.once('moveend', handler);
      return () => {
        map.off('moveend', handler);
      };
    }
  }, [map, isLoaded, longitude, latitude, zoom, pitch, bearing, transitionType]);

  return null;
};