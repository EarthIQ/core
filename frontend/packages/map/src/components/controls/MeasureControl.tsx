// MeasureControl.tsx
import {
  type ReactNode,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { ControlButton, ControlButtonFlyout } from "./MapControlButton";
import { useMap } from "../../hooks/useMap";
import * as turf from "@turf/turf";
import type { GeoJSONSource } from "maplibre-gl";
import { Ruler, Trash2, Undo2, Check } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MeasureMode = "distance" | "area";

export interface MeasureResult {
  type: MeasureMode;
  value: number;
  unit: string;
  formattedValue: string;
  geometry: GeoJSON.Geometry;
  segments?: { distance: number; bearing: number }[];
}

export interface MeasureControlProps {
  /** Unit system */
  units?: "metric" | "imperial";
  /** Flyout direction */
  flyoutSide?: "left" | "right";
  /** Trigger icon */
  icon?: ReactNode;
  /** Trigger label */
  label?: string;
  /** Trigger className */
  className?: string;
  /** Flyout className */
  flyoutClassName?: string;
  /** Line style */
  lineStyle?: { color?: string; width?: number };
  /** Polygon style */
  polygonStyle?: {
    fillColor?: string;
    fillOpacity?: number;
    outlineColor?: string;
  };
  /** Callback on measurement */
  onMeasure?: (result: MeasureResult) => void;
  /** Callback when active state changes */
  onActiveChange?: (active: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════

function DistanceIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20L20 4" />
      <circle cx={4} cy={20} r={2} />
      <circle cx={20} cy={4} r={2} />
    </svg>
  );
}

function AreaIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 4h16v16H4z" />
      <path d="M4 4l16 16" opacity={0.4} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════════════════════════════════════

function formatDistance(
  meters: number,
  units: "metric" | "imperial"
): { value: number; unit: string; formatted: string } {
  if (units === "metric") {
    if (meters < 1000) {
      return { value: meters, unit: "m", formatted: `${meters.toFixed(1)} m` };
    }
    const km = meters / 1000;
    return { value: km, unit: "km", formatted: `${km.toFixed(2)} km` };
  }
  const feet = meters * 3.28084;
  if (feet < 5280) {
    return { value: feet, unit: "ft", formatted: `${feet.toFixed(1)} ft` };
  }
  const miles = feet / 5280;
  return { value: miles, unit: "mi", formatted: `${miles.toFixed(2)} mi` };
}

function formatArea(
  sqMeters: number,
  units: "metric" | "imperial"
): { value: number; unit: string; formatted: string } {
  if (units === "metric") {
    if (sqMeters < 10000) {
      return {
        value: sqMeters,
        unit: "m²",
        formatted: `${sqMeters.toFixed(1)} m²`,
      };
    }
    if (sqMeters < 1000000) {
      const ha = sqMeters / 10000;
      return { value: ha, unit: "ha", formatted: `${ha.toFixed(2)} ha` };
    }
    const sqKm = sqMeters / 1000000;
    return { value: sqKm, unit: "km²", formatted: `${sqKm.toFixed(2)} km²` };
  }
  const sqFeet = sqMeters * 10.7639;
  if (sqFeet < 43560) {
    return {
      value: sqFeet,
      unit: "ft²",
      formatted: `${sqFeet.toFixed(1)} ft²`,
    };
  }
  const acres = sqFeet / 43560;
  return {
    value: acres,
    unit: "acres",
    formatted: `${acres.toFixed(2)} acres`,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// MAP LAYER IDS
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS & DEFAULTS
// ═══════════════════════════════════════════════════════════════════════

const SOURCE_ID = "measure-control-source";
const LINE_LAYER = "measure-control-line";
const POINT_LAYER = "measure-control-points";
const POLYGON_LAYER = "measure-control-polygon";
const OUTLINE_LAYER = "measure-control-outline";
const LABEL_LAYER = "measure-control-labels";

const DEFAULT_LINE_STYLE = { color: "#3b82f6", width: 3 };
const DEFAULT_POLYGON_STYLE = {
  fillColor: "#3b82f6",
  fillOpacity: 0.2,
  outlineColor: "#3b82f6",
};

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export const MeasureControl: React.FC<MeasureControlProps> = ({
  units = "metric",
  flyoutSide = "left",
  icon,
  label = "Measure",
  className,
  flyoutClassName,
  lineStyle = DEFAULT_LINE_STYLE,
  polygonStyle = DEFAULT_POLYGON_STYLE,
  onMeasure,
  onActiveChange,
}) => {
  const { map, isLoaded } = useMap();
  const [measureMode, setMeasureMode] = useState<MeasureMode | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [currentResult, setCurrentResult] = useState<MeasureResult | null>(
    null
  );
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isActive = measureMode !== null;

  useEffect(() => {
    onActiveChange?.(isActive);
  }, [isActive, onActiveChange]);

  useEffect(() => {
    return () => {
      onActiveChange?.(false);
    };
  }, [onActiveChange]);

  // ── Initialize map layers ─────────────────────────────────────────
  useEffect(() => {
    if (!map || !isLoaded) return;

    const setupLayers = () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addLayer({
          id: POLYGON_LAYER,
          type: "fill",
          source: SOURCE_ID,
          filter: ["==", ["get", "measureType"], "polygon"],
          paint: {
            "fill-color": polygonStyle.fillColor!,
            "fill-opacity": polygonStyle.fillOpacity!,
          },
        });

        map.addLayer({
          id: OUTLINE_LAYER,
          type: "line",
          source: SOURCE_ID,
          filter: ["==", ["get", "measureType"], "polygon"],
          paint: {
            "line-color": polygonStyle.outlineColor!,
            "line-width": 2,
          },
        });

        map.addLayer({
          id: LINE_LAYER,
          type: "line",
          source: SOURCE_ID,
          filter: ["==", ["get", "measureType"], "line"],
          paint: {
            "line-color": lineStyle.color!,
            "line-width": lineStyle.width!,
          },
        });

        map.addLayer({
          id: POINT_LAYER,
          type: "circle",
          source: SOURCE_ID,
          filter: ["==", ["get", "measureType"], "vertex"],
          paint: {
            "circle-radius": 6,
            "circle-color": "#ffffff",
            "circle-stroke-color": lineStyle.color!,
            "circle-stroke-width": 2,
          },
        });

        map.addLayer({
          id: LABEL_LAYER,
          type: "symbol",
          source: SOURCE_ID,
          filter: ["==", ["get", "measureType"], "label"],
          layout: {
            "text-field": ["get", "label"],
            "text-size": 12,
            "text-offset": [0, -1.5],
            "text-anchor": "bottom",
          },
          paint: {
            "text-color": "#000000",
            "text-halo-color": "#ffffff",
            "text-halo-width": 2,
          },
        });
      }
    };

    setupLayers();
    map.on("style.load", setupLayers);

    return () => {
      try {
        map.off("style.load", setupLayers);
        if (!map.style) return;
        if (map.getLayer(LABEL_LAYER)) map.removeLayer(LABEL_LAYER);
        if (map.getLayer(POINT_LAYER)) map.removeLayer(POINT_LAYER);
        if (map.getLayer(LINE_LAYER)) map.removeLayer(LINE_LAYER);
        if (map.getLayer(OUTLINE_LAYER)) map.removeLayer(OUTLINE_LAYER);
        if (map.getLayer(POLYGON_LAYER)) map.removeLayer(POLYGON_LAYER);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch (e) {
        console.warn("Failed to clean up measure control layers:", e);
      }
    };
  }, [map, isLoaded, lineStyle.color, lineStyle.width, polygonStyle.fillColor, polygonStyle.fillOpacity, polygonStyle.outlineColor]);

  // ── Compute current features ──────────────────────────────────────
  const features = useMemo<GeoJSON.Feature[]>(() => {
    const f: GeoJSON.Feature[] = [];

    // Add vertex points
    points.forEach((point, index) => {
      f.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: point },
        properties: { measureType: "vertex", index },
      });
    });

    // Add geometry
    if (points.length >= 2) {
      if (measureMode === "distance") {
        f.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: points },
          properties: { measureType: "line" },
        });

        // Add segment labels
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i]!;
          const p2 = points[i + 1]!;
          const segLine = turf.lineString([p1, p2]);
          const dist = turf.length(segLine, { units: "meters" });
          const midpoint = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
          f.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: midpoint },
            properties: {
              measureType: "label",
              label: formatDistance(dist, units).formatted,
            },
          });
        }
      } else if (measureMode === "area") {
        if (points.length >= 3) {
          f.push({
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [[...points, points[0]!]],
            },
            properties: { measureType: "polygon" },
          });
        }
        // Always show the line while drawing the area
        f.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: points },
          properties: { measureType: "line" },
        });
      }
    }

    return f;
  }, [points, measureMode, units]);

  // ── Initialize map layers ─────────────────────────────────────────
  useEffect(() => {
    if (!map || !isLoaded) return;

    const setupLayers = () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features },
        });

        map.addLayer({
          id: POLYGON_LAYER,
          type: "fill",
          source: SOURCE_ID,
          filter: ["==", ["get", "measureType"], "polygon"],
          paint: {
            "fill-color": polygonStyle.fillColor!,
            "fill-opacity": polygonStyle.fillOpacity!,
          },
        });

        map.addLayer({
          id: OUTLINE_LAYER,
          type: "line",
          source: SOURCE_ID,
          filter: ["==", ["get", "measureType"], "polygon"],
          paint: {
            "line-color": polygonStyle.outlineColor!,
            "line-width": 2,
          },
        });

        map.addLayer({
          id: LINE_LAYER,
          type: "line",
          source: SOURCE_ID,
          filter: ["==", ["get", "measureType"], "line"],
          paint: {
            "line-color": lineStyle.color!,
            "line-width": lineStyle.width!,
          },
        });

        map.addLayer({
          id: POINT_LAYER,
          type: "circle",
          source: SOURCE_ID,
          filter: ["==", ["get", "measureType"], "vertex"],
          paint: {
            "circle-radius": 6,
            "circle-color": "#ffffff",
            "circle-stroke-color": lineStyle.color!,
            "circle-stroke-width": 2,
          },
        });

        map.addLayer({
          id: LABEL_LAYER,
          type: "symbol",
          source: SOURCE_ID,
          filter: ["==", ["get", "measureType"], "label"],
          layout: {
            "text-field": ["get", "label"],
            "text-size": 12,
            "text-offset": [0, -1.5],
            "text-anchor": "bottom",
          },
          paint: {
            "text-color": "#000000",
            "text-halo-color": "#ffffff",
            "text-halo-width": 2,
          },
        });
      }
    };

    setupLayers();
    map.on("style.load", setupLayers);

    return () => {
      try {
        map.off("style.load", setupLayers);
        if (!map.style) return;
        if (map.getLayer(LABEL_LAYER)) map.removeLayer(LABEL_LAYER);
        if (map.getLayer(POINT_LAYER)) map.removeLayer(POINT_LAYER);
        if (map.getLayer(LINE_LAYER)) map.removeLayer(LINE_LAYER);
        if (map.getLayer(OUTLINE_LAYER)) map.removeLayer(OUTLINE_LAYER);
        if (map.getLayer(POLYGON_LAYER)) map.removeLayer(POLYGON_LAYER);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch (e) {
        console.warn("Failed to clean up measure control layers:", e);
      }
    };
  }, [
    map,
    isLoaded,
    lineStyle.color,
    lineStyle.width,
    polygonStyle.fillColor,
    polygonStyle.fillOpacity,
    polygonStyle.outlineColor,
    features,
  ]);

  // ── Update geometry visualization ─────────────────────────────────
  useEffect(() => {
    if (!map || !isLoaded) return;

    const source = map.getSource(SOURCE_ID) as GeoJSONSource;
    if (source) {
      source.setData({ type: "FeatureCollection", features });
    }

    // Calculate measurements
    if (measureMode === "distance" && points.length >= 2) {
      const line = turf.lineString(points);
      const totalDistance = turf.length(line, { units: "meters" });
      const formatted = formatDistance(totalDistance, units);

      const segments = [];
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]!;
        const curr = points[i]!;
        const segLine = turf.lineString([prev, curr]);
        const d = turf.length(segLine, { units: "meters" });
        const b = turf.bearing(turf.point(prev), turf.point(curr));
        segments.push({
          distance: d,
          bearing: b,
        });
      }

      const result: MeasureResult = {
        type: "distance",
        value: formatted.value,
        unit: formatted.unit,
        formattedValue: formatted.formatted,
        geometry: line.geometry,
        segments,
      };
      setCurrentResult(result);
    } else if (measureMode === "area" && points.length >= 3) {
      const polygon = turf.polygon([[...points, points[0]!]]);
      const area = turf.area(polygon);
      const formatted = formatArea(area, units);
      const perimeter = turf.length(turf.lineString([...points, points[0]!]), {
        units: "meters",
      });

      const result: MeasureResult = {
        type: "area",
        value: formatted.value,
        unit: formatted.unit,
        formattedValue: `${formatted.formatted} (${
          formatDistance(perimeter, units).formatted
        })`,
        geometry: polygon.geometry,
      };
      setCurrentResult(result);
    } else {
      setCurrentResult(null);
    }
  }, [features, measureMode, units, map, isLoaded, points.length]);

  // ── Map click handlers ────────────────────────────────────────────
  useEffect(() => {
    if (!map || !isLoaded || !measureMode || !isDrawing) {
      if (map && map.getCanvas()) map.getCanvas().style.cursor = "";
      return;
    }

    map.getCanvas().style.cursor = "crosshair";

    const handleClick = (e: any) => {
      const newPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setPoints((prev) => [...prev, newPoint]);
    };

    const handleDoubleClick = (e: any) => {
      e.preventDefault();
      finishMeasurement();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelMeasurement();
      } else if (e.key === "Enter") {
        finishMeasurement();
      }
    };

    map.on("click", handleClick);
    map.on("dblclick", handleDoubleClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      try {
        map.off("click", handleClick);
        map.off("dblclick", handleDoubleClick);
        document.removeEventListener("keydown", handleKeyDown);
        if (map.getCanvas()) map.getCanvas().style.cursor = "";
      } catch (e) {
        console.warn("Failed to clean up map events:", e);
      }
    };
  }, [map, isLoaded, measureMode]);

  // ── Actions ───────────────────────────────────────────────────────
  const startMeasurement = useCallback((mode: MeasureMode) => {
    if (measureMode === mode && isDrawing) {
      // Toggle off completely
      setMeasureMode(null);
      setIsDrawing(false);
      setPoints([]);
      setCurrentResult(null);
      
      if (map) {
        const source = map.getSource(SOURCE_ID) as GeoJSONSource;
        if (source) {
          source.setData({ type: "FeatureCollection", features: [] });
        }
      }
    } else {
      // Start or restart new measurement
      setMeasureMode(mode);
      setPoints([]);
      setCurrentResult(null);
      setIsDrawing(true);
    }
  }, [measureMode, isDrawing, map]);

  const finishMeasurement = useCallback(() => {
    if (currentResult) {
      onMeasure?.(currentResult);
    }
    // Keep result visible but stop measuring map clicks
    setIsDrawing(false);
  }, [currentResult, onMeasure]);

  const cancelMeasurement = useCallback(() => {
    setPoints([]);
    setCurrentResult(null);
    setMeasureMode(null);
    setIsDrawing(false);

    if (map) {
      const source = map.getSource(SOURCE_ID) as GeoJSONSource;
      if (source) {
        source.setData({ type: "FeatureCollection", features: [] });
      }
    }
  }, [map]);

  const undoLastPoint = useCallback(() => {
    setPoints((prev) => prev.slice(0, -1));
  }, []);

  // ── Click outside (don't close while measuring) ───────────────────
  useEffect(() => {
    if (!isActive) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        // Handle outside clicks
        if (isDrawing) return;
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isActive, isDrawing]);

  // ── Resolved state ────────────────────────────────────────────────
  const hasPoints = points.length > 0;
  const canFinish =
    measureMode === "distance" ? points.length >= 2 : points.length >= 3;

  return (
    <div ref={wrapperRef} className="relative">
      <ControlButtonFlyout
        icon={icon ?? <Ruler className="h-4 w-4" />}
        label={label}
        flyoutSide={flyoutSide}
        flyoutAlign="start"
        active={isActive}
        forceOpen={isActive}
        className={className}
        flyoutClassName={flyoutClassName}
      >
        {/* Mode buttons */}
        <ControlButton
          icon={<DistanceIcon />}
          label="Measure distance"
          active={measureMode === "distance"}
          onClick={() => startMeasurement("distance")}
        />
        <ControlButton
          icon={<AreaIcon />}
          label="Measure area"
          active={measureMode === "area"}
          onClick={() => startMeasurement("area")}
        />

        {/* Result display */}
        {currentResult && (
          <div
            className="mx-1 my-1 rounded-lg px-2.5 py-2"
            style={{
              background: "var(--surface-hover)",
              color: "var(--text-primary)",
            }}
          >
            <div
              className="mb-0.5 text-[10px] font-medium uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              {currentResult.type === "distance" ? "Distance" : "Area"}
            </div>
            <div className="text-sm font-bold">
              {currentResult.formattedValue}
            </div>
            {currentResult.segments && currentResult.segments.length > 1 && (
              <div
                className="mt-1.5 space-y-0.5 border-t pt-1.5"
                style={{ borderColor: "var(--border-primary)" }}
              >
                {currentResult.segments.map((seg, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-[10px]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <span>Seg {i + 1}</span>
                    <span>
                      {formatDistance(seg.distance, units).formatted} @{" "}
                      {seg.bearing.toFixed(0)}°
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status hint */}
        {measureMode && !currentResult && (
          <div
            className="px-2.5 py-1.5 text-center text-[10px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {measureMode === "distance"
              ? "Click to add points"
              : "Click to add vertices"}
          </div>
        )}

        {/* Action buttons when measuring */}
        {measureMode && isDrawing && (
          <>
            <div
              className="mx-2 h-px"
              style={{ background: "var(--border-primary)" }}
            />
            <ControlButton
              icon={<Undo2 className="h-4 w-4" />}
              label="Undo last point"
              onClick={undoLastPoint}
              disabled={!hasPoints}
            />
            <ControlButton
              icon={<Check className="h-4 w-4" />}
              label="Finish measurement"
              onClick={finishMeasurement}
              disabled={!canFinish}
            />
            <ControlButton
              icon={<Trash2 className="h-4 w-4" />}
              label="Cancel"
              onClick={cancelMeasurement}
              className="text-[var(--error)] hover:bg-[var(--error-bg)]"
            />
          </>
        )}

        {/* Action buttons when finished */}
        {measureMode && !isDrawing && (
          <>
            <div
              className="mx-2 h-px"
              style={{ background: "var(--border-primary)" }}
            />
            <ControlButton
              icon={<Trash2 className="h-4 w-4" />}
              label="Clear measurement"
              onClick={cancelMeasurement}
              className="text-[var(--error)] hover:bg-[var(--error-bg)]"
            />
          </>
        )}
      </ControlButtonFlyout>
    </div>
  );
};
