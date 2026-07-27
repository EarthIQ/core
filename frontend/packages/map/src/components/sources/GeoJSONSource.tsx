import React, { useEffect, useCallback, useRef } from 'react';
import { useMap } from '../../hooks/useMap';
import type { GeoJSON } from 'geojson';

export interface GeoJSONSourceProps {
  /** Unique source ID */
  id: string;
  /** GeoJSON data or URL */
  data: GeoJSON.GeoJSON | string;
  /** Generate unique IDs for features */
  generateId?: boolean;
  /** Property to use as feature ID */
  promoteId?: string | { [key: string]: string };
  /** Maximum zoom level for tiling */
  maxzoom?: number;
  /** Attribution text */
  attribution?: string;
  /** Buffer size for tiles (in pixels) */
  buffer?: number;
  /** Tolerance for simplification (higher = simpler) */
  tolerance?: number;
  /** Enable clustering */
  cluster?: boolean;
  /** Cluster radius in pixels */
  clusterRadius?: number;
  /** Maximum zoom to cluster points */
  clusterMaxZoom?: number;
  /** Minimum points to form a cluster */
  clusterMinPoints?: number;
  /** Cluster aggregation properties */
  clusterProperties?: { [key: string]: any };
  /** Enable line metrics for gradient lines */
  lineMetrics?: boolean;
  /** Filter expression */
  filter?: any[];
  /** Auto-refresh interval in ms */
  refreshInterval?: number;
  /** Callback when data is loaded */
  onLoad?: (source: maplibregl.GeoJSONSource) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Callback when data changes */
  onDataChange?: (data: GeoJSON.GeoJSON) => void;
  /** Children (layers) */
  children?: React.ReactNode;
}

export const GeoJSONSource: React.FC<GeoJSONSourceProps> = ({
  id,
  data,
  generateId = true,
  promoteId,
  maxzoom = 18,
  attribution,
  buffer = 128,
  tolerance = 0.375,
  cluster = false,
  clusterRadius = 50,
  clusterMaxZoom = 14,
  clusterMinPoints = 2,
  clusterProperties,
  lineMetrics = false,
  filter,
  refreshInterval,
  onLoad,
  onError,
  onDataChange,
  children
}) => {
  const { map, isLoaded } = useMap();
  const refreshTimerRef = useRef<NodeJS.Timeout>();
  const previousDataRef = useRef<string>('');

  // Fetch data if URL provided
  const fetchData = useCallback(async (url: string): Promise<GeoJSON.GeoJSON> => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch GeoJSON: ${response.status} ${response.statusText}`);
      }
      const json = await response.json();
      return json;
    } catch (error) {
      onError?.(error as Error);
      throw error;
    }
  }, [onError]);

  // Initialize source
  useEffect(() => {
    if (!map || !isLoaded) return;

    const initSource = async () => {
      try {
        let sourceData: GeoJSON.GeoJSON | string = data;

        // If data is a URL, we can pass it directly to MapLibre
        // MapLibre will handle fetching
        if (typeof data === 'string' && !data.startsWith('{')) {
          sourceData = data;
        }

        // Add source if it doesn't exist
        if (!map.getSource(id)) {
          map.addSource(id, {
            type: 'geojson',
            data: sourceData,
            generateId,
            promoteId,
            maxzoom,
            attribution,
            buffer,
            tolerance,
            cluster,
            clusterRadius,
            clusterMaxZoom,
            clusterMinPoints,
            clusterProperties,
            lineMetrics
          });

          const source = map.getSource(id) as maplibregl.GeoJSONSource;
          onLoad?.(source);
        }
      } catch (error) {
        onError?.(error as Error);
      }
    };

    initSource();

    return () => {
      // Clean up source when component unmounts
      // Note: Layers using this source must be removed first
      if (map.getSource(id)) {
        // Get all layers using this source
        const style = map.getStyle();
        const layersToRemove = style?.layers?.filter(
          (layer: any) => layer.source === id
        ) || [];

        // Remove layers first
        layersToRemove.forEach((layer: any) => {
          if (map.getLayer(layer.id)) {
            map.removeLayer(layer.id);
          }
        });

        // Then remove source
        map.removeSource(id);
      }
    };
  }, [map, isLoaded, id]);

  // Update data when it changes
  useEffect(() => {
    if (!map || !isLoaded || !map.getSource(id)) return;

    const updateData = async () => {
      try {
        let newData: GeoJSON.GeoJSON;

        if (typeof data === 'string') {
          if (data.startsWith('{') || data.startsWith('[')) {
            // It's a JSON string
            newData = JSON.parse(data);
          } else {
            // It's a URL
            newData = await fetchData(data);
          }
        } else {
          newData = data;
        }

        // Check if data actually changed
        const dataString = JSON.stringify(newData);
        if (dataString === previousDataRef.current) {
          return;
        }
        previousDataRef.current = dataString;

        const source = map.getSource(id) as maplibregl.GeoJSONSource;
        if (source) {
          source.setData(newData);
          onDataChange?.(newData);
        }
      } catch (error) {
        onError?.(error as Error);
      }
    };

    updateData();
  }, [map, isLoaded, id, data, fetchData, onDataChange, onError]);

  // Set up auto-refresh
  useEffect(() => {
    if (!refreshInterval || typeof data !== 'string' || !map || !isLoaded) return;

    const refresh = async () => {
      try {
        const newData = await fetchData(data);
        const source = map.getSource(id) as maplibregl.GeoJSONSource;
        if (source) {
          source.setData(newData);
          onDataChange?.(newData);
        }
      } catch (error) {
        // Error already handled in fetchData
      }
    };

    refreshTimerRef.current = setInterval(refresh, refreshInterval);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [map, isLoaded, id, data, refreshInterval, fetchData, onDataChange]);

  // Render children (layers)
  return <>{children}</>;
};

// Hook to access GeoJSON source
export const useGeoJSONSource = (id: string) => {
  const { map, isLoaded } = useMap();

  const getSource = useCallback(() => {
    if (!map || !isLoaded) return null;
    return map.getSource(id) as maplibregl.GeoJSONSource | undefined;
  }, [map, isLoaded, id]);

  const setData = useCallback((data: GeoJSON.GeoJSON | string) => {
    const source = getSource();
    if (source) {
      source.setData(data);
    }
  }, [getSource]);

  const getClusterExpansionZoom = useCallback((clusterId: number): Promise<number> => {
    return new Promise((resolve, reject) => {
      const source = getSource();
      if (!source) {
        reject(new Error('Source not found'));
        return;
      }
      source.getClusterExpansionZoom(clusterId, (error, zoom) => {
        if (error) reject(error);
        else resolve(zoom!);
      });
    });
  }, [getSource]);

  const getClusterChildren = useCallback((clusterId: number): Promise<GeoJSON.Feature[]> => {
    return new Promise((resolve, reject) => {
      const source = getSource();
      if (!source) {
        reject(new Error('Source not found'));
        return;
      }
      source.getClusterChildren(clusterId, (error, features) => {
        if (error) reject(error);
        else resolve(features as GeoJSON.Feature[]);
      });
    });
  }, [getSource]);

  const getClusterLeaves = useCallback((
    clusterId: number,
    limit?: number,
    offset?: number
  ): Promise<GeoJSON.Feature[]> => {
    return new Promise((resolve, reject) => {
      const source = getSource();
      if (!source) {
        reject(new Error('Source not found'));
        return;
      }
      source.getClusterLeaves(clusterId, limit || 10, offset || 0, (error, features) => {
        if (error) reject(error);
        else resolve(features as GeoJSON.Feature[]);
      });
    });
  }, [getSource]);

  return {
    source: getSource(),
    setData,
    getClusterExpansionZoom,
    getClusterChildren,
    getClusterLeaves
  };
};