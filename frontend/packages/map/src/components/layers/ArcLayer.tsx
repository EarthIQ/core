import React, { useEffect, useId, useState, useCallback } from 'react';
import { useMap } from '../../hooks/useMap';
import { ArcLayer as DeckArcLayer } from '@deck.gl/layers';
import type { GeoJSON } from 'geojson';

export interface ArcData {
  source: [number, number];
  target: [number, number];
  sourceColor?: [number, number, number, number];
  targetColor?: [number, number, number, number];
  width?: number;
  height?: number;
  [key: string]: any;
}

export interface ArcLayerProps {
  /** Unique layer ID */
  id?: string;
  /** Arc data array or GeoJSON LineStrings */
  data: ArcData[] | GeoJSON.FeatureCollection<GeoJSON.LineString> | string;
  /** Get source position */
  getSourcePosition?: (d: any) => [number, number];
  /** Get target position */
  getTargetPosition?: (d: any) => [number, number];
  /** Get source color */
  getSourceColor?: [number, number, number, number] | ((d: any) => [number, number, number, number]);
  /** Get target color */
  getTargetColor?: [number, number, number, number] | ((d: any) => [number, number, number, number]);
  /** Get width */
  getWidth?: number | ((d: any) => number);
  /** Get height (arc curve height) */
  getHeight?: number | ((d: any) => number);
  /** Get tilt */
  getTilt?: number | ((d: any) => number);
  /** Great circle arcs */
  greatCircle?: boolean;
  /** Number of segments per arc */
  numSegments?: number;
  /** Width units */
  widthUnits?: 'pixels' | 'meters' | 'common';
  /** Width scale */
  widthScale?: number;
  /** Width min pixels */
  widthMinPixels?: number;
  /** Width max pixels */
  widthMaxPixels?: number;
  /** Opacity */
  opacity?: number;
  /** Visibility */
  visible?: boolean;
  /** Pickable */
  pickable?: boolean;
  /** Click handler */
  onClick?: (info: any) => void;
  /** Hover handler */
  onHover?: (info: any) => void;
  /** Use Deck.gl */
  useDeckGL?: boolean;
  /** Animate arcs */
  animated?: boolean;
  /** Animation speed */
  animationSpeed?: number;
}

export const ArcLayer: React.FC<ArcLayerProps> = ({
  id: propId,
  data,
  getSourcePosition = (d: ArcData) => d.source,
  getTargetPosition = (d: ArcData) => d.target,
  getSourceColor = [0, 128, 255, 255],
  getTargetColor = [255, 0, 128, 255],
  getWidth = 1,
  getHeight = 1,
  getTilt = 0,
  greatCircle = true,
  numSegments = 50,
  widthUnits = 'pixels',
  widthScale = 1,
  widthMinPixels = 1,
  widthMaxPixels = 100,
  opacity = 0.8,
  visible = true,
  pickable = true,
  onClick,
  onHover,
  useDeckGL = true,
  animated = false,
  animationSpeed = 1
}) => {
  const { map, deck, isLoaded } = useMap();
  const autoId = useId();
  const id = propId || `arc-layer-${autoId}`;
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [animationTime, setAnimationTime] = useState(0);

  // Process data
  useEffect(() => {
    const process = async () => {
      let rawData: any[];

      if (typeof data === 'string') {
        try {
          const response = await fetch(data);
          const json = await response.json();
          rawData = json.type === 'FeatureCollection' ? json.features : json;
        } catch (error) {
          console.error('Failed to fetch arc layer data:', error);
          return;
        }
      } else if ((data as GeoJSON.FeatureCollection).type === 'FeatureCollection') {
        // Convert LineStrings to arc data
        rawData = (data as GeoJSON.FeatureCollection<GeoJSON.LineString>).features.map(f => ({
          source: f.geometry.coordinates[0] as [number, number],
          target: f.geometry.coordinates[f.geometry.coordinates.length - 1] as [number, number],
          ...f.properties
        }));
      } else {
        rawData = data as ArcData[];
      }

      setProcessedData(rawData);
    };

    process();
  }, [data]);

  // Animation loop
  useEffect(() => {
    if (!animated || !visible) return;

    let animationFrame: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      
      setAnimationTime(prev => (prev + delta * animationSpeed * 0.001) % 1);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [animated, visible, animationSpeed]);

  // Deck.gl rendering
  useEffect(() => {
    if (!useDeckGL || !deck || !visible || processedData.length === 0) return;

    const arcLayer = new DeckArcLayer({
      id,
      data: processedData,
      getSourcePosition,
      getTargetPosition,
      getSourceColor: typeof getSourceColor === 'function' ? getSourceColor : () => getSourceColor,
      getTargetColor: typeof getTargetColor === 'function' ? getTargetColor : () => getTargetColor,
      getWidth: typeof getWidth === 'function' ? getWidth : () => getWidth,
      getHeight: typeof getHeight === 'function' ? getHeight : () => getHeight,
      getTilt: typeof getTilt === 'function' ? getTilt : () => getTilt,
      greatCircle,
      numSegments,
      widthUnits,
      widthScale,
      widthMinPixels,
      widthMaxPixels,
      opacity,
      visible,
      pickable,
      onClick: pickable ? onClick : undefined,
      onHover: pickable ? onHover : undefined,
      updateTriggers: {
        getSourceColor,
        getTargetColor,
        getWidth,
        getHeight
      }
    });

    const currentLayers = deck.props.layers || [];
    const filteredLayers = currentLayers.filter((l: any) => l.id !== id);
    deck.setProps({ layers: [...filteredLayers, arcLayer] });

    return () => {
      const layers = deck.props.layers || [];
      deck.setProps({
        layers: layers.filter((l: any) => l.id !== id)
      });
    };
  }, [
    deck, useDeckGL, visible, processedData, id, 
    getSourcePosition, getTargetPosition, getSourceColor, getTargetColor,
    getWidth, getHeight, getTilt, greatCircle, numSegments,
    widthUnits, widthScale, widthMinPixels, widthMaxPixels,
    opacity, pickable, onClick, onHover
  ]);

  // Native MapLibre fallback (simplified - draws straight lines)
  useEffect(() => {
    if (useDeckGL || !map || !isLoaded || processedData.length === 0) return;

    const sourceId = `${id}-source`;

    // Convert arcs to LineStrings
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: processedData.map((arc, index) => {
        const source = getSourcePosition(arc);
        const target = getTargetPosition(arc);
        
        // Generate curved path
        const points = generateArcPoints(source, target, numSegments, greatCircle);
        
        return {
          type: 'Feature',
          id: index,
          geometry: {
            type: 'LineString',
            coordinates: points
          },
          properties: arc
        };
      })
    };

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojson
      });
    } else {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
    }

    if (!map.getLayer(id)) {
      map.addLayer({
        id,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': Array.isArray(getSourceColor) 
            ? `rgba(${getSourceColor.join(',')})` 
            : '#0080ff',
          'line-width': typeof getWidth === 'number' ? getWidth : 2,
          'line-opacity': opacity
        },
        layout: {
          visibility: visible ? 'visible' : 'none',
          'line-cap': 'round',
          'line-join': 'round'
        }
      });
    }

    return () => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, isLoaded, useDeckGL, processedData, id, getSourcePosition, getTargetPosition, numSegments, greatCircle, getSourceColor, getWidth, opacity, visible]);

  return null;
};

// Generate arc points for native rendering
function generateArcPoints(
  source: [number, number],
  target: [number, number],
  numSegments: number,
  greatCircle: boolean
): number[][] {
  const points: number[][] = [];
  
  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    
    if (greatCircle) {
      // Great circle interpolation
      const point = interpolateGreatCircle(source, target, t);
      points.push(point);
    } else {
      // Simple linear interpolation with height
      const lng = source[0] + (target[0] - source[0]) * t;
      const lat = source[1] + (target[1] - source[1]) * t;
      points.push([lng, lat]);
    }
  }
  
  return points;
}

function interpolateGreatCircle(
  source: [number, number],
  target: [number, number],
  t: number
): [number, number] {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const toDeg = (rad: number) => rad * 180 / Math.PI;
  
  const lat1 = toRad(source[1]);
  const lng1 = toRad(source[0]);
  const lat2 = toRad(target[1]);
  const lng2 = toRad(target[0]);
  
  const d = 2 * Math.asin(Math.sqrt(
    Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lng1 - lng2) / 2), 2)
  ));
  
  if (d === 0) return source;
  
  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);
  
  const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
  const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
  const z = A * Math.sin(lat1) + B * Math.sin(lat2);
  
  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lng = Math.atan2(y, x);
  
  return [toDeg(lng), toDeg(lat)];
}