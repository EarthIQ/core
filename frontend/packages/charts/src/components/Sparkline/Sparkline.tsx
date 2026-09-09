import { cn } from "@packages/ui";
import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";

import { getColor } from "../../utils/colors";

import type { SparklineProps } from "../../types";

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  dataKey = "value",
  type = "line",
  width = 100,
  height = 30,
  color,
  showValue = false,
  valueFormatter,
  className,
}) => {
  // Normalize data to array of objects
  const normalizedData = Array.isArray(data)
    ? data.map((item, index) =>
        typeof item === "number"
          ? { name: String(index), [dataKey]: item }
          : item
      )
    : [];

  const chartColor = color || getColor(0);
  const lastValue =
    normalizedData.length > 0
      ? (normalizedData[normalizedData.length - 1][dataKey] as number)
      : 0;

  const formatValue = (value: number) => {
    if (valueFormatter) return valueFormatter(value);
    return value.toLocaleString();
  };

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <BarChart data={normalizedData}>
            <Bar
              dataKey={dataKey}
              fill={chartColor}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        );
      case "area":
        return (
          <AreaChart data={normalizedData}>
            <defs>
              <linearGradient
                id="sparkline-gradient"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={chartColor}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={chartColor}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey={dataKey}
              fill="url(#sparkline-gradient)"
              isAnimationActive={false}
              stroke={chartColor}
              strokeWidth={1.5}
              type="monotone"
            />
          </AreaChart>
        );
      case "line":
      default:
        return (
          <LineChart data={normalizedData}>
            <Line
              dataKey={dataKey}
              dot={false}
              isAnimationActive={false}
              stroke={chartColor}
              strokeWidth={1.5}
              type="monotone"
            />
          </LineChart>
        );
    }
  };

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div style={{ width, height }}>
        <ResponsiveContainer
          height="100%"
          width="100%"
        >
          {renderChart()}
        </ResponsiveContainer>
      </div>
      {showValue ? (
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {formatValue(lastValue)}
        </span>
      ) : null}
    </div>
  );
};
