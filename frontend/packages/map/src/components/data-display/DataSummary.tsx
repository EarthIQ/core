import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as turf from '@turf/turf';
import { useMap } from '../../hooks/useMap';
import type { FeatureCollection, Feature } from 'geojson';

export interface DataSummaryField {
  field: string;
  label?: string;
  type: 'count' | 'sum' | 'mean' | 'min' | 'max' | 'unique' | 'custom';
  format?: (value: any) => string;
  customAggregator?: (features: Feature[]) => any;
}

export interface DataSummaryProps {
  /** Source layer ID or GeoJSON */
  source: string | FeatureCollection;
  /** Fields to summarize */
  fields: DataSummaryField[];
  /** Title */
  title?: string;
  /** Layout */
  layout?: 'horizontal' | 'vertical' | 'grid';
  /** Custom className */
  className?: string;
  /** Position */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Show loading state */
  showLoading?: boolean;
  /** Collapsible */
  collapsible?: boolean;
  /** Callback with summary data */
  onSummary?: (summary: Record<string, any>) => void;
  /** Include geometry summary */
  includeGeometrySummary?: boolean;
  /** Style variant */
  variant?: 'default' | 'compact' | 'card';
}

export const DataSummary: React.FC<DataSummaryProps> = ({
  source,
  fields,
  title = 'Data Summary',
  layout = 'vertical',
  className,
  position = 'top-right',
  showLoading = true,
  collapsible = true,
  onSummary,
  includeGeometrySummary = false,
  variant = 'default'
}) => {
  const { map, isLoaded } = useMap();
  const [summary, setSummary] = useState<Record<string, any>>({});
  const [geometrySummary, setGeometrySummary] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Get features from source
  const getFeatures = useCallback((): Feature[] => {
    if (typeof source === 'object' && 'features' in source) {
      return source.features;
    }

    if (!map || typeof source !== 'string') return [];

    const mapSource = map.getSource(source);
    if (mapSource && mapSource.type === 'geojson') {
      return ((mapSource as any)._data as FeatureCollection).features;
    }

    return [];
  }, [source, map]);

  // Calculate summary
  const calculateSummary = useCallback(() => {
    setIsLoading(true);

    try {
      const features = getFeatures();
      const result: Record<string, any> = {};

      fields.forEach(field => {
        const values = features
          .map(f => f.properties?.[field.field])
          .filter(v => v !== null && v !== undefined);

        const numericValues = values
          .map(v => parseFloat(v))
          .filter(v => !isNaN(v));

        switch (field.type) {
          case 'count':
            result[field.field] = values.length;
            break;
          case 'sum':
            result[field.field] = numericValues.reduce((a, b) => a + b, 0);
            break;
          case 'mean':
            result[field.field] = numericValues.length > 0
              ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
              : 0;
            break;
          case 'min':
            result[field.field] = numericValues.length > 0 ? Math.min(...numericValues) : null;
            break;
          case 'max':
            result[field.field] = numericValues.length > 0 ? Math.max(...numericValues) : null;
            break;
          case 'unique':
            result[field.field] = new Set(values).size;
            break;
          case 'custom':
            result[field.field] = field.customAggregator?.(features) ?? null;
            break;
        }
      });

      setSummary(result);
      onSummary?.(result);

      // Geometry summary
      if (includeGeometrySummary && features.length > 0) {
        const geoSummary: Record<string, any> = {
          totalFeatures: features.length
        };

        let totalArea = 0;
        let totalLength = 0;

        features.forEach(f => {
          try {
            if (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') {
              totalArea += turf.area(f);
            }
            if (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString') {
              totalLength += turf.length(f, { units: 'kilometers' });
            }
          } catch (e) {
            // Skip invalid geometries
          }
        });

        if (totalArea > 0) {
          geoSummary.totalArea = totalArea >= 1000000
            ? `${(totalArea / 1000000).toFixed(2)} km²`
            : `${totalArea.toFixed(0)} m²`;
        }

        if (totalLength > 0) {
          geoSummary.totalLength = `${totalLength.toFixed(2)} km`;
        }

        // Bounding box
        try {
          const fc = turf.featureCollection(features);
          const bbox = turf.bbox(fc);
          geoSummary.bounds = `${bbox[0].toFixed(4)}, ${bbox[1].toFixed(4)} - ${bbox[2].toFixed(4)}, ${bbox[3].toFixed(4)}`;
        } catch (e) {
          // Skip if bbox fails
        }

        setGeometrySummary(geoSummary);
      }
    } finally {
      setIsLoading(false);
    }
  }, [getFeatures, fields, includeGeometrySummary, onSummary]);

  // Calculate on mount and source change
  useEffect(() => {
    if (isLoaded) {
      calculateSummary();
    }
  }, [isLoaded, source, calculateSummary]);

  // Format value
  const formatValue = useCallback((field: DataSummaryField, value: any): string => {
    if (value === null || value === undefined) return '-';
    if (field.format) return field.format(value);
    if (typeof value === 'number') {
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return String(value);
  }, []);

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

  // Variant styles
  const variantStyles = useMemo(() => {
    switch (variant) {
      case 'compact':
        return { padding: 8, borderRadius: 6, minWidth: 180 };
      case 'card':
        return { padding: 16, borderRadius: 12, minWidth: 280, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' };
      default:
        return { padding: 12, borderRadius: 8, minWidth: 220 };
    }
  }, [variant]);

  if (!isLoaded) return null;

  return (
    <div
      className={className}
      style={{
        ...positionStyles,
        ...variantStyles,
        backgroundColor: 'white',
        boxShadow: variantStyles.boxShadow || '0 2px 10px rgba(0,0,0,0.1)'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isCollapsed ? 0 : (variant === 'compact' ? 8 : 12),
          cursor: collapsible ? 'pointer' : 'default'
        }}
        onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
      >
        <span style={{
          fontWeight: 600,
          fontSize: variant === 'compact' ? 12 : 14,
          color: '#333'
        }}>
          {title}
        </span>
        {collapsible && (
          <span style={{
            transform: isCollapsed ? 'rotate(-90deg)' : 'none',
            transition: 'transform 0.2s',
            color: '#666',
            fontSize: 10
          }}>
            ▼
          </span>
        )}
      </div>

      {/* Loading */}
      {showLoading && isLoading && !isCollapsed && (
        <div style={{ textAlign: 'center', color: '#999', padding: 10, fontSize: 12 }}>
          Calculating...
        </div>
      )}

      {/* Content */}
      {!isCollapsed && !isLoading && (
        <>
          {/* Field summaries */}
          <div style={{
            display: layout === 'grid' ? 'grid' : 'flex',
            flexDirection: layout === 'horizontal' ? 'row' : 'column',
            gridTemplateColumns: layout === 'grid' ? 'repeat(2, 1fr)' : undefined,
            gap: variant === 'compact' ? 6 : 10,
            flexWrap: layout === 'horizontal' ? 'wrap' : undefined
          }}>
            {fields.map(field => (
              <div
                key={field.field}
                style={{
                  display: 'flex',
                  flexDirection: layout === 'horizontal' ? 'column' : 'row',
                  justifyContent: layout === 'horizontal' ? 'center' : 'space-between',
                  alignItems: layout === 'horizontal' ? 'center' : 'baseline',
                  padding: variant === 'card' ? '8px 12px' : undefined,
                  backgroundColor: variant === 'card' ? '#f8f9fa' : undefined,
                  borderRadius: variant === 'card' ? 6 : undefined
                }}
              >
                <span style={{
                  color: '#666',
                  fontSize: variant === 'compact' ? 10 : 12
                }}>
                  {field.label || field.field}
                </span>
                <span style={{
                  fontWeight: 600,
                  fontSize: variant === 'compact' ? 12 : variant === 'card' ? 16 : 13,
                  color: '#333'
                }}>
                  {formatValue(field, summary[field.field])}
                </span>
              </div>
            ))}
          </div>

          {/* Geometry summary */}
          {includeGeometrySummary && Object.keys(geometrySummary).length > 0 && (
            <div style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid #eee'
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#666',
                marginBottom: 6
              }}>
                Geometry
              </div>
              {Object.entries(geometrySummary).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    marginBottom: 4
                  }}
                >
                  <span style={{ color: '#666' }}>{key}:</span>
                  <span style={{ fontWeight: 500, color: '#333' }}>{String(value)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Refresh button */}
          <button
            onClick={calculateSummary}
            style={{
              width: '100%',
              marginTop: 12,
              padding: variant === 'compact' ? '4px 8px' : '6px 12px',
              backgroundColor: '#f0f0f0',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
              color: '#666'
            }}
          >
            ↻ Refresh
          </button>
        </>
      )}
    </div>
  );
};

export default DataSummary;