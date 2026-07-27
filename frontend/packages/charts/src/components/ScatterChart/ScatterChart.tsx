import React from 'react';
import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer } from '../ChartContainer';
import { getColor } from '../../utils/colors';
import type { ScatterChartProps } from '../../types';

export const ScatterChart: React.FC<ScatterChartProps> = ({
  data,
  width = '100%',
  height = 400,
  className,
  colors,
  title,
  description,
  showGrid = true,
  gridType = 'both',
  animate = true,
  animationDuration = 300,
  legend = true,
  tooltip = true,
  toolbar = true,
  loading = false,
  empty = false,
  error = false,
  onDataPointClick,
  exportFilename = 'scatter-chart',
  scatters,
  xAxis,
  yAxis,
  zAxis,
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
          <RechartsScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-gray-700"
                horizontal={gridType !== 'vertical'}
                vertical={gridType !== 'horizontal'}
              />
            )}

            {!xAxis?.hide && (
              <XAxis
                type="number"
                dataKey={xAxis?.dataKey || 'x'}
                name={xAxis?.label || 'X'}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={xAxis?.tickFormatter}
                tick={{ fill: 'currentColor', fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
                domain={xAxis?.domain}
              />
            )}

            {!yAxis?.hide && (
              <YAxis
                type="number"
                dataKey={yAxis?.dataKey || 'y'}
                name={yAxis?.label || 'Y'}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={yAxis?.tickFormatter}
                tick={{ fill: 'currentColor', fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
                domain={yAxis?.domain}
              />
            )}

            {zAxis && (
              <ZAxis
                type="number"
                dataKey={zAxis.dataKey}
                range={zAxis.range || [50, 500]}
              />
            )}

            {showTooltip && (
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
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

            {scatters.map((scatter, index) => {
              const color = scatter.color || getColor(index, colors);
              return (
                <Scatter
                  key={scatter.dataKey}
                  name={scatter.name || scatter.dataKey}
                  data={data}
                  fill={color}
                  isAnimationActive={animate}
                  animationDuration={animationDuration}
                  onClick={(entry) => {
                    if (onDataPointClick) {
                      onDataPointClick(entry, index);
                    }
                  }}
                  shape={scatter.shape || 'circle'}
                />
              );
            })}
          </RechartsScatterChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
};