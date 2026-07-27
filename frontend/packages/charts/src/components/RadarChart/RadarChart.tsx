import React from 'react';
import {
  RadarChart as RechartsRadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer } from '../ChartContainer';
import { getColor } from '../../utils/colors';
import type { RadarChartProps } from '../../types';

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  width = '100%',
  height = 400,
  className,
  colors,
  title,
  description,
  animate = true,
  animationDuration = 300,
  legend = true,
  tooltip = true,
  toolbar = true,
  loading = false,
  empty = false,
  error = false,
  onDataPointClick,
  exportFilename = 'radar-chart',
  radars,
  angleAxisKey = 'name',
  showPolarGrid = true,
}) => {
  const showLegend = typeof legend === 'boolean' ? legend : legend?.show !== false;
  const showTooltip = typeof tooltip === 'boolean' ? tooltip : tooltip?.show !== false;

  return (
    <ChartContainer
      title={title}
      description={description}
      toolbar={toolbar}
      loading={loading}
      empty={empty || data.length === 0}
      error={error}
      data={data}
      exportFilename={exportFilename}
      className={className}
    >
      <div style={{ width, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadarChart
            data={data}
            cx="50%"
            cy="50%"
            outerRadius="80%"
            onClick={(e) => {
              if (onDataPointClick && e?.activePayload?.[0]) {
                onDataPointClick(e.activePayload[0].payload, e.activeTooltipIndex || 0);
              }
            }}
          >
            {showPolarGrid && (
              <PolarGrid className="stroke-gray-200 dark:stroke-gray-700" />
            )}
            
            <PolarAngleAxis
              dataKey={angleAxisKey}
              tick={{ fill: 'currentColor', fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
            />
            
            <PolarRadiusAxis
              angle={30}
              domain={[0, 'auto']}
              tick={{ fill: 'currentColor', fontSize: 10 }}
              className="text-gray-600 dark:text-gray-400"
            />

            {showTooltip && (
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover, 0 0% 100%))',
                  border: '1px solid hsl(var(--border, 220 13% 91%))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
            )}

            {showLegend && (
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingTop: 16 }}
              />
            )}

            {radars.map((radar, index) => {
              const color = radar.color || getColor(index, colors);
              return (
                <Radar
                  key={radar.dataKey}
                  name={radar.name || radar.dataKey}
                  dataKey={radar.dataKey}
                  stroke={color}
                  fill={color}
                  fillOpacity={radar.fillOpacity ?? 0.3}
                  isAnimationActive={animate}
                  animationDuration={animationDuration}
                />
              );
            })}
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
};