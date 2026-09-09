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
            data={chartData}
            margin={{
              top: title ? 20 : 10,
              right: 30,
              // ✅ Set left to 0 - YAxis width prop handles its own space
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
                x2="0"
                y1="0"
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
                  result="coloredBlur"
                  stdDeviation="2.5"
                />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
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
                formatter={customTooltipFormatter}
                labelStyle={{ fontWeight: "bold", marginBottom: "8px" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover, 0 0% 100%))",
                  border: "1px solid hsl(var(--border, 220 13% 91%))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  color: "hsl(var(--popover-foreground))",
                }}
              />
            ) : null}

            <Area
              connectNulls
              animationDuration={animationDuration}
              dataKey="range"
              fill="url(#colorUncertainty)"
              isAnimationActive={animate}
              name="Uncertainty Band"
              stroke="none"
              type="monotone"
            />

            {lines.map((line) => {
              const isMean = line.dataKey === "mean";
              return (
                <Line
                  key={line.dataKey}
                  connectNulls
                  animationDuration={animationDuration}
                  dataKey={line.dataKey}
                  dot={false}
                  isAnimationActive={animate}
                  name={line.name}
                  stroke={isMean ? "#10b981" : line.color}
                  strokeDasharray={line.strokeDasharray}
                  strokeWidth={isMean ? 3 : line.strokeWidth || 1.5}
                  style={isMean ? { filter: "url(#glow)" } : { opacity: 0.8 }}
                  type="monotone"
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
                />
              );
            })}

            {showLegend ? (
              <Legend
                height={36}
                iconSize={8}
                iconType="circle"
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: 16 }}
              />
            ) : null}
          </RechartsComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
};
