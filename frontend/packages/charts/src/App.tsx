import React, { useState } from "react";

import {
  LineChart,
  AreaChart,
  BarChart,
  PieChart,
  DonutChart,
  RadarChart,
  ScatterChart,
  ComposedChart,
  Sparkline,
  formatCompact,
  formatCurrency,
} from "@packages/charts";
import "@packages/charts/styles.css";

// Sample data
const salesData = [
  { name: "Jan", sales: 4000, revenue: 2400, profit: 1200, target: 3500 },
  { name: "Feb", sales: 3000, revenue: 1398, profit: 900, target: 3500 },
  { name: "Mar", sales: 2000, revenue: 9800, profit: 1800, target: 3500 },
  { name: "Apr", sales: 2780, revenue: 3908, profit: 1500, target: 3500 },
  { name: "May", sales: 1890, revenue: 4800, profit: 1100, target: 3500 },
  { name: "Jun", sales: 2390, revenue: 3800, profit: 1400, target: 3500 },
  { name: "Jul", sales: 3490, revenue: 4300, profit: 1700, target: 3500 },
];

const categoryData = [
  { name: "Electronics", value: 4000 },
  { name: "Clothing", value: 3000 },
  { name: "Food", value: 2000 },
  { name: "Books", value: 2780 },
  { name: "Sports", value: 1890 },
];

const radarData = [
  { subject: "Marketing", A: 120, B: 110 },
  { subject: "Sales", A: 98, B: 130 },
  { subject: "Development", A: 86, B: 130 },
  { subject: "Support", A: 99, B: 100 },
  { subject: "Finance", A: 85, B: 90 },
  { subject: "HR", A: 65, B: 85 },
];

const scatterData = [
  { x: 100, y: 200, z: 200, name: "A" },
  { x: 120, y: 100, z: 260, name: "B" },
  { x: 170, y: 300, z: 400, name: "C" },
  { x: 140, y: 250, z: 280, name: "D" },
  { x: 150, y: 400, z: 500, name: "E" },
  { x: 110, y: 280, z: 200, name: "F" },
];

const sparklineData = [23, 45, 67, 34, 56, 78, 45, 67, 89, 56];

export const Dashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-900">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
        Analytics Dashboard
      </h1>

      {/* KPI Cards with Sparklines */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: "Revenue", value: "$124,500", change: "+12.5%" },
          { label: "Orders", value: "1,234", change: "+5.2%" },
          { label: "Customers", value: "856", change: "+8.1%" },
          { label: "Conversion", value: "3.2%", change: "-0.4%" },
        ].map((kpi, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-2 flex items-start justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {kpi.label}
              </span>
              <span
                className={`text-xs font-medium ${
                  kpi.change.startsWith("+") ? "text-green-500" : "text-red-500"
                }`}
              >
                {kpi.change}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {kpi.value}
              </span>
              <Sparkline
                color={kpi.change.startsWith("+") ? "#22c55e" : "#ef4444"}
                data={sparklineData}
                height={32}
                type="area"
                width={80}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Line Chart */}
        <LineChart
          data={salesData}
          description="Monthly sales performance over time"
          exportFilename="sales-trend"
          height={350}
          title="Sales Trend"
          lines={[
            { dataKey: "sales", name: "Sales", color: "#3b82f6" },
            { dataKey: "revenue", name: "Revenue", color: "#22c55e" },
          ]}
          referenceLines={[
            {
              y: 3500,
              label: "Target",
              color: "#ef4444",
              strokeDasharray: "5 5",
            },
          ]}
          toolbar={{
            downloadImage: true,
            downloadData: true,
            fullscreen: true,
          }}
          yAxis={{
            tickFormatter: (value) => formatCompact(value),
          }}
        />

        {/* Area Chart */}
        <AreaChart
          stacked
          data={salesData}
          description="Stacked area showing revenue composition"
          exportFilename="revenue-profit"
          height={350}
          title="Revenue & Profit"
          areas={[
            { dataKey: "revenue", name: "Revenue" },
            { dataKey: "profit", name: "Profit" },
          ]}
          yAxis={{
            tickFormatter: (value) => formatCurrency(value),
          }}
        />

        {/* Bar Chart */}
        <BarChart
          barCategoryGap="20%"
          data={salesData}
          description="Sales vs Target by month"
          exportFilename="monthly-comparison"
          height={350}
          title="Monthly Comparison"
          bars={[
            { dataKey: "sales", name: "Sales", color: "#3b82f6" },
            { dataKey: "target", name: "Target", color: "#94a3b8" },
          ]}
          yAxis={{
            tickFormatter: (value) => formatCompact(value),
          }}
          onDataPointClick={(data, index) => {
            console.warn("Clicked:", data, index);
          }}
        />

        {/* Horizontal Bar Chart */}
        <BarChart
          bars={[{ dataKey: "value", name: "Sales" }]}
          data={categoryData}
          description="Sales by product category"
          exportFilename="category-performance"
          height={350}
          layout="vertical"
          title="Category Performance"
          xAxis={{
            tickFormatter: (value) => formatCompact(value as number),
          }}
        />
      </div>

      {/* Second Row */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Donut Chart */}
        <DonutChart
          centerDescription="Total Sales"
          centerValue={categoryData.reduce((sum, d) => sum + d.value, 0)}
          data={categoryData}
          description="Distribution of sales"
          exportFilename="sales-distribution"
          height={350}
          title="Sales by Category"
        />

        {/* Pie Chart */}
        <PieChart
          showLabels
          data={categoryData}
          description="Percentage of total market"
          exportFilename="market-share"
          height={350}
          labelType="percent"
          title="Market Share"
        />

        {/* Radar Chart */}
        <RadarChart
          angleAxisKey="subject"
          data={radarData}
          description="Comparison across departments"
          exportFilename="team-performance"
          height={350}
          title="Team Performance"
          radars={[
            { dataKey: "A", name: "Team A", fillOpacity: 0.3 },
            { dataKey: "B", name: "Team B", fillOpacity: 0.3 },
          ]}
        />
      </div>

      {/* Third Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Scatter Chart */}
        <ScatterChart
          data={scatterData}
          description="Relationship between variables"
          exportFilename="correlation"
          height={350}
          scatters={[{ dataKey: "scatter", name: "Data Points" }]}
          title="Correlation Analysis"
          xAxis={{ dataKey: "x", label: "X Value" }}
          yAxis={{ dataKey: "y", label: "Y Value" }}
          zAxis={{ dataKey: "z", range: [50, 400] }}
        />

        {/* Composed Chart */}
        <ComposedChart
          data={salesData}
          description="Multiple chart types in one"
          exportFilename="combined-metrics"
          height={350}
          title="Combined Metrics"
          elements={[
            { type: "bar", config: { dataKey: "sales", name: "Sales" } },
            {
              type: "line",
              config: { dataKey: "profit", name: "Profit", strokeWidth: 3 },
            },
            { type: "area", config: { dataKey: "revenue", name: "Revenue" } },
          ]}
          yAxis={{
            tickFormatter: (value) => formatCompact(value),
          }}
        />
      </div>

      {/* Loading State Example */}
      <div className="mt-6">
        <button
          className="mb-4 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          onClick={() => setIsLoading(!isLoading)}
        >
          Toggle Loading State
        </button>

        <LineChart
          data={salesData}
          height={300}
          lines={[{ dataKey: "sales" }]}
          loading={isLoading}
          loadingText="Fetching chart data..."
          title="Loading Example"
        />
      </div>

      {/* Empty State Example */}
      <div className="mt-6">
        <LineChart
          empty
          data={[]}
          emptyText="No data available for the selected period"
          height={300}
          lines={[{ dataKey: "sales" }]}
          title="Empty State Example"
        />
      </div>
    </div>
  );
};

export default Dashboard;
