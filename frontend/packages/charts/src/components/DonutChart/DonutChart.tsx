import { cn } from "@packages/ui";
import React from "react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector,
} from "recharts";

import { getColor } from "../../utils/colors";
import { ChartContainer } from "../ChartContainer";

import type { DonutChartProps } from "../../types";

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
    props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        endAngle={endAngle}
        fill={fill}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
      />
    </g>
  );
};

export const DonutChart: React.FC<DonutChartProps> = ({
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
  exportFilename = "donut-chart",
  dataKey = "value",
  nameKey = "name",
  innerRadius = "60%",
  outerRadius = "80%",
  paddingAngle = 2,
  startAngle = 90,
  endAngle = -270,
  showLabels = false,
  centerLabel,
  centerValue,
  centerDescription,
}) => {
  const showLegend =
    typeof legend === "boolean" ? legend : legend?.show !== false;
  const showTooltip =
    typeof tooltip === "boolean" ? tooltip : tooltip?.show !== false;

  // Calculate total for center display
  // const total = data.reduce(
  //   (sum, item) => sum + (Number(item[dataKey]) || 0),
  //   0
  // );

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
      <div
        className="relative"
        style={{ width, height }}
      >
        <ResponsiveContainer
          height="100%"
          width="100%"
        >
          <RechartsPieChart>
            <Pie
              activeShape={renderActiveShape}
              animationDuration={animationDuration}
              cx="50%"
              cy="50%"
              data={data}
              dataKey={dataKey}
              endAngle={endAngle}
              innerRadius={innerRadius}
              isAnimationActive={animate}
              label={showLabels}
              labelLine={showLabels}
              nameKey={nameKey}
              outerRadius={outerRadius}
              paddingAngle={paddingAngle}
              startAngle={startAngle}
              onClick={(entry, index) => {
                if (onDataPointClick) {
                  onDataPointClick(entry, index);
                }
              }}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  className="stroke-white dark:stroke-gray-950"
                  fill={getColor(index, colors)}
                  strokeWidth={2}
                />
              ))}
            </Pie>

            {showTooltip ? <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover, 0 0% 100%))",
                  border: "1px solid hsl(var(--border, 220 13% 91%))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value: any, name: any) => [
                  value.toLocaleString(),
                  name,
                ]}
              /> : null}

            {showLegend ? <Legend
                height={36}
                iconSize={8}
                iconType="circle"
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: 16 }}
              /> : null}
          </RechartsPieChart>
        </ResponsiveContainer>

        {/* Center Content */}
        {(centerLabel || centerValue !== undefined || centerDescription) ? <div
            style={{ marginTop: showLegend ? -18 : 0 }}
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform",
              "flex flex-col items-center justify-center text-center",
              "pointer-events-none"
            )}
          >
            {centerLabel ? (
              centerLabel
            ) : (
              <>
                {centerValue !== undefined && (
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {typeof centerValue === "number"
                      ? centerValue.toLocaleString()
                      : centerValue}
                  </span>
                )}
                {centerDescription ? <span className="text-sm text-gray-500 dark:text-gray-400">
                    {centerDescription}
                  </span> : null}
              </>
            )}
          </div> : null}
      </div>
    </ChartContainer>
  );
};
