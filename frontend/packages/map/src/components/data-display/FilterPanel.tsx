import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, Stack, Text, Input, Select, Button, Checkbox } from '@packages/ui';
import type { GeoJSON } from 'geojson';

export interface FilterDefinition {
  /** Property key */
  property: string;
  /** Display label */
  label?: string;
  /** Filter type */
  type: 'text' | 'number' | 'select' | 'multiselect' | 'range' | 'date' | 'boolean';
  /** Options for select/multiselect */
  options?: { value: any; label: string }[];
  /** Auto-generate options from data */
  autoOptions?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Default value */
  defaultValue?: any;
}

export interface FilterState {
  [property: string]: {
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'between';
    value: any;
  };
}

export interface FilterPanelProps {
  /** Filter definitions */
  filters: FilterDefinition[];
  /** Data source (for auto options) */
  data?: GeoJSON.FeatureCollection;
  /** Initial filter state */
  initialState?: FilterState;
  /** Callback when filters change */
  onChange?: (state: FilterState, expression: any[]) => void;
  /** Callback to apply filters */
  onApply?: (state: FilterState, expression: any[]) => void;
  /** Callback to reset */
  onReset?: () => void;
  /** Auto-apply on change */
  autoApply?: boolean;
  /** Debounce delay for auto-apply */
  debounceMs?: number;
  /** Title */
  title?: string;
  /** Collapsible */
  collapsible?: boolean;
  /** Initially collapsed */
  defaultCollapsed?: boolean;
  /** Show active filter count */
  showActiveCount?: boolean;
  /** Custom className */
  className?: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  data,
  initialState = {},
  onChange,
  onApply,
  onReset,
  autoApply = true,
  debounceMs = 300,
  title = 'Filters',
  collapsible = true,
  defaultCollapsed = false,
  showActiveCount = true,
  className
}) => {
  const [filterState, setFilterState] = useState<FilterState>(initialState);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Generate options from data
  const filtersWithOptions = useMemo(() => {
    if (!data) return filters;
    
    return filters.map(filter => {
      if (filter.autoOptions && !filter.options) {
        const values = new Set<any>();
        data.features.forEach(feature => {
          const value = feature.properties?.[filter.property];
          if (value !== null && value !== undefined) {
            values.add(value);
          }
        });
        
        const options = Array.from(values)
          .sort()
          .map(value => ({ value, label: String(value) }));
        
        return { ...filter, options };
      }
      return filter;
    });
  }, [filters, data]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.values(filterState).filter(f => 
      f.value !== undefined && 
      f.value !== '' && 
      f.value !== null &&
      !(Array.isArray(f.value) && f.value.length === 0)
    ).length;
  }, [filterState]);

  // Generate MapLibre expression from filter state
  const generateExpression = useCallback((state: FilterState): any[] | null => {
    const conditions: any[] = [];

    Object.entries(state).forEach(([property, { operator, value }]) => {
      if (value === undefined || value === '' || value === null) return;
      if (Array.isArray(value) && value.length === 0) return;

      switch (operator) {
        case 'eq':
          conditions.push(['==', ['get', property], value]);
          break;
        case 'neq':
          conditions.push(['!=', ['get', property], value]);
          break;
        case 'gt':
          conditions.push(['>', ['get', property], value]);
          break;
        case 'gte':
          conditions.push(['>=', ['get', property], value]);
          break;
        case 'lt':
          conditions.push(['<', ['get', property], value]);
          break;
        case 'lte':
          conditions.push(['<=', ['get', property], value]);
          break;
        case 'contains':
          conditions.push(['in', value.toLowerCase(), ['downcase', ['get', property]]]);
          break;
        case 'in':
          if (Array.isArray(value) && value.length > 0) {
            conditions.push(['in', ['get', property], ['literal', value]]);
          }
          break;
        case 'between':
          if (Array.isArray(value) && value.length === 2) {
            conditions.push(['all',
              ['>=', ['get', property], value[0]],
              ['<=', ['get', property], value[1]]
            ]);
          }
          break;
      }
    });

    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0];
    return ['all', ...conditions];
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((
    property: string,
    operator: FilterState[string]['operator'],
    value: any
  ) => {
    setFilterState(prev => {
      const next = {
        ...prev,
        [property]: { operator, value }
      };
      
      const expression = generateExpression(next);
      onChange?.(next, expression!);
      
      if (autoApply) {
        // Debounce apply
        clearTimeout((handleFilterChange as any).timeout);
        (handleFilterChange as any).timeout = setTimeout(() => {
          onApply?.(next, expression!);
        }, debounceMs);
      }
      
      return next;
    });
  }, [onChange, onApply, autoApply, debounceMs, generateExpression]);

  // Handle apply
  const handleApply = useCallback(() => {
    const expression = generateExpression(filterState);
    onApply?.(filterState, expression!);
  }, [filterState, onApply, generateExpression]);

  // Handle reset
  const handleReset = useCallback(() => {
    setFilterState({});
    onReset?.();
    onChange?.({}, null!);
    if (autoApply) {
      onApply?.({}, null!);
    }
  }, [onReset, onChange, onApply, autoApply]);

  return (
    <Card className={className}>
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: isCollapsed ? 'none' : '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: collapsible ? 'pointer' : 'default'
        }}
        onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text weight="bold">{title}</Text>
          {showActiveCount && activeFilterCount > 0 && (
            <span
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '50%',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </div>
        {collapsible && (
          <span style={{ color: '#6b7280' }}>
            {isCollapsed ? '▼' : '▲'}
          </span>
        )}
      </div>

      {/* Filters */}
      {!isCollapsed && (
        <div style={{ padding: 16 }}>
          <Stack spacing="md">
            {filtersWithOptions.map(filter => (
              <FilterInput
                key={filter.property}
                definition={filter}
                value={filterState[filter.property]?.value}
                operator={filterState[filter.property]?.operator}
                onChange={(operator, value) => 
                  handleFilterChange(filter.property, operator, value)
                }
              />
            ))}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={activeFilterCount === 0}
                style={{ flex: 1 }}
              >
                Reset
              </Button>
              {!autoApply && (
                <Button
                  size="sm"
                  onClick={handleApply}
                  style={{ flex: 1 }}
                >
                  Apply
                </Button>
              )}
            </div>
          </Stack>
        </div>
      )}
    </Card>
  );
};

// Individual filter input
interface FilterInputProps {
  definition: FilterDefinition;
  value: any;
  operator?: FilterState[string]['operator'];
  onChange: (operator: FilterState[string]['operator'], value: any) => void;
}

const FilterInput: React.FC<FilterInputProps> = ({
  definition,
  value,
  operator,
  onChange
}) => {
  const { property, label, type, options, placeholder } = definition;

  const handleChange = (newValue: any, newOperator?: FilterState[string]['operator']) => {
    onChange(newOperator || operator || getDefaultOperator(type), newValue);
  };

  return (
    <div>
      <Text size="sm" color="muted" style={{ marginBottom: 4 }}>
        {label || property}
      </Text>

      {type === 'text' && (
        <Input
          type="text"
          value={value || ''}
          onChange={(e) => handleChange(e.target.value, 'contains')}
          placeholder={placeholder || `Filter by ${label || property}...`}
          size="sm"
        />
      )}

      {type === 'number' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <Select
            value={operator || 'eq'}
            onChange={(e) => handleChange(value, e.target.value as any)}
            style={{ width: 80 }}
            size="sm"
          >
            <option value="eq">=</option>
            <option value="neq">≠</option>
            <option value="gt">&gt;</option>
            <option value="gte">≥</option>
            <option value="lt">&lt;</option>
            <option value="lte">≤</option>
          </Select>
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => handleChange(parseFloat(e.target.value))}
            placeholder={placeholder}
            size="sm"
            style={{ flex: 1 }}
          />
        </div>
      )}

      {type === 'select' && options && (
        <Select
          value={value ?? ''}
          onChange={(e) => handleChange(e.target.value || undefined, 'eq')}
          size="sm"
        >
          <option value="">All</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      )}

      {type === 'multiselect' && options && (
        <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 4, padding: 8 }}>
          {options.map(opt => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <input
                type="checkbox"
                checked={(value || []).includes(opt.value)}
                onChange={(e) => {
                  const current = value || [];
                  const next = e.target.checked
                    ? [...current, opt.value]
                    : current.filter((v: any) => v !== opt.value);
                  handleChange(next, 'in');
                }}
              />
              <Text size="sm">{opt.label}</Text>
            </label>
          ))}
        </div>
      )}

      {type === 'range' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input
            type="number"
            value={value?.[0] ?? ''}
            onChange={(e) => handleChange([parseFloat(e.target.value), value?.[1]], 'between')}
            placeholder="Min"
            size="sm"
          />
          <span>-</span>
          <Input
            type="number"
            value={value?.[1] ?? ''}
            onChange={(e) => handleChange([value?.[0], parseFloat(e.target.value)], 'between')}
            placeholder="Max"
            size="sm"
          />
        </div>
      )}

      {type === 'date' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input
            type="date"
            value={value?.[0] || ''}
            onChange={(e) => handleChange([e.target.value, value?.[1]], 'between')}
            size="sm"
          />
          <span>-</span>
          <Input
            type="date"
            value={value?.[1] || ''}
            onChange={(e) => handleChange([value?.[0], e.target.value], 'between')}
            size="sm"
          />
        </div>
      )}

      {type === 'boolean' && (
        <Select
          value={value === undefined ? '' : String(value)}
          onChange={(e) => {
            const v = e.target.value;
            handleChange(v === '' ? undefined : v === 'true', 'eq');
          }}
          size="sm"
        >
          <option value="">All</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>
      )}
    </div>
  );
};

function getDefaultOperator(type: FilterDefinition['type']): FilterState[string]['operator'] {
  switch (type) {
    case 'text':
      return 'contains';
    case 'multiselect':
      return 'in';
    case 'range':
    case 'date':
      return 'between';
    default:
      return 'eq';
  }
}