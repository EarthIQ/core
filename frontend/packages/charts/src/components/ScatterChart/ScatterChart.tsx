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

import { getColor } from '../../utils/colors';
import { ChartContainer } from '../ChartContainer';

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
      className={className}
      data={data}
      description={description}
      empty={empty || data.length === 0}
      error={error}
      exportFilename={exportFilename}
      loading={loading}
      title={title}
      toolbar={toolbar}
    >
      <div style={{ width, height }}>
        <ResponsiveContainer height="100%" width="100%">
          <RechartsScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            {showGrid ? <CartesianGrid
                className="stroke-gray-200 dark:stroke-gray-700"
                horizontal={gridType !== 'vertical'}
                strokeDasharray="3 3"
                vertical={gridType !== 'horizontal'}
              /> : null}

            {!xAxis?.hide && (
              <XAxis
                axisLine={false}
                className="text-gray-600 dark:text-gray-400"
                dataKey={xAxis?.dataKey || 'x'}
                domain={xAxis?.domain}
                name={xAxis?.label || 'X'}
                tick={{ fill: 'currentColor', fontSize: 12 }}
                tickFormatter={xAxis?.tickFormatter}
                tickLine={false}
                tickMargin={8}
                type="number"
              />
            )}

            {!yAxis?.hide && (
              <YAxis
                axisLine={false}
                className="text-gray-600 dark:text-gray-400"
                dataKey={yAxis?.dataKey || 'y'}
                domain={yAxis?.domain}
                name={yAxis?.label || 'Y'}
                tick={{ fill: 'currentColor', fontSize: 12 }}
                tickFormatter={yAxis?.tickFormatter}
                tickLine={false}
                tickMargin={8}
                type="number"
              />
            )}

            {zAxis ? <ZAxis
                dataKey={zAxis.dataKey}
                range={zAxis.range || [50, 500]}
                type="number"
              /> : null}

            {showTooltip ? <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover, 0 0% 100%))',
                  border: '1px solid hsl(var(--border, 220 13% 91%))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              /> : null}

            {showLegend ? <Legend
                height={36}
                iconSize={8}
                iconType="circle"
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: 16 }}
              /> : null}

            {scatters.map((scatter, index) => {
              const color = scatter.color || getColor(index, colors);
              return (
                <Scatter
                  key={scatter.dataKey}
                  animationDuration={animationDuration}
                  data={data}
                  fill={color}
                  isAnimationActive={animate}
                  name={scatter.name || scatter.dataKey}
                  shape={scatter.shape || 'circle'}
                  onClick={(entry) => {
                    if (onDataPointClick) {
                      onDataPointClick(entry, index);
                    }
                  }}
                />
              );
            })}
          </RechartsScatterChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
};