// hooks/useTerraDraw.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  TerraDraw,
  TerraDrawCircleMode,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawSelectMode,
  type GeoJSONStoreFeatures,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";

/** A committed TerraDraw feature (structural GeoJSON Feature). */
export interface TerraDrawFeature {
  id: string;
  type: "Feature";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geometry: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties?: Record<string, any>;
}

/** The kinds of feature-set changes TerraDraw reports. */
export type TerraDrawChangeAction = "create" | "update" | "delete";

export interface UseTerraDrawCallbacks {
  /** Called on every committed feature-set change (create / update / delete). */
  onFeaturesChange?: (
    features: TerraDrawFeature[],
    action: TerraDrawChangeAction
  ) => void;
  /** Called when the user finishes drawing a shape; `features` is the full set. */
  onFinish?: (features: TerraDrawFeature[]) => void;
}

export interface UseTerraDrawResult {
  /** True once the TerraDraw instance is live on the map. */
  isReady: boolean;
  /** Switch to a draw variant's mode (`shape`/`line`/`circle`/`rectangle`) or `select`. */
  setMode: (variantId: string | null) => void;
  /** The currently committed features. */
  getFeatures: () => TerraDrawFeature[];
  /** Replace the committed feature set (used for undo/redo/clear restores). */
  setFeatures: (features: TerraDrawFeature[]) => void;
}

/** MapActionBar draw variant id → TerraDraw mode name. */
const VARIANT_TO_MODE: Record<string, string> = {
  shape: "polygon",
  line: "linestring",
  circle: "circle",
  rectangle: "rectangle",
};

/**
 * Draws shapes on a MapLibre map with TerraDraw (select + polygon + linestring
 * + circle + rectangle). Store-agnostic: feature changes are reported through
 * `callbacks` so the caller owns persistence / history.
 */
export function useTerraDraw(
  map: MapLibreMap | null,
  enabled: boolean,
  callbacks: UseTerraDrawCallbacks = {}
): UseTerraDrawResult {
  const drawRef = useRef<TerraDraw | null>(null);
  const modeRef = useRef<string>("select");
  /** True while `setFeatures` is applying a programmatic restore
      (undo/redo/edit-load) so the resulting change events are not reported
      back to the caller as user actions. */
  const silentRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const getFeatures = useCallback((): TerraDrawFeature[] => {
    const d = drawRef.current;
    if (!d) return [];
    return d.getSnapshot() as unknown as TerraDrawFeature[];
  }, []);

  const setFeatures = useCallback((features: TerraDrawFeature[]) => {
    const d = drawRef.current;
    if (!d) return;
    silentRef.current = true;
    try {
      d.clear();
      if (features.length) {
        d.addFeatures(features as unknown as GeoJSONStoreFeatures[]);
      }
    } finally {
      silentRef.current = false;
    }
  }, []);

  /* ── create the TerraDraw instance once the map is available ─────────── */
  useEffect(() => {
    if (!map || !enabled) return;
    if (drawRef.current) return;

    const initDraw = () => {
      if (drawRef.current) return;

      const d = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map }),
        modes: [
          new TerraDrawSelectMode({
            flags: {
              polygon: {
                feature: {
                  draggable: true,
                  coordinates: {
                    midpoints: true,
                    draggable: true,
                    deletable: true,
                  },
                },
              },
              linestring: {
                feature: {
                  draggable: true,
                  coordinates: {
                    midpoints: true,
                    draggable: true,
                    deletable: true,
                  },
                },
              },
              rectangle: {
                feature: {
                  draggable: true,
                  coordinates: {
                    midpoints: true,
                    draggable: true,
                    deletable: true,
                  },
                },
              },
              circle: { feature: { draggable: true } },
            },
          }),
          new TerraDrawPolygonMode(),
          new TerraDrawLineStringMode(),
          new TerraDrawCircleMode(),
          new TerraDrawRectangleMode(),
        ],
      });

      d.start();
      d.setMode("select");
      drawRef.current = d;
      setIsReady(true);
    };

    if (map.isStyleLoaded()) {
      initDraw();
    } else {
      map.once("idle", () => {
        if (!drawRef.current) initDraw();
      });
    }

    return () => {
      const d = drawRef.current;
      drawRef.current = null;
      setIsReady(false);
      if (d) {
        try {
          d.stop();
        } catch {
          // instance may already be detached from the map
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, enabled]);

  /* ── report TerraDraw feature events to the caller ────────────────────── */
  useEffect(() => {
    const d = drawRef.current;
    if (!d) return;

    const handleChange = (_ids: (string | number)[], action: string) => {
      if (silentRef.current) return; // programmatic restore, not a user action
      callbacksRef.current.onFeaturesChange?.(
        getFeatures(),
        action as TerraDrawChangeAction
      );
    };

    const handleFinish = () => {
      callbacksRef.current.onFinish?.(getFeatures());
    };

    d.on("change", handleChange);
    d.on("finish", handleFinish);
    return () => {
      d.off("change", handleChange);
      d.off("finish", handleFinish);
    };
  }, [isReady, getFeatures]);

  /* ── mode switching ───────────────────────────────────────────────────── */
  const setMode = useCallback((variantId: string | null) => {
    const d = drawRef.current;
    if (!d) return;
    const mode =
      variantId !== null ? VARIANT_TO_MODE[variantId] ?? "select" : "select";
    if (modeRef.current === mode) return; // setMode restarts modes; skip no-ops
    modeRef.current = mode;
    d.setMode(mode);
  }, []);

  return { isReady, setMode, getFeatures, setFeatures };
}