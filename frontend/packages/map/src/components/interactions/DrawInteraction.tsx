import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMap } from '../../hooks/useMap';
import type { GeoJSON } from 'geojson';

export type DrawMode = 'point' | 'line' | 'polygon' | 'rectangle' | 'circle' | 'freehand';

export interface DrawInteractionProps {
  /** Drawing mode */
  mode: DrawMode | null;
  /** Callback when drawing is complete */
  onComplete?: (feature: GeoJSON.Feature) => void;
  /** Callback during drawing (for live preview) */
  onDraw?: (coordinates: number[] | number[][]) => void;
  /** Callback when drawing is cancelled */
  onCancel?: () => void;
  /** Draw style */
  style?: {
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWidth?: number;
    pointColor?: string;
    pointRadius?: number;
  };
  /** Enable snapping to existing features */
  snap?: boolean;
  /** Snap tolerance in pixels */
  snapTolerance?: number;
  /** Snap layers */
  snapLayers?: string[];
  /** Enable freehand drawing (hold shift) */
  freehandEnabled?: boolean;
  /** Freehand simplification tolerance */
  freehandTolerance?: number;
  /** Maximum points for polygon/line */
  maxPoints?: number;
  /** Close polygon automatically after max points */
  autoClose?: boolean;
  /** Show measurements while drawing */
  showMeasurements?: boolean;
  /** Measurement units */
  measurementUnits?: 'metric' | 'imperial';
  /** Guide lines */
  showGuides?: boolean;
}

export const DrawInteraction: React.FC<DrawInteractionProps> = ({
  mode,
  onComplete,
  onDraw,
  onCancel,
  style = {
    fillColor: '#3b82f6',
    fillOpacity: 0.3,
    strokeColor: '#3b82f6',
    strokeWidth: 2,
    pointColor: '#3b82f6',
    pointRadius: 6
  },
  snap = false,
  snapTolerance = 10,
  snapLayers = [],
  freehandEnabled = true,
  freehandTolerance = 2,
  maxPoints,
  autoClose = true,
  showMeasurements = false,
  measurementUnits = 'metric',
  showGuides = true
}) => {
  const { map, isLoaded } = useMap();
  const [coordinates, setCoordinates] = useState<number[][]>([]);
  const [currentPosition, setCurrentPosition] = useState<number[] | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFreehand, setIsFreehand] = useState(false);
  const [circleCenter, setCircleCenter] = useState<number[] | null>(null);
  const [rectangleStart, setRectangleStart] = useState<number[] | null>(null);
  
  const sourceId = 'draw-interaction-source';
  const layerId = 'draw-interaction-layer';
  const pointsLayerId = 'draw-interaction-points';
  const guideLayerId = 'draw-interaction-guide';

  // Initialize drawing layers
  useEffect(() => {
    if (!map || !isLoaded) return;

    // Add source
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
    }

    // Add fill layer
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': style.fillColor,
          'fill-opacity': style.fillOpacity
        }
      });
    }

    // Add line layer
    if (!map.getLayer(`${layerId}-line`)) {
      map.addLayer({
        id: `${layerId}-line`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': style.strokeColor,
          'line-width': style.strokeWidth
        }
      });
    }

    // Add points layer
    if (!map.getLayer(pointsLayerId)) {
      map.addLayer({
        id: pointsLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-color': style.pointColor,
          'circle-radius': style.pointRadius,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2
        }
      });
    }

    // Add guide layer
    if (showGuides && !map.getLayer(guideLayerId)) {
      map.addLayer({
        id: guideLayerId,
        type: 'line',
        source: sourceId,
        filter: ['==', ['get', 'type'], 'guide'],
        paint: {
          'line-color': style.strokeColor,
          'line-width': 1,
          'line-dasharray': [4, 4]
        }
      });
    }

    return () => {
      if (map.getLayer(guideLayerId)) map.removeLayer(guideLayerId);
      if (map.getLayer(pointsLayerId)) map.removeLayer(pointsLayerId);
      if (map.getLayer(`${layerId}-line`)) map.removeLayer(`${layerId}-line`);
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, isLoaded, style, showGuides]);

  // Update drawing preview
  const updatePreview = useCallback(() => {
    if (!map || !isLoaded) return;

    const features: GeoJSON.Feature[] = [];

    if (mode === 'point' && currentPosition) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: currentPosition },
        properties: {}
      });
    } else if (mode === 'line' && coordinates.length > 0) {
      const lineCoords = currentPosition 
        ? [...coordinates, currentPosition]
        : coordinates;
      
      if (lineCoords.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: lineCoords },
          properties: {}
        });
      }

      // Add vertex points
      coordinates.forEach(coord => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coord },
          properties: {}
        });
      });
    } else if (mode === 'polygon' && coordinates.length > 0) {
      const polygonCoords = currentPosition
        ? [...coordinates, currentPosition, coordinates[0]]
        : [...coordinates, coordinates[0]];

      if (polygonCoords.length >= 4) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [polygonCoords] },
          properties: {}
        });
      }

      // Add vertex points
      coordinates.forEach(coord => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coord },
          properties: {}
        });
      });

      // Add guide line from last point to first
      if (showGuides && coordinates.length >= 2 && currentPosition) {
        features.push({
          type: 'Feature',
          geometry: { 
            type: 'LineString', 
            coordinates: [currentPosition, coordinates[0]] 
          },
          properties: { type: 'guide' }
        });
      }
    } else if (mode === 'rectangle' && rectangleStart && currentPosition) {
      const [x1, y1] = rectangleStart;
      const [x2, y2] = currentPosition;
      
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [x1, y1],
            [x2, y1],
            [x2, y2],
            [x1, y2],
            [x1, y1]
          ]]
        },
        properties: {}
      });
    } else if (mode === 'circle' && circleCenter && currentPosition) {
      const center = circleCenter;
      const radius = distance(center, currentPosition);
      const circleCoords = createCirclePolygon(center, radius, 64);
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [circleCoords] },
        properties: { radius }
      });
    } else if (mode === 'freehand' && coordinates.length > 1) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coordinates },
        properties: {}
      });
    }

    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({ type: 'FeatureCollection', features });
    }

    onDraw?.(coordinates);
  }, [map, isLoaded, mode, coordinates, currentPosition, rectangleStart, circleCenter, showGuides, onDraw]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  // Snap to nearby features
  const snapToFeatures = useCallback((point: number[]): number[] => {
    if (!snap || !map || snapLayers.length === 0) return point;

    const pixel = map.project(point as [number, number]);
    const bbox: [[number, number], [number, number]] = [
      [pixel.x - snapTolerance, pixel.y - snapTolerance],
      [pixel.x + snapTolerance, pixel.y + snapTolerance]
    ];

    const features = map.queryRenderedFeatures(bbox, { layers: snapLayers });
    
    let closestPoint = point;
    let closestDistance = Infinity;

    features.forEach(feature => {
      const coords = getCoordinates(feature.geometry as GeoJSON.Geometry);
      coords.forEach(coord => {
        const d = distance(point, coord);
        if (d < closestDistance && d < snapTolerance) {
          closestDistance = d;
          closestPoint = coord;
        }
      });
    });

    return closestPoint;
  }, [map, snap, snapLayers, snapTolerance]);

  // Handle click
  const handleClick = useCallback((e: any) => {
    if (!mode) return;

    const coords = snap 
      ? snapToFeatures([e.lngLat.lng, e.lngLat.lat])
      : [e.lngLat.lng, e.lngLat.lat];

    switch (mode) {
      case 'point':
        const pointFeature: GeoJSON.Feature = {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coords },
          properties: {}
        };
        onComplete?.(pointFeature);
        break;

      case 'line':
        setCoordinates(prev => {
          const next = [...prev, coords];
          if (maxPoints && next.length >= maxPoints) {
            // Complete line
            const lineFeature: GeoJSON.Feature = {
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: next },
              properties: {}
            };
            setTimeout(() => {
              onComplete?.(lineFeature);
              setCoordinates([]);
              setIsDrawing(false);
            }, 0);
          }
          return next;
        });
        setIsDrawing(true);
        break;

      case 'polygon':
        setCoordinates(prev => {
          const next = [...prev, coords];
          if (maxPoints && next.length >= maxPoints && autoClose) {
            // Complete polygon
            const polygonFeature: GeoJSON.Feature = {
              type: 'Feature',
              geometry: { type: 'Polygon', coordinates: [[...next, next[0]]] },
              properties: {}
            };
            setTimeout(() => {
              onComplete?.(polygonFeature);
              setCoordinates([]);
              setIsDrawing(false);
            }, 0);
          }
          return next;
        });
        setIsDrawing(true);
        break;

      case 'rectangle':
        if (!rectangleStart) {
          setRectangleStart(coords);
          setIsDrawing(true);
        } else {
          const [x1, y1] = rectangleStart;
          const [x2, y2] = coords;
          const rectFeature: GeoJSON.Feature = {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [x1, y1],
                [x2, y1],
                [x2, y2],
                [x1, y2],
                [x1, y1]
              ]]
            },
            properties: {}
          };
          onComplete?.(rectFeature);
          setRectangleStart(null);
          setIsDrawing(false);
        }
        break;

      case 'circle':
        if (!circleCenter) {
          setCircleCenter(coords);
          setIsDrawing(true);
        } else {
          const radius = distance(circleCenter, coords);
          const circleCoords = createCirclePolygon(circleCenter, radius, 64);
          const circleFeature: GeoJSON.Feature = {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [circleCoords] },
            properties: { radius, center: circleCenter }
          };
          onComplete?.(circleFeature);
          setCircleCenter(null);
          setIsDrawing(false);
        }
        break;
    }
  }, [mode, snap, snapToFeatures, maxPoints, autoClose, rectangleStart, circleCenter, onComplete]);

  // Handle double click (complete polygon/line)
  const handleDoubleClick = useCallback((e: any) => {
    if (!mode || !isDrawing) return;

    e.preventDefault();

    if (mode === 'polygon' && coordinates.length >= 3) {
      const polygonFeature: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[...coordinates, coordinates[0]]] },
        properties: {}
      };
      onComplete?.(polygonFeature);
      setCoordinates([]);
      setIsDrawing(false);
    } else if (mode === 'line' && coordinates.length >= 2) {
      const lineFeature: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coordinates },
        properties: {}
      };
      onComplete?.(lineFeature);
      setCoordinates([]);
      setIsDrawing(false);
    }
  }, [mode, isDrawing, coordinates, onComplete]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: any) => {
    if (!mode) return;

    const coords = snap
      ? snapToFeatures([e.lngLat.lng, e.lngLat.lat])
      : [e.lngLat.lng, e.lngLat.lat];

    setCurrentPosition(coords);

    // Freehand mode
    if (isFreehand && mode === 'freehand') {
      setCoordinates(prev => [...prev, coords]);
    }
  }, [mode, snap, snapToFeatures, isFreehand]);

  // Handle mouse down (for freehand)
  const handleMouseDown = useCallback((e: any) => {
    if (!mode || mode !== 'freehand' || !freehandEnabled) return;

    if (e.originalEvent.shiftKey) {
      setIsFreehand(true);
      setCoordinates([[e.lngLat.lng, e.lngLat.lat]]);
      setIsDrawing(true);
      map?.dragPan.disable();
    }
  }, [mode, freehandEnabled, map]);

  // Handle mouse up (complete freehand)
  const handleMouseUp = useCallback(() => {
    if (isFreehand && mode === 'freehand') {
      if (coordinates.length >= 2) {
        // Simplify the line
        const simplified = simplifyLine(coordinates, freehandTolerance);
        
        const freehandFeature: GeoJSON.Feature = {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: simplified },
          properties: {}
        };
        onComplete?.(freehandFeature);
      }
      
      setIsFreehand(false);
      setCoordinates([]);
      setIsDrawing(false);
      map?.dragPan.enable();
    }
  }, [isFreehand, mode, coordinates, freehandTolerance, map, onComplete]);

  // Handle escape key (cancel drawing)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isDrawing) {
      setCoordinates([]);
      setCurrentPosition(null);
      setRectangleStart(null);
      setCircleCenter(null);
      setIsDrawing(false);
      setIsFreehand(false);
      
      // Clear preview
      const source = map?.getSource(sourceId) as maplibregl.GeoJSONSource;
      if (source) {
        source.setData({ type: 'FeatureCollection', features: [] });
      }
      
      onCancel?.();
    } else if (e.key === 'Backspace' && isDrawing && coordinates.length > 0) {
      // Remove last point
      setCoordinates(prev => prev.slice(0, -1));
    }
  }, [map, isDrawing, coordinates, onCancel]);

  // Setup event listeners
  useEffect(() => {
    if (!map || !isLoaded || !mode) return;

    map.on('click', handleClick);
    map.on('dblclick', handleDoubleClick);
    map.on('mousemove', handleMouseMove);
    map.on('mousedown', handleMouseDown);
    map.on('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);

    // Set cursor
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', handleClick);
      map.off('dblclick', handleDoubleClick);
      map.off('mousemove', handleMouseMove);
      map.off('mousedown', handleMouseDown);
      map.off('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      
      map.getCanvas().style.cursor = '';
      map.dragPan.enable();
    };
  }, [map, isLoaded, mode, handleClick, handleDoubleClick, handleMouseMove, handleMouseDown, handleMouseUp, handleKeyDown]);

  // Reset when mode changes
  useEffect(() => {
    setCoordinates([]);
    setCurrentPosition(null);
    setRectangleStart(null);
    setCircleCenter(null);
    setIsDrawing(false);
    setIsFreehand(false);
  }, [mode]);

  return null;
};

// Helper functions
function distance(a: number[], b: number[]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function createCirclePolygon(center: number[], radius: number, steps: number): number[][] {
  const coords: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    coords.push([
      center[0] + radius * Math.cos(angle),
      center[1] + radius * Math.sin(angle)
    ]);
  }
  return coords;
}

function getCoordinates(geometry: GeoJSON.Geometry): number[][] {
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

function simplifyLine(coords: number[][], tolerance: number): number[][] {
  if (coords.length <= 2) return coords;
  
  // Douglas-Peucker simplification
  const sqTolerance = tolerance * tolerance;
  
  function simplifyDPStep(
    points: number[][],
    first: number,
    last: number,
    sqTolerance: number,
    simplified: number[][]
  ): void {
    let maxSqDist = sqTolerance;
    let index = 0;

    for (let i = first + 1; i < last; i++) {
      const sqDist = getSqSegDist(points[i], points[first], points[last]);
      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }

    if (maxSqDist > sqTolerance) {
      if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
      simplified.push(points[index]);
      if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
    }
  }

  function getSqSegDist(p: number[], p1: number[], p2: number[]): number {
    let x = p1[0];
    let y = p1[1];
    let dx = p2[0] - x;
    let dy = p2[1] - y;

    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = p2[0];
        y = p2[1];
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }

    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
  }

  const simplified = [coords[0]];
  simplifyDPStep(coords, 0, coords.length - 1, sqTolerance, simplified);
  simplified.push(coords[coords.length - 1]);

  return simplified;
}