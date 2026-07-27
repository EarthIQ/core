import React, { useState, useCallback, useMemo } from 'react';
import * as turf from '@turf/turf';
import { useMap } from '../../hooks/useMap';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';

export interface ClipToolProps {
  /** Source to clip */
  source: string | FeatureCollection;
  /** Clip mask polygon */
  clipMask: string | Feature<Polygon | MultiPolygon>;
  /** Output layer ID */
  outputLayerId?: string;
  /** Clip mode */
  mode?: 'inside' | 'outside';
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

export const ClipTool: React.FC<ClipToolProps> = ({
  source,
  clipMask,
  outputLayerId = 'clip-result',
  mode = 'inside',
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
  const [clipMode, setClipMode] = useState<'inside' | 'outside'>(mode);

  // Get GeoJSON from source
  const getGeoJSON = useCallback((src: string | FeatureCollection): FeatureCollection | null => {
    if (typeof src === 'object' && 'type' in src && src.type === 'FeatureCollection') {
      return src;
    }
    
    if (typeof src === 'string' && map) {
      const mapSource = map.getSource(src);
      if (mapSource && mapSource.type === 'geojson') {
        return (mapSource as any)._data as FeatureCollection;
      }
    }
    
    return null;
  }, [map]);

  // Get clip mask feature
  const getClipMask = useCallback((): Feature<Polygon | MultiPolygon> | null => {
    if (typeof clipMask === 'object' && 'geometry' in clipMask) {
      return clipMask;
    }
    
    if (typeof clipMask === 'string' && map) {
      const mapSource = map.getSource(clipMask);
      if (mapSource && mapSource.type === 'geojson') {
        const data = (mapSource as any)._data as FeatureCollection;
        const polygonFeature = data.features.find(
          f => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'
        );
        return polygonFeature as Feature<Polygon | MultiPolygon> || null;
      }
    }
    
    return null;
  }, [clipMask, map]);

  // Perform clip
  const executeClip = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const sourceData = getGeoJSON(source);
      const mask = getClipMask();

      if (!sourceData) {
        throw new Error('Could not retrieve source GeoJSON');
      }

      if (!mask) {
        throw new Error('Could not retrieve clip mask');
      }

      const clippedFeatures: Feature[] = [];

      for (const feature of sourceData.features) {
        try {
          let clipped: Feature | null = null;

          if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            if (clipMode === 'inside') {
              clipped = turf.intersect(turf.featureCollection([
                feature as Feature<Polygon | MultiPolygon>,
                mask
              ]));
            } else {
              clipped = turf.difference(turf.featureCollection([
                feature as Feature<Polygon | MultiPolygon>,
                mask
              ]));
            }
          } else if (feature.geometry.type === 'Point') {
            const isInside = turf.booleanPointInPolygon(feature.geometry.coordinates, mask);
            if ((clipMode === 'inside' && isInside) || (clipMode === 'outside' && !isInside)) {
              clipped = feature;
            }
          } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
            // For lines, use booleanWithin or lineSplit
            const bbox = turf.bbox(mask);
            if (turf.booleanWithin(feature, turf.bboxPolygon(bbox))) {
              clipped = clipMode === 'inside' ? feature : null;
            }
          }

          if (clipped) {
            clipped.properties = {
              ...feature.properties,
              _clipped: true,
              _clipMode: clipMode
            };
            clippedFeatures.push(clipped);
          }
        } catch (e) {
          console.warn('Clip failed for feature:', e);
        }
      }

      const resultCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: clippedFeatures
      };

      setResult(resultCollection);
      onResult?.(resultCollection);

      // Add to map
      if (map && showResult) {
        if (map.getSource(outputLayerId)) {
          (map.getSource(outputLayerId) as any).setData(resultCollection);
        } else {
          map.addSource(outputLayerId, {
            type: 'geojson',
            data: resultCollection
          });

          map.addLayer({
            id: `${outputLayerId}-fill`,
            type: 'fill',
            source: outputLayerId,
            filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
            paint: {
              'fill-color': '#27ae60',
              'fill-opacity': 0.6,
              'fill-outline-color': '#1e8449'
            }
          });

          map.addLayer({
            id: `${outputLayerId}-line`,
            type: 'line',
            source: outputLayerId,
            filter: ['any', ['==', ['geometry-type'], 'LineString'], ['==', ['geometry-type'], 'MultiLineString']],
            paint: {
              'line-color': '#27ae60',
              'line-width': 2
            }
          });

          map.addLayer({
            id: `${outputLayerId}-point`,
            type: 'circle',
            source: outputLayerId,
            filter: ['==', ['geometry-type'], 'Point'],
            paint: {
              'circle-color': '#27ae60',
              'circle-radius': 5
            }
          });
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Clip failed');
      setError(error);
      onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  }, [source, getGeoJSON, getClipMask, clipMode, map, outputLayerId, showResult, onResult, onError]);

  // Auto-execute
  React.useEffect(() => {
    if (autoExecute && isLoaded) {
      executeClip();
    }
  }, [autoExecute, isLoaded, executeClip]);

  // Clear result
  const clearResult = useCallback(() => {
    if (map) {
      [`${outputLayerId}-fill`, `${outputLayerId}-line`, `${outputLayerId}-point`].forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource(outputLayerId)) {
        map.removeSource(outputLayerId);
      }
    }
    setResult(null);
  }, [map, outputLayerId]);

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
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
        Clip Tool
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
          Clip Mode:
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setClipMode('inside')}
            style={{
              flex: 1,
              padding: '6px 12px',
              backgroundColor: clipMode === 'inside' ? '#27ae60' : '#ecf0f1',
              color: clipMode === 'inside' ? 'white' : '#333',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Inside
          </button>
          <button
            onClick={() => setClipMode('outside')}
            style={{
              flex: 1,
              padding: '6px 12px',
              backgroundColor: clipMode === 'outside' ? '#27ae60' : '#ecf0f1',
              color: clipMode === 'outside' ? 'white' : '#333',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Outside
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={executeClip}
          disabled={isProcessing || !isLoaded}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: isProcessing ? '#95a5a6' : '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontSize: 13
          }}
        >
          {isProcessing ? 'Processing...' : 'Execute Clip'}
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
          <strong>Result:</strong> {result.features.length} features clipped
        </div>
      )}
    </div>
  );
};

export default ClipTool;