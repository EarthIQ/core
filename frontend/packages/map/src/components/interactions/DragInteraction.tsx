import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMap } from '../../hooks/useMap';
import type { GeoJSON } from 'geojson';
import * as turf from '@turf/turf';

export interface DragInteractionProps {
  /** Layer IDs to enable dragging on */
  layers: string[];
  /** Enable/disable dragging */
  enabled?: boolean;
  /** Callback when drag starts */
  onDragStart?: (feature: GeoJSON.Feature, event: any) => void;
  /** Callback during drag */
  onDrag?: (feature: GeoJSON.Feature, delta: { lng: number; lat: number }, event: any) => void;
  /** Callback when drag ends */
  onDragEnd?: (feature: GeoJSON.Feature, event: any) => void;
  /** Callback to update feature (required for actual position updates) */
  onFeatureUpdate?: (feature: GeoJSON.Feature) => void;
  /** Cursor style while dragging */
  dragCursor?: string;
  /** Cursor style on hover (when draggable) */
  hoverCursor?: string;
  /** Constraint function for drag position */
  constraint?: (coords: number[], feature: GeoJSON.Feature) => number[];
  /** Minimum drag distance to start (in pixels) */
  minDragDistance?: number;
  /** Show drag preview */
  showPreview?: boolean;
  /** Preview style */
  previewStyle?: {
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWidth?: number;
  };
  /** Filter function for draggable features */
  filter?: (feature: GeoJSON.Feature) => boolean;
  /** Enable snapping while dragging */
  snap?: boolean;
  /** Snap options */
  snapOptions?: {
    layers: string[];
    tolerance: number;
  };
}

export const DragInteraction: React.FC<DragInteractionProps> = ({
  layers,
  enabled = true,
  onDragStart,
  onDrag,
  onDragEnd,
  onFeatureUpdate,
  dragCursor = 'grabbing',
  hoverCursor = 'grab',
  constraint,
  minDragDistance = 3,
  showPreview = true,
  previewStyle = {
    fillColor: '#3b82f6',
    fillOpacity: 0.5,
    strokeColor: '#1d4ed8',
    strokeWidth: 2
  },
  filter,
  snap = false,
  snapOptions
}) => {
  const { map, isLoaded } = useMap();
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFeature, setDraggedFeature] = useState<GeoJSON.Feature | null>(null);
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | number | null>(null);
  
  const startPointRef = useRef<{ x: number; y: number; lngLat: { lng: number; lat: number } } | null>(null);
  const currentOffsetRef = useRef<{ lng: number; lat: number }>({ lng: 0, lat: 0 });
  const hasDraggedRef = useRef(false);

  const previewSourceId = 'drag-preview-source';
  const previewFillLayerId = 'drag-preview-fill';
  const previewLineLayerId = 'drag-preview-line';

  // Initialize preview layers
  useEffect(() => {
    if (!map || !isLoaded || !showPreview) return;

    if (!map.getSource(previewSourceId)) {
      map.addSource(previewSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
    }

    if (!map.getLayer(previewFillLayerId)) {
      map.addLayer({
        id: previewFillLayerId,
        type: 'fill',
        source: previewSourceId,
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': previewStyle.fillColor,
          'fill-opacity': previewStyle.fillOpacity
        }
      });
    }

    if (!map.getLayer(previewLineLayerId)) {
      map.addLayer({
        id: previewLineLayerId,
        type: 'line',
        source: previewSourceId,
        paint: {
          'line-color': previewStyle.strokeColor,
          'line-width': previewStyle.strokeWidth
        }
      });
    }

    return () => {
      if (map.getLayer(previewLineLayerId)) map.removeLayer(previewLineLayerId);
      if (map.getLayer(previewFillLayerId)) map.removeLayer(previewFillLayerId);
      if (map.getSource(previewSourceId)) map.removeSource(previewSourceId);
    };
  }, [map, isLoaded, showPreview, previewStyle]);

  // Translate feature geometry
  const translateFeature = useCallback((
    feature: GeoJSON.Feature,
    deltaLng: number,
    deltaLat: number
  ): GeoJSON.Feature => {
    const translated = turf.transformTranslate(
      feature,
      Math.sqrt(deltaLng * deltaLng + deltaLat * deltaLat) * 111000, // Convert to meters roughly
      Math.atan2(deltaLng, deltaLat) * (180 / Math.PI),
      { units: 'meters' }
    );

    // Simpler translation for performance
    const translateCoords = (coords: any): any => {
      if (typeof coords[0] === 'number') {
        let newCoords = [coords[0] + deltaLng, coords[1] + deltaLat];
        
        // Apply constraint if provided
        if (constraint && feature) {
          newCoords = constraint(newCoords, feature);
        }
        
        return newCoords;
      }
      return coords.map(translateCoords);
    };

    return {
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: translateCoords((feature.geometry as any).coordinates)
      }
    };
  }, [constraint]);

  // Update preview
  const updatePreview = useCallback((feature: GeoJSON.Feature, deltaLng: number, deltaLat: number) => {
    if (!map || !showPreview) return;

    const translatedFeature = translateFeature(feature, deltaLng, deltaLat);
    
    const source = map.getSource(previewSourceId) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: [translatedFeature]
      });
    }
  }, [map, showPreview, translateFeature]);

  // Clear preview
  const clearPreview = useCallback(() => {
    if (!map) return;

    const source = map.getSource(previewSourceId) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [map]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: any) => {
    if (!enabled || !map) return;

    const features = map.queryRenderedFeatures(e.point, { layers });
    
    const draggableFeatures = filter
      ? features?.filter(f => filter(f as unknown as GeoJSON.Feature))
      : features;

    if (draggableFeatures && draggableFeatures.length > 0) {
      const feature = draggableFeatures[0] as unknown as GeoJSON.Feature;
      
      startPointRef.current = {
        x: e.point.x,
        y: e.point.y,
        lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat }
      };
      
      setDraggedFeature(feature);
      hasDraggedRef.current = false;
      
      // Prevent map panning
      map.dragPan.disable();
    }
  }, [map, enabled, layers, filter]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: any) => {
    if (!map) return;

    // Handle dragging
    if (draggedFeature && startPointRef.current) {
      const dx = e.point.x - startPointRef.current.x;
      const dy = e.point.y - startPointRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check minimum drag distance
      if (!hasDraggedRef.current && distance < minDragDistance) {
        return;
      }

      if (!hasDraggedRef.current) {
        hasDraggedRef.current = true;
        setIsDragging(true);
        onDragStart?.(draggedFeature, e);
        map.getCanvas().style.cursor = dragCursor;
      }

      // Calculate delta in lng/lat
      let deltaLng = e.lngLat.lng - startPointRef.current.lngLat.lng;
      let deltaLat = e.lngLat.lat - startPointRef.current.lngLat.lat;

      // Apply snapping if enabled
      if (snap && snapOptions) {
        const snappedPosition = findSnapPoint(
          map,
          e.point,
          snapOptions.layers,
          snapOptions.tolerance
        );
        
        if (snappedPosition) {
          const originalCenter = turf.center(draggedFeature);
          const originalCoords = (originalCenter.geometry as GeoJSON.Point).coordinates;
          
          deltaLng = snappedPosition[0] - originalCoords[0];
          deltaLat = snappedPosition[1] - originalCoords[1];
        }
      }

      currentOffsetRef.current = { lng: deltaLng, lat: deltaLat };
      
      // Update preview
      updatePreview(draggedFeature, deltaLng, deltaLat);
      
      onDrag?.(draggedFeature, { lng: deltaLng, lat: deltaLat }, e);
    } else {
      // Handle hover
      const features = map.queryRenderedFeatures(e.point, { layers });
      
      const draggableFeatures = filter
        ? features?.filter(f => filter(f as unknown as GeoJSON.Feature))
        : features;

      if (draggableFeatures && draggableFeatures.length > 0) {
        const featureId = draggableFeatures[0].id ?? draggableFeatures[0].properties?.id;
        
        if (featureId !== hoveredFeatureId) {
          setHoveredFeatureId(featureId);
          map.getCanvas().style.cursor = hoverCursor;
        }
      } else {
        if (hoveredFeatureId !== null) {
          setHoveredFeatureId(null);
          map.getCanvas().style.cursor = '';
        }
      }
    }
  }, [map, draggedFeature, minDragDistance, dragCursor, hoverCursor, filter, layers, snap, snapOptions, hoveredFeatureId, onDragStart, onDrag, updatePreview]);

  // Handle mouse up
  const handleMouseUp = useCallback((e: any) => {
    if (!map) return;

    if (draggedFeature && hasDraggedRef.current) {
      // Apply the translation to the feature
      const { lng, lat } = currentOffsetRef.current;
      const updatedFeature = translateFeature(draggedFeature, lng, lat);
      
      onFeatureUpdate?.(updatedFeature);
      onDragEnd?.(updatedFeature, e);
    }

    // Reset state
    setIsDragging(false);
    setDraggedFeature(null);
    startPointRef.current = null;
    currentOffsetRef.current = { lng: 0, lat: 0 };
    hasDraggedRef.current = false;
    
    clearPreview();
    map.dragPan.enable();
    map.getCanvas().style.cursor = hoveredFeatureId ? hoverCursor : '';
  }, [map, draggedFeature, hoveredFeatureId, hoverCursor, translateFeature, clearPreview, onFeatureUpdate, onDragEnd]);

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isDragging && map) {
      setIsDragging(false);
      setDraggedFeature(null);
      startPointRef.current = null;
      currentOffsetRef.current = { lng: 0, lat: 0 };
      hasDraggedRef.current = false;
      
      clearPreview();
      map.dragPan.enable();
      map.getCanvas().style.cursor = '';
    }
  }, [map, isDragging, clearPreview]);

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
      
      map.dragPan.enable();
      map.getCanvas().style.cursor = '';
    };
  }, [map, isLoaded, enabled, handleMouseDown, handleMouseMove, handleMouseUp, handleKeyDown]);

  return null;
};

// Helper: Find snap point
function findSnapPoint(
  map: maplibregl.Map,
  point: { x: number; y: number },
  layers: string[],
  tolerance: number
): number[] | null {
  const bbox: [[number, number], [number, number]] = [
    [point.x - tolerance, point.y - tolerance],
    [point.x + tolerance, point.y + tolerance]
  ];

  const features = map.queryRenderedFeatures(bbox, { layers });
  
  let closest: { point: number[]; distance: number } | null = null;

  features.forEach(feature => {
    const coords = getCoordinatesFromGeometry(feature.geometry as GeoJSON.Geometry);
    coords.forEach(coord => {
      const projected = map.project(coord as [number, number]);
      const distance = Math.sqrt(
        Math.pow(projected.x - point.x, 2) +
        Math.pow(projected.y - point.y, 2)
      );
      
      if (distance <= tolerance && (!closest || distance < closest.distance)) {
        closest = { point: coord, distance };
      }
    });
  });

  return closest?.point || null;
}

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