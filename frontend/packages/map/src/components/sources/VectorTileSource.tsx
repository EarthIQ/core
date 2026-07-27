import React, { useEffect, useCallback } from 'react';
import { useMap } from '../../hooks/useMap';

export interface VectorTileSourceProps {
  /** Unique source ID */
  id: string;
  /** TileJSON URL or tiles array */
  url?: string;
  /** Array of tile URL templates */
  tiles?: string[];
  /** Tile bounds [west, south, east, north] */
  bounds?: [number, number, number, number];
  /** Tile URL scheme */
  scheme?: 'xyz' | 'tms';
  /** Minimum zoom level */
  minzoom?: number;
  /** Maximum zoom level */
  maxzoom?: number;
  /** Attribution text */
  attribution?: string;
  /** Property to use as feature ID */
  promoteId?: string | { [key: string]: string };
  /** Volatile source (frequently changing) */
  volatile?: boolean;
  /** Callback when source is loaded */
  onLoad?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Children (layers) */
  children?: React.ReactNode;
}

export const VectorTileSource: React.FC<VectorTileSourceProps> = ({
  id,
  url,
  tiles,
  bounds,
  scheme = 'xyz',
  minzoom = 0,
  maxzoom = 22,
  attribution,
  promoteId,
  volatile = false,
  onLoad,
  onError,
  children
}) => {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    try {
      if (!map.getSource(id)) {
        const sourceConfig: maplibregl.VectorSourceSpecification = {
          type: 'vector',
          scheme,
          minzoom,
          maxzoom,
          attribution,
          promoteId,
          volatile
        };

        if (url) {
          sourceConfig.url = url;
        } else if (tiles) {
          sourceConfig.tiles = tiles;
        } else {
          throw new Error('Either url or tiles must be provided');
        }

        if (bounds) {
          sourceConfig.bounds = bounds;
        }

        map.addSource(id, sourceConfig);

        // Wait for source to load
        const checkLoaded = () => {
          if (map.isSourceLoaded(id)) {
            onLoad?.();
          } else {
            map.once('sourcedata', (e) => {
              if (e.sourceId === id && e.isSourceLoaded) {
                onLoad?.();
              }
            });
          }
        };

        checkLoaded();
      }
    } catch (error) {
      onError?.(error as Error);
    }

    return () => {
      if (map.getSource(id)) {
        // Remove layers first
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
  }, [map, isLoaded, id, url, tiles, bounds, scheme, minzoom, maxzoom, attribution, promoteId, volatile, onLoad, onError]);

  return <>{children}</>;
};

// Hook to access vector tile source
export const useVectorTileSource = (id: string) => {
  const { map, isLoaded } = useMap();

  const getSource = useCallback(() => {
    if (!map || !isLoaded) return null;
    return map.getSource(id) as maplibregl.VectorTileSource | undefined;
  }, [map, isLoaded, id]);

  const getSourceLayers = useCallback((): string[] => {
    const source = getSource();
    if (!source) return [];
    
    // Query rendered features to get source layers
    const features = map?.querySourceFeatures(id) || [];
    const layers = new Set<string>();
    
    features.forEach(f => {
      if (f.sourceLayer) {
        layers.add(f.sourceLayer);
      }
    });
    
    return Array.from(layers);
  }, [map, getSource, id]);

  return {
    source: getSource(),
    getSourceLayers
  };
};