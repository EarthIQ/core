import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useMap } from '../../hooks/useMap';
import type { Feature } from 'geojson';

export interface PropertyInspectorProps {
  /** Layer IDs to inspect */
  layers?: string[];
  /** Show on hover instead of click */
  showOnHover?: boolean;
  /** Maximum properties to show */
  maxProperties?: number;
  /** Properties to exclude */
  excludeProperties?: string[];
  /** Properties to include (whitelist) */
  includeProperties?: string[];
  /** Custom property formatters */
  formatters?: Record<string, (value: any) => string>;
  /** Custom property labels */
  labels?: Record<string, string>;
  /** Show geometry info */
  showGeometryInfo?: boolean;
  /** Title */
  title?: string;
  /** Custom className */
  className?: string;
  /** Position */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'follow-cursor';
  /** Callback when feature is inspected */
  onInspect?: (feature: Feature | null) => void;
  /** Enable copy to clipboard */
  enableCopy?: boolean;
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  layers,
  showOnHover = false,
  maxProperties = 20,
  excludeProperties = [],
  includeProperties,
  formatters = {},
  labels = {},
  showGeometryInfo = true,
  title = 'Feature Properties',
  className,
  position = 'top-right',
  onInspect,
  enableCopy = true
}) => {
  const { map, isLoaded } = useMap();
  const [feature, setFeature] = useState<Feature | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Handle feature inspection
  const handleFeature = useCallback((e: any) => {
    if (!map) return;

    const queryLayers = layers || map.getStyle().layers?.map(l => l.id) || [];
    const features = map.queryRenderedFeatures(e.point, { layers: queryLayers });

    if (features && features.length > 0) {
      const topFeature = features[0] as unknown as Feature;
      setFeature(topFeature);
      setIsVisible(true);
      onInspect?.(topFeature);

      if (position === 'follow-cursor') {
        setCursorPosition({ x: e.point.x, y: e.point.y });
      }
    } else {
      if (showOnHover) {
        setFeature(null);
        setIsVisible(false);
        onInspect?.(null);
      }
    }
  }, [map, layers, position, showOnHover, onInspect]);

  // Handle click away
  const handleClickAway = useCallback(() => {
    if (!showOnHover) {
      setFeature(null);
      setIsVisible(false);
      onInspect?.(null);
    }
  }, [showOnHover, onInspect]);

  // Set up event listeners
  useEffect(() => {
    if (!map || !isLoaded) return;

    const eventType = showOnHover ? 'mousemove' : 'click';
    map.on(eventType, handleFeature);

    if (!showOnHover) {
      // Add click listener to close panel
      const handleMapClick = (e: any) => {
        const queryLayers = layers || map.getStyle().layers?.map(l => l.id) || [];
        const features = map.queryRenderedFeatures(e.point, { layers: queryLayers });
        if (!features || features.length === 0) {
          handleClickAway();
        }
      };
      map.on('click', handleMapClick);

      return () => {
        map.off(eventType, handleFeature);
        map.off('click', handleMapClick);
      };
    }

    return () => {
      map.off(eventType, handleFeature);
    };
  }, [map, isLoaded, showOnHover, layers, handleFeature, handleClickAway]);

  // Filter and format properties
  const displayProperties = useMemo(() => {
    if (!feature?.properties) return [];

    let props = Object.entries(feature.properties);

    // Apply whitelist if provided
    if (includeProperties && includeProperties.length > 0) {
      props = props.filter(([key]) => includeProperties.includes(key));
    }

    // Apply blacklist
    props = props.filter(([key]) => !excludeProperties.includes(key));

    // Limit count
    props = props.slice(0, maxProperties);

    // Format values
    return props.map(([key, value]) => {
      const label = labels[key] || key;
      const formatter = formatters[key];
      let displayValue = formatter ? formatter(value) : String(value ?? 'null');

      // Truncate long values
      if (displayValue.length > 100) {
        displayValue = displayValue.slice(0, 100) + '...';
      }

      return { key, label, value, displayValue };
    });
  }, [feature, includeProperties, excludeProperties, maxProperties, labels, formatters]);

  // Copy value to clipboard
  const copyToClipboard = useCallback(async (key: string, value: any) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 1500);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  }, []);

  // Get geometry info
  const geometryInfo = useMemo(() => {
    if (!feature?.geometry || !showGeometryInfo) return null;

    const info: Record<string, string> = {
      Type: feature.geometry.type
    };

    if (feature.geometry.type === 'Point') {
      const coords = (feature.geometry as any).coordinates;
      info['Coordinates'] = `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;
    } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      try {
        const turf = require('@turf/turf');
        const area = turf.area(feature);
        if (area >= 1000000) {
          info['Area'] = `${(area / 1000000).toFixed(2)} km²`;
        } else {
          info['Area'] = `${area.toFixed(0)} m²`;
        }
      } catch (e) {
        // Turf not available
      }
    } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
      try {
        const turf = require('@turf/turf');
        const length = turf.length(feature, { units: 'kilometers' });
        info['Length'] = `${length.toFixed(2)} km`;
      } catch (e) {
        // Turf not available
      }
    }

    return info;
  }, [feature, showGeometryInfo]);

  // Position styles
  const positionStyles = useMemo(() => {
    const base = { position: 'absolute' as const, zIndex: 1000 };
    const offset = 10;

    if (position === 'follow-cursor') {
      return {
        ...base,
        left: cursorPosition.x + 15,
        top: cursorPosition.y + 15,
        maxWidth: 300
      };
    }
    
    switch (position) {
      case 'top-left': return { ...base, top: offset, left: offset };
      case 'top-right': return { ...base, top: offset, right: offset };
      case 'bottom-left': return { ...base, bottom: offset, left: offset };
      case 'bottom-right': return { ...base, bottom: offset, right: offset };
      default: return { ...base, top: offset, right: offset };
    }
  }, [position, cursorPosition]);

  if (!isLoaded || !isVisible || !feature) return null;

  return (
    <div
      className={className}
      style={{
        ...positionStyles,
        backgroundColor: 'white',
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        minWidth: 250,
        maxWidth: 350,
        maxHeight: 400,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        backgroundColor: '#3498db',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
        {!showOnHover && (
          <button
            onClick={handleClickAway}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 12, overflowY: 'auto', maxHeight: 340 }}>
        {/* Geometry info */}
        {geometryInfo && (
          <div style={{
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: '1px solid #eee'
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6 }}>
              Geometry
            </div>
            {Object.entries(geometryInfo).map(([key, value]) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  marginBottom: 4
                }}
              >
                <span style={{ color: '#666' }}>{key}:</span>
                <span style={{ fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Properties */}
        <div style={{ fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6 }}>
          Attributes
        </div>
        
        {displayProperties.length === 0 ? (
          <div style={{ color: '#999', fontSize: 12, fontStyle: 'italic' }}>
            No properties available
          </div>
        ) : (
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <tbody>
              {displayProperties.map(({ key, label, value, displayValue }) => (
                <tr
                  key={key}
                  style={{ borderBottom: '1px solid #f0f0f0' }}
                >
                  <td style={{
                    padding: '6px 8px 6px 0',
                    color: '#666',
                    verticalAlign: 'top',
                    width: '40%'
                  }}>
                    {label}
                  </td>
                  <td style={{
                    padding: '6px 0',
                    wordBreak: 'break-word',
                    position: 'relative'
                  }}>
                    <span>{displayValue}</span>
                    {enableCopy && value !== null && value !== undefined && (
                      <button
                        onClick={() => copyToClipboard(key, value)}
                        style={{
                          marginLeft: 8,
                          padding: '2px 6px',
                          fontSize: 10,
                          backgroundColor: copiedField === key ? '#27ae60' : '#eee',
                          color: copiedField === key ? 'white' : '#666',
                          border: 'none',
                          borderRadius: 3,
                          cursor: 'pointer'
                        }}
                      >
                        {copiedField === key ? '✓' : 'Copy'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Layer info */}
        {(feature as any).layer && (
          <div style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid #eee',
            fontSize: 11,
            color: '#999'
          }}>
            Layer: {(feature as any).layer.id}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyInspector;