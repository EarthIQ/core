import React, { useState, useCallback, useMemo } from 'react';
import * as turf from '@turf/turf';
import { useMap } from '../../hooks/useMap';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';

export interface IntersectToolProps {
  /** Source layer ID or GeoJSON */
  sourceA: string | FeatureCollection;
  /** Target layer ID or GeoJSON */
  sourceB: string | FeatureCollection;
  /** Output layer ID */
  outputLayerId?: string;
  /** Callback with result */
  onResult?: (result: FeatureCollection) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Show UI controls */
  showControls?: boolean;
  /** Auto-execute on mount */
  autoExecute?: boolean;
  /** Custom className */
  className?: string;
  /** Position */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const IntersectTool: React.FC<IntersectToolProps> = ({
  sourceA,
  sourceB,
  outputLayerId = 'intersect-result',
  onResult,
  onError,
  showControls = true,
  autoExecute = false,
  className,
  position = 'top-right'
}) => {
  const { map, isLoaded } = useMap();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [showResult, setShowResult] = useState(true);

  // Get GeoJSON from source (layer ID or direct GeoJSON)
  const getGeoJSON = useCallback((source: string | FeatureCollection): FeatureCollection | null => {
    if (typeof source === 'object') {
      return source;
    }
    
    if (!map) return null;
    
    const mapSource = map.getSource(source);
    if (mapSource && mapSource.type === 'geojson') {
      // @ts-ignore - accessing internal data
      return (mapSource as any)._data as FeatureCollection;
    }
    
    return null;
  }, [map]);

  // Perform intersection
  const executeIntersect = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const geoJsonA = getGeoJSON(sourceA);
      const geoJsonB = getGeoJSON(sourceB);

      if (!geoJsonA || !geoJsonB) {
        throw new Error('Could not retrieve GeoJSON from sources');
      }

      const intersectedFeatures: Feature[] = [];

      // Iterate through features and find intersections
      for (const featureA of geoJsonA.features) {
        for (const featureB of geoJsonB.features) {
          if (
            (featureA.geometry.type === 'Polygon' || featureA.geometry.type === 'MultiPolygon') &&
            (featureB.geometry.type === 'Polygon' || featureB.geometry.type === 'MultiPolygon')
          ) {
            try {
              const intersection = turf.intersect(
                turf.featureCollection([featureA as Feature<Polygon | MultiPolygon>, featureB as Feature<Polygon | MultiPolygon>])
              );
              
              if (intersection) {
                intersection.properties = {
                  ...featureA.properties,
                  ...featureB.properties,
                  _intersectSource: 'A+B'
                };
                intersectedFeatures.push(intersection);
              }
            } catch (e) {
              // Skip invalid geometries
              console.warn('Intersection failed for feature pair:', e);
            }
          }
        }
      }

      const resultCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: intersectedFeatures
      };

      setResult(resultCollection);
      onResult?.(resultCollection);

      // Add to map if available
      if (map && showResult) {
        if (map.getSource(outputLayerId)) {
          (map.getSource(outputLayerId) as any).setData(resultCollection);
        } else {
          map.addSource(outputLayerId, {
            type: 'geojson',
            data: resultCollection
          });

          map.addLayer({
            id: outputLayerId,
            type: 'fill',
            source: outputLayerId,
            paint: {
              'fill-color': '#ff6b6b',
              'fill-opacity': 0.6,
              'fill-outline-color': '#c0392b'
            }
          });
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Intersection failed');
      setError(error);
      onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  }, [sourceA, sourceB, getGeoJSON, map, outputLayerId, showResult, onResult, onError]);

  // Auto-execute on mount
  React.useEffect(() => {
    if (autoExecute && isLoaded) {
      executeIntersect();
    }
  }, [autoExecute, isLoaded, executeIntersect]);

  // Clear result from map
  const clearResult = useCallback(() => {
    if (map) {
      if (map.getLayer(outputLayerId)) {
        map.removeLayer(outputLayerId);
      }
      if (map.getSource(outputLayerId)) {
        map.removeSource(outputLayerId);
      }
    }
    setResult(null);
  }, [map, outputLayerId]);

  // Position styles
  const positionStyles = useMemo(() => {
    const base = { position: 'absolute' as const, zIndex: 1000 };
    const offset = 10;
    
    switch (position) {
      case 'top-left': return { ...base, top: offset, left: offset };
      case 'top-right': return { ...base, top: offset, right: offset };
      case 'bottom-left': return { ...base, bottom: offset, left: offset };
      case 'bottom-right': return { ...base, bottom: offset, right: offset };
      default: return { ...base, top: offset, right: offset };
    }
  }, [position]);

  if (!showControls) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        ...positionStyles,
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        minWidth: 250
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="9" r="7" />
          <circle cx="15" cy="15" r="7" />
        </svg>
        Intersect Tool
      </div>

      <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
        <div>Source A: {typeof sourceA === 'string' ? sourceA : 'GeoJSON'}</div>
        <div>Source B: {typeof sourceB === 'string' ? sourceB : 'GeoJSON'}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={executeIntersect}
          disabled={isProcessing || !isLoaded}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: isProcessing ? '#95a5a6' : '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontSize: 13
          }}
        >
          {isProcessing ? 'Processing...' : 'Execute Intersect'}
        </button>

        {result && (
          <button
            onClick={clearResult}
            style={{
              padding: '8px 12px',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            Clear
          </button>
        )}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
        <input
          type="checkbox"
          checked={showResult}
          onChange={(e) => setShowResult(e.target.checked)}
        />
        Show result on map
      </label>

      {error && (
        <div style={{
          marginTop: 12,
          padding: 8,
          backgroundColor: '#fee',
          borderRadius: 4,
          color: '#c0392b',
          fontSize: 12
        }}>
          {error.message}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: 12,
          padding: 8,
          backgroundColor: '#e8f5e9',
          borderRadius: 4,
          fontSize: 12
        }}>
          <strong>Result:</strong> {result.features.length} features
        </div>
      )}
    </div>
  );
};

export default IntersectTool;