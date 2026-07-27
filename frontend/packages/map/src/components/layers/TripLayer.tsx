import React, { useEffect, useId, useState, useRef, useCallback } from 'react';
import { useMap } from '../../hooks/useMap';
import { TripsLayer } from '@deck.gl/geo-layers';
import type { GeoJSON } from 'geojson';

export interface TripData {
  path: [number, number, number][]; // [lng, lat, timestamp]
  timestamps?: number[];
  color?: [number, number, number, number];
  [key: string]: any;
}

export interface TripLayerProps {
  /** Unique layer ID */
  id?: string;
  /** Trip data */
  data: TripData[] | GeoJSON.FeatureCollection<GeoJSON.LineString> | string;
  /** Get path accessor */
  getPath?: (d: any) => [number, number, number][] | [number, number][];
  /** Get timestamps accessor */
  getTimestamps?: (d: any) => number[];
  /** Get color accessor */
  getColor?: [number, number, number, number] | ((d: any) => [number, number, number, number]);
  /** Get width accessor */
  getWidth?: number | ((d: any) => number);
  /** Current time for animation */
  currentTime?: number;
  /** Trail length */
  trailLength?: number;
  /** Width units */
  widthUnits?: 'pixels' | 'meters' | 'common';
  /** Width scale */
  widthScale?: number;
  /** Width min pixels */
  widthMinPixels?: number;
  /** Width max pixels */
  widthMaxPixels?: number;
  /** Rounded caps */
  capRounded?: boolean;
  /** Rounded joints */
  jointRounded?: boolean;
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
  /** Loop animation */
  loop?: boolean;
  /** Animation speed multiplier */
  speed?: number;
  /** Auto-play animation */
  autoPlay?: boolean;
  /** Animation duration (if not using timestamps) */
  duration?: number;
  /** Callback on animation time change */
  onTimeChange?: (time: number) => void;
  /** Fade trail */
  fadeTrail?: boolean;
}

export const TripLayer: React.FC<TripLayerProps> = ({
  id: propId,
  data,
  getPath = (d: TripData) => d.path,
  getTimestamps = (d: TripData) => d.timestamps || d.path.map((p: any) => p[2]),
  getColor = [253, 128, 93, 255],
  getWidth = 3,
  currentTime: propCurrentTime,
  trailLength = 180,
  widthUnits = 'pixels',
  widthScale = 1,
  widthMinPixels = 1,
  widthMaxPixels = 10,
  capRounded = true,
  jointRounded = true,
  opacity = 0.8,
  visible = true,
  pickable = true,
  onClick,
  onHover,
  loop = true,
  speed = 1,
  autoPlay = true,
  duration = 30000,
  onTimeChange,
  fadeTrail = true
}) => {
  const { map, deck, isLoaded } = useMap();
  const autoId = useId();
  const id = propId || `trip-layer-${autoId}`;
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [animationTime, setAnimationTime] = useState(0);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, duration]);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const currentTime = propCurrentTime ?? animationTime;

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
          console.error('Failed to fetch trip layer data:', error);
          return;
        }
      } else if ((data as GeoJSON.FeatureCollection).type === 'FeatureCollection') {
        rawData = (data as GeoJSON.FeatureCollection<GeoJSON.LineString>).features.map(f => ({
          path: f.geometry.coordinates,
          ...f.properties
        }));
      } else {
        rawData = data as TripData[];
      }

      // Calculate time range from data
      let minTime = Infinity;
      let maxTime = -Infinity;

      rawData.forEach(d => {
        const timestamps = getTimestamps(d);
        if (timestamps && timestamps.length > 0) {
          minTime = Math.min(minTime, Math.min(...timestamps));
          maxTime = Math.max(maxTime, Math.max(...timestamps));
        }
      });

      if (minTime !== Infinity && maxTime !== -Infinity) {
        setTimeRange([minTime, maxTime]);
      }

      setProcessedData(rawData);
    };

    process();
  }, [data, getTimestamps]);

  // Animation loop
  useEffect(() => {
    if (!autoPlay || !visible || propCurrentTime !== undefined) return;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      setAnimationTime(prev => {
        let next = prev + delta * speed;
        
        if (next > timeRange[1]) {
          if (loop) {
            next = timeRange[0];
          } else {
            next = timeRange[1];
          }
        }
        
        onTimeChange?.(next);
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [autoPlay, visible, propCurrentTime, loop, speed, timeRange, onTimeChange]);

  // Deck.gl rendering
  useEffect(() => {
    if (!deck || !visible || processedData.length === 0) return;

    const tripLayer = new TripsLayer({
      id,
      data: processedData,
      getPath: (d: any) => {
        const path = getPath(d);
        // Ensure path has timestamps
        if (path.length > 0 && path[0].length === 2) {
          const timestamps = getTimestamps(d);
          return path.map((p, i) => [...p, timestamps?.[i] || i]);
        }
        return path;
      },
      getTimestamps,
      getColor: typeof getColor === 'function' ? getColor : () => getColor,
      getWidth: typeof getWidth === 'function' ? getWidth : () => getWidth,
      currentTime,
      trailLength,
      widthUnits,
      widthScale,
      widthMinPixels,
      widthMaxPixels,
      capRounded,
      jointRounded,
      opacity,
      visible,
      pickable,
      onClick: pickable ? onClick : undefined,
      onHover: pickable ? onHover : undefined,
      fadeTrail,
      updateTriggers: {
        getColor,
        getWidth
      }
    });

    const currentLayers = deck.props.layers || [];
    const filteredLayers = currentLayers.filter((l: any) => l.id !== id);
    deck.setProps({ layers: [...filteredLayers, tripLayer] });

    return () => {
      const layers = deck.props.layers || [];
      deck.setProps({
        layers: layers.filter((l: any) => l.id !== id)
      });
    };
  }, [
    deck, visible, processedData, id, currentTime, trailLength,
    getPath, getTimestamps, getColor, getWidth,
    widthUnits, widthScale, widthMinPixels, widthMaxPixels,
    capRounded, jointRounded, opacity, pickable, onClick, onHover, fadeTrail
  ]);

  return null;
};

// Hook for trip layer control
export const useTripAnimation = (options: {
  duration?: number;
  speed?: number;
  loop?: boolean;
} = {}) => {
  const { duration = 30000, speed = 1, loop = true } = options;
  
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, duration]);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(timeRange[0]);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [timeRange]);

  const seek = useCallback((time: number) => {
    setCurrentTime(Math.max(timeRange[0], Math.min(timeRange[1], time)));
  }, [timeRange]);

  useEffect(() => {
    if (!isPlaying) return;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      setCurrentTime(prev => {
        let next = prev + delta * speed;
        
        if (next > timeRange[1]) {
          if (loop) {
            next = timeRange[0];
          } else {
            setIsPlaying(false);
            return timeRange[1];
          }
        }
        
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, speed, loop, timeRange]);

  return {
    currentTime,
    isPlaying,
    timeRange,
    setTimeRange,
    play,
    pause,
    stop,
    seek
  };
};