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

/**
 * A feature committed by the TerraDraw-based drawing engine
 * (minimal GeoJSON Feature). Kept structural to avoid a hard geojson-types dep.
 */
export interface DrawnFeature {
  id: string;
  type: "Feature";
  /** GeoJSON geometry. Kept as `any` to avoid a hard geojson-types dep. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geometry: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties?: Record<string, any>;
}

/**
 * An active shape draw-session in the map editor:
 * - `create` — new shapes are being drawn; on Save they are uploaded as a
 *   new dataset and the pending panel layer becomes a real vector layer.
 * - `edit`   — an existing saved vector layer is being edited (add / modify /
 *   delete features); on Save the features are written back to its dataset.
 *
 * While a session is active the action bar shows Save + Undo/Redo.
 */
export interface DrawSession {
  mode: "create" | "edit";
  /** The layer-panel node this session is bound to. */
  layerNodeId: string;
  /** Edit mode: the dataset to persist features to on Save. */
  datasetId?: string;
  /** Edit mode: layer visibility to restore when the session ends. */
  wasVisible?: boolean;
}

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

/** A single message inside a comment thread. */
export interface CommentMessage {
  id: string;
  body: string;
  /** Display name of the author. */
  author: string;
  /** Auth user id of the author ("" for legacy comments). */
  authorId: string;
  createdAt: number;
}

/**
 * A discussion thread pinned at a location on the map.
 * The first message opens the thread; the rest are replies.
 * `lngLat` may be null for legacy comments saved before pins existed.
 */
export interface CommentThread {
  id: string;
  lngLat: [number, number] | null;
  /** All messages, oldest first. */
  messages: CommentMessage[];
  resolved: boolean;
  resolvedById?: string;
  resolvedByName?: string;
  resolvedAt?: number;
  createdAt: number;
  updatedAt: number;
}
