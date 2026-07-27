import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useMap } from '../../hooks/useMap';
import type { FeatureCollection } from 'geojson';

export interface ChartData {
  label: string;
  value: number;
  color?: string;
}

export interface ChartOverlayProps {
  /** Chart type */
  type: 'bar' | 'pie' | 'donut' | 'line' | 'area';
  /** Data source - layer ID, GeoJSON, or direct data */
  source?: string | FeatureCollection | ChartData[];
  /** Field to aggregate */
  valueField?: string;
  /** Field for labels/categories */
  labelField?: string;
  /** Aggregation method */
  aggregation?: 'sum' | 'count' | 'mean' | 'min' | 'max';
  /** Chart title */
  title?: string;
  /** Chart width */
  width?: number;
  /** Chart height */
  height?: number;
  /** Color palette */
  colors?: string[];
  /** Show legend */
  showLegend?: boolean;
  /** Show values on chart */
  showValues?: boolean;
  /** Custom className */
  className?: string;
  /** Position */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Collapsible */
  collapsible?: boolean;
  /** Callback on bar/segment click */
  onSegmentClick?: (data: ChartData, index: number) => void;
}

export const ChartOverlay: React.FC<ChartOverlayProps> = ({
  type,
  source,
  valueField,
  labelField,
  aggregation = 'sum',
  title,
  width = 280,
  height = 200,
  colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'],
  showLegend = true,
  showValues = true,
  className,
  position = 'bottom-left',
  collapsible = true,
  onSegmentClick
}) => {
  const { map, isLoaded } = useMap();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Get chart data from source
  const chartData = useMemo((): ChartData[] => {
    // Direct data array
    if (Array.isArray(source)) {
      return source.map((item, i) => ({
        ...item,
        color: item.color || colors[i % colors.length]
      }));
    }

    // GeoJSON or layer source
    let features: any[] = [];

    if (typeof source === 'object' && 'features' in source) {
      features = source.features;
    } else if (typeof source === 'string' && map) {
      const mapSource = map.getSource(source);
      if (mapSource && mapSource.type === 'geojson') {
        features = ((mapSource as any)._data as FeatureCollection).features;
      }
    }

    if (features.length === 0 || !labelField) {
      return [];
    }

    // Aggregate data by label field
    const aggregatedData = new Map<string, number[]>();

    features.forEach(feature => {
      const label = String(feature.properties?.[labelField] || 'Unknown');
      const value = valueField ? parseFloat(feature.properties?.[valueField]) : 1;

      if (!isNaN(value)) {
        if (!aggregatedData.has(label)) {
          aggregatedData.set(label, []);
        }
        aggregatedData.get(label)!.push(value);
      }
    });

    // Apply aggregation
    return Array.from(aggregatedData.entries()).map(([label, values], index) => {
      let value: number;

      switch (aggregation) {
        case 'count':
          value = values.length;
          break;
        case 'sum':
          value = values.reduce((a, b) => a + b, 0);
          break;
        case 'mean':
          value = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'min':
          value = Math.min(...values);
          break;
        case 'max':
          value = Math.max(...values);
          break;
        default:
          value = values.reduce((a, b) => a + b, 0);
      }

      return {
        label,
        value,
        color: colors[index % colors.length]
      };
    }).sort((a, b) => b.value - a.value);
  }, [source, map, labelField, valueField, aggregation, colors]);

  // Calculate totals and max for scaling
  const { total, maxValue } = useMemo(() => ({
    total: chartData.reduce((sum, d) => sum + d.value, 0),
    maxValue: Math.max(...chartData.map(d => d.value), 1)
  }), [chartData]);

  // Render bar chart
  const renderBarChart = () => {
    const barHeight = Math.max(20, (height - 40) / chartData.length - 4);
    
    return (
      <svg width={width - 32} height={height}>
        {chartData.map((data, index) => {
          const barWidth = (data.value / maxValue) * (width - 120);
          const y = index * (barHeight + 4) + 10;
          const isHovered = hoveredIndex === index;

          return (
            <g
              key={data.label}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onSegmentClick?.(data, index)}
              style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
            >
              {/* Bar */}
              <rect
                x={80}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={data.color}
                opacity={isHovered ? 1 : 0.8}
                rx={2}
              />
              {/* Label */}
              <text
                x={75}
                y={y + barHeight / 2 + 4}
                textAnchor="end"
                fontSize={11}
                fill="#333"
              >
                {data.label.length > 10 ? `${data.label.slice(0, 10)}...` : data.label}
              </text>
              {/* Value */}
              {showValues && (
                <text
                  x={85 + barWidth}
                  y={y + barHeight / 2 + 4}
                  fontSize={10}
                  fill="#666"
                >
                  {data.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  // Render pie/donut chart
  const renderPieChart = () => {
    const centerX = (width - 32) / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    const innerRadius = type === 'donut' ? radius * 0.6 : 0;

    let currentAngle = -Math.PI / 2;

    return (
      <svg width={width - 32} height={height}>
        {chartData.map((data, index) => {
          const sliceAngle = (data.value / total) * Math.PI * 2;
          const startAngle = currentAngle;
          const endAngle = currentAngle + sliceAngle;
          currentAngle = endAngle;

          const isHovered = hoveredIndex === index;
          const hoverOffset = isHovered ? 5 : 0;

          // Calculate path
          const x1 = centerX + (radius + hoverOffset) * Math.cos(startAngle);
          const y1 = centerY + (radius + hoverOffset) * Math.sin(startAngle);
          const x2 = centerX + (radius + hoverOffset) * Math.cos(endAngle);
          const y2 = centerY + (radius + hoverOffset) * Math.sin(endAngle);

          const ix1 = centerX + innerRadius * Math.cos(startAngle);
          const iy1 = centerY + innerRadius * Math.sin(startAngle);
          const ix2 = centerX + innerRadius * Math.cos(endAngle);
          const iy2 = centerY + innerRadius * Math.sin(endAngle);

          const largeArc = sliceAngle > Math.PI ? 1 : 0;

          let path: string;
          if (innerRadius > 0) {
            path = `
              M ${x1} ${y1}
              A ${radius + hoverOffset} ${radius + hoverOffset} 0 ${largeArc} 1 ${x2} ${y2}
              L ${ix2} ${iy2}
              A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}
              Z
            `;
          } else {
            path = `
              M ${centerX} ${centerY}
              L ${x1} ${y1}
              A ${radius + hoverOffset} ${radius + hoverOffset} 0 ${largeArc} 1 ${x2} ${y2}
              Z
            `;
          }

          // Label position
          const labelAngle = startAngle + sliceAngle / 2;
          const labelRadius = radius * 0.7;
          const labelX = centerX + labelRadius * Math.cos(labelAngle);
          const labelY = centerY + labelRadius * Math.sin(labelAngle);

          return (
            <g
              key={data.label}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onSegmentClick?.(data, index)}
              style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
            >
              <path
                d={path}
                fill={data.color}
                stroke="white"
                strokeWidth={2}
                opacity={isHovered ? 1 : 0.9}
              />
              {showValues && sliceAngle > 0.3 && (
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="white"
                  fontWeight="bold"
                >
                  {((data.value / total) * 100).toFixed(0)}%
                </text>
              )}
            </g>
          );
        })}

        {/* Center text for donut */}
        {type === 'donut' && (
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={14}
            fontWeight="bold"
            fill="#333"
          >
            {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </text>
        )}
      </svg>
    );
  };

  // Render line/area chart
  const renderLineChart = () => {
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - 32 - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const xStep = chartWidth / Math.max(chartData.length - 1, 1);

    const points = chartData.map((data, index) => ({
      x: padding.left + index * xStep,
      y: padding.top + chartHeight - (data.value / maxValue) * chartHeight,
      data
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1]?.x || 0} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

    return (
      <svg width={width - 32} height={height}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const y = padding.top + chartHeight * (1 - ratio);
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke="#eee"
                strokeWidth={1}
              />
              <text
                x={padding.left - 5}
                y={y + 4}
                textAnchor="end"
                fontSize={9}
                fill="#999"
              >
                {(maxValue * ratio).toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        {type === 'area' && (
          <path
            d={areaPath}
            fill={colors[0]}
            opacity={0.3}
          />
        )}

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={colors[0]}
          strokeWidth={2}
        />

        {/* Points */}
        {points.map((point, index) => (
          <g
            key={index}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => onSegmentClick?.(point.data, index)}
            style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
          >
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === index ? 6 : 4}
              fill={colors[0]}
              stroke="white"
              strokeWidth={2}
            />
            {hoveredIndex === index && (
              <text
                x={point.x}
                y={point.y - 10}
                textAnchor="middle"
                fontSize={10}
                fill="#333"
              >
                {point.data.value.toFixed(1)}
              </text>
            )}
          </g>
        ))}

        {/* X-axis labels */}
        {points.map((point, index) => (
          <text
            key={index}
            x={point.x}
            y={height - 5}
            textAnchor="middle"
            fontSize={9}
            fill="#666"
            transform={`rotate(-45, ${point.x}, ${height - 5})`}
          >
            {point.data.label.slice(0, 8)}
          </text>
        ))}
      </svg>
    );
  };

  // Render chart based on type
  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
          No data available
        </div>
      );
    }

    switch (type) {
      case 'bar':
        return renderBarChart();
      case 'pie':
      case 'donut':
        return renderPieChart();
      case 'line':
      case 'area':
        return renderLineChart();
      default:
        return renderBarChart();
    }
  };

  // Render legend
  const renderLegend = () => {
    if (!showLegend || chartData.length === 0) return null;

    return (
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
        padding: '8px 0',
        borderTop: '1px solid #eee'
      }}>
        {chartData.slice(0, 8).map((data, index) => (
          <div
            key={data.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: data.color
              }}
            />
            <span style={{ color: '#666' }}>
              {data.label.length > 12 ? `${data.label.slice(0, 12)}...` : data.label}
            </span>
          </div>
        ))}
        {chartData.length > 8 && (
          <span style={{ fontSize: 10, color: '#999' }}>
            +{chartData.length - 8} more
          </span>
        )}
      </div>
    );
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
      default: return { ...base, bottom: offset, left: offset };
    }
  }, [position]);

  if (!isLoaded) return null;

  return (
    <div
      className={className}
      style={{
        ...positionStyles,
        width,
        backgroundColor: 'white',
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      {title && (
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: collapsible ? 'pointer' : 'default'
          }}
          onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
        >
          <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
          {collapsible && (
            <span style={{
              transform: isCollapsed ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
              fontSize: 10
            }}>
              ▼
            </span>
          )}
        </div>
      )}

      {/* Chart content */}
      {!isCollapsed && (
        <div style={{ padding: 16 }}>
          {renderChart()}
          {renderLegend()}
        </div>
      )}
    </div>
  );
};

export default ChartOverlay;