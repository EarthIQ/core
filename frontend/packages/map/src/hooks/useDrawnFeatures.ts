import { useState, useEffect, useCallback, useRef } from 'react';
import { useMap } from './useMap';
import type { GeoJSON } from 'geojson';

export interface UseDrawnFeaturesOptions {
  /** Auto-save to localStorage */
  persist?: boolean;
  /** Storage key */
  storageKey?: string;
  /** Max features */
  maxFeatures?: number;
}

export const useDrawnFeatures = (options: UseDrawnFeaturesOptions = {}) => {
  const { persist = false, storageKey = 'drawn-features', maxFeatures = 100 } = options;
  const { map, isLoaded } = useMap();
  
  const [features, setFeatures] = useState<GeoJSON.Feature[]>(() => {
    if (persist) {
      try {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Save to localStorage on change
  useEffect(() => {
    if (persist) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(features));
      } catch {}
    }
  }, [features, persist, storageKey]);

  const addFeature = useCallback((feature: GeoJSON.Feature) => {
    setFeatures(prev => {
      // Ensure feature has ID
      const newFeature = {
        ...feature,
        id: feature.id ?? `feature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      const next = [...prev, newFeature];
      return next.slice(-maxFeatures);
    });
  }, [maxFeatures]);

  const updateFeature = useCallback((id: string | number, updates: Partial<GeoJSON.Feature>) => {
    setFeatures(prev => prev.map(f => 
      f.id === id ? { ...f, ...updates } : f
    ));
  }, []);

  const removeFeature = useCallback((id: string | number) => {
    setFeatures(prev => prev.filter(f => f.id !== id));
  }, []);

  const clearFeatures = useCallback(() => {
    setFeatures([]);
  }, []);

  const getFeatureById = useCallback((id: string | number) => {
    return features.find(f => f.id === id);
  }, [features]);

  const toFeatureCollection = useCallback((): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features
  }), [features]);

  return {
    features,
    featureCount: features.length,
    addFeature,
    updateFeature,
    removeFeature,
    clearFeatures,
    getFeatureById,
    toFeatureCollection,
    setFeatures
  };
};