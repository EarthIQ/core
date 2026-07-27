import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMap } from '../../hooks/useMap';
import type { GeoJSON } from 'geojson';

export interface SelectInteractionProps {
  /** Layer IDs to enable selection on */
  layers: string[];
  /** Enable multi-select with Shift key */
  multiSelect?: boolean;
  /** Enable box selection with Ctrl/Cmd + drag */
  boxSelect?: boolean;
  /** Selected feature IDs (controlled mode) */
  selectedIds?: (string | number)[];
  /** Selection style */
  selectionStyle?: {
    color?: string;
    width?: number;
    fillColor?: string;
    fillOpacity?: number;
  };
  /** Highlight style on hover before selection */
  hoverStyle?: {
    color?: string;
    width?: number;
    fillOpacity?: number;
  };
  /** Maximum number of features that can be selected */
  maxSelection?: number;
  /** Callback when selection changes */
  onSelect?: (features: GeoJSON.Feature[]) => void;
  /** Callback when a feature is clicked */
  onClick?: (feature: GeoJSON.Feature, event: any) => void;
  /** Callback when hovering over a feature */
  onHover?: (feature: GeoJSON.Feature | null) => void;
  /** Enable/disable the interaction */
  enabled?: boolean;
  /** Clear selection on map click (outside features) */
  clearOnClick?: boolean;
  /** Filter function for selectable features */
  filter?: (feature: GeoJSON.Feature) => boolean;
}

export const SelectInteraction: React.FC<SelectInteractionProps> = ({
  layers,
  multiSelect = true,
  boxSelect = true,
  selectedIds: controlledSelectedIds,
  selectionStyle = {
    color: '#3b82f6',
    width: 3,
    fillColor: '#3b82f6',
    fillOpacity: 0.3
  },
  hoverStyle = {
    color: '#60a5fa',
    width: 2,
    fillOpacity: 0.2
  },
  maxSelection,
  onSelect,
  onClick,
  onHover,
  enabled = true,
  clearOnClick = true,
  filter
}) => {
  const { map, isLoaded } = useMap();
  const [selectedFeatures, setSelectedFeatures] = useState<Map<string | number, GeoJSON.Feature>>(new Map());
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | number | null>(null);
  const isBoxSelectingRef = useRef(false);
  const boxStartRef = useRef<{ x: number; y: number } | null>(null);
  const boxElementRef = useRef<HTMLDivElement | null>(null);

  // Sync with controlled selectedIds
  useEffect(() => {
    if (controlledSelectedIds !== undefined && map && isLoaded) {
      const newSelected = new Map<string | number, GeoJSON.Feature>();
      
      layers.forEach(layerId => {
        const features = map.querySourceFeatures(
          (map.getLayer(layerId) as any)?.source,
          { sourceLayer: (map.getLayer(layerId) as any)?.['source-layer'] }
        );
        
        features.forEach(feature => {
          const id = feature.id ?? feature.properties?.id;
          if (controlledSelectedIds.includes(id)) {
            newSelected.set(id, feature as unknown as GeoJSON.Feature);
          }
        });
      });
      
      setSelectedFeatures(newSelected);
    }
  }, [controlledSelectedIds, map, isLoaded, layers]);

  // Update feature states for selected features
  const updateSelectionState = useCallback(() => {
    if (!map || !isLoaded) return;

    layers.forEach(layerId => {
      const layer = map.getLayer(layerId);
      if (!layer) return;

      const sourceId = (layer as any).source;
      const sourceLayer = (layer as any)['source-layer'];

      // Clear all selection states first
      const allFeatures = map.querySourceFeatures(sourceId, { sourceLayer });
      allFeatures.forEach(feature => {
        if (feature.id !== undefined) {
          map.setFeatureState(
            { source: sourceId, sourceLayer, id: feature.id },
            { selected: false }
          );
        }
      });

      // Set selected state for selected features
      selectedFeatures.forEach((_, id) => {
        map.setFeatureState(
          { source: sourceId, sourceLayer, id },
          { selected: true }
        );
      });
    });
  }, [map, isLoaded, layers, selectedFeatures]);

  useEffect(() => {
    updateSelectionState();
  }, [updateSelectionState]);

  // Handle feature click
  const handleClick = useCallback((e: any) => {
    if (!enabled || isBoxSelectingRef.current) return;

    const features = map?.queryRenderedFeatures(e.point, { layers });
    
    // Filter features if filter function provided
    const selectableFeatures = filter 
      ? features?.filter(f => filter(f as unknown as GeoJSON.Feature))
      : features;

    if (!selectableFeatures || selectableFeatures.length === 0) {
      // Clicked on empty space
      if (clearOnClick) {
        setSelectedFeatures(new Map());
        onSelect?.([]);
      }
      return;
    }

    const clickedFeature = selectableFeatures[0] as unknown as GeoJSON.Feature;
    const featureId = clickedFeature.id ?? (clickedFeature.properties as any)?.id;

    onClick?.(clickedFeature, e);

    setSelectedFeatures(prev => {
      const newSelected = new Map(prev);
      const isShiftPressed = e.originalEvent?.shiftKey;

      if (multiSelect && isShiftPressed) {
        // Toggle selection in multi-select mode
        if (newSelected.has(featureId)) {
          newSelected.delete(featureId);
        } else {
          if (!maxSelection || newSelected.size < maxSelection) {
            newSelected.set(featureId, clickedFeature);
          }
        }
      } else {
        // Single select mode or no shift key
        if (newSelected.has(featureId) && newSelected.size === 1) {
          // Clicking on only selected feature deselects it
          newSelected.clear();
        } else {
          newSelected.clear();
          newSelected.set(featureId, clickedFeature);
        }
      }

      onSelect?.(Array.from(newSelected.values()));
      return newSelected;
    });
  }, [map, enabled, layers, multiSelect, maxSelection, clearOnClick, filter, onClick, onSelect]);

  // Handle hover
  const handleMouseMove = useCallback((e: any) => {
    if (!enabled || !map || isBoxSelectingRef.current) return;

    const features = map.queryRenderedFeatures(e.point, { layers });
    
    const selectableFeatures = filter
      ? features?.filter(f => filter(f as unknown as GeoJSON.Feature))
      : features;

    if (selectableFeatures && selectableFeatures.length > 0) {
      const feature = selectableFeatures[0];
      const featureId = feature.id ?? feature.properties?.id;

      if (featureId !== hoveredFeatureId) {
        // Clear previous hover state
        if (hoveredFeatureId !== null) {
          layers.forEach(layerId => {
            const layer = map.getLayer(layerId);
            if (layer) {
              map.setFeatureState(
                { 
                  source: (layer as any).source, 
                  sourceLayer: (layer as any)['source-layer'],
                  id: hoveredFeatureId 
                },
                { hover: false }
              );
            }
          });
        }

        // Set new hover state
        layers.forEach(layerId => {
          const layer = map.getLayer(layerId);
          if (layer) {
            map.setFeatureState(
              { 
                source: (layer as any).source,
                sourceLayer: (layer as any)['source-layer'],
                id: featureId 
              },
              { hover: true }
            );
          }
        });

        setHoveredFeatureId(featureId);
        onHover?.(feature as unknown as GeoJSON.Feature);
        map.getCanvas().style.cursor = 'pointer';
      }
    } else {
      // Clear hover state when not over any feature
      if (hoveredFeatureId !== null) {
        layers.forEach(layerId => {
          const layer = map.getLayer(layerId);
          if (layer) {
            map.setFeatureState(
              { 
                source: (layer as any).source,
                sourceLayer: (layer as any)['source-layer'],
                id: hoveredFeatureId 
              },
              { hover: false }
            );
          }
        });
        setHoveredFeatureId(null);
        onHover?.(null);
        map.getCanvas().style.cursor = '';
      }
    }
  }, [map, enabled, layers, hoveredFeatureId, filter, onHover]);

  // Box selection handlers
  const handleMouseDown = useCallback((e: any) => {
    if (!enabled || !boxSelect || !map) return;
    
    const isModifierPressed = e.originalEvent?.ctrlKey || e.originalEvent?.metaKey;
    if (!isModifierPressed) return;

    isBoxSelectingRef.current = true;
    boxStartRef.current = { x: e.point.x, y: e.point.y };

    // Create box element
    const box = document.createElement('div');
    box.style.position = 'absolute';
    box.style.border = '2px dashed #3b82f6';
    box.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    box.style.pointerEvents = 'none';
    box.style.zIndex = '1000';
    map.getContainer().appendChild(box);
    boxElementRef.current = box;

    // Prevent map drag
    map.dragPan.disable();
  }, [map, enabled, boxSelect]);

  const handleMouseMoveBox = useCallback((e: any) => {
    if (!isBoxSelectingRef.current || !boxStartRef.current || !boxElementRef.current) return;

    const start = boxStartRef.current;
    const current = { x: e.point.x, y: e.point.y };

    const minX = Math.min(start.x, current.x);
    const minY = Math.min(start.y, current.y);
    const maxX = Math.max(start.x, current.x);
    const maxY = Math.max(start.y, current.y);

    boxElementRef.current.style.left = `${minX}px`;
    boxElementRef.current.style.top = `${minY}px`;
    boxElementRef.current.style.width = `${maxX - minX}px`;
    boxElementRef.current.style.height = `${maxY - minY}px`;
  }, []);

  const handleMouseUp = useCallback((e: any) => {
    if (!isBoxSelectingRef.current || !boxStartRef.current || !map) return;

    const start = boxStartRef.current;
    const end = { x: e.point.x, y: e.point.y };

    // Query features in box
    const bbox: [[number, number], [number, number]] = [
      [Math.min(start.x, end.x), Math.min(start.y, end.y)],
      [Math.max(start.x, end.x), Math.max(start.y, end.y)]
    ];

    const features = map.queryRenderedFeatures(bbox, { layers });
    
    const selectableFeatures = filter
      ? features?.filter(f => filter(f as unknown as GeoJSON.Feature))
      : features;

    if (selectableFeatures && selectableFeatures.length > 0) {
      const isShiftPressed = e.originalEvent?.shiftKey;
      
      setSelectedFeatures(prev => {
        const newSelected = isShiftPressed ? new Map(prev) : new Map();
        
        selectableFeatures.forEach(feature => {
          const featureId = feature.id ?? feature.properties?.id;
          if (!maxSelection || newSelected.size < maxSelection) {
            newSelected.set(featureId, feature as unknown as GeoJSON.Feature);
          }
        });

        onSelect?.(Array.from(newSelected.values()));
        return newSelected;
      });
    }

    // Cleanup
    if (boxElementRef.current) {
      boxElementRef.current.remove();
      boxElementRef.current = null;
    }
    boxStartRef.current = null;
    isBoxSelectingRef.current = false;
    map.dragPan.enable();
  }, [map, layers, filter, maxSelection, onSelect]);

  // Setup event listeners
  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;

    map.on('click', handleClick);
    map.on('mousemove', handleMouseMove);
    
    if (boxSelect) {
      map.on('mousedown', handleMouseDown);
      map.on('mousemove', handleMouseMoveBox);
      map.on('mouseup', handleMouseUp);
    }

    return () => {
      map.off('click', handleClick);
      map.off('mousemove', handleMouseMove);
      
      if (boxSelect) {
        map.off('mousedown', handleMouseDown);
        map.off('mousemove', handleMouseMoveBox);
        map.off('mouseup', handleMouseUp);
      }

      // Cleanup box element
      if (boxElementRef.current) {
        boxElementRef.current.remove();
      }

      // Reset cursor
      map.getCanvas().style.cursor = '';
    };
  }, [map, isLoaded, enabled, handleClick, handleMouseMove, boxSelect, handleMouseDown, handleMouseMoveBox, handleMouseUp]);

  // Expose methods via ref
  const clearSelection = useCallback(() => {
    setSelectedFeatures(new Map());
    onSelect?.([]);
  }, [onSelect]);

  const selectAll = useCallback(() => {
    if (!map || !isLoaded) return;

    const allFeatures = new Map<string | number, GeoJSON.Feature>();
    
    layers.forEach(layerId => {
      const features = map.queryRenderedFeatures(undefined, { layers: [layerId] });
      const selectableFeatures = filter
        ? features.filter(f => filter(f as unknown as GeoJSON.Feature))
        : features;

      selectableFeatures.forEach(feature => {
        const featureId = feature.id ?? feature.properties?.id;
        if (!maxSelection || allFeatures.size < maxSelection) {
          allFeatures.set(featureId, feature as unknown as GeoJSON.Feature);
        }
      });
    });

    setSelectedFeatures(allFeatures);
    onSelect?.(Array.from(allFeatures.values()));
  }, [map, isLoaded, layers, filter, maxSelection, onSelect]);

  return null;
};

// Hook to access selection methods
export const useSelect = () => {
  const selectedRef = useRef<{
    clearSelection: () => void;
    selectAll: () => void;
    getSelectedFeatures: () => GeoJSON.Feature[];
  }>(null);

  return selectedRef.current;
};