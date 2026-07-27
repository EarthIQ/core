// hooks/useDrawControl.ts
import { useCallback, useEffect, useRef, useState } from "react";
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawCircleMode,
  TerraDrawFreehandMode,
  TerraDrawPointMode,
  TerraDrawLineStringMode,
  TerraDrawSelectMode,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import type { FeatureCollection, Feature } from "geojson";
import { useMap } from "./useMap";
import type {
  DrawMode,
  DrawState,
  DrawCallbacks,
  DrawOptions,
  DrawCreateEvent,
  DrawUpdateEvent,
  DrawDeleteEvent,
  DrawSelectionChangeEvent,
  DrawModeChangeEvent,
} from "../components/controls/DrawControl/types";

// Mode mapping
const MODE_MAP: Record<DrawMode, string> = {
  polygon: "polygon",
  rectangle: "rectangle",
  circle: "circle",
  line: "linestring",
  point: "point",
  freehand: "freehand",
};

const REVERSE_MODE_MAP: Record<string, DrawMode | null> = {
  polygon: "polygon",
  rectangle: "rectangle",
  circle: "circle",
  linestring: "line",
  point: "point",
  freehand: "freehand",
  select: null,
};

export function useDrawControl(
  callbacks: DrawCallbacks = {},
  options: DrawOptions = {}
) {
  const { map } = useMap();
  const drawRef = useRef<TerraDraw | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [state, setState] = useState<DrawState>({
    activeMode: null,
    selectedIds: [],
    features: { type: "FeatureCollection", features: [] },
    isDrawing: false,
  });

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const getSnapshot = useCallback((): FeatureCollection => {
    if (!drawRef.current) return { type: "FeatureCollection", features: [] };
    const snap = drawRef.current.getSnapshot();
    if (Array.isArray(snap)) {
      return { type: "FeatureCollection", features: snap as Feature[] };
    }
    return snap as unknown as FeatureCollection;
  }, []);

  // Initialize TerraDraw
  useEffect(() => {
    if (!map) return;
    if (drawRef.current) return;

    const initDraw = () => {
      if (drawRef.current) return;

      const draw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({
          map: map,
        }),
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
              point: { feature: { draggable: true } },
              circle: { feature: { draggable: true } },
              rectangle: { feature: { draggable: true } },
              freehand: { feature: { draggable: true } },
            },
          }),
          new TerraDrawPolygonMode(),
          new TerraDrawRectangleMode(),
          new TerraDrawCircleMode(),
          new TerraDrawFreehandMode(),
          new TerraDrawPointMode(),
          new TerraDrawLineStringMode(),
        ],
      });

      draw.start();
      draw.setMode("select");
      drawRef.current = draw;
      setIsReady(true);

      if (
        options.initialFeatures &&
        options.initialFeatures.features.length > 0
      ) {
        draw.addFeatures(options.initialFeatures.features);
        setState((prev) => ({
          ...prev,
          features: options.initialFeatures!,
        }));
      }
    };

    if (map.isStyleLoaded()) {
      initDraw();
    } else {
      map.once("idle", () => {
        if (!drawRef.current) initDraw();
      });
    }

    return () => {
      if (drawRef.current) {
        try {
          drawRef.current.stop();
        } catch (e) {
          console.warn("Error stopping TerraDraw:", e);
        }
        drawRef.current = null;
        setIsReady(false);
      }
    };
  }, [map]);

  // Event handlers for TerraDraw store events
  useEffect(() => {
    if (!drawRef.current || !isReady) return;
    const draw = drawRef.current;

    const handleChange = (ids: string | string[], action: string) => {
      const featuresColl = getSnapshot();

      setState((prev) => ({
        ...prev,
        features: featuresColl,
      }));

      const idList = Array.isArray(ids) ? ids : [ids];
      const relevantFeatures = featuresColl.features.filter((f) => f.id && idList.includes(f.id as string));

      if (action === "update" && relevantFeatures.length > 0) {
        callbacksRef.current.onUpdate?.({
          type: "draw.update",
          features: relevantFeatures,
          action: "change_coordinates",
        });
      } else if (action === "delete") {
        // Feature is already removed from snapshot
        callbacksRef.current.onDelete?.({
          type: "draw.delete",
          features: idList.map((id) => ({
            id,
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [] },
          })),
        });
      }

      callbacksRef.current.onFeaturesChange?.(featuresColl);
    };

    const handleSelectionChange = () => {
      const snap = getSnapshot();
      const ids = snap.features
        .filter((f) => (f as any).selected)
        .map((f) => f.id as string) || [];
      setState((prev) => ({
        ...prev,
        selectedIds: ids,
      }));
      // Construct pseudo-events for compatibility
      const featArr = snap.features.filter((f) => ids.includes(f.id as string)) || [];
      callbacksRef.current.onSelectionChange?.({
        type: "draw.selectionchange",
        features: featArr,
      });
    };

    const handleFinish = (id: string) => {
      const snap = getSnapshot();
      const relevantFeature = snap.features.find((f) => f.id === id);
      if (relevantFeature) {
        callbacksRef.current.onCreate?.({
          type: "draw.create",
          features: [relevantFeature],
        });
      }
    };

    draw.on("change", handleChange);
    draw.on("select", handleSelectionChange);
    draw.on("deselect", handleSelectionChange);
    draw.on("finish", handleFinish);

    return () => {
      draw.off("change", handleChange);
      draw.off("select", handleSelectionChange);
      draw.off("deselect", handleSelectionChange);
      draw.off("finish", handleFinish);
    };
  }, [drawRef.current, isReady, getSnapshot]);

  const setMode = useCallback((mode: DrawMode | null) => {
    if (!drawRef.current) return;

    if (mode === null) {
      drawRef.current.setMode("select");
    } else {
      const targetMode = MODE_MAP[mode];
      if (targetMode) {
        drawRef.current.setMode(targetMode);
      }
    }

    setState((prev) => ({
      ...prev,
      activeMode: mode,
      isDrawing: mode !== null,
    }));
    callbacksRef.current.onModeChange?.(mode);
  }, []);

  const addFeatures = useCallback(
    (features: FeatureCollection) => {
      if (!drawRef.current) return;
      drawRef.current.addFeatures(features.features);
      const snap = getSnapshot();
      setState((prev) => ({ ...prev, features: snap }));
    },
    [getSnapshot]
  );

  const deleteFeatures = useCallback(
    (ids: string[]) => {
      if (!drawRef.current) return;
      drawRef.current.removeFeatures(ids);
      const snap = getSnapshot();
      setState((prev) => ({
        ...prev,
        features: snap,
        selectedIds: prev.selectedIds.filter((id) => !ids.includes(id)),
      }));
    },
    [getSnapshot]
  );

  const deleteAll = useCallback(() => {
    if (!drawRef.current) return;
    drawRef.current.clear();
    setState((prev) => ({
      ...prev,
      features: { type: "FeatureCollection", features: [] },
      selectedIds: [],
    }));
  }, []);

  const getAll = useCallback((): FeatureCollection => {
    return getSnapshot();
  }, [getSnapshot]);

  const getSelected = useCallback((): string[] => {
    return state.selectedIds;
  }, [state.selectedIds]);

  const selectFeatures = useCallback((ids: string[]) => {
    if (!drawRef.current) return;
    drawRef.current.setMode("select");
    // TerraDraw does not easily allow programmatic array selection out of the box in select mode without UI click APIs natively,
    // but we emulate the mode transition.
    setState((prev) => ({
      ...prev,
      selectedIds: ids,
    }));
  }, []);

  const deselectAll = useCallback(() => {
    if (!drawRef.current) return;
    drawRef.current.setMode("select");
    setState((prev) => ({
      ...prev,
      selectedIds: [],
    }));
  }, []);

  return {
    state,
    setMode,
    addFeatures,
    deleteFeatures,
    deleteAll,
    getAll,
    getSelected,
    selectFeatures,
    deselectAll,
    isReady,
  };
}
