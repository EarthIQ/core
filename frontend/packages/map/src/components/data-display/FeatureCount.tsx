import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useMap } from '../../hooks/useMap';
import type { FeatureCollection } from 'geojson';

export interface FeatureCountProps {
  /** Source layer ID or GeoJSON */
  source: string | FeatureCollection;
  /** Label to display */
  label?: string;
  /** Icon */
  icon?: React.ReactNode;
  /** Count only visible features in viewport */
  viewportOnly?: boolean;
  /** Filter function */
  filter?: (feature: any) => boolean;
  /** Format function */
  format?: (count: number) => string;
  /** Custom className */
  className?: string;
  /** Position */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Show breakdown by geometry type */
  showBreakdown?: boolean;
  /** Callback on count change */
  onCountChange?: (count: number) => void;
  /** Update interval in ms (0 = manual only) */
  updateInterval?: number;
}

export const FeatureCount: React.FC<FeatureCountProps> = ({
  source,
  label = 'Features',
  icon,
  viewportOnly = false,
  filter,
  format,
  className,
  position = 'bottom-left',
  size = 'medium',
  showBreakdown = false,
  onCountChange,
  updateInterval = 0
}) => {
  const { map, isLoaded } = useMap();
  const [count, setCount] = useState(0);
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Get features from source
  const getFeatures = useCallback((): any[] => {
    if (typeof source === 'object' && 'features' in source) {
      return source.features;
    }

    if (!map || typeof source !== 'string') return [];

    if (viewportOnly) {
      // Query rendered features
      const layers = map.getStyle().layers?.filter(l => {
        const layerSource = (l as any).source;
        return layerSource === source;
      }).map(l => l.id) || [];

      if (layers.length > 0) {
        return map.queryRenderedFeatures(undefined, { layers });
      }
    }

    // Get from source directly
    const mapSource = map.getSource(source);
    if (mapSource && mapSource.type === 'geojson') {
      return ((mapSource as any)._data as FeatureCollection).features;
    }

    return [];
  }, [source, map, viewportOnly]);

  // Update count
  const updateCount = useCallback(() => {
    setIsLoading(true);

    try {
      let features = getFeatures();

      // Apply filter
      if (filter) {
        features = features.filter(filter);
      }

      setCount(features.length);
      onCountChange?.(features.length);

      // Calculate breakdown
      if (showBreakdown) {
        const typeCount: Record<string, number> = {};
        features.forEach(f => {
          const type = f.geometry?.type || 'Unknown';
          typeCount[type] = (typeCount[type] || 0) + 1;
        });
        setBreakdown(typeCount);
      }
    } finally {
      setIsLoading(false);
    }
  }, [getFeatures, filter, showBreakdown, onCountChange]);

  // Initial count and event listeners
  useEffect(() => {
    if (!isLoaded) return;

    updateCount();

    if (map && viewportOnly) {
      map.on('moveend', updateCount);
      map.on('zoomend', updateCount);

      return () => {
        map.off('moveend', updateCount);
        map.off('zoomend', updateCount);
      };
    }
  }, [isLoaded, map, viewportOnly, updateCount]);

  // Update on source change
  useEffect(() => {
    if (isLoaded) {
      updateCount();
    }
  }, [source, isLoaded, updateCount]);

  // Interval updates
  useEffect(() => {
    if (updateInterval > 0) {
      const intervalId = setInterval(updateCount, updateInterval);
      return () => clearInterval(intervalId);
    }
  }, [updateInterval, updateCount]);

  // Format count
  const formattedCount = useMemo(() => {
    if (format) return format(count);
    
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toLocaleString();
  }, [count, format]);

  // Size styles
  const sizeStyles = useMemo(() => {
    switch (size) {
      case 'small':
        return { padding: '4px 8px', fontSize: 11 };
      case 'large':
        return { padding: '12px 20px', fontSize: 16 };
      case 'medium':
      default:
        return { padding: '8px 14px', fontSize: 13 };
    }
  }, [size]);

  // Position styles
  const positionStyles = useMemo(() => {
    const base = { position: 'absolute' as const, zIndex: 1000 };
    const offset = 10;
    
    switch (position) {
      case 'top-left': return { ...base, top: offset, left: offset };
      case 'top-right': return { ...base, top: offset, right: offset };
      case 'bottom-left': return { ...base, bottom: offset, left: offset };
      case 'bottom-right': return { ...base, bottom: offset, right: offset };
      default: return { ...base, bottom: offset, left: offset };
    }
  }, [position]);

  // Default icon
  const defaultIcon = (
    <svg width={size === 'small' ? 12 : size === 'large' ? 18 : 14} height={size === 'small' ? 12 : size === 'large' ? 18 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );

  if (!isLoaded) return null;

  return (
    <div
      className={className}
      style={{
        ...positionStyles,
        backgroundColor: 'white',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        ...sizeStyles
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        {icon || defaultIcon}
        <div>
          <div style={{
            fontWeight: 600,
            color: isLoading ? '#999' : '#333'
          }}>
            {isLoading ? '...' : formattedCount}
          </div>
          <div style={{
            fontSize: size === 'small' ? 9 : size === 'large' ? 12 : 10,
            color: '#666'
          }}>
            {label}
            {viewportOnly && ' (visible)'}
          </div>
        </div>
      </div>

      {/* Breakdown */}
      {showBreakdown && Object.keys(breakdown).length > 0 && (
        <div style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: '1px solid #eee',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6
        }}>
          {Object.entries(breakdown).map(([type, typeCount]) => (
            <span
              key={type}
              style={{
                padding: '2px 6px',
                backgroundColor: '#f0f0f0',
                borderRadius: 4,
                fontSize: 10,
                color: '#666'
              }}
            >
              {type}: {typeCount}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeatureCount;