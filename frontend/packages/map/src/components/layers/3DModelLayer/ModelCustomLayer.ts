// components/ModelLayer/ModelCustomLayer.ts

import * as THREE from "three";
import * as maplibregl from "maplibre-gl";
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
