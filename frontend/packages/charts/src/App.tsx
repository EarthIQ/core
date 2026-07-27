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
                data={sparklineData}
                type="area"
                width={80}
                height={32}
                color={kpi.change.startsWith("+") ? "#22c55e" : "#ef4444"}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Line Chart */}
        <LineChart
          title="Sales Trend"
          description="Monthly sales performance over time"
          data={salesData}
          height={350}
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
          yAxis={{
            tickFormatter: (value) => formatCompact(value),
          }}
          toolbar={{
            downloadImage: true,
            downloadData: true,
            fullscreen: true,
          }}
          exportFilename="sales-trend"
        />

        {/* Area Chart */}
        <AreaChart
          title="Revenue & Profit"
          description="Stacked area showing revenue composition"
          data={salesData}
          height={350}
          areas={[
            { dataKey: "revenue", name: "Revenue" },
            { dataKey: "profit", name: "Profit" },
          ]}
          stacked
          yAxis={{
            tickFormatter: (value) => formatCurrency(value),
          }}
          exportFilename="revenue-profit"
        />

        {/* Bar Chart */}
        <BarChart
          title="Monthly Comparison"
          description="Sales vs Target by month"
          data={salesData}
          height={350}
          bars={[
            { dataKey: "sales", name: "Sales", color: "#3b82f6" },
            { dataKey: "target", name: "Target", color: "#94a3b8" },
          ]}
          barCategoryGap="20%"
          yAxis={{
            tickFormatter: (value) => formatCompact(value),
          }}
          onDataPointClick={(data, index) => {
            console.log("Clicked:", data, index);
          }}
          exportFilename="monthly-comparison"
        />

        {/* Horizontal Bar Chart */}
        <BarChart
          title="Category Performance"
          description="Sales by product category"
          data={categoryData}
          height={350}
          layout="vertical"
          bars={[{ dataKey: "value", name: "Sales" }]}
          xAxis={{
            tickFormatter: (value) => formatCompact(value as number),
          }}
          exportFilename="category-performance"
        />
      </div>

      {/* Second Row */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Donut Chart */}
        <DonutChart
          title="Sales by Category"
          description="Distribution of sales"
          data={categoryData}
          height={350}
          centerValue={categoryData.reduce((sum, d) => sum + d.value, 0)}
          centerDescription="Total Sales"
          exportFilename="sales-distribution"
        />

        {/* Pie Chart */}
        <PieChart
          title="Market Share"
          description="Percentage of total market"
          data={categoryData}
          height={350}
          showLabels
          labelType="percent"
          exportFilename="market-share"
        />

        {/* Radar Chart */}
        <RadarChart
          title="Team Performance"
          description="Comparison across departments"
          data={radarData}
          height={350}
          radars={[
            { dataKey: "A", name: "Team A", fillOpacity: 0.3 },
            { dataKey: "B", name: "Team B", fillOpacity: 0.3 },
          ]}
          angleAxisKey="subject"
          exportFilename="team-performance"
        />
      </div>

      {/* Third Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Scatter Chart */}
        <ScatterChart
          title="Correlation Analysis"
          description="Relationship between variables"
          data={scatterData}
          height={350}
          scatters={[{ dataKey: "scatter", name: "Data Points" }]}
          xAxis={{ dataKey: "x", label: "X Value" }}
          yAxis={{ dataKey: "y", label: "Y Value" }}
          zAxis={{ dataKey: "z", range: [50, 400] }}
          exportFilename="correlation"
        />

        {/* Composed Chart */}
        <ComposedChart
          title="Combined Metrics"
          description="Multiple chart types in one"
          data={salesData}
          height={350}
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
          exportFilename="combined-metrics"
        />
      </div>

      {/* Loading State Example */}
      <div className="mt-6">
        <button
          onClick={() => setIsLoading(!isLoading)}
          className="mb-4 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Toggle Loading State
        </button>

        <LineChart
          title="Loading Example"
          data={salesData}
          height={300}
          lines={[{ dataKey: "sales" }]}
          loading={isLoading}
          loadingText="Fetching chart data..."
        />
      </div>

      {/* Empty State Example */}
      <div className="mt-6">
        <LineChart
          title="Empty State Example"
          data={[]}
          height={300}
          lines={[{ dataKey: "sales" }]}
          empty
          emptyText="No data available for the selected period"
        />
      </div>
    </div>
  );
};

export default Dashboard;
