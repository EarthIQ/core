/* ──────────────────────────────────────────────────────────────────────── */
/*  Map editor data model                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

/** The tool currently active in the MapActionBar (mirrors the bar's model). */
export interface ActiveTool {
  groupId: string;
  variantId: string;
}

/** Point annotations — rendered as rich DOM overlays. */
export type PointKind = "marker" | "text" | "note" | "image" | "link" | "video";

/** Shape annotations — rendered as MapLibre vector layers. */
export type ShapeKind = "circle" | "rectangle" | "line" | "highlight" | "shape";

export type AnnotationKind = PointKind | ShapeKind;

export const POINT_KINDS: PointKind[] = [
  "marker",
  "text",
  "note",
  "image",
  "link",
  "video",
];

export const SHAPE_KINDS: ShapeKind[] = [
  "circle",
  "rectangle",
  "line",
  "highlight",
  "shape",
];

interface BaseAnnotation {
  id: string;
  kind: AnnotationKind;
  color: string;
  caption?: string;
}

/** A point annotation placed at a single lng/lat position. */
export interface PointAnnotation extends BaseAnnotation {
  lngLat: [number, number];
  /** Free text for text / note annotations. */
  text?: string;
  /** URL for image / link / video annotations. */
  url?: string;
}

/**
 * A shape annotation rendered as a MapLibre vector layer.
 * - circle:  geometry is a Point, `radius` is in meters
 * - rectangle / highlight / shape: geometry is a Polygon
 * - line:    geometry is a LineString
 */
export interface ShapeAnnotation extends BaseAnnotation {
  /** GeoJSON geometry. Kept as `any` to avoid a hard geojson-types dep. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geometry: any;
  /** Radius in meters (circle only). */
  radius?: number;
  /** Fill opacity (rectangle / highlight / shape). */
  opacity?: number;
  /** Line width (line). */
  lineWidth?: number;
}

export type Annotation = PointAnnotation | ShapeAnnotation;

export type AnnotationGroup = "navigate" | "draw" | "annotate";

export interface Bookmark {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
  bearing?: number;
  pitch?: number;
  createdAt: number;
}

export interface CommentItem {
  id: string;
  body: string;
  author: string;
  lngLat?: [number, number];
  createdAt: number;
}
