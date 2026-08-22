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
import { ChartContainer } from "../ChartContainer";
import { getColor } from "../../utils/colors";
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
          <RechartsBarChart
            data={data}
            layout={layout}
            margin={{
              top: title ? 20 : 10,
              right: 30,
              left: 0,
              bottom: xAxis?.label ? 20 : 10,
            }}
            barGap={barGap}
            barCategoryGap={barCategoryGap}
            onClick={(e) => {
              if (!onDataPointClick) return;
              const index = e.activeTooltipIndex;
              if (typeof index !== "number") return;
              const payload = data[index];
              if (payload) onDataPointClick(payload, index);
            }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-gray-700"
                horizontal={layout === "horizontal" && gridType !== "vertical"}
                vertical={layout === "vertical" || gridType === "vertical"}
              />
            )}

            {layout === "horizontal" ? (
              <>
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
                    tickMargin={4}
                    tickFormatter={yAxis?.tickFormatter || defaultTickFormatter}
                    tick={{ fill: "currentColor", fontSize: 12 }}
                    className="text-gray-600 dark:text-gray-400"
                    domain={yAxis?.domain}
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
                    type="number"
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
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    tick={{ fill: "currentColor", fontSize: 12 }}
                    className="text-gray-600 dark:text-gray-400"
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

            {showTooltip && (
              <Tooltip
                formatter={tooltipFormatter}
                cursor={{ fill: "hsl(var(--muted, 220 14% 96%))" }}
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

            {bars.map((bar, index) => (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                name={bar.name || bar.dataKey}
                fill={bar.color || getColor(index, colors)}
                stackId={stacked ? "stack" : bar.stackId}
                isAnimationActive={animate}
                animationDuration={animationDuration}
                radius={bar.radius ?? [4, 4, 0, 0]}
                barSize={barSize}
              >
                {data.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={
                      (entry.color as string) ||
                      bar.color ||
                      (getColor(index, colors) as string)
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
