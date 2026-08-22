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
import { ChartContainer } from "../ChartContainer";
import { getColor, generateGradientId } from "../../utils/colors";
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
        <ResponsiveContainer
          width="100%"
          height="100%"
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
                    y1="0"
                    x2="0"
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

            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-gray-700"
                horizontal={gridType !== "vertical"}
                vertical={gridType !== "horizontal"}
              />
            )}

            {!xAxis?.hide && (
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={xAxis?.tickFormatter}
                tick={{ fill: "currentColor", fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
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
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={yAxis?.tickFormatter}
                tick={{ fill: "currentColor", fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
                domain={yAxis?.domain}
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

            {showTooltip && (
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover, 0 0% 100%))",
                  border: "1px solid hsl(var(--border, 220 13% 91%))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
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

            {areas.map((area, index) => {
              const gradientId = generateGradientId(chartId, index);
              const color = area.color || getColor(index, colors);
              return (
                <Area
                  key={area.dataKey}
                  type={curved ? "monotone" : "linear"}
                  dataKey={area.dataKey}
                  name={area.name || area.dataKey}
                  stroke={color}
                  strokeWidth={area.strokeWidth || 2}
                  fill={`url(#${gradientId})`}
                  fillOpacity={area.fillOpacity || 1}
                  stackId={stacked ? "stack" : undefined}
                  isAnimationActive={animate}
                  animationDuration={animationDuration}
                  connectNulls={connectNulls}
                />
              );
            })}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
};
