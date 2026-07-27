import React, { useState, useCallback, useMemo } from 'react';
import * as turf from '@turf/turf';
import { useMap } from '../../hooks/useMap';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';

export interface UnionToolProps {
  /** Source layers or GeoJSON */
  sources: (string | FeatureCollection)[];
  /** Output layer ID */
  outputLayerId?: string;
  /** Callback with result */
  onResult?: (result: Feature) => void;
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
  /** Preserve properties strategy */
  propertiesStrategy?: 'first' | 'last' | 'merge' | 'none';
}

export const UnionTool: React.FC<UnionToolProps> = ({
  sources,
  outputLayerId = 'union-result',
  onResult,
  onError,
  showControls = true,
  autoExecute = false,
  className,
  position = 'top-right',
  propertiesStrategy = 'merge'
}) => {
  const { map, isLoaded } = useMap();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<Feature | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [showResult, setShowResult] = useState(true);

  // Get GeoJSON from source
  const getGeoJSON = useCallback((source: string | FeatureCollection): FeatureCollection | null => {
    if (typeof source === 'object') {
      return source;
    }
    
    if (!map) return null;
    
    const mapSource = map.getSource(source);
    if (mapSource && mapSource.type === 'geojson') {
      return (mapSource as any)._data as FeatureCollection;
    }
    
    return null;
  }, [map]);

  // Merge properties based on strategy
  const mergeProperties = useCallback((features: Feature[]): Record<string, any> => {
    switch (propertiesStrategy) {
      case 'first':
        return features[0]?.properties || {};
      case 'last':
        return features[features.length - 1]?.properties || {};
      case 'merge':
        return features.reduce((acc, f) => ({ ...acc, ...f.properties }), {});
      case 'none':
      default:
        return {};
    }
  }, [propertiesStrategy]);

  // Perform union
  const executeUnion = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Collect all polygon features
      const allFeatures: Feature<Polygon | MultiPolygon>[] = [];

      for (const source of sources) {
        const geoJson = getGeoJSON(source);
        if (geoJson) {
          for (const feature of geoJson.features) {
            if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
              allFeatures.push(feature as Feature<Polygon | MultiPolygon>);
            }
          }
        }
      }

      if (allFeatures.length === 0) {
        throw new Error('No polygon features found in sources');
      }

      if (allFeatures.length === 1) {
        const singleResult = allFeatures[0];
        setResult(singleResult);
        onResult?.(singleResult);
        return;
      }

      // Perform union iteratively
      let unionResult = allFeatures[0];
      
      for (let i = 1; i < allFeatures.length; i++) {
        const union = turf.union(turf.featureCollection([unionResult, allFeatures[i]]));
        if (union) {
          unionResult = union;
        }
      }

      // Apply merged properties
      unionResult.properties = {
        ...mergeProperties(allFeatures),
        _unionCount: allFeatures.length,
        _unionTimestamp: new Date().toISOString()
      };

      setResult(unionResult);
      onResult?.(unionResult);

      // Add to map
      if (map && showResult) {
        const fc: FeatureCollection = {
          type: 'FeatureCollection',
          features: [unionResult]
        };

        if (map.getSource(outputLayerId)) {
          (map.getSource(outputLayerId) as any).setData(fc);
        } else {
          map.addSource(outputLayerId, {
            type: 'geojson',
            data: fc
          });

          map.addLayer({
            id: outputLayerId,
            type: 'fill',
            source: outputLayerId,
            paint: {
              'fill-color': '#9b59b6',
              'fill-opacity': 0.6,
              'fill-outline-color': '#8e44ad'
            }
          });
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Union failed');
      setError(error);
      onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  }, [sources, getGeoJSON, map, outputLayerId, showResult, mergeProperties, onResult, onError]);

  // Auto-execute
  React.useEffect(() => {
    if (autoExecute && isLoaded) {
      executeUnion();
    }
  }, [autoExecute, isLoaded, executeUnion]);

  // Clear result
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

  if (!showControls) return null;

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
          <circle cx="8" cy="12" r="6" />
          <circle cx="16" cy="12" r="6" />
        </svg>
        Union Tool
      </div>

      <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
        <div>Sources: {sources.length} layer(s)</div>
        <div>Strategy: {propertiesStrategy}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={executeUnion}
          disabled={isProcessing || !isLoaded}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: isProcessing ? '#95a5a6' : '#9b59b6',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontSize: 13
          }}
        >
          {isProcessing ? 'Processing...' : 'Execute Union'}
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
          backgroundColor: '#f3e5f5',
          borderRadius: 4,
          fontSize: 12
        }}>
          <strong>Result:</strong> {result.geometry.type}
          <br />
          <small>Area: {turf.area(result).toLocaleString()} m²</small>
        </div>
      )}
    </div>
  );
};

export default UnionTool;