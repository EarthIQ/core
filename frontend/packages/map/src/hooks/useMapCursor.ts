import { useEffect, useCallback, useState } from 'react';
import { useMap } from './useMap';

export type CursorStyle = 
  | 'auto' | 'default' | 'pointer' | 'crosshair' | 'move'
  | 'grab' | 'grabbing' | 'not-allowed' | 'wait' | 'help'
  | 'text' | 'cell' | 'copy' | 'zoom-in' | 'zoom-out';

export const useMapCursor = () => {
  const { map, isLoaded } = useMap();
  const [currentCursor, setCurrentCursor] = useState<CursorStyle>('auto');

  const setCursor = useCallback((cursor: CursorStyle) => {
    if (!map) return;
    map.getCanvas().style.cursor = cursor;
    setCurrentCursor(cursor);
  }, [map]);

  const resetCursor = useCallback(() => {
    setCursor('auto');
  }, [setCursor]);

  // Set cursor on layer hover
  const setLayerCursor = useCallback((
    layerId: string,
    cursor: CursorStyle = 'pointer'
  ) => {
    if (!map || !isLoaded) return;

    const onEnter = () => setCursor(cursor);
    const onLeave = () => resetCursor();

    map.on('mouseenter', layerId, onEnter);
    map.on('mouseleave', layerId, onLeave);

    return () => {
      map.off('mouseenter', layerId, onEnter);
      map.off('mouseleave', layerId, onLeave);
    };
  }, [map, isLoaded, setCursor, resetCursor]);

  return {
    cursor: currentCursor,
    setCursor,
    resetCursor,
    setLayerCursor
  };
};