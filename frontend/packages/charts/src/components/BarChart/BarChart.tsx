import React from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { getColor } from "../../utils/colors";
import { ChartContainer } from "../ChartContainer";

import type { BarChartProps } from "../../types";

const defaultTickFormatter = (value: any) => {
  if (typeof value !== "number") return value;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value;
};

export const BarChart: React.FC<BarChartProps> = ({
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
  exportFilename = "bar-chart",
  bars,
  xAxis,
  yAxis,
  layout = "horizontal",
  barSize,
  barGap = 4,
  barCategoryGap = "20%",
  stacked = false,
}) => {
  const showLegend =
    typeof legend === "boolean" ? legend : legend?.show !== false;
  const showTooltip =
    typeof tooltip === "boolean" ? tooltip : tooltip?.show !== false;
  const tooltipFormatter =
    typeof tooltip === "object" ? tooltip.formatter : undefined;

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
          <RechartsBarChart
            barCategoryGap={barCategoryGap}
            barGap={barGap}
            data={data}
            layout={layout}
            margin={{
              top: title ? 20 : 10,
              right: 30,
              left: 0,
              bottom: xAxis?.label ? 20 : 10,
            }}
            onClick={(e) => {
              if (!onDataPointClick) return;
              const index = e.activeTooltipIndex;
              if (typeof index !== "number") return;
              const payload = data[index];
              if (payload) onDataPointClick(payload, index);
            }}
          >
            {showGrid ? <CartesianGrid
                className="stroke-gray-200 dark:stroke-gray-700"
                horizontal={layout === "horizontal" && gridType !== "vertical"}
                strokeDasharray="3 3"
                vertical={layout === "vertical" || gridType === "vertical"}
              /> : null}

            {layout === "horizontal" ? (
              <>
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
                    tickFormatter={yAxis?.tickFormatter || defaultTickFormatter}
                    tickLine={false}
                    tickMargin={4}
                    width={yAxis?.label ? 50 : 40}
                    label={
                      yAxis?.label
                        ? {
                            value: yAxis.label,
                            angle: -90,
                            position: "insideLeft",
                            style: { textAnchor: "middle" },
                            offset: 5,
                            fontSize: 12,
                            fill: "currentColor",
                          }
                        : undefined
                    }
                  />
                )}
              </>
            ) : (
              <>
                {!xAxis?.hide && (
                  <XAxis
                    axisLine={false}
                    className="text-gray-600 dark:text-gray-400"
                    tick={{ fill: "currentColor", fontSize: 12 }}
                    tickFormatter={xAxis?.tickFormatter}
                    tickLine={false}
                    tickMargin={8}
                    type="number"
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
                    dataKey="name"
                    tick={{ fill: "currentColor", fontSize: 12 }}
                    tickLine={false}
                    tickMargin={4}
                    type="category"
                    width={yAxis?.label ? 100 : 80}
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
              </>
            )}

            {showTooltip ? <Tooltip
                cursor={{ fill: "hsl(var(--muted, 220 14% 96%))" }}
                formatter={tooltipFormatter}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover, 0 0% 100%))",
                  border: "1px solid hsl(var(--border, 220 13% 91%))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              /> : null}

            {showLegend ? <Legend
                height={36}
                iconSize={8}
                iconType="circle"
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: 16 }}
              /> : null}

            {bars.map((bar, index) => (
              <Bar
                key={bar.dataKey}
                animationDuration={animationDuration}
                barSize={barSize}
                dataKey={bar.dataKey}
                fill={bar.color || getColor(index, colors)}
                isAnimationActive={animate}
                name={bar.name || bar.dataKey}
                radius={bar.radius ?? [4, 4, 0, 0]}
                stackId={stacked ? "stack" : bar.stackId}
              >
                {data.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={
                      (entry.color as string) ||
                      bar.color ||
                      (getColor(index, colors))
                    }
                  />
                ))}
              </Bar>
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
};
