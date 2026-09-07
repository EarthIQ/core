/* ──────────────────────────────────────────────────────────────────────── */
/*  Map drawing engine: TerraDraw (@packages/map) + mapEditor history       */
/*                                                                          */
/*  Thin glue over the store-agnostic useTerraDraw hook from @packages/map: */
/*  wires feature events into the mapEditor store (so the shared undo/redo  */
/*  history covers drawn shapes alongside annotations) and maps the         */
/*  MapActionBar's draw variants to TerraDraw modes.                        */
/* ──────────────────────────────────────────────────────────────────────── */
import { useTerraDraw } from "@packages/map";
import { useCallback, useEffect } from "react";

import { useMapEditor } from "@/lib/mapEditor/store";

import type { DrawnFeature as _DrawnFeature } from "@/lib/mapEditor/types";

export interface UseMapDrawing {
  /** True once the TerraDraw engine is live on the map. */
  isReady: boolean;
  /** Switch to a draw variant's mode (`shape`/`line`/`circle`/`rectangle`) or `select`. */
  setMode: (variantId: string | null) => void;
  /** Clear all drawn features (history-tracked, works with undo/redo). */
  clearAll: () => void;
  /** Number of committed drawn features. */
  featureCount: number;
}

export function useMapDrawing(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map: any,
  mapReady: boolean
): UseMapDrawing {
  const drawnFeatures = useMapEditor((s) => s.drawnFeatures);
  const activeTool = useMapEditor((s) => s.activeTool);

  const { isReady, setMode, getFeatures, setFeatures } = useTerraDraw(
    map,
    mapReady,
    {
      onFeaturesChange: (features, action) => {
        const store = useMapEditor.getState();
        if (action === "delete") {
          // Discrete user action → history entry
          store.commitDrawnFeatures(features);
        } else {
          // Live edits / in-flight creates sync silently (finish commits them)
          store.syncDrawnFeatures(features);
        }
      },
      onFinish: (features) => {
        const store = useMapEditor.getState();
        store.commitDrawnFeatures(features);
        // Back to select after a shape is committed (same UX as annotations)
        store.setActiveTool({ groupId: "navigate", variantId: "select" });
      },
    },
  );

  // Active tool → TerraDraw mode
  useEffect(() => {
    if (!isReady) return;
    const variant =
      activeTool?.groupId === "draw" ? activeTool.variantId : null;
    setMode(variant);
  }, [activeTool, isReady, setMode]);

  // Undo / redo / clear → restore the feature set on the map
  useEffect(() => {
    if (!isReady) return;
    const next = JSON.stringify(drawnFeatures);
    if (next === JSON.stringify(getFeatures())) return;
    setFeatures(drawnFeatures);
  }, [drawnFeatures, isReady, getFeatures, setFeatures]);

  const clearAll = useCallback(
    () => useMapEditor.getState().clearDrawnFeatures(),
    [],
  );

  return { isReady, setMode, clearAll, featureCount: drawnFeatures.length };
}

export default useMapDrawing;