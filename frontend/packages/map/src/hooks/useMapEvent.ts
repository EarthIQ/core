// hooks/useMapEvent.ts
import { useEffect, useCallback, useRef } from 'react';
import { useMap } from './useMap';
import type { MapLayerMouseEvent, MapLayerTouchEvent } from 'maplibre-gl';

type MapEventType = 
  | 'click' | 'dblclick' | 'mousedown' | 'mouseup' | 'mousemove' 
  | 'mouseenter' | 'mouseleave' | 'mouseover' | 'mouseout'
  | 'contextmenu' | 'touchstart' | 'touchend' | 'touchcancel' | 'touchmove'
  | 'movestart' | 'move' | 'moveend' | 'dragstart' | 'drag' | 'dragend'
  | 'zoomstart' | 'zoom' | 'zoomend' | 'rotatestart' | 'rotate' | 'rotateend'
  | 'pitchstart' | 'pitch' | 'pitchend' | 'boxzoomstart' | 'boxzoomend' | 'boxzoomcancel'
  | 'webglcontextlost' | 'webglcontextrestored' | 'load' | 'render' | 'idle'
  | 'error' | 'data' | 'styledata' | 'sourcedata' | 'dataloading' | 'styledataloading' | 'sourcedataloading'
  | 'styleimagemissing' | 'resize';

export const useMapEvent = <T extends MapEventType>(
  event: T,
  handler: (e: any) => void,
  layerId?: string,
  deps: any[] = []
) => {
  const { map, isLoaded } = useMap();
  const handlerRef = useRef(handler);
  
  // Update handler ref on change
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const eventHandler = (e: any) => {
      handlerRef.current(e);
    };

    if (layerId) {
      map.on(event, layerId, eventHandler);
      return () => {
        map.off(event, layerId, eventHandler);
      };
    } else {
      map.on(event, eventHandler);
      return () => {
        map.off(event, eventHandler);
      };
    }
  }, [map, isLoaded, event, layerId, ...deps]);
};

// Typed event hooks
export const useMapClick = (
  handler: (e: MapLayerMouseEvent) => void,
  layerId?: string
) => useMapEvent('click', handler, layerId);

export const useMapHover = (
  onEnter: (e: MapLayerMouseEvent) => void,
  onLeave: (e: MapLayerMouseEvent) => void,
  layerId: string
) => {
  useMapEvent('mouseenter', onEnter, layerId);
  useMapEvent('mouseleave', onLeave, layerId);
};

export const useMapMove = (handler: (e: any) => void) => 
  useMapEvent('move', handler);

export const useMapZoom = (handler: (e: any) => void) => 
  useMapEvent('zoom', handler);

export const useMapLoad = (handler: () => void) => 
  useMapEvent('load', handler);

export const useMapIdle = (handler: () => void) => 
  useMapEvent('idle', handler);