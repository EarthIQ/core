import React, { useMemo } from "react";
import {
  ComposedChart as RechartsComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer } from "../ChartContainer";
import type { UncertaintyChartProps } from "../../types";

const defaultTickFormatter = (value: any) => {
  if (typeof value !== "number") return value;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value;
};

export const UncertaintyChart: React.FC<UncertaintyChartProps> = ({
  data,
  width = "100%",
  height = 400,
  className,
  title,
  description,
  showGrid = true,
  gridType = "horizontal",
  animate = true,
  animationDuration = 800,
  legend = true,
  tooltip = true,
  toolbar = true,
  loading = false,
  empty = false,
  error = false,
  onDataPointClick,
  exportFilename = "uncertainty-chart",
  lines,
  xAxis,
  yAxis,
  tooltipFormatter,
}) => {
  const showLegend =
    typeof legend === "boolean" ? legend : legend?.show !== false;
  const showTooltip =
    typeof tooltip === "boolean" ? tooltip : tooltip?.show !== false;

  const chartData = useMemo(() => {
    const boundKeys = lines
      .map((l) => l.dataKey)
      .filter((k) => k !== "mean" && k !== "value");
    const [lowerKey, upperKey] = boundKeys;

    return data.map((d) => {
      const lower = lowerKey ? d[lowerKey] : d.min;
      const upper = upperKey ? d[upperKey] : d.max;

      return {
        ...d,
        range:
          lower !== undefined && upper !== undefined
            ? [lower, upper]
            : undefined,
      };
    });
  }, [data, lines]);

  const customTooltipFormatter = (value: any, name: any) => {
    if (
      name === "Uncertainty Band" &&
      Array.isArray(value) &&
      value.length === 2
    ) {
      return [
        `${value[0].toFixed(2)} - ${value[1].toFixed(2)}`,
        "Uncertainty Range",
      ];
    }
    return tooltipFormatter ? tooltipFormatter(value, name) : [value, name];
  };

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
            data={chartData}
            margin={{
              top: title ? 20 : 10,
              right: 30,
              // ✅ Set left to 0 — YAxis width prop handles its own space
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
            <defs>
              <linearGradient
                id="colorUncertainty"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="#60a5fa"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="#60a5fa"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur
                  stdDeviation="2.5"
                  result="coloredBlur"
                />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
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

            {showTooltip && (
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover, 0 0% 100%))",
                  border: "1px solid hsl(var(--border, 220 13% 91%))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  color: "hsl(var(--popover-foreground))",
                }}
                formatter={customTooltipFormatter}
                labelStyle={{ fontWeight: "bold", marginBottom: "8px" }}
              />
            )}

            <Area
              type="monotone"
              dataKey="range"
              stroke="none"
              fill="url(#colorUncertainty)"
              name="Uncertainty Band"
              connectNulls
              isAnimationActive={animate}
              animationDuration={animationDuration}
            />

            {lines.map((line) => {
              const isMean = line.dataKey === "mean";
              return (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  stroke={isMean ? "#10b981" : line.color}
                  strokeWidth={isMean ? 3 : line.strokeWidth || 1.5}
                  strokeDasharray={line.strokeDasharray}
                  dot={false}
                  activeDot={
                    isMean
                      ? {
                          r: 6,
                          fill: "#10b981",
                          stroke: "var(--background, #fff)",
                          strokeWidth: 2,
                        }
                      : { r: 4, fill: line.color, stroke: "none" }
                  }
                  name={line.name}
                  connectNulls
                  style={isMean ? { filter: "url(#glow)" } : { opacity: 0.8 }}
                  isAnimationActive={animate}
                  animationDuration={animationDuration}
                />
              );
            })}

            {showLegend && (
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingTop: 16 }}
              />
            )}
          </RechartsComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
};
