import type { ReactNode } from "react";

// Base data types
export interface ChartDataPoint {
  name: string;
  [key: string]: string | number | null | undefined;
}

export interface ScatterDataPoint {
  x: number;
  y: number;
  z?: number;
  name?: string;
  [key: string]: string | number | null | undefined;
}

// Axis configuration
export interface AxisConfig {
  label?: string;
  tickFormatter?: (value: number | string) => string;
  hide?: boolean;
  domain?: [number | string, number | string];
  tickCount?: number;
}

// Series configurations
export interface LineSeries {
  dataKey: string;
  name?: string;
  color?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  showDots?: boolean;
  dotSize?: number;
}

export interface AreaSeries extends LineSeries {
  fillOpacity?: number;
  gradientId?: string;
}

export interface BarSeries {
  dataKey: string;
  name?: string;
  color?: string;
  stackId?: string;
  radius?: number | [number, number, number, number];
}

export interface ScatterSeries {
  dataKey: string;
  name?: string;
  color?: string;
  shape?: "circle" | "square" | "triangle" | "diamond";
  size?: number;
}

// Export options
export interface ExportOptions {
  filename?: string;
  format?: "png" | "jpeg" | "svg";
  quality?: number;
  backgroundColor?: string;
  scale?: number;
}

export interface DataExportOptions {
  filename?: string;
  format?: "csv" | "json" | "xlsx";
  includeHeaders?: boolean;
}

// Toolbar configuration
export interface ToolbarConfig {
  show?: boolean;
  downloadImage?: boolean;
  downloadData?: boolean;
  fullscreen?: boolean;
  zoom?: boolean;
  resetZoom?: boolean;
  customActions?: ToolbarAction[];
}

export interface ToolbarAction {
  id: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

// Legend configuration
export interface LegendConfig {
  show?: boolean;
  position?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  interactive?: boolean;
}

// Tooltip configuration
// Note: formatter/labelFormatter use loose parameter types so they remain
// assignable to recharts' Formatter/LabelFormatter (whose parameters are
// ValueType | undefined / ReactNode under strictFunctionTypes).
export interface TooltipConfig {
  show?: boolean;
  formatter?: (
    value: any,
    name: any,
    item: any,
    index: number,
    payload: any
  ) => ReactNode;
  labelFormatter?: (label: any, payload?: any) => ReactNode;
  cursor?: boolean | object;
}

// Loading and empty states
export interface StateConfig {
  loading?: boolean;
  loadingText?: string;
  empty?: boolean;
  emptyText?: string;
  emptyIcon?: ReactNode;
  error?: boolean;
  errorText?: string;
  onRetry?: () => void;
}

// Base chart props
export interface BaseChartProps {
  // Data
  data: ChartDataPoint[];

  // Dimensions
  width?: number | string;
  height?: number;

  // Styling
  className?: string;
  colors?: string[];

  // Title and description
  title?: string;
  description?: string;

  // Features
  showGrid?: boolean;
  gridType?: "horizontal" | "vertical" | "both";
  animate?: boolean;
  animationDuration?: number;

  // Configurations
  legend?: LegendConfig | boolean;
  tooltip?: TooltipConfig | boolean;
  toolbar?: ToolbarConfig | boolean;

  // States
  loading?: boolean;
  empty?: boolean;
  error?: boolean;

  // Callbacks
  onDataPointClick?: (data: any, index: number) => void;
  onLegendClick?: (dataKey: string) => void;

  // Export
  exportFilename?: string;
}

// Specific chart props
export interface LineChartProps extends BaseChartProps {
  lines: LineSeries[];
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  curved?: boolean;
  connectNulls?: boolean;
  referenceLines?: ReferenceLine[];
}

export interface AreaChartProps extends BaseChartProps {
  areas: AreaSeries[];
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  curved?: boolean;
  stacked?: boolean;
  connectNulls?: boolean;
}

export interface UncertaintyChartProps extends BaseChartProps {
  lines: LineSeries[];
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  tooltipFormatter?: (value: any, name: string) => any;
}

export interface BarChartProps extends BaseChartProps {
  bars: BarSeries[];
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  layout?: "horizontal" | "vertical";
  barSize?: number;
  barGap?: number;
  barCategoryGap?: string | number;
  stacked?: boolean;
}

export interface PieChartProps extends Omit<BaseChartProps, "showGrid"> {
  dataKey?: string;
  nameKey?: string;
  innerRadius?: number | string;
  outerRadius?: number | string;
  paddingAngle?: number;
  startAngle?: number;
  endAngle?: number;
  showLabels?: boolean;
  labelType?: "value" | "percent" | "name" | "custom";
  labelFormatter?: (entry: any) => string;
}

export interface DonutChartProps extends PieChartProps {
  centerLabel?: ReactNode;
  centerValue?: string | number;
  centerDescription?: string;
}

export interface RadarChartProps extends Omit<BaseChartProps, "showGrid"> {
  radars: {
    dataKey: string;
    name?: string;
    color?: string;
    fillOpacity?: number;
  }[];
  angleAxisKey?: string;
  showPolarGrid?: boolean;
}

export interface ScatterChartProps extends BaseChartProps {
  scatters: ScatterSeries[];
  xAxis?: AxisConfig & { dataKey: string };
  yAxis?: AxisConfig & { dataKey: string };
  zAxis?: { dataKey: string; range?: [number, number] };
}

export interface ComposedChartProps extends BaseChartProps {
  elements: (
    | { type: "line"; config: LineSeries }
    | { type: "bar"; config: BarSeries }
    | { type: "area"; config: AreaSeries }
  )[];
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  secondaryYAxis?: AxisConfig;
}

export interface SparklineProps {
  data: number[] | ChartDataPoint[];
  dataKey?: string;
  type?: "line" | "bar" | "area";
  width?: number;
  height?: number;
  color?: string;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}

export interface ReferenceLine {
  y?: number;
  x?: string | number;
  label?: string;
  color?: string;
  strokeDasharray?: string;
}
