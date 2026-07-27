// components/analysis/StatisticsPanel.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as turf from '@turf/turf';
import { useMap } from '../../hooks/useMap';
import type { FeatureCollection, Feature } from 'geojson';

export interface StatisticsResult {
  field: string;
  count: number;
  sum?: number;
  mean?: number;
  median?: number;
  min?: number;
  max?: number;
  stdDev?: number;
  values?: { value: any; count: number }[];
}

export interface StatisticsPanelProps {
  /** Source layer ID or GeoJSON */
  source: string | FeatureCollection;
  /** Fields to analyze */
  fields?: string[];
  /** Statistics to calculate */
  statistics?: ('count' | 'sum' | 'mean' | 'median' | 'min' | 'max' | 'stdDev' | 'unique')[];
  /** Title */
  title?: string;
  /** Custom className */
  className?: string;
  /** Position */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Collapsible */
  collapsible?: boolean;
  /** Include geometry statistics */
  includeGeometryStats?: boolean;
  /** Callback with results */
  onCalculate?: (results: StatisticsResult[]) => void;
  /** Auto-update on source change */
  autoUpdate?: boolean;
}

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({
  source,
  fields,
  statistics = ['count', 'sum', 'mean', 'min', 'max'],
  title = 'Statistics',
  className,
  position = 'bottom-right',
  collapsible = true,
  includeGeometryStats = true,
  onCalculate,
  autoUpdate = true
}) => {
  const { map, isLoaded } = useMap();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [results, setResults] = useState<StatisticsResult[]>([]);
  const [geometryStats, setGeometryStats] = useState<{
    totalArea?: number;
    totalLength?: number;
    featureCount: number;
    geometryTypes: { type: string; count: number }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get GeoJSON from source
  const getGeoJSON = useCallback((): FeatureCollection | null => {
    if (typeof source === 'object') {
      return source;
    }
    
    if (map && typeof source === 'string') {
      const mapSource = map.getSource(source);
      if (mapSource && mapSource.type === 'geojson') {
        return (mapSource as any)._data as FeatureCollection;
      }
    }
    
    return null;
  }, [source, map]);

  // Calculate standard deviation
  const calcStdDev = (values: number[], mean: number): number => {
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  };

  // Calculate statistics
  const calculateStatistics = useCallback(() => {
    setIsLoading(true);

    try {
      const geoJson = getGeoJSON();
      if (!geoJson || geoJson.features.length === 0) {
        setResults([]);
        setGeometryStats(null);
        return;
      }

      const features = geoJson.features;

      // Determine fields to analyze
      let fieldsToAnalyze = fields;
      if (!fieldsToAnalyze || fieldsToAnalyze.length === 0) {
        // Auto-detect numeric fields
        const sampleProps = features[0]?.properties || {};
        fieldsToAnalyze = Object.keys(sampleProps).filter(key => {
          const value = sampleProps[key];
          return typeof value === 'number' || !isNaN(parseFloat(value));
        });
      }

      // Calculate field statistics
      const fieldResults: StatisticsResult[] = fieldsToAnalyze.map(field => {
        const values = features
          .map(f => f.properties?.[field])
          .filter(v => v !== null && v !== undefined);

        const numericValues = values
          .map(v => typeof v === 'number' ? v : parseFloat(v))
          .filter(v => !isNaN(v));

        const result: StatisticsResult = {
          field,
          count: values.length
        };

        if (numericValues.length > 0) {
          if (statistics.includes('sum')) {
            result.sum = numericValues.reduce((a, b) => a + b, 0);
          }
          if (statistics.includes('mean')) {
            result.mean = result.sum! / numericValues.length;
          }
          if (statistics.includes('median')) {
            const sorted = [...numericValues].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            result.median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
          }
          if (statistics.includes('min')) {
            result.min = Math.min(...numericValues);
          }
          if (statistics.includes('max')) {
            result.max = Math.max(...numericValues);
          }
          if (statistics.includes('stdDev') && result.mean !== undefined) {
            result.stdDev = calcStdDev(numericValues, result.mean);
          }
        }

        if (statistics.includes('unique')) {
          const uniqueValues = new Map<any, number>();
          values.forEach(v => {
            uniqueValues.set(v, (uniqueValues.get(v) || 0) + 1);
          });
          result.values = Array.from(uniqueValues.entries())
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        }

        return result;
      });

      setResults(fieldResults);
      onCalculate?.(fieldResults);

      // Calculate geometry statistics
      if (includeGeometryStats) {
        let totalArea = 0;
        let totalLength = 0;
        const geometryTypes = new Map<string, number>();

        features.forEach(feature => {
          const geomType = feature.geometry.type;
          geometryTypes.set(geomType, (geometryTypes.get(geomType) || 0) + 1);

          try {
            if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
              totalArea += turf.area(feature);
            }
            if (geomType === 'LineString' || geomType === 'MultiLineString') {
              totalLength += turf.length(feature, { units: 'kilometers' });
            }
          } catch (e) {
            console.warn('Geometry calculation failed:', e);
          }
        });

        setGeometryStats({
          totalArea,
          totalLength,
          featureCount: features.length,
          geometryTypes: Array.from(geometryTypes.entries())
            .map(([type, count]) => ({ type, count }))
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [getGeoJSON, fields, statistics, includeGeometryStats, onCalculate]);

  // Auto-update on source change
  useEffect(() => {
    if (isLoaded && autoUpdate) {
      calculateStatistics();
    }
  }, [isLoaded, autoUpdate, calculateStatistics, source]);

  // Format number
  const formatNumber = (num: number | undefined, decimals = 2): string => {
    if (num === undefined) return '-';
    return num.toLocaleString(undefined, { maximumFractionDigits: decimals });
  };

  // Format area
  const formatArea = (sqMeters: number): string => {
    if (sqMeters >= 1000000) {
      return `${(sqMeters / 1000000).toFixed(2)} km²`;
    }
    return `${sqMeters.toFixed(0)} m²`;
  };

  // Position styles
  const positionStyles = useMemo(() => {
    const base = { position: 'absolute' as const, zIndex: 1000 };
    const offset = 10;
    
    switch (position) {
      case 'top-left': return { ...base, top: offset, left: offset };
      case 'top-right': return { ...base, top: offset, right: offset };
      case 'bottom-left': return { ...base, bottom: offset, left: offset };
      case 'bottom-right': return { ...base, bottom: offset, right: offset };
      default: return { ...base, bottom: offset, right: offset };
    }
  }, [position]);

  return (
    <div
      className={className}
      style={{
        ...positionStyles,
        backgroundColor: 'white',
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        minWidth: 280,
        maxWidth: 350,
        maxHeight: isCollapsed ? 'auto' : 400,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: collapsible ? 'pointer' : 'default'
        }}
        onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
      >
        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          {title}
        </span>
        {collapsible && (
          <span style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            ▼
          </span>
        )}
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div style={{ padding: 16, overflowY: 'auto', maxHeight: 340 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', color: '#666', padding: 20 }}>
              Calculating...
            </div>
          ) : (
            <>
              {/* Geometry Statistics */}
              {geometryStats && (
                <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #eee' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 8 }}>
                    Geometry Overview
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Features:</span>
                      <strong>{geometryStats.featureCount}</strong>
                    </div>
                    {geometryStats.totalArea > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>Total Area:</span>
                        <strong>{formatArea(geometryStats.totalArea)}</strong>
                      </div>
                    )}
                    {geometryStats.totalLength > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>Total Length:</span>
                        <strong>{geometryStats.totalLength.toFixed(2)} km</strong>
                      </div>
                    )}
                    <div style={{ marginTop: 8 }}>
                      {geometryStats.geometryTypes.map(({ type, count }) => (
                        <span
                          key={type}
                          style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            backgroundColor: '#e8f4fd',
                            borderRadius: 4,
                            fontSize: 11,
                            marginRight: 4,
                            marginBottom: 4
                          }}
                        >
                          {type}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Field Statistics */}
              {results.map((stat, index) => (
                <div
                  key={stat.field}
                  style={{
                    marginBottom: 12,
                    paddingBottom: 12,
                    borderBottom: index < results.length - 1 ? '1px solid #f0f0f0' : 'none'
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 6 }}>
                    {stat.field}
                  </div>
                  <div style={{ fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    <span style={{ color: '#666' }}>Count:</span>
                    <span style={{ textAlign: 'right' }}>{stat.count}</span>
                    
                    {stat.sum !== undefined && (
                      <>
                        <span style={{ color: '#666' }}>Sum:</span>
                        <span style={{ textAlign: 'right' }}>{formatNumber(stat.sum)}</span>
                      </>
                    )}
                    
                    {stat.mean !== undefined && (
                      <>
                        <span style={{ color: '#666' }}>Mean:</span>
                        <span style={{ textAlign: 'right' }}>{formatNumber(stat.mean)}</span>
                      </>
                    )}
                    
                    {stat.median !== undefined && (
                      <>
                        <span style={{ color: '#666' }}>Median:</span>
                        <span style={{ textAlign: 'right' }}>{formatNumber(stat.median)}</span>
                      </>
                    )}
                    
                    {stat.min !== undefined && (
                      <>
                        <span style={{ color: '#666' }}>Min:</span>
                        <span style={{ textAlign: 'right' }}>{formatNumber(stat.min)}</span>
                      </>
                    )}
                    
                    {stat.max !== undefined && (
                      <>
                        <span style={{ color: '#666' }}>Max:</span>
                        <span style={{ textAlign: 'right' }}>{formatNumber(stat.max)}</span>
                      </>
                    )}
                    
                    {stat.stdDev !== undefined && (
                      <>
                        <span style={{ color: '#666' }}>Std Dev:</span>
                        <span style={{ textAlign: 'right' }}>{formatNumber(stat.stdDev)}</span>
                      </>
                    )}
                  </div>

                  {stat.values && stat.values.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Top Values:</div>
                      {stat.values.slice(0, 5).map(({ value, count }) => (
                        <div
                          key={String(value)}
                          style={{
                            display: 'flex',
                            justifyContent:                             'space-between',
                            fontSize: 11,
                            padding: '2px 0'
                          }}
                        >
                          <span>{String(value)}</span>
                          <span style={{ color: '#666' }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {results.length === 0 && !geometryStats && (
                <div style={{ textAlign: 'center', color: '#999', padding: 20, fontSize: 13 }}>
                  No data available
                </div>
              )}

              {/* Refresh button */}
              <button
                onClick={calculateStatistics}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: '8px 12px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                Refresh Statistics
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StatisticsPanel;