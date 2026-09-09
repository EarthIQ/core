import React from "react";
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { getColor, generateGradientId } from "../../utils/colors";
import { ChartContainer } from "../ChartContainer";

import type { AreaChartProps } from "../../types";

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  width = "100%",
  height = 400,
  className,
  colors,
  title,
  description,
  showGrid = true,
  gridType = "horizontal",
  animate = true,
  animationDuration = 300,
  legend = true,
  tooltip = true,
  toolbar = true,
  loading = false,
  empty = false,
  error = false,
  onDataPointClick,
  exportFilename = "area-chart",
  areas,
  xAxis,
  yAxis,
  curved = true,
  stacked = false,
  connectNulls = false,
}) => {
  const showLegend =
    typeof legend === "boolean" ? legend : legend?.show !== false;
  const showTooltip =
    typeof tooltip === "boolean" ? tooltip : tooltip?.show !== false;
  const chartId = React.useId();

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
        <ResponsiveContainer
          height="100%"
          width="100%"
        >
          <RechartsAreaChart
            data={data}
            margin={{
              top: title ? 20 : 10,
              right: 30,
              left: yAxis?.label ? 40 : 20,
              bottom: xAxis?.label ? 30 : 10,
            }}
            onClick={(e) => {
              if (!onDataPointClick) return;
              const index = e.activeTooltipIndex;
              if (typeof index !== "number") return;
              const payload = data[index];
              if (payload) onDataPointClick(payload, index);
            }}
          >
            <defs>
              {areas.map((area, index) => {
                const gradientId = generateGradientId(chartId, index);
                const color = area.color || getColor(index, colors);
                return (
                  <linearGradient
                    key={gradientId}
                    id={gradientId}
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={color}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={color}
                      stopOpacity={0}
                    />
                  </linearGradient>
                );
              })}
            </defs>

            {showGrid ? (
              <CartesianGrid
                className="stroke-gray-200 dark:stroke-gray-700"
                horizontal={gridType !== "vertical"}
                strokeDasharray="3 3"
                vertical={gridType !== "horizontal"}
              />
            ) : null}

            {!xAxis?.hide && (
              <XAxis
                axisLine={false}
                className="text-gray-600 dark:text-gray-400"
                dataKey="name"
                tick={{ fill: "currentColor", fontSize: 12 }}
                tickFormatter={xAxis?.tickFormatter}
                tickLine={false}
                tickMargin={8}
                label={
                  xAxis?.label
                    ? {
                        value: xAxis.label,
                        position: "insideBottom",
                        offset: -5,
                        fontSize: 12,
                        fill: "currentColor",
                      }
                    : undefined
                }
              />
            )}

            {!yAxis?.hide && (
              <YAxis
                axisLine={false}
                className="text-gray-600 dark:text-gray-400"
                domain={yAxis?.domain}
                tick={{ fill: "currentColor", fontSize: 12 }}
                tickFormatter={yAxis?.tickFormatter}
                tickLine={false}
                tickMargin={8}
                label={
                  yAxis?.label
                    ? {
                        value: yAxis.label,
                        angle: -90,
                        position: "insideLeft",
                        offset: 10,
                        fontSize: 12,
                        fill: "currentColor",
                      }
                    : undefined
                }
              />
            )}

            {showTooltip ? (
              <Tooltip
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover, 0 0% 100%))",
                  border: "1px solid hsl(var(--border, 220 13% 91%))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
            ) : null}

            {showLegend ? (
              <Legend
                height={36}
                iconSize={8}
                iconType="circle"
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: 16 }}
              />
            ) : null}

            {areas.map((area, index) => {
              const gradientId = generateGradientId(chartId, index);
              const color = area.color || getColor(index, colors);
              return (
                <Area
                  key={area.dataKey}
                  animationDuration={animationDuration}
                  connectNulls={connectNulls}
                  dataKey={area.dataKey}
                  fill={`url(#${gradientId})`}
                  fillOpacity={area.fillOpacity || 1}
                  isAnimationActive={animate}
                  name={area.name || area.dataKey}
                  stackId={stacked ? "stack" : undefined}
                  stroke={color}
                  strokeWidth={area.strokeWidth || 2}
                  type={curved ? "monotone" : "linear"}
                />
              );
            })}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
};
