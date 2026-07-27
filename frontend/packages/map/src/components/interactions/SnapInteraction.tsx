import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMap } from '../../hooks/useMap';
import type { GeoJSON } from 'geojson';

export interface SnapInteractionProps {
  /** Enable/disable snapping */
  enabled?: boolean;
  /** Layers to snap to */
  layers: string[];
  /** Snap tolerance in pixels */
  tolerance?: number;
  /** Snap to vertices */
  snapToVertex?: boolean;
  /** Snap to edges */
  snapToEdge?: boolean;
  /** Snap to midpoints */
  snapToMidpoint?: boolean;
  /** Snap to grid */
  snapToGrid?: boolean;
  /** Grid size in degrees */
  gridSize?: number;
  /** Show snap indicator */
  showIndicator?: boolean;
  /** Snap indicator style */
  indicatorStyle?: {
    color?: string;
    radius?: number;
  };
  /** Callback when snap point changes */
  onSnap?: (point: number[] | null, type: 'vertex' | 'edge' | 'midpoint' | 'grid' | null) => void;
  /** Priority order for snap types */
  priority?: ('vertex' | 'edge' | 'midpoint' | 'grid')[];
}

export const SnapInteraction: React.FC<SnapInteractionProps> = ({
  enabled = true,
  layers,
  tolerance = 15,
  snapToVertex = true,
  snapToEdge = true,
  snapToMidpoint = false,
  snapToGrid = false,
  gridSize = 0.0001,
  showIndicator = true,
  indicatorStyle = {
    color: '#22c55e',
    radius: 8
  },
  onSnap,
  priority = ['vertex', 'midpoint', 'edge', 'grid']
}) => {
  const { map, isLoaded } = useMap();
  const [snapPoint, setSnapPoint] = useState<number[] | null>(null);
  const [snapType, setSnapType] = useState<'vertex' | 'edge' | 'midpoint' | 'grid' | null>(null);
  const indicatorSourceId = 'snap-indicator-source';
  const indicatorLayerId = 'snap-indicator-layer';

  // Initialize indicator layer
  useEffect(() => {
    if (!map || !isLoaded || !showIndicator) return;

    if (!map.getSource(indicatorSourceId)) {
      map.addSource(indicatorSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
    }

    if (!map.getLayer(indicatorLayerId)) {
      map.addLayer({
        id: indicatorLayerId,
        type: 'circle',
        source: indicatorSourceId,
        paint: {
          'circle-color': indicatorStyle.color,
          'circle-radius': indicatorStyle.radius,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.8
        }
      });
    }

    return () => {
      if (map.getLayer(indicatorLayerId)) map.removeLayer(indicatorLayerId);
      if (map.getSource(indicatorSourceId)) map.removeSource(indicatorSourceId);
    };
  }, [map, isLoaded, showIndicator, indicatorStyle]);

  // Update indicator position
  useEffect(() => {
    if (!map || !isLoaded || !showIndicator) return;

    const source = map.getSource(indicatorSourceId) as maplibregl.GeoJSONSource;
    if (source) {
      if (snapPoint) {
        source.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: snapPoint },
            properties: { type: snapType }
          }]
        });
      } else {
        source.setData({ type: 'FeatureCollection', features: [] });
      }
    }
  }, [map, isLoaded, snapPoint, snapType, showIndicator]);

  // Find closest vertex
  const findClosestVertex = useCallback((
    point: { x: number; y: number },
    lngLat: { lng: number; lat: number }
  ): { point: number[]; distance: number } | null => {
    if (!map || !snapToVertex) return null;

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

    return closest;
  }, [map, layers, tolerance, snapToVertex]);

  // Find closest point on edge
  const findClosestEdge = useCallback((
    point: { x: number; y: number },
    lngLat: { lng: number; lat: number }
  ): { point: number[]; distance: number } | null => {
    if (!map || !snapToEdge) return null;

    const bbox: [[number, number], [number, number]] = [
      [point.x - tolerance, point.y - tolerance],
      [point.x + tolerance, point.y + tolerance]
    ];

    const features = map.queryRenderedFeatures(bbox, { layers });
    
    let closest: { point: number[]; distance: number } | null = null;

    features.forEach(feature => {
      const edges = getEdgesFromGeometry(feature.geometry as GeoJSON.Geometry);
      
      edges.forEach(edge => {
        const closestOnEdge = closestPointOnSegment(
          [lngLat.lng, lngLat.lat],
          edge[0],
          edge[1]
        );
        
        const projected = map.project(closestOnEdge as [number, number]);
        const distance = Math.sqrt(
          Math.pow(projected.x - point.x, 2) +
          Math.pow(projected.y - point.y, 2)
        );

        if (distance <= tolerance && (!closest || distance < closest.distance)) {
          closest = { point: closestOnEdge, distance };
        }
      });
    });

    return closest;
  }, [map, layers, tolerance, snapToEdge]);

  // Find closest midpoint
  const findClosestMidpoint = useCallback((
    point: { x: number; y: number },
    lngLat: { lng: number; lat: number }
  ): { point: number[]; distance: number } | null => {
    if (!map || !snapToMidpoint) return null;

    const bbox: [[number, number], [number, number]] = [
      [point.x - tolerance, point.y - tolerance],
      [point.x + tolerance, point.y + tolerance]
    ];

    const features = map.queryRenderedFeatures(bbox, { layers });
    
    let closest: { point: number[]; distance: number } | null = null;

    features.forEach(feature => {
      const edges = getEdgesFromGeometry(feature.geometry as GeoJSON.Geometry);
      
      edges.forEach(edge => {
        const midpoint = [
          (edge[0][0] + edge[1][0]) / 2,
          (edge[0][1] + edge[1][1]) / 2
        ];
        
        const projected = map.project(midpoint as [number, number]);
        const distance = Math.sqrt(
          Math.pow(projected.x - point.x, 2) +
          Math.pow(projected.y - point.y, 2)
        );

        if (distance <= tolerance && (!closest || distance < closest.distance)) {
          closest = { point: midpoint, distance };
        }
      });
    });

    return closest;
  }, [map, layers, tolerance, snapToMidpoint]);

  // Find grid point
  const findGridPoint = useCallback((
    lngLat: { lng: number; lat: number }
  ): { point: number[]; distance: number } | null => {
    if (!snapToGrid) return null;

    const snappedLng = Math.round(lngLat.lng / gridSize) * gridSize;
    const snappedLat = Math.round(lngLat.lat / gridSize) * gridSize;
    
    const distance = Math.sqrt(
      Math.pow(lngLat.lng - snappedLng, 2) +
      Math.pow(lngLat.lat - snappedLat, 2)
    );

    return { point: [snappedLng, snappedLat], distance };
  }, [snapToGrid, gridSize]);

  // Main snap function
  const findSnapPoint = useCallback((
    point: { x: number; y: number },
    lngLat: { lng: number; lat: number }
  ): { point: number[]; type: 'vertex' | 'edge' | 'midpoint' | 'grid' } | null => {
    const snapFunctions: Record<string, () => { point: number[]; distance: number } | null> = {
      vertex: () => findClosestVertex(point, lngLat),
      edge: () => findClosestEdge(point, lngLat),
      midpoint: () => findClosestMidpoint(point, lngLat),
      grid: () => findGridPoint(lngLat)
    };

    // Find best snap point based on priority
    for (const type of priority) {
      const result = snapFunctions[type]?.();
      if (result) {
        return { point: result.point, type: type as any };
      }
    }

    return null;
  }, [priority, findClosestVertex, findClosestEdge, findClosestMidpoint, findGridPoint]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: any) => {
    if (!enabled || !map) return;

    const result = findSnapPoint(e.point, e.lngLat);
    
    if (result) {
      setSnapPoint(result.point);
      setSnapType(result.type);
      onSnap?.(result.point, result.type);
    } else {
      setSnapPoint(null);
      setSnapType(null);
      onSnap?.(null, null);
    }
  }, [enabled, map, findSnapPoint, onSnap]);

  // Setup event listeners
  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;

    map.on('mousemove', handleMouseMove);

    return () => {
      map.off('mousemove', handleMouseMove);
      setSnapPoint(null);
      setSnapType(null);
    };
  }, [map, isLoaded, enabled, handleMouseMove]);

  return null;
};

// Helper: Get edges from geometry
function getEdgesFromGeometry(geometry: GeoJSON.Geometry): number[][][] {
  const edges: number[][][] = [];

  const addEdges = (coords: number[][]) => {
    for (let i = 0; i < coords.length - 1; i++) {
      edges.push([coords[i], coords[i + 1]]);
    }
  };

  switch (geometry.type) {
    case 'LineString':
      addEdges(geometry.coordinates as number[][]);
      break;
    case 'Polygon':
      (geometry.coordinates as number[][][]).forEach(ring => addEdges(ring));
      break;
    case 'MultiLineString':
      (geometry.coordinates as number[][][]).forEach(line => addEdges(line));
      break;
    case 'MultiPolygon':
      (geometry.coordinates as number[][][][]).forEach(polygon => {
        polygon.forEach(ring => addEdges(ring));
      });
      break;
  }

  return edges;
}

// Helper: Get all coordinates from geometry
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

// Helper: Find closest point on a line segment
function closestPointOnSegment(
  point: number[],
  start: number[],
  end: number[]
): number[] {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return start;

  let t = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  return [
    start[0] + t * dx,
    start[1] + t * dy
  ];
}

// Hook for programmatic snap access
export const useSnap = () => {
  const snapPointRef = useRef<number[] | null>(null);
  const snapTypeRef = useRef<string | null>(null);

  return {
    getSnapPoint: () => snapPointRef.current,
    getSnapType: () => snapTypeRef.current
  };
};