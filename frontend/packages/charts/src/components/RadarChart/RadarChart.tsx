import React from "react";
import {
  RadarChart as RechartsRadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { getColor } from "../../utils/colors";
import { ChartContainer } from "../ChartContainer";

import type { RadarChartProps } from "../../types";

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  width = "100%",
  height = 400,
  className,
  colors,
  title,
  description,
  animate = true,
  animationDuration = 300,
  legend = true,
  tooltip = true,
  toolbar = true,
  loading = false,
  empty = false,
  error = false,
  onDataPointClick,
  exportFilename = "radar-chart",
  radars,
  angleAxisKey = "name",
  showPolarGrid = true,
}) => {
  const showLegend =
    typeof legend === "boolean" ? legend : legend?.show !== false;
  const showTooltip =
    typeof tooltip === "boolean" ? tooltip : tooltip?.show !== false;

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
          <RechartsRadarChart
            cx="50%"
            cy="50%"
            data={data}
            outerRadius="80%"
            onClick={(e) => {
              if (!onDataPointClick) return;
              const index = e.activeTooltipIndex;
              if (typeof index !== "number") return;
              const payload = data[index];
              if (payload) onDataPointClick(payload, index);
            }}
          >
            {showPolarGrid ? <PolarGrid className="stroke-gray-200 dark:stroke-gray-700" /> : null}

            <PolarAngleAxis
              className="text-gray-600 dark:text-gray-400"
              dataKey={angleAxisKey}
              tick={{ fill: "currentColor", fontSize: 12 }}
            />

            <PolarRadiusAxis
              angle={30}
              className="text-gray-600 dark:text-gray-400"
              domain={[0, "auto"]}
              tick={{ fill: "currentColor", fontSize: 10 }}
            />

            {showTooltip ? <Tooltip
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

            {radars.map((radar, index) => {
              const color = radar.color || getColor(index, colors);
              return (
                <Radar
                  key={radar.dataKey}
                  animationDuration={animationDuration}
                  dataKey={radar.dataKey}
                  fill={color}
                  fillOpacity={radar.fillOpacity ?? 0.3}
                  isAnimationActive={animate}
                  name={radar.name || radar.dataKey}
                  stroke={color}
                />
              );
            })}
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
};
