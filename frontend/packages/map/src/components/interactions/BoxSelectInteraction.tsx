import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMap } from '../../hooks/useMap';
import type { GeoJSON } from 'geojson';

export interface BoxSelectInteractionProps {
  /** Layer IDs to enable box selection on */
  layers: string[];
  /** Enable/disable box selection */
  enabled?: boolean;
  /** Modifier key required to start box selection */
  modifier?: 'shift' | 'ctrl' | 'alt' | 'meta' | 'none';
  /** Add to existing selection when modifier is held */
  additive?: boolean;
  /** Box style */
  boxStyle?: {
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
  };
  /** Callback when selection changes */
  onSelect?: (features: GeoJSON.Feature[]) => void;
  /** Callback when box selection starts */
  onStart?: (point: { x: number; y: number }) => void;
  /** Callback when box selection ends */
  onEnd?: (bounds: { minX: number; minY: number; maxX: number; maxY: number }) => void;
  /** Callback during box selection (for preview) */
  onBoxChange?: (bounds: { minX: number; minY: number; maxX: number; maxY: number }) => void;
  /** Filter function for selectable features */
  filter?: (feature: GeoJSON.Feature) => boolean;
  /** Maximum features to select */
  maxFeatures?: number;
  /** Minimum box size to trigger selection (in pixels) */
  minBoxSize?: number;
  /** Selection mode */
  selectionMode?: 'intersects' | 'contains';
}

export const BoxSelectInteraction: React.FC<BoxSelectInteractionProps> = ({
  layers,
  enabled = true,
  modifier = 'shift',
  additive = true,
  boxStyle = {
    fillColor: 'rgba(59, 130, 246, 0.1)',
    fillOpacity: 1,
    strokeColor: '#3b82f6',
    strokeWidth: 2,
    strokeDasharray: '5,5'
  },
  onSelect,
  onStart,
  onEnd,
  onBoxChange,
  filter,
  maxFeatures,
  minBoxSize = 10,
  selectionMode = 'intersects'
}) => {
  const { map, isLoaded } = useMap();
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<GeoJSON.Feature[]>([]);
  
  const boxElementRef = useRef<HTMLDivElement | null>(null);
  const previousSelectionRef = useRef<GeoJSON.Feature[]>([]);

  // Check if modifier key is pressed
  const isModifierPressed = useCallback((e: MouseEvent | KeyboardEvent): boolean => {
    switch (modifier) {
      case 'shift':
        return e.shiftKey;
      case 'ctrl':
        return e.ctrlKey;
      case 'alt':
        return e.altKey;
      case 'meta':
        return e.metaKey;
      case 'none':
        return true;
      default:
        return false;
    }
  }, [modifier]);

  // Create box element
  const createBoxElement = useCallback(() => {
    if (!map) return;

    const box = document.createElement('div');
    box.style.position = 'absolute';
    box.style.backgroundColor = boxStyle.fillColor || 'rgba(59, 130, 246, 0.1)';
    box.style.border = `${boxStyle.strokeWidth}px ${boxStyle.strokeDasharray ? 'dashed' : 'solid'} ${boxStyle.strokeColor}`;
    box.style.pointerEvents = 'none';
    box.style.zIndex = '1000';
    
    map.getContainer().appendChild(box);
    boxElementRef.current = box;
  }, [map, boxStyle]);

  // Update box element position and size
  const updateBoxElement = useCallback(() => {
    if (!boxElementRef.current || !startPoint || !currentPoint) return;

    const minX = Math.min(startPoint.x, currentPoint.x);
    const minY = Math.min(startPoint.y, currentPoint.y);
    const maxX = Math.max(startPoint.x, currentPoint.x);
    const maxY = Math.max(startPoint.y, currentPoint.y);

    boxElementRef.current.style.left = `${minX}px`;
    boxElementRef.current.style.top = `${minY}px`;
    boxElementRef.current.style.width = `${maxX - minX}px`;
    boxElementRef.current.style.height = `${maxY - minY}px`;

    onBoxChange?.({ minX, minY, maxX, maxY });
  }, [startPoint, currentPoint, onBoxChange]);

  // Remove box element
  const removeBoxElement = useCallback(() => {
    if (boxElementRef.current) {
      boxElementRef.current.remove();
      boxElementRef.current = null;
    }
  }, []);

  // Query features in box
  const queryFeaturesInBox = useCallback((): GeoJSON.Feature[] => {
    if (!map || !startPoint || !currentPoint) return [];

    const minX = Math.min(startPoint.x, currentPoint.x);
    const minY = Math.min(startPoint.y, currentPoint.y);
    const maxX = Math.max(startPoint.x, currentPoint.x);
    const maxY = Math.max(startPoint.y, currentPoint.y);

    // Check minimum box size
    if (maxX - minX < minBoxSize || maxY - minY < minBoxSize) {
      return [];
    }

    const bbox: [[number, number], [number, number]] = [
      [minX, minY],
      [maxX, maxY]
    ];

    let features = map.queryRenderedFeatures(bbox, { layers });

    // Apply filter
    if (filter) {
      features = features.filter(f => filter(f as unknown as GeoJSON.Feature));
    }

    // For 'contains' mode, check if features are fully within box
    if (selectionMode === 'contains') {
      const boxBounds = {
        minLng: map.unproject([minX, maxY]).lng,
        maxLng: map.unproject([maxX, minY]).lng,
        minLat: map.unproject([minX, maxY]).lat,
        maxLat: map.unproject([maxX, minY]).lat
      };

      features = features.filter(feature => {
        const coords = getCoordinatesFromGeometry(feature.geometry as GeoJSON.Geometry);
        return coords.every(coord => 
          coord[0] >= boxBounds.minLng &&
          coord[0] <= boxBounds.maxLng &&
          coord[1] >= boxBounds.minLat &&
          coord[1] <= boxBounds.maxLat
        );
      });
    }

    // Deduplicate by feature ID
    const uniqueFeatures = new Map<string | number, GeoJSON.Feature>();
    features.forEach(feature => {
      const id = feature.id ?? feature.properties?.id ?? JSON.stringify(feature.geometry);
      if (!uniqueFeatures.has(id)) {
        uniqueFeatures.set(id, feature as unknown as GeoJSON.Feature);
      }
    });

    let result = Array.from(uniqueFeatures.values());

    // Apply max features limit
    if (maxFeatures && result.length > maxFeatures) {
      result = result.slice(0, maxFeatures);
    }

    return result;
  }, [map, startPoint, currentPoint, layers, filter, minBoxSize, maxFeatures, selectionMode]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: any) => {
    if (!enabled || !map) return;
    if (!isModifierPressed(e.originalEvent)) return;

    // Store previous selection for additive mode
    if (additive && e.originalEvent.shiftKey) {
      previousSelectionRef.current = [...selectedFeatures];
    } else {
      previousSelectionRef.current = [];
    }

    const point = { x: e.point.x, y: e.point.y };
    setStartPoint(point);
    setCurrentPoint(point);
    setIsSelecting(true);
    
    createBoxElement();
    map.dragPan.disable();
    
    onStart?.(point);
  }, [map, enabled, additive, selectedFeatures, isModifierPressed, createBoxElement, onStart]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: any) => {
    if (!isSelecting || !startPoint) return;

    const point = { x: e.point.x, y: e.point.y };
    setCurrentPoint(point);
    updateBoxElement();

    // Preview selection
    const features = queryFeaturesInBox();
    const combined = additive
      ? [...previousSelectionRef.current, ...features]
      : features;
    
    // Deduplicate
    const unique = new Map<string | number, GeoJSON.Feature>();
    combined.forEach(f => {
      const id = f.id ?? (f.properties as any)?.id ?? JSON.stringify(f.geometry);
      unique.set(id, f);
    });

    setSelectedFeatures(Array.from(unique.values()));
  }, [isSelecting, startPoint, additive, updateBoxElement, queryFeaturesInBox]);

  // Handle mouse up
  const handleMouseUp = useCallback((e: any) => {
    if (!isSelecting || !map) return;

    const features = queryFeaturesInBox();
    
    // Combine with previous selection if additive
    const combined = additive && e.originalEvent?.shiftKey
      ? [...previousSelectionRef.current, ...features]
      : features;
    
    // Deduplicate
    const unique = new Map<string | number, GeoJSON.Feature>();
    combined.forEach(f => {
      const id = f.id ?? (f.properties as any)?.id ?? JSON.stringify(f.geometry);
      unique.set(id, f);
    });

    const finalSelection = Array.from(unique.values());
    setSelectedFeatures(finalSelection);
    onSelect?.(finalSelection);

    // Calculate bounds for callback
    if (startPoint && currentPoint) {
      onEnd?.({
        minX: Math.min(startPoint.x, currentPoint.x),
        minY: Math.min(startPoint.y, currentPoint.y),
        maxX: Math.max(startPoint.x, currentPoint.x),
        maxY: Math.max(startPoint.y, currentPoint.y)
      });
    }

    // Cleanup
    setIsSelecting(false);
    setStartPoint(null);
    setCurrentPoint(null);
    removeBoxElement();
    map.dragPan.enable();
  }, [map, isSelecting, startPoint, currentPoint, additive, queryFeaturesInBox, removeBoxElement, onSelect, onEnd]);

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isSelecting && map) {
      setIsSelecting(false);
      setStartPoint(null);
      setCurrentPoint(null);
      removeBoxElement();
      map.dragPan.enable();
    }
  }, [map, isSelecting, removeBoxElement]);

  // Setup event listeners
  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;

    map.on('mousedown', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      
      removeBoxElement();
      map.dragPan.enable();
    };
  }, [map, isLoaded, enabled, handleMouseDown, handleMouseMove, handleMouseUp, handleKeyDown, removeBoxElement]);

  // Update box element when points change
  useEffect(() => {
    if (isSelecting) {
      updateBoxElement();
    }
  }, [isSelecting, updateBoxElement]);

  return null;
};

// Helper function
function getCoordinatesFromGeometry(geometry: GeoJSON.Geometry): number[][] {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates as number[]];
    case 'LineString':
    case 'MultiPoint':
      return geometry.coordinates as number[][];
    case 'Polygon':
    case 'MultiLineString':
      return (geometry.coordinates as number[][][]).flat();
    case 'MultiPolygon':
      return (geometry.coordinates as number[][][][]).flat(2);
    default:
      return [];
  }
}

// Hook for programmatic access
export const useBoxSelect = () => {
  const [selectedFeatures, setSelectedFeatures] = useState<GeoJSON.Feature[]>([]);
  
  const clearSelection = useCallback(() => {
    setSelectedFeatures([]);
  }, []);

  return {
    selectedFeatures,
    setSelectedFeatures,
    clearSelection
  };
};