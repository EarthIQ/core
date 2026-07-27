// types.ts
import type {
  Feature,
  Geometry,
  GeoJsonProperties,
  FeatureCollection,
} from "geojson";
import type { ReactNode } from "react";

/**
 * Drawing modes supported by the draw control
 */
export type DrawMode =
  | "polygon"
  | "rectangle"
  | "circle"
  | "line"
  | "point"
  | "freehand";

/**
 * Draw tool definition for the UI
 */
export interface DrawToolDefinition {
  mode: DrawMode;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

/**
 * A drawn feature with additional metadata
 */
export interface DrawnFeature<G extends Geometry = Geometry> extends Feature<
  G,
  GeoJsonProperties
> {
  id: string;
  properties: {
    drawMode?: DrawMode;
    createdAt?: number;
    updatedAt?: number;
    [key: string]: unknown;
  };
}

/**
 * Draw create event
 */
export interface DrawCreateEvent {
  type: "draw.create";
  features: Feature[];
}

/**
 * Draw update event
 */
export interface DrawUpdateEvent {
  type: "draw.update";
  features: Feature[];
  action: "move" | "change_coordinates";
}

/**
 * Draw delete event
 */
export interface DrawDeleteEvent {
  type: "draw.delete";
  features: Feature[];
}

/**
 * Draw selection change event
 */
export interface DrawSelectionChangeEvent {
  type: "draw.selectionchange";
  features: Feature[];
}

/**
 * Draw mode change event
 */
export interface DrawModeChangeEvent {
  type: "draw.modechange";
  mode: string;
}

/**
 * Draw state
 */
export interface DrawState {
  activeMode: DrawMode | null;
  selectedIds: string[];
  features: FeatureCollection;
  isDrawing: boolean;
}

/**
 * Draw control callbacks
 */
export interface DrawCallbacks {
  onCreate?: (event: DrawCreateEvent) => void;
  onUpdate?: (event: DrawUpdateEvent) => void;
  onDelete?: (event: DrawDeleteEvent) => void;
  onSelectionChange?: (event: DrawSelectionChangeEvent) => void;
  onModeChange?: (mode: DrawMode | null) => void;
  onFeaturesChange?: (features: FeatureCollection) => void;
}

/**
 * Draw control options
 */
export interface DrawOptions {
  initialFeatures?: FeatureCollection;
  styles?: object[];
  touchEnabled?: boolean;
  boxSelect?: boolean;
  clickBuffer?: number;
  touchBuffer?: number;
}
