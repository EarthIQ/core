/**
 * presentation/SlideCanvas.tsx
 * ----------------------------
 * Renders a single slide - title, subtitle and its content blocks - used both
 * by the editor (with block selection + a floating per-block toolbar) and by
 * present mode (a clean, non-interactive render).
 *
 * Layout model (deterministic, PowerPoint-like):
 *   - the slide is a 16:9 container; text sizes use container-query units (cqw)
 *     so everything scales with the slide in both edit and present.
 *   - content blocks are grouped into rows of up to two "half" blocks, or one
 *     "full" (span 2) block per row; rows share the body height evenly.
 *
 * Block types: text, bullets, KPI, image render "native" (on the slide surface);
 * map, chart, table render as self-contained widgets (a live MapLibre map, or a
 * light panel for data viz) so they stay legible on any background.
 */
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Copy,
  ImageOff,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Table as TableIcon,
  Trash2,
  Type as TypeIcon,
} from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";

import { Button, cn } from "@packages/ui";
import {
  AreaChart,
  BarChart,
  LineChart,
  PieChart,
} from "@packages/charts";
import { Map as MapCanvas } from "@packages/map";

import { BASEMAP_STYLES } from "@/hooks/useMapLibre";
import { getVectorTileUrl } from "@/lib/datasets";
import type { MapLayerItem } from "@/lib/maps";

import type { ProjectData } from "./useProjectData";
import {
  blockDef,
  type Slide,
  type SlideBlock,
  type SlideSurface,
  slideSurface,
} from "./types";

/* ── Small shared bits ────────────────────────────────────────────────────── */

/** A "fill this in" hint shown inside a widget that has no data yet. */
function WidgetHint({
  icon: Icon,
  label,
  sub,
}: {
  icon: typeof TypeIcon;
  label: string;
  sub?: string;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-hover)] text-[var(--text-tertiary)]">
        <Icon size={18} />
      </span>
      <p className="text-xs font-medium text-[var(--text-secondary)]">{label}</p>
      {sub ? (
        <p className="max-w-[16rem] text-[0.7rem] leading-snug text-[var(--text-tertiary)]">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

/** Deterministic row grouping: full (span 2) blocks alone; halves pair up. */
function buildRows(blocks: SlideBlock[]): SlideBlock[][] {
  const rows: SlideBlock[][] = [];
  let current: SlideBlock[] = [];
  for (const block of blocks) {
    if (block.span === 2) {
      if (current.length) {
        rows.push(current);
        current = [];
      }
      rows.push([block]);
    } else {
      current.push(block);
      if (current.length === 2) {
        rows.push(current);
        current = [];
      }
    }
  }
  if (current.length) rows.push(current);
  return rows;
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Auto-pick sensible label/value columns from a dataset's attribute fields. */
function pickColumns(columns: { field: string }[]): {
  label: string;
  value: string;
} {
  const label = columns[0]?.field ?? "name";
  const numeric = columns.find((c) => {
    const f = c.field.toLowerCase();
    return !/id$|_id|name|label|code|type$/.test(f);
  });
  return { label, value: numeric?.field ?? label };
}

/** Map preview rows to chart data points ({ name, [value]: number }). */
function toChartData(
  rows: { values: Record<string, unknown> }[],
  label: string,
  value: string
) {
  return rows.map((row) => {
    const raw = row.values;
    const name = raw?.[label] ?? raw?.[value] ?? "";
    return { name: String(name ?? "—"), [value]: toNumber(raw?.[value]) };
  });
}

const CHART_COLORS = [
  "var(--primary)",
  "var(--secondary)",
  "var(--accent)",
  "var(--success)",
  "var(--warning)",
];

/* ── Native renderers (on the slide surface) ──────────────────────────────── */

function BlockHeading({
  heading,
  surface,
}: {
  heading?: string;
  surface: SlideSurface;
}) {
  if (!heading) return null;
  return (
    <p
      className="mb-1.5 font-semibold tracking-wide uppercase"
      style={{ color: surface.accent, fontSize: "1.7cqw" }}
    >
      {heading}
    </p>
  );
}

function TextBlock({
  block,
  surface,
}: {
  block: SlideBlock;
  surface: SlideSurface;
}) {
  return (
    <div className="flex h-full flex-col justify-start">
      <BlockHeading heading={block.heading} surface={surface} />
      <p
        className="whitespace-pre-wrap"
        style={{ color: surface.sub, fontSize: "1.9cqw", lineHeight: 1.55 }}
      >
        {block.text || "…"}
      </p>
    </div>
  );
}

function BulletsBlock({
  block,
  surface,
}: {
  block: SlideBlock;
  surface: SlideSurface;
}) {
  const items = (block.bullets ?? []).filter((b) => b.trim().length > 0);
  return (
    <div className="flex h-full flex-col justify-start">
      <BlockHeading heading={block.heading} surface={surface} />
      {items.length ? (
        <ul className="flex flex-col" style={{ gap: "0.8cqw" }}>
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-0.5"
                style={{ color: surface.accent, fontSize: "1.9cqw" }}
              >
                •
              </span>
              <span
                style={{ color: surface.text, fontSize: "1.9cqw", lineHeight: 1.5 }}
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: surface.sub, fontSize: "1.9cqw" }}>No items yet</p>
      )}
    </div>
  );
}

function KpiBlock({
  block,
  surface,
}: {
  block: SlideBlock;
  surface: SlideSurface;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      {block.heading ? (
        <p
          className="mb-1 font-medium uppercase tracking-wide"
          style={{ color: surface.sub, fontSize: "1.7cqw" }}
        >
          {block.heading}
        </p>
      ) : null}
      <p
        className="font-bold leading-none tabular-nums"
        style={{ color: surface.accent, fontSize: "7cqw" }}
      >
        {block.kpiValue || "0"}
      </p>
      {block.kpiLabel ? (
        <p className="mt-1" style={{ color: surface.sub, fontSize: "1.9cqw" }}>
          {block.kpiLabel}
        </p>
      ) : null}
    </div>
  );
}

function ImageBlock({
  block,
  surface,
}: {
  block: SlideBlock;
  surface: SlideSurface;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [block.imageUrl]);
  if (!block.imageUrl || broken) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg-tertiary)]">
        <WidgetHint
          icon={ImageOff}
          label="No image"
          sub="Add an image URL in the inspector"
        />
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col">
      {block.heading ? (
        <p
          className="mb-1 text-left font-medium"
          style={{ color: surface.sub, fontSize: "1.5cqw" }}
        >
          {block.heading}
        </p>
      ) : null}
      <img
        alt={block.heading || "Image"}
        className="min-h-0 w-full flex-1 rounded-md object-cover"
        draggable={false}
        onError={() => setBroken(true)}
        src={block.imageUrl}
      />
    </div>
  );
}

/* ── Widget renderers (self-contained surfaces) ───────────────────────────── */

function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border-primary)] border-t-[var(--primary)]" />
    </div>
  );
}

/** Add the selected map/project vector-tile layers to a loaded map (best-effort). */
function addVectorLayers(map: any, layers: MapLayerItem[]) {
  for (const layer of layers) {
    if (layer.type !== "vector" || !layer.datasetId) continue;
    const srcId = `pres-src-${layer.datasetId}`;
    if (map.getSource(srcId)) continue;
    try {
      map.addSource(srcId, {
        type: "vector",
        url: getVectorTileUrl(layer.datasetId),
        tileSize: 512,
      });
    } catch {
      continue;
    }
    const geo = (layer.geometryType ?? "point").toLowerCase();
    const sourceLayer = layer.name || layer.datasetId || "0";
    try {
      if (geo.includes("polygon")) {
        map.addLayer({
          id: `${srcId}-fill`,
          type: "fill",
          source: srcId,
          "source-layer": sourceLayer,
          paint: { "fill-color": "#2563eb", "fill-opacity": 0.35 },
        });
        map.addLayer({
          id: `${srcId}-line`,
          type: "line",
          source: srcId,
          "source-layer": sourceLayer,
          paint: { "line-color": "#1d4ed8", "line-width": 1.2 },
        });
      } else if (geo.includes("line")) {
        map.addLayer({
          id: `${srcId}-line`,
          type: "line",
          source: srcId,
          "source-layer": sourceLayer,
          paint: { "line-color": "#2563eb", "line-width": 2.5 },
        });
      } else {
        map.addLayer({
          id: `${srcId}-circle`,
          type: "circle",
          source: srcId,
          "source-layer": sourceLayer,
          paint: {
            "circle-radius": 4,
            "circle-color": "#2563eb",
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff",
          },
        });
      }
    } catch {
      /* source-layer may not exist in this MVT tile - skip gracefully */
    }
  }
}

function SlideMap({
  block,
  data,
  interactive,
}: {
  block: SlideBlock;
  data: ProjectData;
  interactive: boolean;
}) {
  const map =
    block.mapId && block.mapId !== "project"
      ? data.maps.find((m) => m.id === block.mapId)
      : undefined;
  const center = block.centerLng ?? map?.center_lng ?? data.project?.center_lng;
  const lat = block.centerLat ?? map?.center_lat ?? data.project?.center_lat;
  const zoom = block.zoom ?? map?.zoom ?? data.project?.zoom ?? 3;
  const basemap =
    block.basemap ?? map?.basemap ?? data.project?.basemap ?? "osm";
  const layers = (map?.layers_config ??
    data.project?.layers_config ??
    []) as MapLayerItem[];

  if (center == null || lat == null) {
    return (
      <div className="h-full w-full bg-[var(--bg-tertiary)]">
        <WidgetHint
          icon={MapIcon}
          label="No map view"
          sub="Pick a map in the inspector, or use the project view"
        />
      </div>
    );
  }

  const styles = BASEMAP_STYLES as Record<string, any>;
  const style = styles[basemap] ?? styles.osm;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--bg-tertiary)]">
      <MapCanvas
        key={`${block.id}:${basemap}:${center},${lat},${zoom}`}
        attributionControl={false}
        className="h-full w-full"
        initialViewState={{ longitude: center, latitude: lat, zoom }}
        interactive={interactive}
        maxZoom={18}
        minZoom={2}
        style={style}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onLoad={(m: any) => {
          try {
            addVectorLayers(m, layers);
          } catch {
            /* map extras are best-effort */
          }
        }}
      />
    </div>
  );
}

function renderChart(
  type: string,
  chartData: { name: string }[],
  value: string,
  label: string
) {
  const common = {
    animate: true,
    animationDuration: 400,
    colors: CHART_COLORS,
    data: chartData,
    height: "100%",
    legend: false,
    toolbar: false,
    tooltip: true,
    width: "100%",
  };
  if (type === "line") {
    return <LineChart {...common} lines={[{ dataKey: value, name: label }]} />;
  }
  if (type === "area") {
    return <AreaChart {...common} areas={[{ dataKey: value, name: label }]} />;
  }
  if (type === "pie") {
    return <PieChart {...common} dataKey={value} legend nameKey="name" />;
  }
  return <BarChart {...common} bars={[{ dataKey: value, name: label }]} />;
}

function SlideChart({ block, data }: { block: SlideBlock; data: ProjectData }) {
  const datasetId = block.datasetId;
  const preview = datasetId ? data.previews[datasetId] : undefined;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!datasetId || data.previews[datasetId]) return;
    let active = true;
    setLoading(true);
    setError(null);
    data
      .getPreview(datasetId)
      .then(() => {
        if (active) setLoading(false);
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [datasetId, data]);

  let body: React.ReactNode;
  if (!datasetId) {
    body = (
      <WidgetHint
        icon={BarChart3}
        label="Choose a dataset"
        sub="Pick a dataset in the inspector to plot a chart"
      />
    );
  } else if (loading) {
    body = <Loading />;
  } else if (error) {
    body = (
      <WidgetHint icon={BarChart3} label="Couldn't load chart" sub={error} />
    );
  } else {
    const columns = preview?.columns ?? [];
    const defaults = pickColumns(columns);
    const label = block.labelColumn || defaults.label;
    const value = block.valueColumn || defaults.value;
    const chartData = toChartData((preview?.rows ?? []).slice(0, 24), label, value);
    body = chartData.length ? (
      renderChart(block.chartType ?? "bar", chartData, value, label)
    ) : (
      <WidgetHint
        icon={BarChart3}
        label="No values to plot"
        sub="This dataset has no preview rows yet"
      />
    );
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-md bg-white p-3 text-slate-800">
      {body}
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function SlideTable({ block, data }: { block: SlideBlock; data: ProjectData }) {
  const datasetId = block.datasetId;
  const preview = datasetId ? data.previews[datasetId] : undefined;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!datasetId || data.previews[datasetId]) return;
    let active = true;
    setLoading(true);
    setError(null);
    data
      .getPreview(datasetId, 12)
      .then(() => {
        if (active) setLoading(false);
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [datasetId, data]);

  let body: React.ReactNode;
  if (!datasetId) {
    body = (
      <WidgetHint
        icon={TableIcon}
        label="Choose a dataset"
        sub="Pick a dataset in the inspector to show its data"
      />
    );
  } else if (loading) {
    body = <Loading />;
  } else if (error || !preview) {
    body = (
      <WidgetHint
        icon={TableIcon}
        label="Couldn't load data"
        sub={error ?? "No dataset selected"}
      />
    );
  } else {
    const cols = (preview.columns ?? []).slice(0, 6).map((c) => c.field);
    const rows = (preview.rows ?? []).slice(0, 9);
    if (!cols.length || !rows.length) {
      body = (
        <WidgetHint
          icon={TableIcon}
          label="No rows to show"
          sub="This dataset has no preview rows"
        />
      );
    } else {
      body = (
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-[0.72rem]">
              <caption className="sr-only">Data preview: {preview.name}</caption>
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th
                      key={c}
                      scope="col"
                      className="sticky top-0 border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-left font-semibold text-slate-600"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="even:bg-slate-50/60">
                    {cols.map((c) => (
                      <td
                        key={c}
                        className="max-w-[10rem] truncate border-b border-slate-100 px-2 py-1 text-slate-700"
                      >
                        {formatCell(row.values?.[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-2 py-1 text-[0.65rem] text-slate-400">
            {preview.row_count ?? rows.length} rows total · showing {rows.length}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-md bg-white p-3 text-slate-800">
      {body}
    </div>
  );
}

/* ── Edit-mode selection config ───────────────────────────────────────────── */
export type BlockAction = "up" | "down" | "duplicate" | "span" | "delete";

export interface EditConfig {
  selectedBlockId: string | null;
  onSelect: (id: string) => void;
  onAction: (blockId: string, action: BlockAction) => void;
}

function renderBlockContent(
  block: SlideBlock,
  data: ProjectData,
  surface: SlideSurface,
  interactive: boolean
) {
  switch (block.type) {
    case "text":
      return <TextBlock block={block} surface={surface} />;
    case "bullets":
      return <BulletsBlock block={block} surface={surface} />;
    case "kpi":
      return <KpiBlock block={block} surface={surface} />;
    case "image":
      return <ImageBlock block={block} surface={surface} />;
    case "map":
      return <SlideMap block={block} data={data} interactive={interactive} />;
    case "chart":
      return <SlideChart block={block} data={data} />;
    case "table":
      return <SlideTable block={block} data={data} />;
    default:
      return null;
  }
}

function ToolButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        danger
          ? "text-[var(--error-text)] hover:bg-[var(--error-bg)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
        disabled && "pointer-events-none opacity-40"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function BlockCell({
  block,
  data,
  surface,
  interactive,
  edit,
  canUp,
  canDown,
}: {
  block: SlideBlock;
  data: ProjectData;
  surface: SlideSurface;
  interactive: boolean;
  edit?: EditConfig;
  canUp: boolean;
  canDown: boolean;
}) {
  const selected = edit?.selectedBlockId === block.id;
  const label = blockDef(block.type).label;
  return (
    <div
      aria-label={edit ? `Select ${label} block` : undefined}
      className="group relative min-h-0 min-w-0 rounded-lg"
      onClick={edit ? () => edit.onSelect(block.id) : undefined}
      onKeyDown={
        edit
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                edit.onSelect(block.id);
              }
            }
          : undefined
      }
      role={edit ? "button" : undefined}
      tabIndex={edit ? 0 : undefined}
    >
      <div className="h-full w-full rounded-lg p-1">
        {renderBlockContent(block, data, surface, interactive)}
      </div>

      {edit ? (
        <>
          <div
            className={cn(
              "pointer-events-none absolute inset-0 rounded-lg ring-2 transition",
              selected
                ? "ring-[var(--primary)]"
                : "ring-transparent group-hover:ring-[var(--border-hover)]"
            )}
          />
          <div
            className={cn(
              "absolute top-1 right-1 z-10 flex items-center gap-0.5 rounded-lg",
              "border border-[var(--border-primary)] bg-[var(--bg-elevated)]/95 p-0.5",
              "shadow-[var(--shadow-md)]",
              selected
                ? "opacity-100"
                : "opacity-0 transition-opacity group-hover:opacity-100"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <ToolButton
              disabled={!canUp}
              label="Move up"
              onClick={() => edit.onAction(block.id, "up")}
            >
              <ChevronUp size={14} />
            </ToolButton>
            <ToolButton
              disabled={!canDown}
              label="Move down"
              onClick={() => edit.onAction(block.id, "down")}
            >
              <ChevronDown size={14} />
            </ToolButton>
            <ToolButton
              label="Duplicate"
              onClick={() => edit.onAction(block.id, "duplicate")}
            >
              <Copy size={14} />
            </ToolButton>
            <ToolButton
              label={block.span === 2 ? "Make half width" : "Make full width"}
              onClick={() => edit.onAction(block.id, "span")}
            >
              {block.span === 2 ? (
                <Minimize2 size={14} />
              ) : (
                <Maximize2 size={14} />
              )}
            </ToolButton>
            <span className="mx-0.5 h-4 w-px bg-[var(--border-primary)]" />
            <ToolButton
              danger
              label="Delete"
              onClick={() => edit.onAction(block.id, "delete")}
            >
              <Trash2 size={14} />
            </ToolButton>
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * The slide surface - title, subtitle and content blocks - rendered in either
 * edit mode (block selection + toolbar) or present mode (clean, interactive).
 */
export function SlideCanvas({
  slide,
  data,
  mode,
  edit,
}: {
  slide: Slide;
  data: ProjectData;
  mode: "edit" | "present";
  edit?: EditConfig;
}) {
  const surface = slideSurface(slide.background);
  const rows = buildRows(slide.blocks);
  const isTitle = slide.blocks.length === 0;
  const interactive = mode === "present";

  return (
    <div
      aria-label={`Slide: ${slide.name}`}
      className={cn(
        "relative w-full overflow-hidden",
        mode === "edit" &&
          "rounded-xl border border-[var(--border-primary)] shadow-[var(--shadow-lg)]"
      )}
      role="region"
      style={
        {
          aspectRatio: "16 / 9",
          background: surface.background,
          color: surface.text,
          containerType: "inline-size",
        } as CSSProperties
      }
    >
      <div className="flex h-full w-full flex-col" style={{ padding: "3.4cqw" }}>
        {/* Header */}
        <div
          className={
            isTitle
              ? "flex flex-1 flex-col items-center justify-center text-center"
              : "shrink-0"
          }
        >
          {isTitle ? (
            <>
              <p
                className="mb-2 font-semibold tracking-[0.2em] uppercase"
                style={{ color: surface.accent, fontSize: "1.5cqw" }}
              >
                EarthIQ
              </p>
              <h1
                className="font-bold leading-tight"
                style={{ fontSize: "5.4cqw", color: surface.text }}
              >
                {slide.title || "Untitled"}
              </h1>
              {slide.subtitle ? (
                <p
                  className="mt-2"
                  style={{ color: surface.sub, fontSize: "2.2cqw" }}
                >
                  {slide.subtitle}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <h2
                className="font-bold leading-tight"
                style={{ fontSize: "3.3cqw", color: surface.text }}
              >
                {slide.title || " "}
              </h2>
              {slide.subtitle ? (
                <p
                  className="mt-1"
                  style={{ color: surface.sub, fontSize: "1.9cqw" }}
                >
                  {slide.subtitle}
                </p>
              ) : null}
              <div
                className="mt-2 h-[0.5cqw] w-[9cqw] rounded-full"
                style={{ background: surface.accent }}
              />
            </>
          )}
        </div>

        {/* Body */}
        {isTitle ? null : (
          <div
            className="mt-3 flex min-h-0 flex-1 flex-col"
            style={{ gap: "2cqw" }}
          >
            {rows.length === 0 ? (
              mode === "edit" ? (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed" style={{ borderColor: surface.divider }}>
                  <p style={{ color: surface.sub, fontSize: "1.8cqw" }}>
                    This slide has no content yet — add blocks on the right.
                  </p>
                </div>
              ) : (
                <div className="flex-1" />
              )
            ) : (
              rows.map((row, ri) => (
                <div
                  key={ri}
                  className="flex min-h-0 flex-1"
                  style={{ gap: "2cqw" }}
                >
                  {row.map((block) => {
                    const flatIndex = slide.blocks.findIndex(
                      (b) => b.id === block.id
                    );
                    return (
                      <BlockCell
                        key={block.id}
                        block={block}
                        canDown={flatIndex < slide.blocks.length - 1}
                        canUp={flatIndex > 0}
                        data={data}
                        edit={mode === "edit" ? edit : undefined}
                        interactive={interactive}
                        surface={surface}
                      />
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}