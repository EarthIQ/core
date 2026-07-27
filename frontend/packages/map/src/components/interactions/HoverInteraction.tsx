import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMap } from '../../hooks/useMap';
import type { GeoJSON } from 'geojson';

export interface HoverInteractionProps {
  /** Layer IDs to enable hover on */
  layers: string[];
  /** Hover style - changes applied on hover */
  hoverStyle?: {
    /** Fill opacity change */
    fillOpacity?: number;
    /** Line width change */
    lineWidth?: number;
    /** Circle radius change */
    circleRadius?: number;
    /** Color override */
    color?: string;
  };
  /** Cursor style on hover */
  cursor?: string;
  /** Debounce delay in ms */
  debounce?: number;
  /** Callback when hovering over a feature */
  onHover?: (feature: GeoJSON.Feature | null, event?: any) => void;
  /** Callback for hover enter */
  onEnter?: (feature: GeoJSON.Feature, event: any) => void;
  /** Callback for hover leave */
  onLeave?: (feature: GeoJSON.Feature, event: any) => void;
  /** Enable/disable the interaction */
  enabled?: boolean;
  /** Filter function for hoverable features */
  filter?: (feature: GeoJSON.Feature) => boolean;
  /** Show tooltip with feature info */
  showTooltip?: boolean;
  /** Tooltip content renderer */
  tooltipContent?: (feature: GeoJSON.Feature) => React.ReactNode;
  /** Tooltip offset */
  tooltipOffset?: [number, number];
  /** Highlight related features (same property value) */
  highlightRelated?: {
    property: string;
    layers?: string[];
  };
}

export const HoverInteraction: React.FC<HoverInteractionProps> = ({
  layers,
  hoverStyle = {
    fillOpacity: 0.8,
    lineWidth: 3
  },
  cursor = 'pointer',
  debounce = 0,
  onHover,
  onEnter,
  onLeave,
  enabled = true,
  filter,
  showTooltip = false,
  tooltipContent,
  tooltipOffset = [0, -10],
  highlightRelated
}) => {
  const { map, isLoaded } = useMap();
  const [hoveredFeature, setHoveredFeature] = useState<GeoJSON.Feature | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const hoveredIdRef = useRef<string | number | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const relatedIdsRef = useRef<Set<string | number>>(new Set());

  // Apply hover state to feature
  const applyHoverState = useCallback((featureId: string | number, isHovered: boolean) => {
    if (!map) return;

    layers.forEach(layerId => {
      const layer = map.getLayer(layerId);
      if (!layer) return;

      const sourceId = (layer as any).source;
      const sourceLayer = (layer as any)['source-layer'];

      map.setFeatureState(
        { source: sourceId, sourceLayer, id: featureId },
        { hover: isHovered }
      );
    });
  }, [map, layers]);

  // Apply hover state to related features
  const applyRelatedHoverState = useCallback((
    propertyValue: any, 
    isHovered: boolean
  ) => {
    if (!map || !highlightRelated) return;

    const targetLayers = highlightRelated.layers || layers;
    
    targetLayers.forEach(layerId => {
      const layer = map.getLayer(layerId);
      if (!layer) return;

      const sourceId = (layer as any).source;
      const sourceLayer = (layer as any)['source-layer'];

      const features = map.querySourceFeatures(sourceId, { sourceLayer });
      
      features.forEach(feature => {
        if (feature.properties?.[highlightRelated.property] === propertyValue) {
          const id = feature.id ?? feature.properties?.id;
          if (id !== undefined) {
            map.setFeatureState(
              { source: sourceId, sourceLayer, id },
              { related: isHovered }
            );
            
            if (isHovered) {
              relatedIdsRef.current.add(id);
            }
          }
        }
      });
    });

    if (!isHovered) {
      relatedIdsRef.current.clear();
    }
  }, [map, layers, highlightRelated]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: any) => {
    if (!enabled || !map) return;

    const processHover = () => {
      const features = map.queryRenderedFeatures(e.point, { layers });
      
      const hoverableFeatures = filter
        ? features?.filter(f => filter(f as unknown as GeoJSON.Feature))
        : features;

      if (hoverableFeatures && hoverableFeatures.length > 0) {
        const feature = hoverableFeatures[0] as unknown as GeoJSON.Feature;
        const featureId = feature.id ?? (feature.properties as any)?.id;

        if (featureId !== hoveredIdRef.current) {
          // Clear previous hover state
          if (hoveredIdRef.current !== null) {
            applyHoverState(hoveredIdRef.current, false);
            
            if (highlightRelated && hoveredFeature) {
              applyRelatedHoverState(
                hoveredFeature.properties?.[highlightRelated.property],
                false
              );
            }
            
            if (hoveredFeature) {
              onLeave?.(hoveredFeature, e);
            }
          }

          // Apply new hover state
          applyHoverState(featureId, true);
          
          if (highlightRelated) {
            applyRelatedHoverState(
              feature.properties?.[highlightRelated.property],
              true
            );
          }

          hoveredIdRef.current = featureId;
          setHoveredFeature(feature);
          onEnter?.(feature, e);
          onHover?.(feature, e);
          map.getCanvas().style.cursor = cursor;

          // Update tooltip position
          if (showTooltip) {
            setTooltipPosition({
              x: e.point.x + tooltipOffset[0],
              y: e.point.y + tooltipOffset[1]
            });
          }
        } else if (showTooltip) {
          // Update tooltip position while hovering same feature
          setTooltipPosition({
            x: e.point.x + tooltipOffset[0],
            y: e.point.y + tooltipOffset[1]
          });
        }
      } else {
        // Not hovering any feature
        if (hoveredIdRef.current !== null) {
          applyHoverState(hoveredIdRef.current, false);
          
          if (highlightRelated && hoveredFeature) {
            applyRelatedHoverState(
              hoveredFeature.properties?.[highlightRelated.property],
              false
            );
          }
          
          if (hoveredFeature) {
            onLeave?.(hoveredFeature, e);
          }
          
          hoveredIdRef.current = null;
          setHoveredFeature(null);
          onHover?.(null);
          map.getCanvas().style.cursor = '';
          setTooltipPosition(null);
        }
      }
    };

    if (debounce > 0) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = setTimeout(processHover, debounce);
    } else {
      processHover();
    }
  }, [
    map, enabled, layers, filter, cursor, debounce, 
    showTooltip, tooltipOffset, highlightRelated,
    applyHoverState, applyRelatedHoverState, hoveredFeature,
    onHover, onEnter, onLeave
  ]);

  // Handle mouse leave from map
  const handleMouseLeave = useCallback(() => {
    if (hoveredIdRef.current !== null && map) {
      applyHoverState(hoveredIdRef.current, false);
      
      if (highlightRelated && hoveredFeature) {
        applyRelatedHoverState(
          hoveredFeature.properties?.[highlightRelated.property],
          false
        );
      }
      
      if (hoveredFeature) {
        onLeave?.(hoveredFeature, null);
      }
      
      hoveredIdRef.current = null;
      setHoveredFeature(null);
      onHover?.(null);
      map.getCanvas().style.cursor = '';
      setTooltipPosition(null);
    }
  }, [map, hoveredFeature, highlightRelated, applyHoverState, applyRelatedHoverState, onHover, onLeave]);

  // Setup event listeners
  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;

    map.on('mousemove', handleMouseMove);
    map.getContainer().addEventListener('mouseleave', handleMouseLeave);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.getContainer().removeEventListener('mouseleave', handleMouseLeave);
      
      clearTimeout(debounceTimeoutRef.current);
      
      // Clear any remaining hover state
      if (hoveredIdRef.current !== null) {
        applyHoverState(hoveredIdRef.current, false);
      }
      
      // Clear related hover states
      relatedIdsRef.current.forEach(id => {
        layers.forEach(layerId => {
          const layer = map.getLayer(layerId);
          if (layer) {
            map.setFeatureState(
              { 
                source: (layer as any).source,
                sourceLayer: (layer as any)['source-layer'],
                id 
              },
              { related: false }
            );
          }
        });
      });

      map.getCanvas().style.cursor = '';
    };
  }, [map, isLoaded, enabled, handleMouseMove, handleMouseLeave, applyHoverState, layers]);

  // Render tooltip
  if (!showTooltip || !hoveredFeature || !tooltipPosition) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: tooltipPosition.x,
        top: tooltipPosition.y,
        transform: 'translate(-50%, -100%)',
        backgroundColor: 'white',
        padding: '8px 12px',
        borderRadius: 6,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        pointerEvents: 'none',
        zIndex: 1000,
        maxWidth: 300,
        fontSize: 13
      }}
    >
      {tooltipContent ? (
        tooltipContent(hoveredFeature)
      ) : (
        <div>
          {Object.entries(hoveredFeature.properties || {}).slice(0, 5).map(([key, value]) => (
            <div key={key} style={{ marginBottom: 4 }}>
              <strong>{key}:</strong> {String(value)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};