import type { GeoJSON } from "geojson";
import type { ReactNode } from "react";
import type {
  SourceSpecification,
  LayerSpecification,
  SkySpecification,
} from "maplibre-gl";

// Re-export GeoJSON types
export type {
  Feature,
  FeatureCollection,
  Geometry,
  Point,
  LineString,
  Polygon,
  MultiPoint,
  MultiLineString,
  MultiPolygon,
  GeometryCollection,
  GeoJsonProperties,
} from "geojson";

// Layer types
export type LayerType =
  | "fill"
  | "line"
  | "circle"
  | "symbol"
  | "raster"
  | "fill-extrusion"
  | "heatmap"
  | "hillshade"
  | "background"
  | "sky";

// Source types
export type SourceType =
  "vector" | "raster" | "raster-dem" | "geojson" | "image" | "video";

// Common props
export interface BaseLayerProps {
  id?: string;
  beforeId?: string;
  visible?: boolean;
  minZoom?: number;
  maxZoom?: number;
}

export interface InteractiveLayerProps {
  onClick?: (feature: GeoJSON.Feature, event: unknown) => void;
  onHover?: (feature: GeoJSON.Feature | null, event: unknown) => void;
  hoverable?: boolean;
  selectable?: boolean;
  cursor?: string;
}

// Paint properties
export interface FillPaint {
  "fill-color"?: string | Expression;
  "fill-opacity"?: number | Expression;
  "fill-pattern"?: string;
  "fill-outline-color"?: string | Expression;
  "fill-antialias"?: boolean;
  "fill-translate"?: [number, number];
}

export interface LinePaint {
  "line-color"?: string | Expression;
  "line-opacity"?: number | Expression;
  "line-width"?: number | Expression;
  "line-gap-width"?: number | Expression;
  "line-blur"?: number | Expression;
  "line-dasharray"?: number[];
  "line-pattern"?: string;
  "line-cap"?: "butt" | "round" | "square";
  "line-join"?: "bevel" | "round" | "miter";
}

export interface CirclePaint {
  "circle-color"?: string | Expression;
  "circle-opacity"?: number | Expression;
  "circle-radius"?: number | Expression;
  "circle-stroke-color"?: string | Expression;
  "circle-stroke-width"?: number | Expression;
  "circle-stroke-opacity"?: number | Expression;
  "circle-blur"?: number | Expression;
  "circle-translate"?: [number, number];
}

export interface SymbolLayout {
  "icon-image"?: string | Expression;
  "icon-size"?: number | Expression;
  "icon-rotation-alignment"?: "map" | "viewport" | "auto";
  "icon-allow-overlap"?: boolean;
  "icon-anchor"?:
    | "center"
    | "left"
    | "right"
    | "top"
    | "bottom"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  "icon-offset"?: [number, number];
  "icon-rotate"?: number | Expression;
  "text-field"?: string | Expression;
  "text-font"?: string[];
  "text-size"?: number | Expression;
  "text-anchor"?:
    | "center"
    | "left"
    | "right"
    | "top"
    | "bottom"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  "text-offset"?: [number, number];
  "text-justify"?: "auto" | "left" | "center" | "right";
  "text-max-width"?: number;
  "text-line-height"?: number;
  "text-letter-spacing"?: number;
  "text-transform"?: "none" | "uppercase" | "lowercase";
  "text-allow-overlap"?: boolean;
  "symbol-placement"?: "point" | "line" | "line-center";
  "symbol-spacing"?: number;
}

export interface SymbolPaint {
  "icon-color"?: string | Expression;
  "icon-opacity"?: number | Expression;
  "icon-halo-color"?: string;
  "icon-halo-width"?: number;
  "icon-halo-blur"?: number;
  "text-color"?: string | Expression;
  "text-opacity"?: number | Expression;
  "text-halo-color"?: string;
  "text-halo-width"?: number;
  "text-halo-blur"?: number;
}

export interface HeatmapPaint {
  "heatmap-radius"?: number | Expression;
  "heatmap-weight"?: number | Expression;
  "heatmap-intensity"?: number | Expression;
  "heatmap-color"?: Expression;
  "heatmap-opacity"?: number | Expression;
}

export interface FillExtrusionPaint {
  "fill-extrusion-color"?: string | Expression;
  "fill-extrusion-opacity"?: number;
  "fill-extrusion-height"?: number | Expression;
  "fill-extrusion-base"?: number | Expression;
  "fill-extrusion-pattern"?: string;
  "fill-extrusion-translate"?: [number, number];
  "fill-extrusion-vertical-gradient"?: boolean;
}

// Event types
export interface MapClickEvent {
  lngLat: { lng: number; lat: number };
  point: { x: number; y: number };
  features?: GeoJSON.Feature[];
  originalEvent: MouseEvent;
}

export interface MapMoveEvent {
  viewState: ViewState;
  originalEvent?: MouseEvent | TouchEvent | WheelEvent;
}

export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  padding?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

// Control position type
export type ControlPosition =
  "top-left" | "top-right" | "bottom-left" | "bottom-right";

// Bounds type
export type BoundsArray = [number, number, number, number]; // [west, south, east, north]
export type BoundsLike = BoundsArray | [[number, number], [number, number]];

// Expression type — a MapLibre data-driven expression: a nested array of
// literals (strings / numbers / booleans) and nested expression arrays.
export type Expression = (string | number | boolean | Expression[])[];

// Data source types
export interface GeoJSONSourceSpecification {
  type: "geojson";
  data: GeoJSON.GeoJSON | string;
  maxzoom?: number;
  attribution?: string;
  buffer?: number;
  tolerance?: number;
  cluster?: boolean;
  clusterRadius?: number;
  clusterMaxZoom?: number;
  clusterMinPoints?: number;
  clusterProperties?: Record<string, unknown>;
  lineMetrics?: boolean;
  generateId?: boolean;
  promoteId?: string | { [key: string]: string };
}

export interface VectorSourceSpecification {
  type: "vector";
  url?: string;
  tiles?: string[];
  bounds?: BoundsArray;
  scheme?: "xyz" | "tms";
  minzoom?: number;
  maxzoom?: number;
  attribution?: string;
  promoteId?: string | { [key: string]: string };
}

export interface RasterSourceSpecification {
  type: "raster";
  url?: string;
  tiles?: string[];
  bounds?: BoundsArray;
  minzoom?: number;
  maxzoom?: number;
  tileSize?: number;
  scheme?: "xyz" | "tms";
  attribution?: string;
}

export interface RasterDEMSourceSpecification {
  type: "raster-dem";
  url?: string;
  tiles?: string[];
  bounds?: BoundsArray;
  minzoom?: number;
  maxzoom?: number;
  tileSize?: number;
  attribution?: string;
  encoding?: "terrarium" | "mapbox";
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

// Style specification types
export interface StyleSpecification {
  version: 8;
  name?: string;
  metadata?: Record<string, unknown>;
  center?: [number, number];
  zoom?: number;
  bearing?: number;
  pitch?: number;
  sources: Record<string, SourceSpecification>;
  sprite?: string;
  glyphs?: string;
  layers: LayerSpecification[];
  terrain?: {
    source: string;
    exaggeration?: number;
  };
  sky?: SkySpecification;
}

export interface MapCoordinates {
  lat: number;
  lng: number;
  zoom: number;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  onClick?: (coords: MapCoordinates) => void;
  children?: ContextMenuItem[];
}

export interface ContextMenuControlProps {
  /** Custom menu items to add */
  items?: ContextMenuItem[];
  /** Whether to show coordinates */
  showCoordinates?: boolean;
  /** Coordinate format */
  coordinateFormat?: "decimal" | "dms" | "both";
  /** Decimal precision for coordinates */
  precision?: number;
  /** Callback when coordinates are copied */
  onCopyCoordinates?: (coords: MapCoordinates, format: string) => void;
  /** Callback when "What's here" is clicked */
  onWhatsHere?: (coords: MapCoordinates) => void;
  /** Callback when "Directions from here" is clicked */
  onDirectionsFrom?: (coords: MapCoordinates) => void;
  /** Callback when "Directions to here" is clicked */
  onDirectionsTo?: (coords: MapCoordinates) => void;
  /** Callback when "Add marker" is clicked */
  onAddMarker?: (coords: MapCoordinates) => void;
  /** Callback when "Measure distance" is clicked */
  onMeasureDistance?: (coords: MapCoordinates) => void;
  /** Custom class name */
  className?: string;
  /** Whether the control is disabled */
  disabled?: boolean;
}

export interface ContextMenuState {
  isOpen: boolean;
  position: ContextMenuPosition | null;
  coordinates: MapCoordinates | null;
}

// Export callback types
export type OnLoadCallback = () => void;
export type OnErrorCallback = (error: Error) => void;
export type OnClickCallback = (event: MapClickEvent) => void;
export type OnMoveCallback = (event: MapMoveEvent) => void;
export type OnFeatureCallback = (
  feature: GeoJSON.Feature,
  event: unknown
) => void;
