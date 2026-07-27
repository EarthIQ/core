/**
 * Anchor point for model placement relative to coordinates.
 * "bottom" places the model base at the coordinate point (most common for ground objects).
 * "center" centers the model vertically at the coordinate point.
 * "top" places the model top at the coordinate point.
 */
export type AnchorPoint = "bottom" | "center" | "top";

/**
 * How to interpret the rotation values.
 * "degrees" - human-friendly, converted internally.
 * "radians" - passed directly to THREE.js.
 */
export type RotationUnit = "degrees" | "radians";

/**
 * Blend mode controlling how the 3D content composites with the map.
 */
export type BlendMode = "normal" | "additive" | "multiply";

/**
 * Configuration for a single model type that can appear in the layer.
 * Multiple features can reference the same modelId, sharing the cached geometry.
 */
export interface ModelDefinition {
  /** Unique key used to reference this model from feature properties */
  modelId: string;
  /** URL to the GLTF/GLB file */
  url: string;
  /**
   * Base scale applied before per-feature scale.
   * Use this to normalize models from different authoring tools
   * to a consistent real-world size.
   * @default [1, 1, 1]
   */
  baseScale?: [number, number, number];
  /**
   * Base rotation in the specified unit applied before per-feature rotation.
   * Useful for correcting model orientation (e.g., GLTF Y-up to map Z-up).
   * @default [90, 0, 0] (degrees) — standard Y-up to Z-up correction
   */
  baseRotation?: [number, number, number];
  /**
   * Unit for baseRotation values.
   * @default "degrees"
   */
  rotationUnit?: RotationUnit;
  /**
   * Vertical anchor point for placement.
   * @default "bottom"
   */
  anchor?: AnchorPoint;
}

/**
 * Per-feature properties controlling individual instance placement.
 * These override or multiply with the ModelDefinition values.
 */
export interface ModelFeatureProperties {
  /** Unique identifier for this feature instance */
  id: string;
  /** References a modelId from the ModelDefinition array */
  modelId: string;
  /**
   * Uniform scale multiplier applied on top of the model's baseScale.
   * @default 1
   */
  scale?: number;
  /**
   * Non-uniform scale multiplier [x, y, z].
   * If provided, overrides the uniform `scale` property.
   */
  scale3?: [number, number, number];
  /**
   * Rotation offset [rx, ry, rz] added to the model's baseRotation.
   * Unit follows the ModelDefinition's rotationUnit.
   * @default [0, 0, 0]
   */
  rotation?: [number, number, number];
  /**
   * Override altitude in meters. Takes precedence over the
   * coordinate's z-value if both are present.
   */
  altitude?: number;
  /**
   * RGB color override [r, g, b] each 0-255.
   * Applied as a tint to all meshes in the instance.
   */
  color?: [number, number, number];
  /**
   * Opacity override, 0-1.
   * @default 1
   */
  opacity?: number;
  /**
   * Arbitrary metadata passed through for interaction handlers.
   */
  [key: string]: unknown;
}

/**
 * A single GeoJSON Feature for the model layer.
 */
export interface ModelFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number, number?]; // [lng, lat, altitude?]
  };
  properties: ModelFeatureProperties;
}

/**
 * GeoJSON FeatureCollection for the model layer.
 */
export interface ModelFeatureCollection {
  type: "FeatureCollection";
  features: ModelFeature[];
}

/**
 * Lighting configuration for the 3D scene.
 */
export interface LightingConfig {
  /** Ambient light intensity. @default 0.6 */
  ambientIntensity?: number;
  /** Ambient light color. @default 0xffffff */
  ambientColor?: number;
  /** Directional light intensity. @default 1.0 */
  directionalIntensity?: number;
  /** Directional light color. @default 0xffffff */
  directionalColor?: number;
  /** Directional light position [x, y, z]. @default [100, 100, 100] */
  directionalPosition?: [number, number, number];
  /** Enable shadows from directional light. @default true */
  castShadows?: boolean;
}

/**
 * Performance tuning options.
 */
export interface PerformanceConfig {
  /**
   * Maximum number of instances per InstancedMesh batch.
   * Large values use more GPU memory but fewer draw calls.
   * @default 65536
   */
  maxInstancesPerBatch?: number;
  /**
   * Enable THREE.js frustum culling on instanced meshes.
   * @default true
   */
  frustumCulling?: boolean;
  /**
   * Merge model sub-meshes that share the same material
   * into a single geometry for fewer draw calls.
   * @default false
   */
  mergeGeometries?: boolean;
  /**
   * Enable DRACO decompression for compressed GLTF files.
   * Requires draco decoder files at the specified path.
   * @default true
   */
  useDraco?: boolean;
  /**
   * Path to DRACO decoder WASM files.
   * @default "/draco/"
   */
  dracoDecoderPath?: string;
}

/**
 * Interaction event payload passed to click/hover handlers.
 */
export interface ModelInteractionEvent {
  /** The feature that was interacted with */
  feature: ModelFeature;
  /** Screen coordinates [x, y] of the interaction */
  point: [number, number];
  /** Geographic coordinates [lng, lat] of the interaction */
  lngLat: [number, number];
  /** The original DOM event */
  originalEvent: MouseEvent;
}

/**
 * Props for the ModelLayer component.
 */
export interface ModelLayerProps {
  /** GeoJSON FeatureCollection defining instance positions and properties */
  data: ModelFeatureCollection;
  /** Array of model definitions (GLTF sources and their configs) */
  models: ModelDefinition[];
  /** Unique layer ID on the map. @default "model-3d-layer" */
  layerId?: string;
  /** Toggle layer visibility. @default true */
  visible?: boolean;
  /** Lighting configuration. Uses sensible defaults if omitted. */
  lighting?: LightingConfig;
  /** Performance tuning. Uses sensible defaults if omitted. */
  performance?: PerformanceConfig;
  /** Called when all models are loaded and instances are built */
  onLoad?: () => void;
  /** Called on any loading or rendering error */
  onError?: (error: Error) => void;
  /** Called when a model instance is clicked */
  onClick?: (event: ModelInteractionEvent) => void;
  /** Called when the cursor enters a model instance */
  onHover?: (event: ModelInteractionEvent | null) => void;
}
