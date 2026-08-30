import { useCallback, useEffect, useRef } from "react";
import { useMapEditor, defaultAnnotationFor } from "@/lib/mapEditor/store";
import type {
  ActiveTool,
  Annotation,
  AnnotationKind,
  PointAnnotation,
  ShapeAnnotation,
} from "@/lib/mapEditor/types";
import { POINT_KINDS, SHAPE_KINDS } from "@/lib/mapEditor/types";

/* ──────────────────────────────────────────────────────────────────────── */
/*  Constants                                                              */
/* ──────────────────────────────────────────────────────────────────────── */
const SRC = "eaiq_annotations";
const PREVIEW_SRC = "eaiq_preview";

const FILL_LAYER = "eaiq_ann_fill";
const LINE_LAYER = "eaiq_ann_line";
const SELECT_LAYER = "eaiq_ann_selected";
const PREVIEW_FILL = "eaiq_preview_fill";
const PREVIEW_LINE = "eaiq_preview_line";

/** How the active tool maps to an interactive mode. */
type Mode = "navigate" | "point" | "box";

function toolToMode(tool: ActiveTool | null): Mode {
  if (!tool) return "navigate";
  const { groupId, variantId } = tool;
  // navigate + draw-group tools are handled elsewhere: the draw group by the
  // TerraDraw engine (useMapDrawing / @packages/map useTerraDraw)
  if (groupId === "navigate" || groupId === "draw") return "navigate";
  if (variantId === "highlighter") return "box";
  if (["marker", "text", "note", "image", "link", "video"].includes(variantId))
    return "point";
  return "navigate";
}

/** Kind of annotation produced for a mode (when unambiguous). */
function modeToKind(
  tool: ActiveTool | null,
  mode: Mode,
): AnnotationKind | null {
  if (!tool) return null;
  const { variantId } = tool;
  switch (mode) {
    case "box":
      return variantId === "highlighter" ? "highlight" : "rectangle";
    case "point":
      if (POINT_KINDS.includes(variantId as any)) return variantId as any;
      return null;
    default:
      return null;
  }
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Geometry helpers                                                       */
/* ──────────────────────────────────────────────────────────────────────── */
const EARTH_RADIUS = 6378137;

function metersToDeg(meters: number, lat: number) {
  const latDeg = (360 / (2 * Math.PI * EARTH_RADIUS)) * meters;
  const lngDeg =
    (360 / (2 * Math.PI * EARTH_RADIUS * Math.cos((lat * Math.PI) / 180))) *
    meters;
  return { latDeg, lngDeg };
}

/** Approximate a circle (center + radius in meters) as an n-point polygon. */
function circleToPolygon(
  center: [number, number],
  radius: number,
  n = 64,
): { type: "Polygon"; coordinates: number[][][] } {
  const [lng, lat] = center;
  const { latDeg, lngDeg } = metersToDeg(radius, lat);
  const coords: number[][] = [];
  for (let i = 0; i <= n; i++) {
    const theta = (i / n) * 2 * Math.PI;
    coords.push([
      lng + lngDeg * Math.sin(theta),
      lat + latDeg * Math.cos(theta),
    ]);
  }
  return { type: "Polygon", coordinates: [coords] };
}

/** Convert an array of [lng, lat] into a closed Polygon. */
function toPolygon(coords: [number, number][]) {
  const ring = [...coords, coords[0]];
  return { type: "Polygon", coordinates: [ring] };
}

/** Build a FeatureCollection from the annotation list. */
function buildGeoJSON(annotations: Annotation[], selectionId: string | null) {
  const features: any[] = [];
  for (const ann of annotations) {
    if ((SHAPE_KINDS as AnnotationKind[]).includes(ann.kind)) {
      const s = ann as ShapeAnnotation;
      if (s.kind === "circle") {
        const center = (s.geometry as any).coordinates as [number, number];
        features.push({
          type: "Feature",
          id: ann.id,
          properties: {
            id: ann.id,
            kind: "circle",
            color: s.color,
            opacity: s.opacity ?? 0.45,
          },
          geometry: circleToPolygon(center, s.radius ?? 100),
        });
      } else if (s.kind === "line") {
        features.push({
          type: "Feature",
          id: ann.id,
          properties: {
            id: ann.id,
            kind: "line",
            color: s.color,
            lineWidth: s.lineWidth ?? 4,
          },
          geometry: s.geometry,
        });
      } else {
        features.push({
          type: "Feature",
          id: ann.id,
          properties: {
            id: ann.id,
            kind: s.kind,
            color: s.color,
            opacity: s.opacity ?? 0.45,
          },
          geometry: s.geometry,
        });
      }
    }
    // point annotations are rendered as DOM overlays, not here
  }

  const base: any = { type: "FeatureCollection", features };
  void selectionId;
  return base;
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  The hook                                                               */
/* ──────────────────────────────────────────────────────────────────────── */
export function useMapTools(mapRef: React.RefObject<any>, mapReady: boolean) {
  const state = useMapEditor();
  const modeRef = useRef<Mode>("navigate");
  const draggingRef = useRef(false);
  const startRef = useRef<[number, number] | null>(null);

  /* ── ensure source + layers exist ─────────────────────────────────────── */
  const ensureLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded?.()) return false;
    if (!map.getSource(SRC)) {
      map.addSource(SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }
    if (!map.getSource(PREVIEW_SRC)) {
      map.addSource(PREVIEW_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }
    if (map.getLayer(FILL_LAYER)) return true;
    map.addLayer({
      id: FILL_LAYER,
      type: "fill",
      source: SRC,
      filter: ["==", ["get", "kind"], "circle"],
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": ["*", 0.5, ["coalesce", ["get", "opacity"], 0.45]],
      },
    });
    map.addLayer({
      id: FILL_LAYER + "_poly",
      type: "fill",
      source: SRC,
      filter: ["all", ["==", ["get", "kind"], "rectangle"]],
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": ["coalesce", ["get", "opacity"], 0.45],
      },
    });
    map.addLayer({
      id: FILL_LAYER + "_hl",
      type: "fill",
      source: SRC,
      filter: [
        "all",
        [
          "in",
          ["get", "kind"],
          ["literal", ["rectangle", "highlight", "shape"]],
        ],
      ],
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": ["coalesce", ["get", "opacity"], 0.45],
      },
    });
    map.addLayer({
      id: LINE_LAYER,
      type: "line",
      source: SRC,
      filter: ["!", ["==", ["get", "kind"], "circle"]],
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["coalesce", ["get", "lineWidth"], 3],
      },
    });
    map.addLayer({
      id: SELECT_LAYER,
      type: "line",
      source: SRC,
      filter: ["==", ["id"], "__none__"],
      paint: {
        "line-color": "#ffffff",
        "line-width": ["+", ["coalesce", ["get", "lineWidth"], 3], 2],
      },
    });
    // preview layers
    map.addLayer({
      id: PREVIEW_FILL,
      type: "fill",
      source: PREVIEW_SRC,
      paint: { "fill-color": "#50aad1", "fill-opacity": 0.2 },
    });
    map.addLayer({
      id: PREVIEW_LINE,
      type: "line",
      source: PREVIEW_SRC,
      paint: {
        "line-color": "#50aad1",
        "line-width": 2,
        "line-dasharray": [2, 2],
      },
    });
    return true;
  }, [mapRef]);

  /* ── sync annotations → map source ────────────────────────────────────── */
  const sync = useCallback(() => {
    const map = mapRef.current;
    if (!map || !ensureLayers()) return;
    const { annotations, selectionId } = useMapEditor.getState();
    const fc = buildGeoJSON(annotations, selectionId);
    map.getSource(SRC)?.setData(fc);
    if (selectionId) {
      map.setFilter(SELECT_LAYER, ["==", ["id"], selectionId]);
    } else {
      map.setFilter(SELECT_LAYER, ["==", ["id"], "__none__"]);
    }
  }, [mapRef, ensureLayers]);

  /* ── apply cursor / interaction config for a mode ─────────────────────── */
  const applyMode = useCallback(
    (mode: Mode) => {
      const map = mapRef.current;
      if (!map) return;
      modeRef.current = mode;
      draggingRef.current = false;
      const canvas = map.getCanvas();
      if (mode === "navigate") {
        map.dragPan.enable();
        map.boxZoom.enable();
        map.doubleClickZoom.enable();
        canvas.style.cursor = "default";
      } else {
        map.dragPan.disable();
        map.boxZoom.disable();
        map.doubleClickZoom.disable();
        canvas.style.cursor = "crosshair";
      }
      clearPreview();
      function clearPreview() {
        map
          .getSource(PREVIEW_SRC)
          ?.setData({ type: "FeatureCollection", features: [] });
      }
    },
    [mapRef],
  );

  /* ── preview helpers ──────────────────────────────────────────────────── */
  const setPreview = useCallback(
    (geometry: { type: string; coordinates: any }) => {
      const map = mapRef.current;
      if (!map) return;
      map.getSource(PREVIEW_SRC)?.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry,
          },
        ],
      });
    },
    [mapRef],
  );

  const clearPreview = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map
      .getSource(PREVIEW_SRC)
      ?.setData({ type: "FeatureCollection", features: [] });
  }, [mapRef]);

  /* ── finish a drawn shape → commit annotation ─────────────────────────── */
  const commitShape = useCallback(
    (
      geometry: { type: string; coordinates: any },
      kind: AnnotationKind,
      seed: Partial<ShapeAnnotation>,
    ) => {
      const store = useMapEditor.getState();
      const ann = defaultAnnotationFor(kind, {
        radius: seed.radius,
        color: kind === "highlight" ? "#fbbf24" : "#50aad1",
      }) as ShapeAnnotation;
      ann.geometry = geometry;
      if (seed.radius != null) ann.radius = seed.radius;
      if (kind === "highlight") {
        ann.opacity = 0.3;
      }
      store.addAnnotation(ann);
      // return to select after drawing for a smoother UX
      store.setActiveTool({ groupId: "navigate", variantId: "select" });
    },
    [],
  );

  const commitPoint = useCallback(
    (kind: AnnotationKind, lngLat: [number, number]) => {
      const store = useMapEditor.getState();
      const ann = defaultAnnotationFor(kind, { lngLat }) as PointAnnotation;
      store.addAnnotation(ann);
      store.setActiveTool({ groupId: "navigate", variantId: "select" });
    },
    [],
  );

  /* ── map event handlers ───────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // wait for style
    let ready = map.isStyleLoaded?.();
    const onStyle = () => (ready = true);
    if (!ready) map.on("styledata", onStyle);

    const getLngLat = (e: MouseEvent): [number, number] => {
      const ll = map.unproject([e.offsetX, e.offsetY]);
      return [ll.lng, ll.lat];
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const mode = modeRef.current;
      if (mode === "box") {
        draggingRef.current = true;
        startRef.current = getLngLat(e);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const mode = modeRef.current;
      if (mode === "box" && draggingRef.current && startRef.current) {
        const cur = getLngLat(e);
        const [[aLng, aLat], [bLng, bLat]] = [startRef.current, cur];
        const poly: [number, number][] = [
          [aLng, aLat],
          [bLng, aLat],
          [bLng, bLat],
          [aLng, bLat],
        ];
        setPreview(toPolygon(poly));
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      const mode = modeRef.current;
      if (!draggingRef.current || !startRef.current) return;
      draggingRef.current = false;
      const cur = getLngLat(e);
      const start = startRef.current;

      if (mode === "box") {
        const tool = useMapEditor.getState().activeTool;
        const kind = modeToKind(tool, "box") ?? "rectangle";
        const poly: [number, number][] = [
          start,
          [cur[0], start[1]],
          cur,
          [start[0], cur[1]],
        ];
        const bbox = poly.map((p) => p[0]);
        const bLat = poly.map((p) => p[1]);
        if (
          Math.max(...bbox) - Math.min(...bbox) < 1e-9 ||
          Math.max(...bLat) - Math.min(...bLat) < 1e-9
        ) {
          startRef.current = null;
          clearPreview();
          return;
        }
        commitShape(toPolygon(poly), kind, {});
      }
      startRef.current = null;
      clearPreview();
    };

    const onClick = (e: any) => {
      const mode = modeRef.current;
      const lngLat = [e.lngLat.lng, e.lngLat.lat] as [number, number];
      const store = useMapEditor.getState();

      if (mode === "point") {
        const kind = modeToKind(store.activeTool, "point");
        if (kind) commitPoint(kind, lngLat);
        return;
      }

      if (mode === "navigate") {
        // click a shape annotation → select it
        if (e.originalEvent && e.originalEvent.type === "click") {
          const feats = map.queryRenderedFeatures(e.point, {
            layers: [
              FILL_LAYER,
              FILL_LAYER + "_poly",
              FILL_LAYER + "_hl",
              LINE_LAYER,
            ],
          });
          const hit = feats.find((f: any) => f.properties?.id);
          if (hit) {
            store.setSelectionId(hit.properties.id);
          } else {
            store.setSelectionId(null);
          }
        }
      }
    };

    map.getCanvas().addEventListener("mousedown", onMouseDown);
    map.getCanvas().addEventListener("mousemove", onMouseMove);
    map.getCanvas().addEventListener("mouseup", onMouseUp);
    map.on("click", onClick);

    return () => {
      map.getCanvas().removeEventListener("mousedown", onMouseDown);
      map.getCanvas().removeEventListener("mousemove", onMouseMove);
      map.getCanvas().removeEventListener("mouseup", onMouseUp);
      map.off("click", onClick);
      map.off("styledata", onStyle);
    };
  }, [mapReady, mapRef, commitPoint, commitShape, setPreview, clearPreview]);

  /* ── react to tool changes ────────────────────────────────────────────── */
  useEffect(() => {
    if (!mapReady) return;
    applyMode(toolToMode(state.activeTool));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activeTool, mapReady]);

  /* ── react to annotation / selection changes ──────────────────────────── */
  useEffect(() => {
    if (!mapReady) return;
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.annotations, state.selectionId, mapReady]);

  return { mode: modeRef.current };
}
