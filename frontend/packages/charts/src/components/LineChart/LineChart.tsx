import React from "react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ChartContainer } from "../ChartContainer";
import { getColor } from "../../utils/colors";
import type { LineChartProps } from "../../types";

const defaultTickFormatter = (value: any) => {
  if (typeof value !== "number") return value;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value;
};

export const LineChart: React.FC<LineChartProps> = ({
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
  exportFilename = "line-chart",
  lines,
  xAxis,
  yAxis,
  curved = true,
  connectNulls = false,
  referenceLines = [],
}) => {
  const showLegend =
    typeof legend === "boolean" ? legend : legend?.show !== false;
  const showTooltip =
    typeof tooltip === "boolean" ? tooltip : tooltip?.show !== false;
  const legendPosition =
    typeof legend === "object" ? legend.position : "bottom";

  const tooltipConfig = typeof tooltip === "object" ? tooltip : {};

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
          <RechartsLineChart
            data={data}
            margin={{
              top: title ? 20 : 10,
              right: 30,
              left: 0,
              bottom: xAxis?.label ? 30 : 10,
            }}
            onClick={(e) => {
              if (onDataPointClick && e?.activePayload?.[0]) {
                onDataPointClick(
                  e.activePayload[0].payload,
                  e.activeTooltipIndex || 0
                );
              }
            }}
          >
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
                tickMargin={4}
                tickFormatter={yAxis?.tickFormatter || defaultTickFormatter}
                tick={{ fill: "currentColor", fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
                domain={yAxis?.domain}
                tickCount={yAxis?.tickCount}
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

            {showTooltip && (
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover, 0 0% 100%))",
                  border: "1px solid hsl(var(--border, 220 13% 91%))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                formatter={tooltipConfig.formatter}
                labelFormatter={tooltipConfig.labelFormatter}
                cursor={tooltipConfig.cursor ?? { stroke: "#ccc" }}
              />
            )}

            {showLegend && (
              <Legend
                verticalAlign={legendPosition === "top" ? "top" : "bottom"}
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{
                  paddingTop: legendPosition === "bottom" ? 16 : 0,
                }}
              />
            )}

            {referenceLines.map((refLine, index) => (
              <ReferenceLine
                key={index}
                y={refLine.y}
                x={refLine.x}
                stroke={refLine.color || "#666"}
                strokeDasharray={refLine.strokeDasharray || "3 3"}
                label={refLine.label}
              />
            ))}

            {lines.map((line, index) => (
              <Line
                key={line.dataKey}
                type={curved ? "monotone" : "linear"}
                dataKey={line.dataKey}
                name={line.name || line.dataKey}
                stroke={line.color || getColor(index, colors)}
                strokeWidth={line.strokeWidth || 2}
                strokeDasharray={line.strokeDasharray}
                dot={
                  line.showDots !== false
                    ? { r: line.dotSize || 3, strokeWidth: 2 }
                    : false
                }
                activeDot={{ r: (line.dotSize || 3) + 3, strokeWidth: 2 }}
                isAnimationActive={animate}
                animationDuration={animationDuration}
                connectNulls={connectNulls}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
};
