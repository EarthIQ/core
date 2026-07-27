import type { GeoJSON } from "geojson";

export interface ColorStop {
  value: number;
  color: string;
}

export interface StyleRule {
  property: string;
  values: { value: any; style: Record<string, any> }[];
  default?: Record<string, any>;
}

export const StyleUtils = {
  /**
   * Generate a color interpolation expression
   */
  interpolateColor(
    property: string,
    stops: ColorStop[],
    type: "linear" | "exponential" | "cubic-bezier" = "linear"
  ): any[] {
    const sortedStops = [...stops].sort((a, b) => a.value - b.value);

    if (type === "linear") {
      return [
        "interpolate",
        ["linear"],
        ["get", property],
        ...sortedStops.flatMap((stop) => [stop.value, stop.color]),
      ];
    }

    if (type === "exponential") {
      return [
        "interpolate",
        ["exponential", 1.5],
        ["get", property],
        ...sortedStops.flatMap((stop) => [stop.value, stop.color]),
      ];
    }

    // Default to linear
    return [
      "interpolate",
      ["linear"],
      ["get", property],
      ...sortedStops.flatMap((stop) => [stop.value, stop.color]),
    ];
  },

  /**
   * Generate a step color expression (discrete)
   */
  stepColor(
    property: string,
    stops: ColorStop[],
    defaultColor: string = "#888888"
  ): any[] {
    const sortedStops = [...stops].sort((a, b) => a.value - b.value);

    return [
      "step",
      ["get", property],
      defaultColor,
      ...sortedStops.flatMap((stop) => [stop.value, stop.color]),
    ];
  },

  /**
   * Generate a match expression for categorical data
   */
  matchCategory(
    property: string,
    categories: { value: any; color: string }[],
    defaultColor: string = "#888888"
  ): any[] {
    return [
      "match",
      ["get", property],
      ...categories.flatMap((cat) => [cat.value, cat.color]),
      defaultColor,
    ];
  },

  /**
   * Generate a case expression
   */
  caseExpression(
    conditions: { condition: any[]; result: any }[],
    fallback: any
  ): any[] {
    return [
      "case",
      ...conditions.flatMap((c) => [c.condition, c.result]),
      fallback,
    ];
  },

  /**
   * Create data-driven size expression
   */
  interpolateSize(
    property: string,
    stops: { value: number; size: number }[],
    type: "linear" | "exponential" = "linear"
  ): any[] {
    const sortedStops = [...stops].sort((a, b) => a.value - b.value);

    return [
      "interpolate",
      type === "exponential" ? ["exponential", 2] : ["linear"],
      ["get", property],
      ...sortedStops.flatMap((stop) => [stop.value, stop.size]),
    ];
  },

  /**
   * Create zoom-based interpolation
   */
  zoomInterpolate(
    stops: { zoom: number; value: any }[],
    type: "linear" | "exponential" = "linear"
  ): any[] {
    const sortedStops = [...stops].sort((a, b) => a.zoom - b.zoom);

    return [
      "interpolate",
      type === "exponential" ? ["exponential", 2] : ["linear"],
      ["zoom"],
      ...sortedStops.flatMap((stop) => [stop.zoom, stop.value]),
    ];
  },

  /**
   * Combine zoom and property interpolation
   */
  zoomPropertyInterpolate(
    property: string,
    zoomStops: {
      zoom: number;
      propertyStops: { value: number; result: any }[];
    }[]
  ): any[] {
    return [
      "interpolate",
      ["linear"],
      ["zoom"],
      ...zoomStops.flatMap((zoomStop) => [
        zoomStop.zoom,
        [
          "interpolate",
          ["linear"],
          ["get", property],
          ...zoomStop.propertyStops.flatMap((ps) => [ps.value, ps.result]),
        ],
      ]),
    ];
  },

  /**
   * Generate a color ramp from a palette name
   */
  getColorRamp(
    palette:
      | "viridis"
      | "plasma"
      | "inferno"
      | "magma"
      | "turbo"
      | "blues"
      | "greens"
      | "reds"
      | "oranges"
      | "purples"
      | "greys"
      | "spectral"
      | "rdylgn"
      | "rdbu",
    steps: number = 10
  ): string[] {
    const palettes: Record<string, string[]> = {
      viridis: [
        "#440154",
        "#482777",
        "#3E4989",
        "#31688E",
        "#26838F",
        "#1F9D8A",
        "#6CCE5A",
        "#B6DE2B",
        "#FDE725",
      ],
      plasma: [
        "#0D0887",
        "#5B02A3",
        "#9A179B",
        "#CB4678",
        "#EB7852",
        "#FBB32F",
        "#F0F921",
      ],
      inferno: [
        "#000004",
        "#1B0C41",
        "#4A0C6B",
        "#781C6D",
        "#A52C60",
        "#CF4446",
        "#ED6925",
        "#FB9A06",
        "#FCFFA4",
      ],
      magma: [
        "#000004",
        "#180F3D",
        "#440F76",
        "#721F81",
        "#9E2F7F",
        "#CD4071",
        "#F1605D",
        "#FD9668",
        "#FCFDBF",
      ],
      turbo: [
        "#30123B",
        "#4662D7",
        "#35AAC9",
        "#29E989",
        "#A4FC3C",
        "#FEDE28",
        "#FB8022",
        "#D23105",
        "#7A0403",
      ],
      blues: [
        "#F7FBFF",
        "#DEEBF7",
        "#C6DBEF",
        "#9ECAE1",
        "#6BAED6",
        "#4292C6",
        "#2171B5",
        "#08519C",
        "#08306B",
      ],
      greens: [
        "#F7FCF5",
        "#E5F5E0",
        "#C7E9C0",
        "#A1D99B",
        "#74C476",
        "#41AB5D",
        "#238B45",
        "#006D2C",
        "#00441B",
      ],
      reds: [
        "#FFF5F0",
        "#FEE0D2",
        "#FCBBA1",
        "#FC9272",
        "#FB6A4A",
        "#EF3B2C",
        "#CB181D",
        "#A50F15",
        "#67000D",
      ],
      oranges: [
        "#FFF5EB",
        "#FEE6CE",
        "#FDD0A2",
        "#FDAE6B",
        "#FD8D3C",
        "#F16913",
        "#D94801",
        "#A63603",
        "#7F2704",
      ],
      purples: [
        "#FCFBFD",
        "#EFEDF5",
        "#DADAEB",
        "#BCBDDC",
        "#9E9AC8",
        "#807DBA",
        "#6A51A3",
        "#54278F",
        "#3F007D",
      ],
      greys: [
        "#FFFFFF",
        "#F0F0F0",
        "#D9D9D9",
        "#BDBDBD",
        "#969696",
        "#737373",
        "#525252",
        "#252525",
        "#000000",
      ],
      spectral: [
        "#9E0142",
        "#D53E4F",
        "#F46D43",
        "#FDAE61",
        "#FEE08B",
        "#FFFFBF",
        "#E6F598",
        "#ABDDA4",
        "#66C2A5",
        "#3288BD",
        "#5E4FA2",
      ],
      rdylgn: [
        "#A50026",
        "#D73027",
        "#F46D43",
        "#FDAE61",
        "#FEE08B",
        "#FFFFBF",
        "#D9EF8B",
        "#A6D96A",
        "#66BD63",
        "#1A9850",
        "#006837",
      ],
      rdbu: [
        "#67001F",
        "#B2182B",
        "#D6604D",
        "#F4A582",
        "#FDDBC7",
        "#F7F7F7",
        "#D1E5F0",
        "#92C5DE",
        "#4393C3",
        "#2166AC",
        "#053061",
      ],
    };

    const colors = palettes[palette] || palettes["viridis"];

    if (steps === colors.length) return colors;

    // Interpolate to get desired number of steps
    const result: string[] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const idx = t * (colors.length - 1);
      const lower = Math.floor(idx);
      const upper = Math.ceil(idx);
      const frac = idx - lower;

      if (lower === upper) {
        result.push(colors[lower]);
      } else {
        result.push(interpolateHex(colors[lower], colors[upper], frac));
      }
    }

    return result;
  },

  /**
   * Create a classified style based on data values
   */
  classifyData(
    data: GeoJSON.FeatureCollection,
    property: string,
    numClasses: number,
    method: "quantile" | "equal" | "natural" | "stddev" = "quantile"
  ): number[] {
    const values = data.features
      .map((f) => f.properties?.[property])
      .filter((v) => typeof v === "number" && !isNaN(v))
      .sort((a, b) => a - b);

    if (values.length === 0) return [];

    const min = values[0];
    const max = values[values.length - 1];

    if (method === "equal") {
      const step = (max - min) / numClasses;
      return Array.from({ length: numClasses + 1 }, (_, i) => min + step * i);
    }

    if (method === "quantile") {
      return Array.from({ length: numClasses + 1 }, (_, i) => {
        const idx = Math.floor((i / numClasses) * (values.length - 1));
        return values[idx];
      });
    }

    if (method === "stddev") {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance =
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
        values.length;
      const stddev = Math.sqrt(variance);

      const breaks = [min];
      for (let i = -2; i <= 2; i++) {
        const value = mean + i * stddev;
        if (value > min && value < max) {
          breaks.push(value);
        }
      }
      breaks.push(max);
      return breaks;
    }

    if (method === "natural") {
      // Jenks natural breaks - simplified implementation
      return jenksBreaks(values, numClasses);
    }

    return [];
  },

  /**
   * Generate style from classification
   */
  generateClassifiedStyle(
    property: string,
    breaks: number[],
    colors: string[],
    styleType: "fill-color" | "circle-color" | "line-color" = "fill-color"
  ): any[] {
    if (breaks.length !== colors.length + 1) {
      console.warn("Number of colors should be one less than number of breaks");
    }

    const stops: any[] = [];
    for (let i = 0; i < colors.length; i++) {
      stops.push(breaks[i], colors[i]);
    }

    return [
      "step",
      ["get", property],
      colors[0], // default
      ...stops.slice(2), // skip first value/color pair (used as default)
    ];
  },

  /**
   * Create a heatmap color expression
   */
  heatmapColor(intensity: "low" | "medium" | "high" = "medium"): any[] {
    const densities = {
      low: [0, 0.2, 0.4, 0.6, 0.8, 1],
      medium: [0, 0.1, 0.3, 0.5, 0.7, 1],
      high: [0, 0.05, 0.1, 0.2, 0.4, 1],
    };

    const colors = [
      "rgba(33,102,172,0)",
      "rgb(103,169,207)",
      "rgb(209,229,240)",
      "rgb(253,219,199)",
      "rgb(239,138,98)",
      "rgb(178,24,43)",
    ];

    const d = densities[intensity];
    return [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      d[0],
      colors[0],
      d[1],
      colors[1],
      d[2],
      colors[2],
      d[3],
      colors[3],
      d[4],
      colors[4],
      d[5],
      colors[5],
    ];
  },

  /**
   * Parse color string to RGB array
   */
  parseColor(color: string): [number, number, number, number] | null {
    // Hex color
    if (color.startsWith("#")) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        return [
          parseInt(hex[0] + hex[0], 16),
          parseInt(hex[1] + hex[1], 16),
          parseInt(hex[2] + hex[2], 16),
          255,
        ];
      }
      if (hex.length === 6) {
        return [
          parseInt(hex.slice(0, 2), 16),
          parseInt(hex.slice(2, 4), 16),
          parseInt(hex.slice(4, 6), 16),
          255,
        ];
      }
      if (hex.length === 8) {
        return [
          parseInt(hex.slice(0, 2), 16),
          parseInt(hex.slice(2, 4), 16),
          parseInt(hex.slice(4, 6), 16),
          parseInt(hex.slice(6, 8), 16),
        ];
      }
    }

    // RGB/RGBA
    const rgbMatch = color.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
    );
    if (rgbMatch) {
      return [
        parseInt(rgbMatch[1]),
        parseInt(rgbMatch[2]),
        parseInt(rgbMatch[3]),
        rgbMatch[4] ? Math.round(parseFloat(rgbMatch[4]) * 255) : 255,
      ];
    }

    return null;
  },

  /**
   * Convert RGB to hex
   */
  rgbToHex(r: number, g: number, b: number, a?: number): string {
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");

    if (a !== undefined && a < 255) {
      return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
    }
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  },

  /**
   * Darken a color
   */
  darken(color: string, amount: number = 0.2): string {
    const rgba = StyleUtils.parseColor(color);
    if (!rgba) return color;

    return StyleUtils.rgbToHex(
      Math.max(0, rgba[0] * (1 - amount)),
      Math.max(0, rgba[1] * (1 - amount)),
      Math.max(0, rgba[2] * (1 - amount)),
      rgba[3]
    );
  },

  /**
   * Lighten a color
   */
  lighten(color: string, amount: number = 0.2): string {
    const rgba = StyleUtils.parseColor(color);
    if (!rgba) return color;

    return StyleUtils.rgbToHex(
      Math.min(255, rgba[0] + (255 - rgba[0]) * amount),
      Math.min(255, rgba[1] + (255 - rgba[1]) * amount),
      Math.min(255, rgba[2] + (255 - rgba[2]) * amount),
      rgba[3]
    );
  },

  /**
   * Create hover/selected state expressions
   */
  withStates(
    baseValue: any,
    states: {
      hover?: any;
      selected?: any;
      active?: any;
    }
  ): any[] {
    const conditions: any[] = [];

    if (states.active !== undefined) {
      conditions.push(
        ["boolean", ["feature-state", "active"], false],
        states.active
      );
    }
    if (states.selected !== undefined) {
      conditions.push(
        ["boolean", ["feature-state", "selected"], false],
        states.selected
      );
    }
    if (states.hover !== undefined) {
      conditions.push(
        ["boolean", ["feature-state", "hover"], false],
        states.hover
      );
    }

    return ["case", ...conditions, baseValue];
  },

  /**
   * Generate a complete layer style object
   */
  createLayerStyle(
    type: "fill" | "line" | "circle" | "symbol",
    options: {
      color?: string | any[];
      opacity?: number;
      width?: number;
      radius?: number;
      strokeColor?: string;
      strokeWidth?: number;
      pattern?: string;
      dasharray?: number[];
      blur?: number;
    }
  ): { paint: Record<string, any>; layout: Record<string, any> } {
    const paint: Record<string, any> = {};
    const layout: Record<string, any> = {};

    switch (type) {
      case "fill":
        if (options.color) paint["fill-color"] = options.color;
        if (options.opacity !== undefined)
          paint["fill-opacity"] = options.opacity;
        if (options.strokeColor)
          paint["fill-outline-color"] = options.strokeColor;
        if (options.pattern) paint["fill-pattern"] = options.pattern;
        break;

      case "line":
        if (options.color) paint["line-color"] = options.color;
        if (options.opacity !== undefined)
          paint["line-opacity"] = options.opacity;
        if (options.width) paint["line-width"] = options.width;
        if (options.blur) paint["line-blur"] = options.blur;
        if (options.dasharray) paint["line-dasharray"] = options.dasharray;
        break;

      case "circle":
        if (options.color) paint["circle-color"] = options.color;
        if (options.opacity !== undefined)
          paint["circle-opacity"] = options.opacity;
        if (options.radius) paint["circle-radius"] = options.radius;
        if (options.strokeColor)
          paint["circle-stroke-color"] = options.strokeColor;
        if (options.strokeWidth)
          paint["circle-stroke-width"] = options.strokeWidth;
        if (options.blur) paint["circle-blur"] = options.blur;
        break;

      case "symbol":
        if (options.color) paint["icon-color"] = options.color;
        if (options.opacity !== undefined)
          paint["icon-opacity"] = options.opacity;
        break;
    }

    return { paint, layout };
  },

  /**
   * Get the opacity property name for a given layer type
   */
  getOpacityProperty(type: string): string | null {
    switch (type) {
      case "fill":
        return "fill-opacity";
      case "line":
        return "line-opacity";
      case "circle":
        return "circle-opacity";
      case "symbol":
        return "icon-opacity";
      case "raster":
        return "raster-opacity";
      case "fill-extrusion":
        return "fill-extrusion-opacity";
      case "heatmap":
        return "heatmap-opacity";
      case "background":
        return "background-opacity";
      default:
        return null;
    }
  },
};

// Helper functions
function interpolateHex(
  color1: string,
  color2: string,
  factor: number
): string {
  const c1 = StyleUtils.parseColor(color1);
  const c2 = StyleUtils.parseColor(color2);

  if (!c1 || !c2) return color1;

  return StyleUtils.rgbToHex(
    Math.round(c1[0] + (c2[0] - c1[0]) * factor),
    Math.round(c1[1] + (c2[1] - c1[1]) * factor),
    Math.round(c1[2] + (c2[2] - c1[2]) * factor)
  );
}

function jenksBreaks(data: number[], numClasses: number): number[] {
  // Simplified Jenks natural breaks implementation
  const n = data.length;

  if (n <= numClasses) {
    return data;
  }

  // Initialize matrices
  const lowerClassLimits: number[][] = [];
  const varianceCombinations: number[][] = [];

  for (let i = 0; i < n + 1; i++) {
    const inner1: number[] = [];
    const inner2: number[] = [];
    for (let j = 0; j < numClasses + 1; j++) {
      inner1.push(0);
      inner2.push(0);
    }
    lowerClassLimits.push(inner1);
    varianceCombinations.push(inner2);
  }

  for (let i = 1; i < numClasses + 1; i++) {
    lowerClassLimits[1][i] = 1;
    varianceCombinations[1][i] = 0;
    for (let j = 2; j < n + 1; j++) {
      varianceCombinations[j][i] = Infinity;
    }
  }

  let variance = 0;
  for (let l = 2; l < n + 1; l++) {
    let sum = 0;
    let sumSquares = 0;
    let w = 0;

    for (let m = 1; m < l + 1; m++) {
      const lowerClassLimit = l - m + 1;
      const val = data[lowerClassLimit - 1];
      w += 1;
      sum += val;
      sumSquares += val * val;
      variance = sumSquares - (sum * sum) / w;
      const i4 = lowerClassLimit - 1;
      if (i4 !== 0) {
        for (let j = 2; j < numClasses + 1; j++) {
          if (
            varianceCombinations[l][j] >=
            variance + varianceCombinations[i4][j - 1]
          ) {
            lowerClassLimits[l][j] = lowerClassLimit;
            varianceCombinations[l][j] =
              variance + varianceCombinations[i4][j - 1];
          }
        }
      }
    }

    lowerClassLimits[l][1] = 1;
    varianceCombinations[l][1] = variance;
  }

  // Extract breaks
  const breaks: number[] = [data[n - 1]];
  let k = n;
  for (let j = numClasses; j >= 2; j--) {
    const id = lowerClassLimits[k][j] - 2;
    breaks.push(data[id]);
    k = lowerClassLimits[k][j] - 1;
  }
  breaks.push(data[0]);

  return breaks.reverse();
}

export default StyleUtils;
