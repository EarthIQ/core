# Generalized 3D Model Layer for MapLibre

A fully generalized, reusable `ModelLayer` component that renders any GLTF/GLB models on a MapLibre map.

## File Structure

```
src/
├── components/
│   └── ModelLayer/
│       ├── index.ts
│       ├── ModelLayer.tsx
│       ├── useModelLoader.ts
│       ├── ModelCustomLayer.ts
│       └── types.ts
├── hooks/
│   └── useMap.ts
└── context/
    └── MapContext.tsx
```

---

## Types

```typescript
// components/ModelLayer/types.ts

import * as THREE from "three";

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
```

---

## Model Loader Hook

```typescript
// components/ModelLayer/useModelLoader.ts

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { ModelDefinition, PerformanceConfig } from "./types";

// ── Singleton loader management ──────────────────────────────────────────

const loaderInstances = new Map<string, GLTFLoader>();

const getLoader = (
  perf: Required<Pick<PerformanceConfig, "useDraco" | "dracoDecoderPath">>
): GLTFLoader => {
  const key = perf.useDraco ? `draco:${perf.dracoDecoderPath}` : "standard";

  if (loaderInstances.has(key)) {
    return loaderInstances.get(key)!;
  }

  const loader = new GLTFLoader();

  if (perf.useDraco) {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(perf.dracoDecoderPath);
    loader.setDRACOLoader(dracoLoader);
  }

  loaderInstances.set(key, loader);
  return loader;
};

// ── Global cache ─────────────────────────────────────────────────────────

/** Stores the canonical (uncloned) scene for each URL */
const modelCache = new Map<string, THREE.Group>();

/** Deduplicates in-flight loads for the same URL */
const inflightLoads = new Map<string, Promise<THREE.Group>>();

const loadSingleModel = (
  url: string,
  loader: GLTFLoader
): Promise<THREE.Group> => {
  if (modelCache.has(url)) {
    return Promise.resolve(modelCache.get(url)!.clone());
  }

  if (inflightLoads.has(url)) {
    return inflightLoads.get(url)!.then((g) => g.clone());
  }

  const promise = new Promise<THREE.Group>((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const scene = gltf.scene;

        // Pre-optimize the canonical copy
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = false;
            child.matrixAutoUpdate = false;
            child.updateMatrix();
          }
        });

        modelCache.set(url, scene);
        inflightLoads.delete(url);
        resolve(scene.clone());
      },
      undefined,
      (error) => {
        inflightLoads.delete(url);
        reject(new Error(`Failed to load model from ${url}: ${error}`));
      }
    );
  });

  inflightLoads.set(url, promise);
  return promise;
};

// ── Hook ─────────────────────────────────────────────────────────────────

export interface UseModelLoaderReturn {
  /** Map of modelId → loaded THREE.Group (cloned from cache) */
  loadedModels: Map<string, THREE.Group>;
  /** Set of modelIds that loaded successfully */
  loadedIds: Set<string>;
  /** True while any model is still loading */
  isLoading: boolean;
  /** First error encountered, or null */
  error: Error | null;
}

export const useModelLoader = (
  definitions: ModelDefinition[],
  performance?: PerformanceConfig
): UseModelLoaderReturn => {
  const [loadedModels, setLoadedModels] = useState<Map<string, THREE.Group>>(
    new Map()
  );
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Build a stable cache key from definitions
  const defsKey = definitions
    .map((d) => `${d.modelId}:${d.url}`)
    .sort()
    .join("|");

  useEffect(() => {
    if (definitions.length === 0) return;

    setIsLoading(true);
    setError(null);

    const perfConfig = {
      useDraco: performance?.useDraco ?? true,
      dracoDecoderPath: performance?.dracoDecoderPath ?? "/draco/",
    };

    const loader = getLoader(perfConfig);

    // Deduplicate by URL in case multiple modelIds point to the same file
    const urlToModelIds = new Map<string, string[]>();
    definitions.forEach((def) => {
      const ids = urlToModelIds.get(def.url) ?? [];
      ids.push(def.modelId);
      urlToModelIds.set(def.url, ids);
    });

    const loadAll = async () => {
      try {
        const entries = Array.from(urlToModelIds.entries());

        const results = await Promise.allSettled(
          entries.map(async ([url, modelIds]) => {
            const group = await loadSingleModel(url, loader);
            return { url, modelIds, group };
          })
        );

        if (!mountedRef.current) return;

        const newModels = new Map<string, THREE.Group>();
        const newIds = new Set<string>();
        let firstError: Error | null = null;

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            const { modelIds, group } = result.value;
            modelIds.forEach((id, i) => {
              // First modelId gets the original clone, rest get additional clones
              newModels.set(id, i === 0 ? group : group.clone());
              newIds.add(id);
            });
          } else {
            if (!firstError) {
              firstError =
                result.reason instanceof Error
                  ? result.reason
                  : new Error(String(result.reason));
            }
            console.error("[ModelLayer] Load failed:", result.reason);
          }
        });

        setLoadedModels(newModels);
        setLoadedIds(newIds);
        if (firstError) setError(firstError);
        setIsLoading(false);
      } catch (err) {
        if (!mountedRef.current) return;
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        setIsLoading(false);
      }
    };

    loadAll();
  }, [defsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { loadedModels, loadedIds, isLoading, error };
};

/**
 * Evict one or all entries from the global model cache.
 * Useful when models are updated at the source URL.
 */
export const invalidateModelCache = (url?: string): void => {
  if (url) {
    const cached = modelCache.get(url);
    if (cached) {
      cached.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material];
          mats.forEach((m) => m.dispose());
        }
      });
      modelCache.delete(url);
    }
  } else {
    modelCache.forEach((group) => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material];
          mats.forEach((m) => m.dispose());
        }
      });
    });
    modelCache.clear();
  }
};
```

---

## Custom Layer Renderer

```typescript
// components/ModelLayer/ModelCustomLayer.ts

import * as THREE from "three";
import maplibregl from "maplibre-gl";
import {
  ModelFeature,
  ModelDefinition,
  LightingConfig,
  PerformanceConfig,
  AnchorPoint,
  RotationUnit,
} from "./types";

// ── Helpers ──────────────────────────────────────────────────────────────

const DEG2RAD = Math.PI / 180;

const toRadians = (
  values: [number, number, number],
  unit: RotationUnit
): [number, number, number] => {
  if (unit === "radians") return values;
  return [values[0] * DEG2RAD, values[1] * DEG2RAD, values[2] * DEG2RAD];
};

/**
 * Compute a vertical offset so the model's bounding-box aligns
 * to the requested anchor point.
 */
const computeAnchorOffset = (
  group: THREE.Group,
  anchor: AnchorPoint
): number => {
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());

  switch (anchor) {
    case "bottom":
      return -box.min.y; // lift so base sits at y = 0
    case "top":
      return -box.max.y; // push so top sits at y = 0
    case "center":
    default:
      return -(box.min.y + size.y / 2);
  }
};

// ── Lookup map for definitions ───────────────────────────────────────────

type DefinitionMap = Map<string, ModelDefinition>;

const buildDefinitionMap = (defs: ModelDefinition[]): DefinitionMap => {
  const map = new Map<string, ModelDefinition>();
  defs.forEach((d) => map.set(d.modelId, d));
  return map;
};

// ── Layer class ──────────────────────────────────────────────────────────

export class ModelCustomLayer implements maplibregl.CustomLayerInterface {
  readonly id: string;
  readonly type = "custom" as const;
  readonly renderingMode = "3d" as const;

  private camera = new THREE.Camera();
  private scene = new THREE.Scene();
  private renderer: THREE.WebGLRenderer | null = null;
  private map: maplibregl.Map | null = null;

  private modelTemplates = new Map<string, THREE.Group>();
  private definitionMap: DefinitionMap = new Map();
  private features: ModelFeature[] = [];

  private instancedMeshes: THREE.InstancedMesh[] = [];
  private featureIndex: ModelFeature[] = []; // parallel to instance index for raycasting

  private lightingConfig: Required<LightingConfig>;
  private perfConfig: Required<PerformanceConfig>;

  private isReady = false;
  private isDirty = false;

  // Raycasting
  private raycaster = new THREE.Raycaster();
  private hoveredFeatureId: string | null = null;

  // Callbacks set by the component
  onClickHandler?: (
    featureIdx: number,
    point: [number, number],
    lngLat: [number, number],
    event: MouseEvent
  ) => void;
  onHoverHandler?: (
    featureIdx: number | null,
    point: [number, number],
    lngLat: [number, number],
    event: MouseEvent
  ) => void;

  constructor(
    layerId: string,
    definitions: ModelDefinition[],
    lighting?: LightingConfig,
    performance?: PerformanceConfig
  ) {
    this.id = layerId;
    this.definitionMap = buildDefinitionMap(definitions);

    this.lightingConfig = {
      ambientIntensity: lighting?.ambientIntensity ?? 0.6,
      ambientColor: lighting?.ambientColor ?? 0xffffff,
      directionalIntensity: lighting?.directionalIntensity ?? 1.0,
      directionalColor: lighting?.directionalColor ?? 0xffffff,
      directionalPosition: lighting?.directionalPosition ?? [100, 100, 100],
      castShadows: lighting?.castShadows ?? true,
    };

    this.perfConfig = {
      maxInstancesPerBatch: performance?.maxInstancesPerBatch ?? 65536,
      frustumCulling: performance?.frustumCulling ?? true,
      mergeGeometries: performance?.mergeGeometries ?? false,
      useDraco: performance?.useDraco ?? true,
      dracoDecoderPath: performance?.dracoDecoderPath ?? "/draco/",
    };
  }

  // ── MapLibre lifecycle ───────────────────────────────────────────────

  onAdd(map: maplibregl.Map, gl: WebGLRenderingContext): void {
    this.map = map;

    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
    });
    this.renderer.autoClear = false;
    this.renderer.shadowMap.enabled = this.lightingConfig.castShadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.setupLighting();
    this.bindInteractions();

    if (this.isDirty) {
      this.rebuildInstances();
    }
  }

  onRemove(): void {
    this.unbindInteractions();
    this.disposeInstances();
    this.scene.clear();
    this.renderer?.dispose();
    this.renderer = null;
    this.map = null;
  }

  render(_gl: WebGLRenderingContext, matrix: number[]): void {
    if (!this.renderer || !this.map || !this.isReady) return;

    const m = new THREE.Matrix4().fromArray(matrix);
    this.camera.projectionMatrix = m;

    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
    this.map.triggerRepaint();
  }

  // ── Public API ───────────────────────────────────────────────────────

  updateModels(models: Map<string, THREE.Group>): void {
    this.modelTemplates = models;
    this.isDirty = true;
    if (this.renderer) this.rebuildInstances();
  }

  updateFeatures(features: ModelFeature[]): void {
    this.features = features;
    this.isDirty = true;
    if (this.renderer && this.modelTemplates.size > 0) {
      this.rebuildInstances();
    }
  }

  updateDefinitions(definitions: ModelDefinition[]): void {
    this.definitionMap = buildDefinitionMap(definitions);
    this.isDirty = true;
    if (this.renderer && this.modelTemplates.size > 0) {
      this.rebuildInstances();
    }
  }

  // ── Lighting ─────────────────────────────────────────────────────────

  private setupLighting(): void {
    const lc = this.lightingConfig;

    const ambient = new THREE.AmbientLight(
      lc.ambientColor,
      lc.ambientIntensity
    );
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(
      lc.directionalColor,
      lc.directionalIntensity
    );
    dir.position.set(...lc.directionalPosition);
    dir.castShadow = lc.castShadows;

    if (lc.castShadows) {
      dir.shadow.mapSize.width = 2048;
      dir.shadow.mapSize.height = 2048;
      dir.shadow.camera.near = 0.5;
      dir.shadow.camera.far = 500;
    }

    this.scene.add(dir);
  }

  // ── Instance building ────────────────────────────────────────────────

  private rebuildInstances(): void {
    this.disposeInstances();

    if (this.features.length === 0 || this.modelTemplates.size === 0) {
      this.isDirty = false;
      return;
    }

    // Group features by modelId
    const featuresByModel = new Map<string, ModelFeature[]>();
    this.features.forEach((f) => {
      const id = f.properties.modelId;
      if (!featuresByModel.has(id)) featuresByModel.set(id, []);
      featuresByModel.get(id)!.push(f);
    });

    const allMeshes: THREE.InstancedMesh[] = [];
    const allFeatureIndex: ModelFeature[] = [];

    featuresByModel.forEach((modelFeatures, modelId) => {
      const template = this.modelTemplates.get(modelId);
      if (!template) {
        console.warn(
          `[ModelLayer] No loaded model for modelId "${modelId}", skipping ${modelFeatures.length} features`
        );
        return;
      }

      const definition = this.definitionMap.get(modelId);
      if (!definition) {
        console.warn(
          `[ModelLayer] No definition for modelId "${modelId}", skipping`
        );
        return;
      }

      const meshes = this.buildInstancedMeshesForModel(
        template,
        modelFeatures,
        definition
      );

      meshes.forEach((mesh) => {
        this.scene.add(mesh);
        allMeshes.push(mesh);
      });

      // Record feature index (each feature maps to one instance index across all sub-meshes)
      modelFeatures.forEach((f) => allFeatureIndex.push(f));
    });

    this.instancedMeshes = allMeshes;
    this.featureIndex = allFeatureIndex;
    this.isDirty = false;
    this.isReady = true;
    this.map?.triggerRepaint();
  }

  private buildInstancedMeshesForModel(
    modelGroup: THREE.Group,
    features: ModelFeature[],
    definition: ModelDefinition
  ): THREE.InstancedMesh[] {
    const count = features.length;
    const result: THREE.InstancedMesh[] = [];

    // Definition defaults
    const baseScale = definition.baseScale ?? [1, 1, 1];
    const baseRotationRaw = definition.baseRotation ?? [90, 0, 0];
    const rotUnit = definition.rotationUnit ?? "degrees";
    const baseRotation = toRadians(baseRotationRaw, rotUnit);
    const anchor = definition.anchor ?? "bottom";

    // Compute anchor offset from the template
    const anchorOffset = computeAnchorOffset(modelGroup, anchor);

    // Collect meshes from the model
    const templateMeshes: THREE.Mesh[] = [];
    modelGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) templateMeshes.push(child);
    });

    // Reusable math objects
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const baseQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(baseRotation[0], baseRotation[1], baseRotation[2], "XYZ")
    );

    templateMeshes.forEach((templateMesh) => {
      const geometry = templateMesh.geometry.clone();
      const material = Array.isArray(templateMesh.material)
        ? templateMesh.material.map((m) => m.clone())
        : templateMesh.material.clone();

      const instMesh = new THREE.InstancedMesh(geometry, material, count);
      instMesh.castShadow = true;
      instMesh.frustumCulled = this.perfConfig.frustumCulling;

      features.forEach((feature, index) => {
        const [lng, lat, zCoord = 0] = feature.geometry.coordinates;
        const altitude = feature.properties.altitude ?? zCoord;

        const mercator = maplibregl.MercatorCoordinate.fromLngLat(
          { lng, lat },
          altitude
        );
        const meterScale = mercator.meterInMercatorCoordinateUnits();

        // ── Scale ────────────────────────────────────────────────────
        let sx: number, sy: number, sz: number;

        if (feature.properties.scale3) {
          const [fx, fy, fz] = feature.properties.scale3;
          sx = baseScale[0] * fx * meterScale;
          sy = baseScale[1] * fy * meterScale;
          sz = baseScale[2] * fz * meterScale;
        } else {
          const uniformScale = feature.properties.scale ?? 1;
          sx = baseScale[0] * uniformScale * meterScale;
          sy = baseScale[1] * uniformScale * meterScale;
          sz = baseScale[2] * uniformScale * meterScale;
        }

        scale.set(sx, sy, sz);

        // ── Rotation ─────────────────────────────────────────────────
        const featureRotRaw = feature.properties.rotation ?? [0, 0, 0];
        const featureRot = toRadians(featureRotRaw, rotUnit);

        const featureQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(featureRot[0], featureRot[1], featureRot[2], "XYZ")
        );
        quaternion.copy(baseQuat).multiply(featureQuat);

        // ── Position ─────────────────────────────────────────────────
        position.set(mercator.x, mercator.y, mercator.z ?? 0);

        // Apply anchor offset scaled to Mercator units
        const offsetVec = new THREE.Vector3(0, anchorOffset * meterScale, 0);
        offsetVec.applyQuaternion(quaternion);
        position.add(offsetVec);

        // ── Compose matrix ───────────────────────────────────────────
        matrix.compose(position, quaternion, scale);
        instMesh.setMatrixAt(index, matrix);

        // ── Per-instance color ───────────────────────────────────────
        if (feature.properties.color) {
          const [r, g, b] = feature.properties.color;
          instMesh.setColorAt(
            index,
            new THREE.Color(r / 255, g / 255, b / 255)
          );
        }
      });

      instMesh.instanceMatrix.needsUpdate = true;
      if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;

      result.push(instMesh);
    });

    return result;
  }

  // ── Interaction handling ─────────────────────────────────────────────

  private onMapClick = (e: maplibregl.MapMouseEvent): void => {
    if (!this.onClickHandler) return;
    const idx = this.pickInstance(e.point);
    if (idx !== null) {
      this.onClickHandler(
        idx,
        [e.point.x, e.point.y],
        [e.lngLat.lng, e.lngLat.lat],
        e.originalEvent
      );
    }
  };

  private onMapMouseMove = (e: maplibregl.MapMouseEvent): void => {
    if (!this.onHoverHandler) return;
    const idx = this.pickInstance(e.point);

    if (idx !== null) {
      const feature = this.featureIndex[idx];
      if (feature && feature.properties.id !== this.hoveredFeatureId) {
        this.hoveredFeatureId = feature.properties.id;
        this.onHoverHandler(
          idx,
          [e.point.x, e.point.y],
          [e.lngLat.lng, e.lngLat.lat],
          e.originalEvent
        );
      }
    } else if (this.hoveredFeatureId !== null) {
      this.hoveredFeatureId = null;
      this.onHoverHandler(
        null,
        [e.point.x, e.point.y],
        [e.lngLat.lng, e.lngLat.lat],
        e.originalEvent
      );
    }
  };

  private pickInstance(point: { x: number; y: number }): number | null {
    if (!this.map || this.instancedMeshes.length === 0) return null;

    const canvas = this.map.getCanvas();
    const mouse = new THREE.Vector2(
      (point.x / canvas.clientWidth) * 2 - 1,
      -(point.y / canvas.clientHeight) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);

    for (const mesh of this.instancedMeshes) {
      const intersects = this.raycaster.intersectObject(mesh, false);
      if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        return intersects[0].instanceId;
      }
    }

    return null;
  }

  private bindInteractions(): void {
    if (!this.map) return;
    this.map.on("click", this.onMapClick);
    this.map.on("mousemove", this.onMapMouseMove);
  }

  private unbindInteractions(): void {
    if (!this.map) return;
    this.map.off("click", this.onMapClick);
    this.map.off("mousemove", this.onMapMouseMove);
  }

  // ── Cleanup ──────────────────────────────────────────────────────────

  private disposeInstances(): void {
    this.instancedMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      mats.forEach((m) => m.dispose());
    });
    this.instancedMeshes = [];
    this.featureIndex = [];
    this.isReady = false;
  }
}
```

---

## Main Component

```typescript
// components/ModelLayer/ModelLayer.tsx

import { useEffect, useRef, useMemo, useCallback } from "react";
import { useMap } from "../../hooks/useMap";
import { useModelLoader } from "./useModelLoader";
import { ModelCustomLayer } from "./ModelCustomLayer";
import { ModelLayerProps, ModelFeature, ModelInteractionEvent } from "./types";

const DEFAULT_LAYER_ID = "model-3d-layer";

export const ModelLayer = ({
  data,
  models: modelDefinitions,
  layerId = DEFAULT_LAYER_ID,
  visible = true,
  lighting,
  performance,
  onLoad,
  onError,
  onClick,
  onHover,
}: ModelLayerProps) => {
  const { map, isLoaded: mapLoaded } = useMap();
  const layerRef = useRef<ModelCustomLayer | null>(null);

  // Keep callbacks in refs to avoid stale closures without re-triggering effects
  const callbackRefs = useRef({ onLoad, onError, onClick, onHover });
  useEffect(() => {
    callbackRefs.current = { onLoad, onError, onClick, onHover };
  }, [onLoad, onError, onClick, onHover]);

  // Extract required model IDs from features
  const requiredModelIds = useMemo(() => {
    const ids = new Set<string>();
    data.features.forEach((f) => ids.add(f.properties.modelId));
    return Array.from(ids);
  }, [data.features]);

  // Filter definitions to only what's needed
  const requiredDefinitions = useMemo(
    () => modelDefinitions.filter((d) => requiredModelIds.includes(d.modelId)),
    [modelDefinitions, requiredModelIds]
  );

  // Load models (globally cached, deduped)
  const {
    loadedModels,
    isLoading,
    error: loadError,
  } = useModelLoader(requiredDefinitions, performance);

  // Propagate errors
  useEffect(() => {
    if (loadError) callbackRefs.current.onError?.(loadError);
  }, [loadError]);

  // ── Create / destroy the custom layer ────────────────────────────────

  useEffect(() => {
    if (!map || !mapLoaded) return;

    const layer = new ModelCustomLayer(
      layerId,
      modelDefinitions,
      lighting,
      performance
    );

    // Wire up interaction callbacks via the layer's public handlers
    layer.onClickHandler = (featureIdx, point, lngLat, originalEvent) => {
      const feature = data.features[featureIdx];
      if (!feature || !callbackRefs.current.onClick) return;
      callbackRefs.current.onClick({
        feature: feature as ModelFeature,
        point,
        lngLat,
        originalEvent,
      });
    };

    layer.onHoverHandler = (featureIdx, point, lngLat, originalEvent) => {
      if (!callbackRefs.current.onHover) return;
      if (featureIdx === null) {
        callbackRefs.current.onHover(null);
        return;
      }
      const feature = data.features[featureIdx];
      if (!feature) return;
      callbackRefs.current.onHover({
        feature: feature as ModelFeature,
        point,
        lngLat,
        originalEvent,
      });
    };

    layerRef.current = layer;
    map.addLayer(layer);

    return () => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      layerRef.current = null;
    };
  }, [map, mapLoaded, layerId]); // Intentionally exclude lighting/performance — they require layer recreation

  // ── Push loaded models into the layer ────────────────────────────────

  useEffect(() => {
    if (!layerRef.current || isLoading || loadedModels.size === 0) return;
    layerRef.current.updateModels(loadedModels);
    callbackRefs.current.onLoad?.();
  }, [loadedModels, isLoading]);

  // ── Push feature data into the layer ─────────────────────────────────

  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.updateFeatures(data.features as ModelFeature[]);
  }, [data]);

  // ── Push definition changes (e.g., baseScale tweaks at runtime) ──────

  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.updateDefinitions(modelDefinitions);
  }, [modelDefinitions]);

  // ── Visibility ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!map || !mapLoaded || !map.getLayer(layerId)) return;
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  }, [map, mapLoaded, layerId, visible]);

  return null;
};
```

---

## Barrel Export

```typescript
// components/ModelLayer/index.ts

export { ModelLayer } from "./ModelLayer";
export { useModelLoader, invalidateModelCache } from "./useModelLoader";
export { ModelCustomLayer } from "./ModelCustomLayer";
export type {
  ModelDefinition,
  ModelFeature,
  ModelFeatureCollection,
  ModelFeatureProperties,
  ModelLayerProps,
  ModelInteractionEvent,
  LightingConfig,
  PerformanceConfig,
  AnchorPoint,
  RotationUnit,
  BlendMode,
} from "./types";
```

---

## Usage Examples

### Basic — Single Model Type

```tsx
import {
  ModelLayer,
  ModelDefinition,
  ModelFeatureCollection,
} from "./components/ModelLayer";

const MODELS: ModelDefinition[] = [
  {
    modelId: "wind-turbine",
    url: "/models/wind_turbine.glb",
    baseScale: [1, 1, 1],
    baseRotation: [90, 0, 0],
    anchor: "bottom",
  },
];

const turbineData: ModelFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-74.006, 40.7128, 0] },
      properties: { id: "t1", modelId: "wind-turbine", scale: 2.0 },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-74.008, 40.715, 0] },
      properties: {
        id: "t2",
        modelId: "wind-turbine",
        scale: 1.5,
        rotation: [0, 45, 0],
      },
    },
  ],
};

export const App = () => (
  <MapProvider>
    <MapContainer>
      <ModelLayer
        data={turbineData}
        models={MODELS}
        layerId="turbines"
        onClick={(e) => console.log("Clicked:", e.feature.properties.id)}
        onHover={(e) => {
          document.body.style.cursor = e ? "pointer" : "";
        }}
      />
    </MapContainer>
  </MapProvider>
);
```

### Multiple Model Types — Mixed Scene

```tsx
const MODELS: ModelDefinition[] = [
  {
    modelId: "oak",
    url: "/models/oak.glb",
    baseScale: [1, 1, 1],
    anchor: "bottom",
  },
  {
    modelId: "pine",
    url: "/models/pine.glb",
    baseScale: [0.8, 0.8, 0.8],
    anchor: "bottom",
  },
  {
    modelId: "bench",
    url: "/models/bench.glb",
    baseScale: [0.5, 0.5, 0.5],
    anchor: "bottom",
  },
  {
    modelId: "lamp",
    url: "/models/lamp.glb",
    baseScale: [1, 1, 1],
    anchor: "bottom",
  },
];

const parkScene: ModelFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [13.405, 52.52] },
      properties: {
        id: "oak-1",
        modelId: "oak",
        scale: 1.2,
        color: [34, 139, 34],
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [13.406, 52.521] },
      properties: { id: "pine-1", modelId: "pine" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [13.4055, 52.5205] },
      properties: { id: "bench-1", modelId: "bench", rotation: [0, 90, 0] },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [13.4058, 52.5208] },
      properties: { id: "lamp-1", modelId: "lamp", scale: 0.8 },
    },
  ],
};

<ModelLayer
  data={parkScene}
  models={MODELS}
  layerId="park-furniture"
  lighting={{
    ambientIntensity: 0.4,
    directionalIntensity: 1.2,
    directionalPosition: [50, 80, 100],
    castShadows: true,
  }}
  performance={{
    frustumCulling: true,
    useDraco: true,
  }}
  onLoad={() => console.log("Park scene ready")}
  onError={(err) => console.error("Park error:", err)}
/>;
```

### Dynamic Updates — Adding/Removing Features

```tsx
const [features, setFeatures] = useState<ModelFeature[]>([]);

const addTree = (lng: number, lat: number) => {
  setFeatures((prev) => [
    ...prev,
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        id: `tree-${Date.now()}`,
        modelId: "oak",
        scale: 0.5 + Math.random() * 1.5,
        rotation: [0, Math.random() * 360, 0],
      },
    },
  ]);
};

const removeTree = (id: string) => {
  setFeatures((prev) => prev.filter((f) => f.properties.id !== id));
};

<ModelLayer
  data={{ type: "FeatureCollection", features }}
  models={MODELS}
  layerId="dynamic-trees"
  onClick={(e) => removeTree(e.feature.properties.id)}
/>;
```

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          <ModelLayer>                                     │
│                                                                          │
│   Props: data, models[], lighting, performance, callbacks                │
│                                                                          │
│   ┌──────────────────┐    ┌────────────────────────────────────────┐     │
│   │  useModelLoader  │    │         ModelCustomLayer               │     │
│   │                  │    │                                        │     │
│   │  ModelDefinition ├───►│  updateModels(Map<id, Group>)          │     │
│   │  → GLTF Load     │    │  updateFeatures(ModelFeature[])        │     │
│   │  → Global Cache  │    │  updateDefinitions(ModelDefinition[])  │     │
│   │  → Dedup Flights │    │                                        │     │
│   └──────────────────┘    │  ┌──────────────────────────────────┐  │     │
│                           │  │  Per modelId:                     │  │     │
│                           │  │                                   │  │     │
│                           │  │  Group features by modelId        │  │     │
│                           │  │  ↓                                │  │     │
│                           │  │  Extract meshes from template     │  │     │
│                           │  │  ↓                                │  │     │
│                           │  │  InstancedMesh(geometry,          │  │     │
│                           │  │    material, count)               │  │     │
│                           │  │  ↓                                │  │     │
│                           │  │  For each feature:                │  │     │
│                           │  │    → MercatorCoordinate           │  │     │
│                           │  │    → baseScale × featureScale     │  │     │
│                           │  │      × meterInMercator            │  │     │
│                           │  │    → baseRotation + featureRot    │  │     │
│                           │  │    → anchorOffset                 │  │     │
│                           │  │    → setMatrixAt(i, matrix)       │  │     │
│                           │  │    → setColorAt(i, color)         │  │     │
│                           │  └──────────────────────────────────┘  │     │
│                           │                                        │     │
│                           │  render(): camera.projectionMatrix =   │     │
│                           │    Matrix4.fromArray(maplibreMatrix)    │     │
│                           │                                        │     │
│                           │  Raycaster → onClick / onHover         │     │
│                           └────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────┘

Performance characteristics:
  N features with K model types, each model having M sub-meshes
  → K × M draw calls total (independent of N)
  → Example: 10,000 features, 4 model types, ~2 meshes each = 8 draw calls
```
