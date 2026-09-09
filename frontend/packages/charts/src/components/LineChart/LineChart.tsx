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

import { getColor } from "../../utils/colors";
import { ChartContainer } from "../ChartContainer";

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
          <RechartsLineChart
            data={data}
            margin={{
              top: title ? 20 : 10,
              right: 30,
              left: 0,
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
                tickCount={yAxis?.tickCount}
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

            {showTooltip ? (
              <Tooltip
                cursor={tooltipConfig.cursor ?? { stroke: "#ccc" }}
                formatter={tooltipConfig.formatter}
                labelFormatter={tooltipConfig.labelFormatter}
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
                verticalAlign={legendPosition === "top" ? "top" : "bottom"}
                wrapperStyle={{
                  paddingTop: legendPosition === "bottom" ? 16 : 0,
                }}
              />
            ) : null}

            {referenceLines.map((refLine, index) => (
              <ReferenceLine
                key={index}
                label={refLine.label}
                stroke={refLine.color || "#666"}
                strokeDasharray={refLine.strokeDasharray || "3 3"}
                x={refLine.x}
                y={refLine.y}
              />
            ))}

            {lines.map((line, index) => (
              <Line
                key={line.dataKey}
                activeDot={{ r: (line.dotSize || 3) + 3, strokeWidth: 2 }}
                animationDuration={animationDuration}
                connectNulls={connectNulls}
                dataKey={line.dataKey}
                isAnimationActive={animate}
                name={line.name || line.dataKey}
                stroke={line.color || getColor(index, colors)}
                strokeDasharray={line.strokeDasharray}
                strokeWidth={line.strokeWidth || 2}
                type={curved ? "monotone" : "linear"}
                dot={
                  line.showDots !== false
                    ? { r: line.dotSize || 3, strokeWidth: 2 }
                    : false
                }
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
};
