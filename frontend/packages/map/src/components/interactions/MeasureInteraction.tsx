import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMap } from '../../hooks/useMap';
import * as turf from '@turf/turf';
import type { GeoJSON } from 'geojson';

export type MeasureMode = 'distance' | 'area' | 'radius' | 'angle' | null;

export interface MeasureResult {
  type: MeasureMode;
  value: number;
  unit: string;
  formattedValue: string;
  geometry: GeoJSON.Geometry;
  points: number[][];
  segments?: { distance: number; bearing: number }[];
}

export interface MeasureInteractionProps {
  /** Measurement mode */
  mode: MeasureMode;
  /** Callback when measurement is complete */
  onComplete?: (result: MeasureResult) => void;
  /** Callback during measurement (for live updates) */
  onMeasure?: (result: MeasureResult) => void;
  /** Callback when measurement is cancelled */
  onCancel?: () => void;
  /** Unit system */
  units?: 'metric' | 'imperial';
  /** Draw style */
  style?: {
    lineColor?: string;
    lineWidth?: number;
    fillColor?: string;
    fillOpacity?: number;
    pointColor?: string;
    pointRadius?: number;
    labelColor?: string;
    labelSize?: number;
  };
  /** Show segment measurements */
  showSegments?: boolean;
  /** Show total measurement */
  showTotal?: boolean;
  /** Show bearing for each segment */
  showBearing?: boolean;
  /** Snap to features */
  snap?: boolean;
  /** Snap layers */
  snapLayers?: string[];
  /** Snap tolerance */
  snapTolerance?: number;
  /** Allow multiple measurements */
  persistent?: boolean;
  /** Stored measurements */
  measurements?: MeasureResult[];
  /** Callback to update stored measurements */
  onMeasurementsChange?: (measurements: MeasureResult[]) => void;
}

export const MeasureInteraction: React.FC<MeasureInteractionProps> = ({
  mode,
  onComplete,
  onMeasure,
  onCancel,
  units = 'metric',
  style = {
    lineColor: '#3b82f6',
    lineWidth: 3,
    fillColor: '#3b82f6',
    fillOpacity: 0.2,
    pointColor: '#3b82f6',
    pointRadius: 6,
    labelColor: '#000000',
    labelSize: 12
  },
  showSegments = true,
  showTotal = true,
  showBearing = false,
  snap = false,
  snapLayers = [],
  snapTolerance = 10,
  persistent = false,
  measurements = [],
  onMeasurementsChange
}) => {
  const { map, isLoaded } = useMap();
  const [points, setPoints] = useState<number[][]>([]);
  const [currentPosition, setCurrentPosition] = useState<number[] | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [circleCenter, setCircleCenter] = useState<number[] | null>(null);

  const sourceId = 'measure-interaction-source';
  const lineLayerId = 'measure-interaction-line';
  const fillLayerId = 'measure-interaction-fill';
  const pointLayerId = 'measure-interaction-points';
  const labelLayerId = 'measure-interaction-labels';

  // Format distance
  const formatDistance = useCallback((meters: number): { value: number; unit: string; formatted: string } => {
    if (units === 'metric') {
      if (meters < 1000) {
        return { value: meters, unit: 'm', formatted: `${meters.toFixed(1)} m` };
      }
      const km = meters / 1000;
      return { value: km, unit: 'km', formatted: `${km.toFixed(2)} km` };
    } else {
      const feet = meters * 3.28084;
      if (feet < 5280) {
        return { value: feet, unit: 'ft', formatted: `${feet.toFixed(1)} ft` };
      }
      const miles = feet / 5280;
      return { value: miles, unit: 'mi', formatted: `${miles.toFixed(2)} mi` };
    }
  }, [units]);

  // Format area
  const formatArea = useCallback((sqMeters: number): { value: number; unit: string; formatted: string } => {
    if (units === 'metric') {
      if (sqMeters < 10000) {
        return { value: sqMeters, unit: 'm²', formatted: `${sqMeters.toFixed(1)} m²` };
      }
      if (sqMeters < 1000000) {
        const ha = sqMeters / 10000;
        return { value: ha, unit: 'ha', formatted: `${ha.toFixed(2)} ha` };
      }
      const sqKm = sqMeters / 1000000;
      return { value: sqKm, unit: 'km²', formatted: `${sqKm.toFixed(2)} km²` };
    } else {
      const sqFeet = sqMeters * 10.7639;
      if (sqFeet < 43560) {
        return { value: sqFeet, unit: 'ft²', formatted: `${sqFeet.toFixed(1)} ft²` };
      }
      const acres = sqFeet / 43560;
      return { value: acres, unit: 'acres', formatted: `${acres.toFixed(2)} acres` };
    }
  }, [units]);

  // Calculate measurement
  const calculateMeasurement = useCallback((): MeasureResult | null => {
    const allPoints = currentPosition ? [...points, currentPosition] : points;
    
    if (mode === 'distance') {
      if (allPoints.length < 2) return null;

      const line = turf.lineString(allPoints);
      const totalDistance = turf.length(line, { units: 'meters' });
      const formatted = formatDistance(totalDistance);

      // Calculate segments
      const segments: { distance: number; bearing: number }[] = [];
      for (let i = 0; i < allPoints.length - 1; i++) {
        const segmentLine = turf.lineString([allPoints[i], allPoints[i + 1]]);
        const distance = turf.length(segmentLine, { units: 'meters' });
        const bearing = turf.bearing(turf.point(allPoints[i]), turf.point(allPoints[i + 1]));
        segments.push({ distance, bearing });
      }

      return {
        type: 'distance',
        value: formatted.value,
        unit: formatted.unit,
        formattedValue: formatted.formatted,
        geometry: line.geometry,
        points: allPoints,
        segments
      };
    } else if (mode === 'area') {
      if (allPoints.length < 3) return null;

      const closedPoints = [...allPoints, allPoints[0]];
      const polygon = turf.polygon([closedPoints]);
      const area = turf.area(polygon);
      const formatted = formatArea(area);

      // Calculate perimeter
      const perimeter = turf.length(turf.lineString(closedPoints), { units: 'meters' });

      return {
        type: 'area',
        value: formatted.value,
        unit: formatted.unit,
        formattedValue: `${formatted.formatted} (perimeter: ${formatDistance(perimeter).formatted})`,
        geometry: polygon.geometry,
        points: allPoints
      };
    } else if (mode === 'radius') {
      if (!circleCenter || !currentPosition) return null;

      const center = turf.point(circleCenter);
      const edge = turf.point(currentPosition);
      const radius = turf.distance(center, edge, { units: 'meters' });
      const formatted = formatDistance(radius);

      // Create circle polygon
      const circle = turf.circle(center, radius, { units: 'meters', steps: 64 });
      const area = turf.area(circle);

      return {
        type: 'radius',
        value: formatted.value,
        unit: formatted.unit,
        formattedValue: `Radius: ${formatted.formatted}, Area: ${formatArea(area).formatted}`,
        geometry: circle.geometry,
        points: [circleCenter, currentPosition]
      };
    } else if (mode === 'angle') {
      if (allPoints.length < 3) return null;

      // Calculate angle at middle point
      const [p1, vertex, p2] = allPoints.slice(-3);
      const bearing1 = turf.bearing(turf.point(vertex), turf.point(p1));
      const bearing2 = turf.bearing(turf.point(vertex), turf.point(p2));
      
      let angle = Math.abs(bearing2 - bearing1);
      if (angle > 180) angle = 360 - angle;

      return {
        type: 'angle',
        value: angle,
        unit: '°',
        formattedValue: `${angle.toFixed(1)}°`,
        geometry: { type: 'LineString', coordinates: allPoints },
        points: allPoints
      };
    }

    return null;
  }, [mode, points, currentPosition, circleCenter, formatDistance, formatArea]);

  // Initialize layers
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
    }

    // Fill layer
    if (!map.getLayer(fillLayerId)) {
      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': style.fillColor,
          'fill-opacity': style.fillOpacity
        }
      });
    }

    // Line layer
    if (!map.getLayer(lineLayerId)) {
      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': style.lineColor,
          'line-width': style.lineWidth
        }
      });
    }

    // Points layer
    if (!map.getLayer(pointLayerId)) {
      map.addLayer({
        id: pointLayerId,
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

    // Labels layer
    if (!map.getLayer(labelLayerId)) {
      map.addLayer({
        id: labelLayerId,
        type: 'symbol',
        source: sourceId,
        filter: ['has', 'label'],
        layout: {
          'text-field': ['get', 'label'],
          'text-size': style.labelSize,
          'text-offset': [0, -1.5],
          'text-anchor': 'bottom'
        },
        paint: {
          'text-color': style.labelColor,
          'text-halo-color': '#ffffff',
          'text-halo-width': 2
        }
      });
    }

    return () => {
      if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
      if (map.getLayer(pointLayerId)) map.removeLayer(pointLayerId);
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, isLoaded, style]);

  // Update preview
  const updatePreview = useCallback(() => {
    if (!map || !isLoaded) return;

    const features: GeoJSON.Feature[] = [];
    const result = calculateMeasurement();

    if (result) {
      // Add main geometry
      features.push({
        type: 'Feature',
        geometry: result.geometry,
        properties: {}
      });

      // Add points
      result.points.forEach((point, index) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: point },
          properties: { index }
        });
      });

      // Add segment labels
      if (showSegments && result.segments && mode === 'distance') {
        result.segments.forEach((segment, index) => {
          const midpoint = [
            (result.points[index][0] + result.points[index + 1][0]) / 2,
            (result.points[index][1] + result.points[index + 1][1]) / 2
          ];
          
          let label = formatDistance(segment.distance).formatted;
          if (showBearing) {
            label += ` (${segment.bearing.toFixed(0)}°)`;
          }

          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: midpoint },
            properties: { label }
          });
        });
      }

      // Add total label
      if (showTotal && result.points.length > 0) {
        const lastPoint = result.points[result.points.length - 1];
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: lastPoint },
          properties: { label: result.formattedValue }
        });
      }

      onMeasure?.(result);
    }

    // Add persistent measurements
    measurements.forEach(measurement => {
      features.push({
        type: 'Feature',
        geometry: measurement.geometry,
        properties: {}
      });
    });

    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({ type: 'FeatureCollection', features });
    }
  }, [map, isLoaded, calculateMeasurement, measurements, showSegments, showTotal, showBearing, formatDistance, mode, onMeasure]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  // Handle click
  const handleClick = useCallback((e: any) => {
    if (!mode) return;

    let coords = [e.lngLat.lng, e.lngLat.lat];

    // Apply snapping
    if (snap && snapLayers.length > 0 && map) {
      coords = findSnapPoint(map, e.point, snapLayers, snapTolerance) || coords;
    }

    if (mode === 'radius') {
      if (!circleCenter) {
        setCircleCenter(coords);
        setIsDrawing(true);
      } else {
        // Complete radius measurement
        const result = calculateMeasurement();
        if (result) {
          onComplete?.(result);
          
          if (persistent) {
            onMeasurementsChange?.([...measurements, result]);
          }
        }
        
        setCircleCenter(null);
        setCurrentPosition(null);
        setIsDrawing(false);
      }
    } else {
      setPoints(prev => [...prev, coords]);
      setIsDrawing(true);
    }
  }, [mode, circleCenter, snap, snapLayers, snapTolerance, map, calculateMeasurement, onComplete, persistent, measurements, onMeasurementsChange]);

  // Handle double click (complete measurement)
  const handleDoubleClick = useCallback((e: any) => {
    if (!mode || !isDrawing) return;
    
    e.preventDefault();

    const result = calculateMeasurement();
    
    if (result) {
      onComplete?.(result);
      
      if (persistent) {
        onMeasurementsChange?.([...measurements, result]);
      }
    }

    // Reset
    setPoints([]);
    setCurrentPosition(null);
    setIsDrawing(false);
  }, [mode, isDrawing, calculateMeasurement, onComplete, persistent, measurements, onMeasurementsChange]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: any) => {
    if (!mode || (!isDrawing && mode !== 'radius' && points.length === 0)) return;

    let coords = [e.lngLat.lng, e.lngLat.lat];

    // Apply snapping
    if (snap && snapLayers.length > 0 && map) {
      coords = findSnapPoint(map, e.point, snapLayers, snapTolerance) || coords;
    }

    setCurrentPosition(coords);
  }, [mode, isDrawing, points.length, snap, snapLayers, snapTolerance, map]);

  // Handle keyboard
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setPoints([]);
      setCurrentPosition(null);
      setCircleCenter(null);
      setIsDrawing(false);
      onCancel?.();
    } else if (e.key === 'Enter' && isDrawing) {
      const result = calculateMeasurement();
      if (result) {
        onComplete?.(result);
        
        if (persistent) {
          onMeasurementsChange?.([...measurements, result]);
        }
      }
      
      setPoints([]);
      setCurrentPosition(null);
      setIsDrawing(false);
    } else if (e.key === 'Backspace' && points.length > 0) {
      setPoints(prev => prev.slice(0, -1));
    }
  }, [isDrawing, calculateMeasurement, onComplete, onCancel, persistent, measurements, onMeasurementsChange, points.length]);

  // Setup event listeners
  useEffect(() => {
    if (!map || !isLoaded || !mode) return;

    map.on('click', handleClick);
    map.on('dblclick', handleDoubleClick);
    map.on('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);

    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', handleClick);
      map.off('dblclick', handleDoubleClick);
      map.off('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      
      map.getCanvas().style.cursor = '';
    };
  }, [map, isLoaded, mode, handleClick, handleDoubleClick, handleMouseMove, handleKeyDown]);

  // Reset when mode changes
  useEffect(() => {
    setPoints([]);
    setCurrentPosition(null);
    setCircleCenter(null);
    setIsDrawing(false);
  }, [mode]);

  return null;
};

// Helper function
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

// Hook for programmatic measure access
export const useMeasure = () => {
  const [measurements, setMeasurements] = useState<MeasureResult[]>([]);

  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
  }, []);

  const removeMeasurement = useCallback((index: number) => {
    setMeasurements(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    measurements,
    setMeasurements,
    clearMeasurements,
    removeMeasurement
  };
};