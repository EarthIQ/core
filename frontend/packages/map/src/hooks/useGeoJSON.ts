import { useState, useEffect, useCallback } from 'react';
import type { GeoJSON } from 'geojson';

export interface UseGeoJSONOptions {
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** Transform function */
  transform?: (data: GeoJSON.FeatureCollection) => GeoJSON.FeatureCollection;
  /** Filter function */
  filter?: (feature: GeoJSON.Feature) => boolean;
  /** Sort function */
  sort?: (a: GeoJSON.Feature, b: GeoJSON.Feature) => number;
  /** Cache key for localStorage */
  cacheKey?: string;
  /** Cache duration in ms */
  cacheDuration?: number;
  /** Retry attempts */
  retries?: number;
  /** Retry delay in ms */
  retryDelay?: number;
}

export interface UseGeoJSONResult {
  data: GeoJSON.FeatureCollection | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  featureCount: number;
}

export const useGeoJSON = (
  url: string | null,
  options: UseGeoJSONOptions = {}
): UseGeoJSONResult => {
  const {
    autoFetch = true,
    transform,
    filter,
    sort,
    cacheKey,
    cacheDuration = 5 * 60 * 1000, // 5 minutes
    retries = 3,
    retryDelay = 1000
  } = options;

  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (attempt = 1) => {
    if (!url) {
      setData(null);
      return;
    }

    // Check cache
    if (cacheKey) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < cacheDuration) {
            setData(cachedData);
            return;
          }
        }
      } catch {}
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      let geojson: GeoJSON.FeatureCollection = await response.json();

      // Ensure it's a FeatureCollection
      if (geojson.type !== 'FeatureCollection') {
        if (geojson.type === 'Feature') {
          geojson = {
            type: 'FeatureCollection',
            features: [geojson as GeoJSON.Feature]
          };
        } else {
          throw new Error('Invalid GeoJSON: expected FeatureCollection or Feature');
        }
      }

      // Apply filter
      if (filter) {
        geojson = {
          ...geojson,
          features: geojson.features.filter(filter)
        };
      }

      // Apply sort
      if (sort) {
        geojson = {
          ...geojson,
          features: [...geojson.features].sort(sort)
        };
      }

      // Apply transform
      if (transform) {
        geojson = transform(geojson);
      }

      // Cache result
      if (cacheKey) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            data: geojson,
            timestamp: Date.now()
          }));
        } catch {}
      }

      setData(geojson);
    } catch (err) {
      const error = err as Error;
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        return fetchData(attempt + 1);
      }
      
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [url, filter, sort, transform, cacheKey, cacheDuration, retries, retryDelay]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [fetchData, autoFetch]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    featureCount: data?.features.length ?? 0
  };
};