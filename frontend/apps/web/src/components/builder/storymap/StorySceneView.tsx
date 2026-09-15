/**
 * storymap/StorySceneView.tsx
 * ---------------------------
 * Shared renderer for one scene of a story map. Used by the editor canvas
 * (`mode="edit"`), preview mode (`mode="present"`) and the public viewer
 * (`mode="present"`), so what is authored is exactly what is shared.
 *
 *  - edit: blocks stack in a readable column; clicking a block selects it
 *    (the inspector edits it) and reveals a small action toolbar.
 *  - present: the scene's `layout` arranges the narrative beside/above the
 *    map (split-left, split-right, map-top, stacked); maps stay interactive.
 *
 * Maps render through the `@packages/map` primitive with the inline basemap
 * styles + best-effort vector layers (same approach as the presentation
 * builder), and use block-level view data first so shared stories are
 * self-contained.
 */
import { Map as MapCanvas } from "@packages/map";
import { cn } from "@packages/ui";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ImageOff,
  Map as MapIcon,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { BASEMAP_STYLES } from "@/hooks/useMapLibre";
import { getVectorTileUrl } from "@/lib/datasets";

import { blockDef, layoutDef, type StoryBlock, type StoryScene } from "./types";

import type { MapLayerItem } from "@/lib/maps";

/** The source material a scene can draw map views from (project + its maps). */
export interface SceneData {
  maps: Array<{
    id: string;
    center_lng?: number;
    center_lat?: number;
    zoom?: number;
    basemap?: string;
    layers_config?: MapLayerItem[];
  }>;
  project?: {
    center_lng?: number;
    center_lat?: number;
    zoom?: number;
    basemap?: string;
    layers_config?: MapLayerItem[];
  } | null;
}

export type BlockAction = "up" | "down" | "duplicate" | "delete";

export interface EditConfig {
  selectedBlockId: string | null;
  onSelect: (id: string) => void;
  onAction: (blockId: string, action: BlockAction) => void;
}

/* ── Small shared bits ────────────────────────────────────────────────────── */

/** A "fill this in" hint shown inside a widget that has no data yet. */
const WidgetHint = ({
  icon: Icon,
  label,
  sub,
}: {
  icon: typeof MapIcon;
  label: string;
  sub?: string;
}) => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-hover)] text-[var(--text-tertiary)]">
        <Icon size={18} />
      </span>
      <p className="text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </p>
      {sub ? (
        <p className="max-w-[16rem] text-[0.7rem] leading-snug text-[var(--text-tertiary)]">
          {sub}
        </p>
      ) : null}
    </div>
  );
};

/** Add a dataset's vector-tile layer to a loaded map (best-effort). */
function addVectorLayers(map: any, layers: MapLayerItem[]) {
  for (const layer of layers) {
    if (!layer.datasetId) continue;
    const srcId = `story-src-${layer.datasetId}`;
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

/** A live map view. Block-level data wins, then the referenced map, then the project. */
const StoryMapBlock = ({
  block,
  data,
  interactive,
}: {
  block: StoryBlock;
  data?: SceneData | null;
  interactive: boolean;
}) => {
  const map =
    block.mapId && block.mapId !== "project"
      ? data?.maps.find((m) => m.id === block.mapId)
      : undefined;
  const center =
    block.centerLng ?? map?.center_lng ?? data?.project?.center_lng;
  const lat = block.centerLat ?? map?.center_lat ?? data?.project?.center_lat;
  const zoom = block.zoom ?? map?.zoom ?? data?.project?.zoom ?? 3;
  const basemap =
    block.basemap ?? map?.basemap ?? data?.project?.basemap ?? "osm";

  if (center == null || lat == null) {
    return (
      <div className="h-full w-full bg-[var(--bg-tertiary)]">
        <WidgetHint
          icon={MapIcon}
          label="No map view"
          sub="Pick a map source in the inspector, or use the project view"
        />
      </div>
    );
  }

  const layers: MapLayerItem[] = block.layersSnapshot?.length
    ? block.layersSnapshot.map((s) => ({
        id: s.datasetId,
        datasetId: s.datasetId,
        name: s.name,
        geometryType: s.geometryType,
        type: "vector" as const,
      }))
    : (map?.layers_config ?? data?.project?.layers_config ?? []);

  const styles = BASEMAP_STYLES;
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
};

/* ── Content block renderers (shared by edit + present) ──────────────────── */

const BlockHeading = ({ block }: { block: StoryBlock }) => {
  if (!block.heading) return null;
  return (
    <p className="text-xs font-semibold tracking-wider text-[var(--text-tertiary)] uppercase">
      {block.heading}
    </p>
  );
};

const TextBlock = ({ block }: { block: StoryBlock }) => {
  return (
    <div className="space-y-2">
      <BlockHeading block={block} />
      {block.text ? (
        <p className="text-[0.95rem] leading-relaxed whitespace-pre-wrap text-[var(--text-primary)]">
          {block.text}
        </p>
      ) : (
        <p className="text-sm text-[var(--text-tertiary)]">
          No text yet - select this block and write on the right.
        </p>
      )}
    </div>
  );
};

const KeyPointsBlock = ({ block }: { block: StoryBlock }) => {
  const items = block.bullets?.filter((b) => b.trim()) ?? [];
  return (
    <div className="space-y-2">
      <BlockHeading block={block} />
      {items.length ? (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[0.9rem] leading-snug text-[var(--text-primary)]"
            >
              <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                <Check size={11} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--text-tertiary)]">
          No key points yet - add them on the right.
        </p>
      )}
    </div>
  );
};

const KpiBlock = ({ block }: { block: StoryBlock }) => {
  return (
    <div className="space-y-1.5">
      <BlockHeading block={block} />
      <p className="text-5xl leading-none font-bold text-[var(--primary)] tabular-nums">
        {block.kpiValue || "—"}
      </p>
      {block.kpiLabel ? (
        <p className="text-sm text-[var(--text-secondary)]">{block.kpiLabel}</p>
      ) : null}
    </div>
  );
};

const QuoteBlock = ({ block }: { block: StoryBlock }) => {
  if (!block.quoteText) {
    return (
      <p className="text-sm text-[var(--text-tertiary)]">
        No quote yet - select this block and add one on the right.
      </p>
    );
  }
  return (
    <blockquote className="border-l-2 border-[var(--primary)] pl-4">
      <p className="text-[1.05rem] leading-relaxed text-[var(--text-primary)] italic">
        “{block.quoteText}”
      </p>
      {block.quoteAttribution ? (
        <footer className="mt-2 text-sm text-[var(--text-secondary)]">
          — {block.quoteAttribution}
        </footer>
      ) : null}
    </blockquote>
  );
};

const ImageBlock = ({ block }: { block: StoryBlock }) => {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [block.imageUrl]);
  if (!block.imageUrl || broken) {
    return (
      <div className="flex h-52 items-center justify-center rounded-lg bg-[var(--bg-tertiary)]">
        <WidgetHint
          icon={ImageOff}
          label="No image yet"
          sub="Add an image URL in the inspector"
        />
      </div>
    );
  }
  return (
    <figure className="space-y-1.5">
      <img
        alt={block.imageCaption || block.heading || "Story image"}
        className="max-h-[28rem] w-full rounded-lg object-cover"
        draggable={false}
        src={block.imageUrl}
        onError={() => setBroken(true)}
      />
      {block.imageCaption ? (
        <figcaption className="text-xs text-[var(--text-tertiary)]">
          {block.imageCaption}
        </figcaption>
      ) : null}
    </figure>
  );
};

/** Render one block's content regardless of type. */
function renderBlockContent(
  block: StoryBlock,
  data: SceneData | null | undefined,
  interactive: boolean
) {
  switch (block.type) {
    case "text":
      return <TextBlock block={block} />;
    case "keyPoints":
      return <KeyPointsBlock block={block} />;
    case "kpi":
      return <KpiBlock block={block} />;
    case "quote":
      return <QuoteBlock block={block} />;
    case "image":
      return <ImageBlock block={block} />;
    case "map":
      return (
        <div className="h-full w-full">
          <StoryMapBlock
            block={block}
            data={data}
            interactive={interactive}
          />
        </div>
      );
    default:
      return null;
  }
}

/* ── Edit-mode block cell ─────────────────────────────────────────────────── */

const ToolButton = ({
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
}) => {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      title={label}
      type="button"
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        danger
          ? "text-[var(--error-text)] hover:bg-[var(--error-bg)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
        disabled && "pointer-events-none opacity-40"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
};

/** One block in the editor canvas: selectable, with an action toolbar. */
const BlockCell = ({
  block,
  data,
  index,
  total,
  edit,
}: {
  block: StoryBlock;
  data?: SceneData | null;
  index: number;
  total: number;
  edit?: EditConfig;
}) => {
  const def = blockDef(block.type);
  const Icon = def.icon;
  const selected = edit?.selectedBlockId === block.id;

  function act(action: BlockAction) {
    edit?.onAction(block.id, action);
  }

  return (
    <div
      aria-pressed={selected}
      role="button"
      tabIndex={0}
      className={cn(
        "relative rounded-xl border bg-[var(--bg-elevated)] transition-colors",
        selected
          ? "border-[var(--border-focus)] ring-2 ring-[var(--primary)]/20"
          : "border-[var(--border-primary)] hover:border-[var(--border-hover)]"
      )}
      onClick={() => edit?.onSelect(block.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          edit?.onSelect(block.id);
        }
      }}
    >
      <div className="flex items-center gap-2 px-4 pt-2.5">
        <Icon
          className="text-[var(--text-tertiary)]"
          size={14}
        />
        <span className="text-xs font-medium text-[var(--text-tertiary)]">
          {def.label}
        </span>
      </div>
      <div className="px-4 py-3">
        {block.type === "map" ? (
          <div className="h-64 overflow-hidden rounded-lg">
            {renderBlockContent(block, data, false)}
          </div>
        ) : (
          renderBlockContent(block, data, false)
        )}
      </div>

      {selected ? (
        <div className="absolute -top-3 right-3 flex items-center gap-0.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-0.5 shadow-md">
          <ToolButton
            disabled={index === 0}
            label="Move block up"
            onClick={() => act("up")}
          >
            <ChevronUp size={14} />
          </ToolButton>
          <ToolButton
            disabled={index === total - 1}
            label="Move block down"
            onClick={() => act("down")}
          >
            <ChevronDown size={14} />
          </ToolButton>
          <ToolButton
            label="Duplicate block"
            onClick={() => act("duplicate")}
          >
            <Copy size={14} />
          </ToolButton>
          <ToolButton
            danger
            label="Delete block"
            onClick={() => act("delete")}
          >
            <Trash2 size={14} />
          </ToolButton>
        </div>
      ) : null}
    </div>
  );
};

/* ── Scene header (present mode) ─────────────────────────────────────────── */

const SceneHeader = ({
  scene,
  index,
  total,
  compact = false,
}: {
  scene: StoryScene;
  index: number;
  total: number;
  compact?: boolean;
}) => {
  return (
    <div className="shrink-0">
      <p className="text-xs font-semibold tracking-wider text-[var(--text-tertiary)] uppercase">
        Scene {index + 1} of {total}
      </p>
      <h2
        className={cn(
          "mt-1 leading-tight font-bold text-[var(--text-primary)]",
          compact ? "text-xl" : "text-2xl"
        )}
      >
        {scene.title || " "}
      </h2>
      {scene.subtitle ? (
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          {scene.subtitle}
        </p>
      ) : null}
      <div className="mt-3 h-0.5 w-10 rounded-full bg-[var(--primary)]" />
    </div>
  );
};

/* ── The shared scene view ───────────────────────────────────────────────── */

export interface StorySceneViewProps {
  scene: StoryScene;
  /** 0-based index of this scene within the story. */
  index: number;
  total: number;
  /** Project + maps data (optional for self-contained shared stories). */
  data?: SceneData | null;
  mode: "edit" | "present";
  /** Edit mode only: selection + per-block actions. */
  edit?: EditConfig;
  className?: string;
}

/**
 * Renders one scene. In edit mode it is a single selectable column (the
 * inspector carries the field editing); in present mode the scene's layout
 * arranges the narrative around its map.
 */
export const StorySceneView = ({
  scene,
  index,
  total,
  data,
  mode,
  edit,
  className,
}: StorySceneViewProps) => {
  /* ── Edit mode: readable column + selectable blocks ─────────────────── */
  if (mode === "edit") {
    const layout = layoutDef(scene.layout);
    const LayoutIcon = layout.icon;
    return (
      <div className={cn("flex h-full flex-col gap-4", className)}>
        <header className="flex shrink-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wider text-[var(--text-tertiary)] uppercase">
              Scene {index + 1} of {total} · {scene.name}
            </p>
            <h2 className="mt-1 truncate text-2xl font-bold text-[var(--text-primary)]">
              {scene.title || "Untitled scene"}
            </h2>
            {scene.subtitle ? (
              <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                {scene.subtitle}
              </p>
            ) : null}
          </div>
          <span
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
            title={layout.blurb}
          >
            <LayoutIcon size={13} />
            {layout.label}
          </span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {scene.blocks.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-primary)] py-12 text-center">
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                This scene is empty
              </p>
              <p className="mt-1 max-w-xs text-xs leading-snug text-[var(--text-tertiary)]">
                Add text, key points, a map, an image, a KPI or a quote from the
                “Add content” panel on the right.
              </p>
            </div>
          ) : (
            scene.blocks.map((block, i) => (
              <BlockCell
                key={block.id}
                block={block}
                data={data}
                edit={edit}
                index={i}
                total={scene.blocks.length}
              />
            ))
          )}
        </div>
      </div>
    );
  }
  /* ── Present mode: apply the scene's layout ──────────────────────────── */
  const maps = scene.blocks.filter((b) => b.type === "map");
  const others = scene.blocks.filter((b) => b.type !== "map");

  const textPane = (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      {others.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">
          No narrative for this scene yet.
        </p>
      ) : null}
      {others.map((b) => (
        <div
          key={b.id}
          className="min-w-0 shrink-0"
        >
          {renderBlockContent(b, data, true)}
        </div>
      ))}
    </div>
  );

  const mapPane = (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-xl border border-[var(--border-primary)] p-2">
      {maps.length === 0 ? (
        <div className="flex-1">
          <WidgetHint
            icon={MapIcon}
            label="No map in this scene"
            sub="Add a map block to give this scene a place"
          />
        </div>
      ) : (
        maps.map((b, i) => (
          <div
            key={b.id}
            className={cn(
              "min-h-0 overflow-hidden rounded-lg",
              i === 0 ? "flex-1" : "h-56 shrink-0"
            )}
          >
            {renderBlockContent(b, data, true)}
          </div>
        ))
      )}
    </div>
  );

  let body: React.ReactNode;
  if (scene.layout === "split-left") {
    body = (
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
        {textPane}
        {mapPane}
      </div>
    );
  } else if (scene.layout === "split-right") {
    body = (
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
        {mapPane}
        {textPane}
      </div>
    );
  } else if (scene.layout === "map-top") {
    body = (
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="h-[52%] min-h-[220px] shrink-0">{mapPane}</div>
        {textPane}
      </div>
    );
  } else {
    /* stacked: blocks flow in authored order */
    body = (
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {scene.blocks.length === 0 ? (
          <div className="flex-1 py-8">
            <WidgetHint
              icon={MapIcon}
              label="This scene is empty"
              sub="Add content to tell this part of the story"
            />
          </div>
        ) : (
          scene.blocks.map((b) =>
            b.type === "map" ? (
              <div
                key={b.id}
                className="h-[46vh] min-h-[240px] shrink-0 overflow-hidden rounded-xl border border-[var(--border-primary)]"
              >
                {renderBlockContent(b, data, true)}
              </div>
            ) : (
              <div
                key={b.id}
                className="shrink-0"
              >
                {renderBlockContent(b, data, true)}
              </div>
            )
          )
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-4", className)}>
      <SceneHeader
        compact
        index={index}
        scene={scene}
        total={total}
      />
      {body}
    </div>
  );
};
