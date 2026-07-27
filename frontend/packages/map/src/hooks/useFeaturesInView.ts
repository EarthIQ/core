import { useState, useEffect, useCallback, useRef } from 'react';
import { useMap } from './useMap';
import type { GeoJSON } from 'geojson';

export interface UseFeaturesInViewOptions {
  /** Layer IDs to query */
  layers?: string[];
  /** Filter expression */
  filter?: any[];
  /** Debounce delay */
  debounceMs?: number;
  /** Include features partially in view */
  includePartial?: boolean;
}

export const useFeaturesInView = (
  options: UseFeaturesInViewOptions = {}
): GeoJSON.Feature[] => {
  const { map, isLoaded } = useMap();
  const { layers, filter, debounceMs = 100, includePartial = true } = options;
  const [features, setFeatures] = useState<GeoJSON.Feature[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const queryFeatures = useCallback(() => {
    if (!map || !isLoaded) return;

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const queryOptions: any = {};
      
      if (layers?.length) {
        queryOptions.layers = layers;
      }
      
      if (filter) {
        queryOptions.filter = filter;
      }

      const renderedFeatures = map.queryRenderedFeatures(undefined, queryOptions);
      
      // Deduplicate by feature ID
      const uniqueFeatures = new Map<string | number, GeoJSON.Feature>();
      renderedFeatures.forEach(feature => {
        const id = feature.id ?? `${feature.source}-${feature.sourceLayer}-${JSON.stringify(feature.properties)}`;
        if (!uniqueFeatures.has(id)) {
          uniqueFeatures.set(id, feature as unknown as GeoJSON.Feature);
        }
      });

      setFeatures(Array.from(uniqueFeatures.values()));
    }, debounceMs);
  }, [map, isLoaded, layers, filter, debounceMs]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    queryFeatures();

    map.on('moveend', queryFeatures);
    map.on('sourcedata', queryFeatures);

    return () => {
      clearTimeout(timeoutRef.current);
      map.off('moveend', queryFeatures);
      map.off('sourcedata', queryFeatures);
    };
  }, [map, isLoaded, queryFeatures]);

  return features;
};