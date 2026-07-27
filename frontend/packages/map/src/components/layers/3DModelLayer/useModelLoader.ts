// components/ModelLayer/useModelLoader.ts

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import type { ModelDefinition, PerformanceConfig } from "./types";

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
