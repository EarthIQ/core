import React, { useState, useMemo } from 'react';
import { Card, Stack, Text, Input, Button, Tabs } from '@packages/ui';
import type { GeoJSON } from 'geojson';

export interface AttributePanelProps {
  /** Selected feature */
  feature: GeoJSON.Feature | null;
  /** Editable mode */
  editable?: boolean;
  /** Callback on property change */
  onPropertyChange?: (key: string, value: any) => void;
  /** Callback on save */
  onSave?: (feature: GeoJSON.Feature) => void;
  /** Callback on delete */
  onDelete?: (feature: GeoJSON.Feature) => void;
  /** Properties to exclude */
  excludeProperties?: string[];
  /** Property display config */
  propertyConfig?: Record<string, PropertyConfig>;
  /** Show geometry info */
  showGeometry?: boolean;
  /** Show coordinates */
  showCoordinates?: boolean;
  /** Custom header */
  header?: React.ReactNode;
  /** Custom footer */
  footer?: React.ReactNode;
  /** Max height */
  maxHeight?: string;
  /** Title field */
  titleField?: string;
}

export interface PropertyConfig {
  label?: string;
  type?: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'color';
  options?: { value: any; label: string }[];
  editable?: boolean;
  hidden?: boolean;
  format?: (value: any) => string;
}

export const AttributePanel: React.FC<AttributePanelProps> = ({
  feature,
  editable = false,
  onPropertyChange,
  onSave,
  onDelete,
  excludeProperties = ['id'],
  propertyConfig = {},
  showGeometry = true,
  showCoordinates = false,
  header,
  footer,
  maxHeight = '400px',
  titleField
}) => {
  const [editedProperties, setEditedProperties] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'properties' | 'geometry'>('properties');

  // Merge original and edited properties
  const properties = useMemo(() => {
    if (!feature) return {};
    return { ...feature.properties, ...editedProperties };
  }, [feature, editedProperties]);

  // Get displayable properties
  const displayProperties = useMemo(() => {
    return Object.entries(properties)
      .filter(([key]) => !excludeProperties.includes(key))
      .filter(([key]) => !propertyConfig[key]?.hidden)
      .map(([key, value]) => ({
        key,
        value,
        config: propertyConfig[key] || {}
      }));
  }, [properties, excludeProperties, propertyConfig]);

  const handlePropertyChange = (key: string, value: any) => {
    setEditedProperties(prev => ({ ...prev, [key]: value }));
    onPropertyChange?.(key, value);
  };

  const handleSave = () => {
    if (!feature) return;
    const updatedFeature: GeoJSON.Feature = {
      ...feature,
      properties: { ...feature.properties, ...editedProperties }
    };
    onSave?.(updatedFeature);
    setEditedProperties({});
  };

  const handleReset = () => {
    setEditedProperties({});
  };

  const getGeometryInfo = () => {
    if (!feature) return null;
    
    const { geometry } = feature;
    const info: Record<string, any> = {
      type: geometry.type
    };

    switch (geometry.type) {
      case 'Point':
        info.coordinates = geometry.coordinates;
        break;
      case 'LineString':
        info.points = geometry.coordinates.length;
        break;
      case 'Polygon':
        info.rings = geometry.coordinates.length;
        info.points = geometry.coordinates.reduce((sum, ring) => sum + ring.length, 0);
        break;
      case 'MultiPoint':
        info.points = geometry.coordinates.length;
        break;
      case 'MultiLineString':
        info.lines = geometry.coordinates.length;
        info.points = geometry.coordinates.reduce((sum, line) => sum + line.length, 0);
        break;
      case 'MultiPolygon':
        info.polygons = geometry.coordinates.length;
        break;
    }

    return info;
  };

  if (!feature) {
    return (
      <Card style={{ padding: 16 }}>
        <Text color="muted" style={{ textAlign: 'center' }}>
          Select a feature to view attributes
        </Text>
      </Card>
    );
  }

  const title = titleField ? properties[titleField] : feature.id || 'Feature';
  const geometryInfo = getGeometryInfo();
  const hasChanges = Object.keys(editedProperties).length > 0;

  return (
    <Card style={{ maxHeight, overflow: 'auto' }}>
      {/* Header */}
      {header || (
        <div style={{ 
          padding: '12px 16px', 
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Text weight="bold">{title}</Text>
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(feature)}
              style={{ color: '#ef4444' }}
            >
              Delete
            </Button>
          )}
        </div>
      )}

      {/* Tabs */}
      {showGeometry && (
        <div style={{ borderBottom: '1px solid #e5e7eb' }}>
          <Tabs
            value={activeTab}
            onChange={(tab) => setActiveTab(tab as any)}
            tabs={[
              { value: 'properties', label: 'Properties' },
              { value: 'geometry', label: 'Geometry' }
            ]}
          />
        </div>
      )}

      {/* Content */}
      <div style={{ padding: 16 }}>
        {activeTab === 'properties' && (
          <Stack spacing="sm">
            {displayProperties.map(({ key, value, config }) => (
              <div key={key}>
                <Text size="xs" color="muted" style={{ marginBottom: 4 }}>
                  {config.label || formatLabel(key)}
                </Text>
                
                {editable && config.editable !== false ? (
                  <PropertyInput
                    type={config.type || 'text'}
                    value={value}
                    options={config.options}
                    onChange={(v) => handlePropertyChange(key, v)}
                  />
                ) : (
                  <Text>
                    {config.format 
                      ? config.format(value) 
                      : formatValue(value, config.type)}
                  </Text>
                )}
              </div>
            ))}

            {displayProperties.length === 0 && (
              <Text color="muted">No properties</Text>
            )}
          </Stack>
        )}

        {activeTab === 'geometry' && geometryInfo && (
          <Stack spacing="sm">
            {Object.entries(geometryInfo).map(([key, value]) => (
              <div key={key}>
                <Text size="xs" color="muted" style={{ marginBottom: 4 }}>
                  {formatLabel(key)}
                </Text>
                <Text>
                  {Array.isArray(value) 
                    ? value.map(v => typeof v === 'number' ? v.toFixed(6) : v).join(', ')
                    : value}
                </Text>
              </div>
            ))}

            {showCoordinates && feature.geometry.type === 'Point' && (
              <div>
                <Text size="xs" color="muted" style={{ marginBottom: 4 }}>
                  Coordinates (lat, lng)
                </Text>
                <Text style={{ fontFamily: 'monospace' }}>
                  {(feature.geometry as GeoJSON.Point).coordinates[1].toFixed(6)},{' '}
                  {(feature.geometry as GeoJSON.Point).coordinates[0].toFixed(6)}
                </Text>
              </div>
            )}
          </Stack>
        )}
      </div>

      {/* Footer with save/reset buttons */}
      {editable && hasChanges && (
        <div style={{ 
          padding: '12px 16px', 
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end'
        }}>
          <Button size="sm" variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      )}

      {footer}
    </Card>
  );
};

// Property input component
interface PropertyInputProps {
  type: string;
  value: any;
  options?: { value: any; label: string }[];
  onChange: (value: any) => void;
}

const PropertyInput: React.FC<PropertyInputProps> = ({
  type,
  value,
  options,
  onChange
}) => {
  switch (type) {
    case 'boolean':
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case 'number':
      return (
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          size="sm"
        />
      );
    case 'date':
      return (
        <Input
          type="date"
          value={value ? new Date(value).toISOString().split('T')[0] : ''}
          onChange={(e) => onChange(e.target.value)}
          size="sm"
        />
      );
    case 'select':
      return (
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: '100%', padding: '6px 8px' }}
        >
          <option value="">Select...</option>
          {options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    case 'color':
      return (
        <input
          type="color"
          value={value ?? '#000000'}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return (
        <Input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          size="sm"
        />
      );
  }
};

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function formatValue(value: any, type?: string): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  if (type === 'date' && value) {
    return new Date(value).toLocaleDateString();
  }
  return String(value);
}