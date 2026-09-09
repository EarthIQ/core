import React from "react";
import {
  ComposedChart as RechartsComposedChart,
  Line,
  Bar,
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

import type { ComposedChartProps } from "../../types";

export const ComposedChart: React.FC<ComposedChartProps> = ({
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
  exportFilename = "composed-chart",
  elements,
  xAxis,
  yAxis,
  secondaryYAxis,
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
          <RechartsComposedChart
            data={data}
            margin={{
              top: 5,
              right: secondaryYAxis ? 50 : 30,
              left: 20,
              bottom: 5,
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
              {elements
                .filter((el) => el.type === "area")
                .map((el, index) => {
                  const gradientId = generateGradientId(chartId, index);
                  const color = el.config.color || getColor(index, colors);
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
                yAxisId="left"
              />
            )}

            {secondaryYAxis && !secondaryYAxis.hide ? (
              <YAxis
                axisLine={false}
                className="text-gray-600 dark:text-gray-400"
                domain={secondaryYAxis.domain}
                orientation="right"
                tick={{ fill: "currentColor", fontSize: 12 }}
                tickFormatter={secondaryYAxis.tickFormatter}
                tickLine={false}
                tickMargin={8}
                yAxisId="right"
              />
            ) : null}

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

            {elements.map((element, index) => {
              const color = element.config.color || getColor(index, colors);

              switch (element.type) {
                case "bar":
                  return (
                    <Bar
                      key={element.config.dataKey}
                      animationDuration={animationDuration}
                      dataKey={element.config.dataKey}
                      fill={color}
                      isAnimationActive={animate}
                      name={element.config.name || element.config.dataKey}
                      radius={element.config.radius ?? [4, 4, 0, 0]}
                      yAxisId="left"
                    />
                  );
                case "line":
                  return (
                    <Line
                      key={element.config.dataKey}
                      animationDuration={animationDuration}
                      dataKey={element.config.dataKey}
                      dot={element.config.showDots !== false}
                      isAnimationActive={animate}
                      name={element.config.name || element.config.dataKey}
                      stroke={color}
                      strokeWidth={element.config.strokeWidth || 2}
                      type="monotone"
                      yAxisId={secondaryYAxis ? "right" : "left"}
                    />
                  );
                case "area": {
                  const gradientId = generateGradientId(chartId, index);
                  return (
                    <Area
                      key={element.config.dataKey}
                      animationDuration={animationDuration}
                      dataKey={element.config.dataKey}
                      fill={`url(#${gradientId})`}
                      isAnimationActive={animate}
                      name={element.config.name || element.config.dataKey}
                      stroke={color}
                      type="monotone"
                      yAxisId="left"
                    />
                  );
                }
                default:
                  return null;
              }
            })}
          </RechartsComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
};
