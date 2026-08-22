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
import { ChartContainer } from "../ChartContainer";
import { getColor, generateGradientId } from "../../utils/colors";
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
              />
            )}

            {!yAxis?.hide && (
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={yAxis?.tickFormatter}
                tick={{ fill: "currentColor", fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
                domain={yAxis?.domain}
              />
            )}

            {secondaryYAxis && !secondaryYAxis.hide && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={secondaryYAxis.tickFormatter}
                tick={{ fill: "currentColor", fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
                domain={secondaryYAxis.domain}
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

            {elements.map((element, index) => {
              const color = element.config.color || getColor(index, colors);

              switch (element.type) {
                case "bar":
                  return (
                    <Bar
                      key={element.config.dataKey}
                      yAxisId="left"
                      dataKey={element.config.dataKey}
                      name={element.config.name || element.config.dataKey}
                      fill={color}
                      radius={element.config.radius ?? [4, 4, 0, 0]}
                      isAnimationActive={animate}
                      animationDuration={animationDuration}
                    />
                  );
                case "line":
                  return (
                    <Line
                      key={element.config.dataKey}
                      yAxisId={secondaryYAxis ? "right" : "left"}
                      type="monotone"
                      dataKey={element.config.dataKey}
                      name={element.config.name || element.config.dataKey}
                      stroke={color}
                      strokeWidth={element.config.strokeWidth || 2}
                      dot={element.config.showDots !== false}
                      isAnimationActive={animate}
                      animationDuration={animationDuration}
                    />
                  );
                case "area":
                  const gradientId = generateGradientId(chartId, index);
                  return (
                    <Area
                      key={element.config.dataKey}
                      yAxisId="left"
                      type="monotone"
                      dataKey={element.config.dataKey}
                      name={element.config.name || element.config.dataKey}
                      stroke={color}
                      fill={`url(#${gradientId})`}
                      isAnimationActive={animate}
                      animationDuration={animationDuration}
                    />
                  );
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
