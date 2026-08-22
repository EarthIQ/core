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
import { ChartContainer } from "../ChartContainer";
import { getColor } from "../../utils/colors";
import type { PieChartProps } from "../../types";

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
    props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
    </g>
  );
};

export const PieChart: React.FC<PieChartProps> = ({
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
  exportFilename = "pie-chart",
  dataKey = "value",
  nameKey = "name",
  innerRadius = 0,
  outerRadius = "80%",
  paddingAngle = 2,
  startAngle = 90,
  endAngle = -270,
  showLabels = false,
  labelType = "percent",
  labelFormatter,
}) => {
  const showLegend =
    typeof legend === "boolean" ? legend : legend?.show !== false;
  const showTooltip =
    typeof tooltip === "boolean" ? tooltip : tooltip?.show !== false;

  const renderLabel = (entry: any) => {
    if (labelFormatter) return labelFormatter(entry);

    switch (labelType) {
      case "value":
        return entry[dataKey];
      case "name":
        return entry[nameKey];
      case "percent":
        return `${(entry.percent * 100).toFixed(0)}%`;
      default:
        return entry[nameKey];
    }
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
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              dataKey={dataKey}
              nameKey={nameKey}
              paddingAngle={paddingAngle}
              startAngle={startAngle}
              endAngle={endAngle}
              isAnimationActive={animate}
              animationDuration={animationDuration}
              label={showLabels ? renderLabel : undefined}
              labelLine={showLabels}
              activeShape={renderActiveShape}
              onClick={(entry, index) => {
                if (onDataPointClick) {
                  onDataPointClick(entry, index);
                }
              }}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getColor(index, colors)}
                  className="stroke-white dark:stroke-gray-950"
                  strokeWidth={2}
                />
              ))}
            </Pie>

            {showTooltip && (
              <Tooltip
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
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
};
