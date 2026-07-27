import React, { useEffect, useState, useCallback } from 'react';
import { useMap } from '../../hooks/useMap';

export interface MVTSourceProps {
  /** Unique source ID */
  id: string;
  /** MVT tile URL template */
  tiles: string[];
  /** TileJSON URL (alternative to tiles) */
  url?: string;
  /** Tile bounds [west, south, east, north] */
  bounds?: [number, number, number, number];
  /** Minimum zoom level */
  minzoom?: number;
  /** Maximum zoom level */
  maxzoom?: number;
  /** Attribution text */
  attribution?: string;
  /** Property to use as feature ID */
  promoteId?: string | { [key: string]: string };
  /** Source layers configuration */
  sourceLayers?: MVTSourceLayerConfig[];
  /** Callback when source is loaded */
  onLoad?: (metadata: MVTMetadata) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Children (layers) */
  children?: React.ReactNode;
}

export interface MVTSourceLayerConfig {
  /** Source layer name */
  name: string;
  /** Layer ID for the map layer */
  layerId: string;
  /** Layer type */
  type: 'fill' | 'line' | 'circle' | 'symbol' | 'fill-extrusion';
  /** Paint properties */
  paint?: Record<string, any>;
  /** Layout properties */
  layout?: Record<string, any>;
  /** Filter expression */
  filter?: any[];
  /** Before layer ID */
  beforeId?: string;
  /** Min zoom */
  minzoom?: number;
  /** Max zoom */
  maxzoom?: number;
}

export interface MVTMetadata {
  bounds?: [number, number, number, number];
  center?: [number, number, number];
  minzoom?: number;
  maxzoom?: number;
  name?: string;
  description?: string;
  version?: string;
  vectorLayers?: {
    id: string;
    description?: string;
    fields?: Record<string, string>;
    minzoom?: number;
    maxzoom?: number;
  }[];
}

export const MVTSource: React.FC<MVTSourceProps> = ({
  id,
  tiles,
  url,
  bounds,
  minzoom = 0,
  maxzoom = 22,
  attribution,
  promoteId,
  sourceLayers,
  onLoad,
  onError,
  children
}) => {
  const { map, isLoaded } = useMap();
  const [metadata, setMetadata] = useState<MVTMetadata | null>(null);

  // Fetch TileJSON metadata if URL provided
  useEffect(() => {
    if (!url) return;

    const fetchMetadata = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch TileJSON: ${response.status}`);
        }
        const data = await response.json();
        setMetadata(data);
      } catch (error) {
        onError?.(error as Error);
      }
    };

    fetchMetadata();
  }, [url, onError]);

  // Initialize source
  useEffect(() => {
    if (!map || !isLoaded) return;

    try {
      if (!map.getSource(id)) {
        const sourceConfig: maplibregl.VectorSourceSpecification = {
          type: 'vector',
          minzoom,
          maxzoom,
          attribution,
          promoteId
        };

        if (url) {
          sourceConfig.url = url;
        } else if (tiles) {
          sourceConfig.tiles = tiles;
        }

        if (bounds) {
          sourceConfig.bounds = bounds;
        }

        map.addSource(id, sourceConfig);

        // Add configured source layers
        if (sourceLayers) {
          sourceLayers.forEach(layerConfig => {
            if (!map.getLayer(layerConfig.layerId)) {
              map.addLayer({
                id: layerConfig.layerId,
                type: layerConfig.type,
                source: id,
                'source-layer': layerConfig.name,
                paint: layerConfig.paint || {},
                layout: layerConfig.layout || {},
                ...(layerConfig.filter && { filter: layerConfig.filter }),
                ...(layerConfig.minzoom && { minzoom: layerConfig.minzoom }),
                ...(layerConfig.maxzoom && { maxzoom: layerConfig.maxzoom })
              }, layerConfig.beforeId);
            }
          });
        }

        // Wait for source to load
        map.once('sourcedata', (e) => {
          if (e.sourceId === id && e.isSourceLoaded) {
            const loadedMetadata: MVTMetadata = {
              bounds,
              minzoom,
              maxzoom,
              ...metadata
            };
            onLoad?.(loadedMetadata);
          }
        });
      }
    } catch (error) {
      onError?.(error as Error);
    }

    return () => {
      if (map.getSource(id)) {
        // Remove all layers from this source
        if (sourceLayers) {
          sourceLayers.forEach(layerConfig => {
            if (map.getLayer(layerConfig.layerId)) {
              map.removeLayer(layerConfig.layerId);
            }
          });
        }

        // Remove any other layers using this source
        const style = map.getStyle();
        const layersToRemove = style?.layers?.filter(
          (layer: any) => layer.source === id
        ) || [];

        layersToRemove.forEach((layer: any) => {
          if (map.getLayer(layer.id)) {
            map.removeLayer(layer.id);
          }
        });

        map.removeSource(id);
      }
    };
  }, [map, isLoaded, id, tiles, url, bounds, minzoom, maxzoom, attribution, promoteId, sourceLayers, metadata, onLoad, onError]);

  return <>{children}</>;
};

// Hook for MVT source
export const useMVTSource = (id: string) => {
  const { map, isLoaded } = useMap();

  const getSource = useCallback(() => {
    if (!map || !isLoaded) return null;
    return map.getSource(id) as maplibregl.VectorTileSource | undefined;
  }, [map, isLoaded, id]);

  const querySourceFeatures = useCallback((
    sourceLayer: string,
    filter?: any[]
  ) => {
    if (!map || !isLoaded) return [];
    
    return map.querySourceFeatures(id, {
      sourceLayer,
      filter
    });
  }, [map, isLoaded, id]);

  const getAvailableSourceLayers = useCallback((): string[] => {
    if (!map || !isLoaded) return [];
    
    const features = map.querySourceFeatures(id);
    const layers = new Set<string>();
    
    features.forEach(f => {
      if (f.sourceLayer) {
        layers.add(f.sourceLayer);
      }
    });
    
    return Array.from(layers);
  }, [map, isLoaded, id]);

  return {
    source: getSource(),
    querySourceFeatures,
    getAvailableSourceLayers
  };
};