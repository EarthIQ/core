import React, { useState, useMemo, useCallback } from 'react';
import { useMap } from '../../hooks/useMap';
import { Table, Input, Select, Pagination, Button, Stack } from '@packages/ui';
import type { GeoJSON } from 'geojson';

export interface FeatureTableProps {
  /** GeoJSON data source */
  data: GeoJSON.FeatureCollection;
  /** Columns to display (defaults to all properties) */
  columns?: ColumnConfig[];
  /** Enable row selection */
  selectable?: boolean;
  /** Enable column sorting */
  sortable?: boolean;
  /** Enable filtering */
  filterable?: boolean;
  /** Enable pagination */
  pagination?: boolean;
  /** Page size */
  pageSize?: number;
  /** Highlight selected feature on map */
  highlightOnSelect?: boolean;
  /** Zoom to feature on click */
  zoomOnClick?: boolean;
  /** Callback on row select */
  onSelect?: (features: GeoJSON.Feature[]) => void;
  /** Callback on row click */
  onRowClick?: (feature: GeoJSON.Feature) => void;
  /** Export options */
  exportable?: boolean;
  /** Max height */
  maxHeight?: string;
}

export interface ColumnConfig {
  key: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  render?: (value: any, feature: GeoJSON.Feature) => React.ReactNode;
}

export const FeatureTable: React.FC<FeatureTableProps> = ({
  data,
  columns: propColumns,
  selectable = true,
  sortable = true,
  filterable = true,
  pagination = true,
  pageSize = 25,
  highlightOnSelect = true,
  zoomOnClick = true,
  onSelect,
  onRowClick,
  exportable = true,
  maxHeight = '400px'
}) => {
  const { map, isLoaded } = useMap();
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Generate columns from data if not provided
  const columns = useMemo(() => {
    if (propColumns) return propColumns;
    
    const sampleFeature = data.features[0];
    if (!sampleFeature?.properties) return [];

    return Object.keys(sampleFeature.properties).map(key => ({
      key,
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      sortable: true,
      filterable: true
    }));
  }, [data, propColumns]);

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data.features];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(feature => 
        Object.values(feature.properties || {}).some(value =>
          String(value).toLowerCase().includes(term)
        )
      );
    }

    // Apply column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        result = result.filter(feature =>
          String(feature.properties?.[key] || '').toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a.properties?.[sortConfig.key];
        const bVal = b.properties?.[sortConfig.key];
        
        if (aVal === bVal) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        const comparison = aVal < bVal ? -1 : 1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchTerm, filters, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return processedData;
    
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  // Handle row selection
  const handleRowSelect = useCallback((feature: GeoJSON.Feature, checked: boolean) => {
    const id = feature.id || feature.properties?.id;
    
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });

    // Highlight on map
    if (highlightOnSelect && map && isLoaded) {
      const sourceId = 'feature-table-highlight';
      const selectedFeatures = data.features.filter(f => 
        selectedIds.has(f.id || f.properties?.id) || (checked && (f.id || f.properties?.id) === id)
      );

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: selectedFeatures }
        });
        map.addLayer({
          id: `${sourceId}-layer`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#ef4444',
            'line-width': 3
          }
        });
      } else {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: selectedFeatures
        });
      }
    }

    onSelect?.(data.features.filter(f => selectedIds.has(f.id || f.properties?.id)));
  }, [data, selectedIds, highlightOnSelect, map, isLoaded, onSelect]);

  // Handle row click
  const handleRowClick = useCallback((feature: GeoJSON.Feature) => {
    onRowClick?.(feature);

    // Zoom to feature
    if (zoomOnClick && map && isLoaded && feature.geometry) {
      const bounds = getBounds(feature.geometry);
      map.fitBounds(bounds as any, { padding: 50, maxZoom: 16 });
    }
  }, [zoomOnClick, map, isLoaded, onRowClick]);

  // Handle sort
  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  }, []);

  // Export functions
  const exportToCSV = useCallback(() => {
    const headers = columns.map(c => c.header).join(',');
    const rows = processedData.map(f => 
      columns.map(c => JSON.stringify(f.properties?.[c.key] ?? '')).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'features.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [processedData, columns]);

  const exportToGeoJSON = useCallback(() => {
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: processedData
    };
    
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'features.geojson';
    a.click();
    URL.revokeObjectURL(url);
  }, [processedData]);

  return (
    <div style={{ maxHeight, overflow: 'auto' }}>
      <Stack spacing="md" style={{ marginBottom: 16 }}>
        {/* Search and controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search all columns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 250 }}
          />
          
          <span style={{ color: '#6b7280', fontSize: 14 }}>
            {processedData.length} features
            {selectedIds.size > 0 && ` (${selectedIds.size} selected)`}
          </span>

          {exportable && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <Button size="sm" variant="outline" onClick={exportToCSV}>
                Export CSV
              </Button>
              <Button size="sm" variant="outline" onClick={exportToGeoJSON}>
                Export GeoJSON
              </Button>
            </div>
          )}
        </div>

        {/* Column filters */}
        {filterable && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {columns.filter(c => c.filterable !== false).slice(0, 4).map(col => (
              <Input
                key={col.key}
                placeholder={`Filter ${col.header}...`}
                size="sm"
                value={filters[col.key] || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, [col.key]: e.target.value }))}
                style={{ width: 150 }}
              />
            ))}
          </div>
        )}
      </Stack>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            {selectable && (
              <th style={{ padding: 8, width: 40 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.size === processedData.length && processedData.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(processedData.map(f => f.id || f.properties?.id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                />
              </th>
            )}
            {columns.map(col => (
              <th
                key={col.key}
                style={{ 
                  padding: 8, 
                  textAlign: 'left',
                  cursor: col.sortable !== false && sortable ? 'pointer' : 'default',
                  width: col.width,
                  userSelect: 'none'
                }}
                onClick={() => col.sortable !== false && sortable && handleSort(col.key)}
              >
                {col.header}
                {sortConfig?.key === col.key && (
                  <span style={{ marginLeft: 4 }}>
                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((feature, idx) => {
            const id = feature.id || feature.properties?.id || idx;
            return (
              <tr
                key={id}
                style={{
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: selectedIds.has(id) ? '#eff6ff' : undefined,
                  cursor: 'pointer'
                }}
                onClick={() => handleRowClick(feature)}
              >
                {selectable && (
                  <td style={{ padding: 8 }} onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(id)}
                      onChange={(e) => handleRowSelect(feature, e.target.checked)}
                    />
                  </td>
                )}
                {columns.map(col => (
                  <td key={col.key} style={{ padding: 8 }}>
                    {col.render 
                      ? col.render(feature.properties?.[col.key], feature)
                      : formatValue(feature.properties?.[col.key])
                    }
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

function formatValue(value: any): string {
  if (value == null) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function getBounds(geometry: GeoJSON.Geometry): [[number, number], [number, number]] {
  const coords = getAllCoordinates(geometry);
  const lngs = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)]
  ];
}

function getAllCoordinates(geometry: GeoJSON.Geometry): [number, number][] {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates as [number, number]];
    case 'LineString':
    case 'MultiPoint':
      return geometry.coordinates as [number, number][];
    case 'Polygon':
    case 'MultiLineString':
      return (geometry.coordinates as [number, number][][]).flat();
    case 'MultiPolygon':
      return (geometry.coordinates as [number, number][][][]).flat(2);
    case 'GeometryCollection':
      return geometry.geometries.flatMap(getAllCoordinates);
    default:
      return [];
  }
}