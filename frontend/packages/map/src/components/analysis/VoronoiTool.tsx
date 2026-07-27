import React, { useState, useCallback, useMemo } from 'react';
import * as turf from '@turf/turf';
import { useMap } from '../../hooks/useMap';
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';

export interface VoronoiToolProps {
  /** Source points layer or GeoJSON */
  source: string | FeatureCollection<Point>;
  /** Bounding box [minX, minY, maxX, maxY] */
  bbox?: [number, number, number, number];
  /** Output layer ID */
  outputLayerId?: string;
  /** Callback with result */
  onResult?: (result: FeatureCollection<Polygon>) => void;
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
  /** Show point labels */
  showLabels?: boolean;
  /** Color scheme */
  colorScheme?: 'random' | 'categorical' | 'sequential';
}

export const VoronoiTool: React.FC<VoronoiToolProps> = ({
  source,
  bbox,
  outputLayerId = 'voronoi-result',
  onResult,
  onError,
  showControls = true,
  autoExecute = false,
  className,
  position = 'top-right',
  showLabels = false,
  colorScheme = 'categorical'
}) => {
  const { map, isLoaded } = useMap();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<FeatureCollection<Polygon> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [showResult, setShowResult] = useState(true);

  // Color palettes
  const colorPalettes = useMemo(() => ({
    categorical: [
      '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
      '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe'
    ],
    sequential: [
      '#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c',
      '#fc4e2a', '#e31a1c', '#bd0026', '#800026'
    ]
  }), []);

  // Get random color
  const getColor = useCallback((index: number): string => {
    if (colorScheme === 'random') {
      return `hsl(${Math.random() * 360}, 70%, 60%)`;
    }
    const palette = colorPalettes[colorScheme] || colorPalettes.categorical;
    return palette[index % palette.length];
  }, [colorScheme, colorPalettes]);

  // Get GeoJSON from source
  const getGeoJSON = useCallback((src: string | FeatureCollection): FeatureCollection | null => {
    if (typeof src === 'object') {
      return src;
    }
    
    if (map) {
      const mapSource = map.getSource(src);
      if (mapSource && mapSource.type === 'geojson') {
        return (mapSource as any)._data as FeatureCollection;
      }
    }
    
    return null;
  }, [map]);

  // Execute Voronoi
  const executeVoronoi = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const sourceData = getGeoJSON(source);

      if (!sourceData) {
        throw new Error('Could not retrieve source GeoJSON');
      }

      // Filter to only point features
      const points = sourceData.features.filter(
        (f): f is Feature<Point> => f.geometry.type === 'Point'
      );

      if (points.length < 3) {
        throw new Error('At least 3 points are required for Voronoi diagram');
      }

      // Create point collection
      const pointCollection = turf.featureCollection(points);

      // Determine bbox
      let voronoiBbox = bbox;
      if (!voronoiBbox && map) {
        const bounds = map.getBounds();
        voronoiBbox = [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth()
        ];
      }

      if (!voronoiBbox) {
        voronoiBbox = turf.bbox(pointCollection) as [number, number, number, number];
        // Expand bbox slightly
        const padding = 0.1;
        const width = voronoiBbox[2] - voronoiBbox[0];
        const height = voronoiBbox[3] - voronoiBbox[1];
        voronoiBbox = [
          voronoiBbox[0] - width * padding,
          voronoiBbox[1] - height * padding,
          voronoiBbox[2] + width * padding,
          voronoiBbox[3] + height * padding
        ];
      }

      // Create Voronoi diagram
      const voronoiPolygons = turf.voronoi(pointCollection, { bbox: voronoiBbox });

      if (!voronoiPolygons) {
        throw new Error('Failed to generate Voronoi diagram');
      }

      // Add colors and properties
      voronoiPolygons.features = voronoiPolygons.features.map((feature, index) => {
        const sourcePoint = points[index];
        return {
          ...feature,
          properties: {
            ...feature.properties,
            ...sourcePoint?.properties,
            _voronoiIndex: index,
            _voronoiColor: getColor(index),
            _sourcePointId: sourcePoint?.id
          }
        };
      }).filter(f => f !== null) as Feature<Polygon>[];

      setResult(voronoiPolygons as FeatureCollection<Polygon>);
      onResult?.(voronoiPolygons as FeatureCollection<Polygon>);

      // Add to map
      if (map && showResult) {
        if (map.getSource(outputLayerId)) {
          (map.getSource(outputLayerId) as any).setData(voronoiPolygons);
        } else {
          map.addSource(outputLayerId, {
            type: 'geojson',
            data: voronoiPolygons
          });

          map.addLayer({
            id: `${outputLayerId}-fill`,
            type: 'fill',
            source: outputLayerId,
            paint: {
              'fill-color': ['get', '_voronoiColor'],
              'fill-opacity': 0.5
            }
          });

          map.addLayer({
            id: `${outputLayerId}-line`,
            type: 'line',
            source: outputLayerId,
            paint: {
              'line-color': '#333',
              'line-width': 1
            }
          });

          if (showLabels) {
            map.addLayer({
              id: `${outputLayerId}-labels`,
              type: 'symbol',
              source: outputLayerId,
              layout: {
                'text-field': ['to-string', ['get', '_voronoiIndex']],
                'text-size': 12
              },
              paint: {
                'text-color': '#333',
                'text-halo-color': 'white',
                'text-halo-width': 1
              }
            });
          }
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Voronoi generation failed');
      setError(error);
      onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  }, [source, bbox, getGeoJSON, getColor, map, outputLayerId, showResult, showLabels, onResult, onError]);

  // Auto-execute
  React.useEffect(() => {
    if (autoExecute && isLoaded) {
      executeVoronoi();
    }
  }, [autoExecute, isLoaded, executeVoronoi]);

  // Clear result
  const clearResult = useCallback(() => {
    if (map) {
      [`${outputLayerId}-fill`, `${outputLayerId}-line`, `${outputLayerId}-labels`].forEach(id => {
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
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
          <line x1="12" y1="22" x2="12" y2="2" />
          <line x1="22" y1="8.5" x2="2" y2="15.5" />
          <line x1="2" y1="8.5" x2="22" y2="15.5" />
        </svg>
        Voronoi Tool
      </div>

      <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
        Creates Voronoi polygons from point features
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={executeVoronoi}
          disabled={isProcessing || !isLoaded}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: isProcessing ? '#95a5a6' : '#e67e22',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontSize: 13
          }}
        >
          {isProcessing ? 'Processing...' : 'Generate Voronoi'}
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
          backgroundColor: '#fef3e2',
          borderRadius: 4,
          fontSize: 12
        }}>
          <strong>Result:</strong> {result.features.length} Voronoi cells
        </div>
      )}
    </div>
  );
};

export default VoronoiTool;