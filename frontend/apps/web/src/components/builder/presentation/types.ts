/**
 * presentation/types.ts
 * ---------------------
 * Data model + helpers for the project **Presentation** builder.
 *
 * A presentation is a `Deck` of `Slide`s. Each slide has its own title,
 * subtitle, background, speaker notes and an ordered list of content `SlideBlock`s.
 * Blocks are the atomic content units (text, bullets, live map, chart, table,
 * KPI, image) the user composes into a slide - the "insert content" primitive
 * that makes this a real PowerPoint-style surface.
 *
 * The model is plain JSON so a deck serialises to localStorage / export verbatim.
 */
import type { ComponentType } from "react";

import {
  AlignLeft,
  BarChart3,
  Gauge,
  Image as ImageIcon,
  Map as MapIcon,
  Table as TableIcon,
  Type,
} from "lucide-react";

/** An icon component compatible with lucide-react. */
export type IconType = ComponentType<{ size?: number; className?: string }>;

/** The kinds of content a slide can hold. */
export type SlideBlockType =
  | "text"
  | "bullets"
  | "map"
  | "chart"
  | "table"
  | "kpi"
  | "image";

/** Chart rendering style for `chart` blocks. */
export type ChartKind = "bar" | "line" | "area" | "pie";

/**
 * One unit of slide content. Every field is optional except `id`/`type`/`span`;
 * the renderer + inspector only read the fields relevant to the block's `type`.
 */
export interface SlideBlock {
  id: string;
  type: SlideBlockType;
  /** Optional small heading rendered above the block's content. */
  heading?: string;
  /** text: body copy. */
  text?: string;
  /** bullets: one entry per line. */
  bullets?: string[];
  /** map: "project" (the project's own view) or a published map id. */
  mapId?: string;
  /** map: basemap key ("osm" | "esri-satellite" | "opentopomap"). */
  basemap?: string;
  /** map: explicit view (falls back to the chosen map/project view). */
  centerLng?: number;
  centerLat?: number;
  zoom?: number;
  /** chart/table: the dataset to render from. */
  datasetId?: string;
  /** chart: bar | line | area | pie. */
  chartType?: ChartKind;
  /** chart: the numeric column to plot. */
  valueColumn?: string;
  /** chart: the label column for the x-axis / slices. */
  labelColumn?: string;
  /** kpi: the headline number (formatted for display). */
  kpiValue?: string;
  /** kpi: a short caption under the number. */
  kpiLabel?: string;
  /** image: the image URL. */
  imageUrl?: string;
  /** How wide the block spans: 1 = half column, 2 = full width. */
  span: 1 | 2;
}

/** Background treatments a slide can use (theme-independent, like a real deck). */
export type SlideBackground = "light" | "dark" | "brand" | "accent";

export interface Slide {
  id: string;
  /** Short name shown in the slide rail. */
  name: string;
  /** The slide's title (rendered at the top of the slide). */
  title: string;
  subtitle?: string;
  background: SlideBackground;
  blocks: SlideBlock[];
  /** Speaker notes (shown only in present mode). */
  notes?: string;
}

export interface Deck {
  id: string;
  title: string;
  subtitle?: string;
  /** App-level accent for the deck (reserved; slides carry their own surface). */
  theme: "light" | "dark";
  slides: Slide[];
}

/* ── Slide surface palette ────────────────────────────────────────────────────
 * Slide backgrounds are authored content, so they use a fixed, theme-independent
 * palette (a deck should look the same regardless of the app's light/dark theme
 * or in print). The builder *chrome* around the slide still uses design tokens.
 */
export interface SlideSurface {
  background: string;
  text: string;
  sub: string;
  heading: string;
  accent: string;
  divider: string;
  /** True when the surface is dark (used for contrast choices). */
  dark: boolean;
}

const SURFACES: Record<SlideBackground, SlideSurface> = {
  light: {
    background: "#ffffff",
    text: "#0f172a",
    sub: "#475569",
    heading: "#1e40af",
    accent: "#2563eb",
    divider: "#e5e7eb",
    dark: false,
  },
  dark: {
    background: "#0b1220",
    text: "#f1f5f9",
    sub: "#94a3b8",
    heading: "#7dd3fc",
    accent: "#38bdf8",
    divider: "rgba(148,163,184,0.28)",
    dark: true,
  },
  brand: {
    background: "linear-gradient(135deg, #0b1220 0%, #1e3a8a 100%)",
    text: "#f8fafc",
    sub: "#cbd5e1",
    heading: "#93c5fd",
    accent: "#60a5fa",
    divider: "rgba(255,255,255,0.18)",
    dark: true,
  },
  accent: {
    background: "linear-gradient(135deg, #0e7490 0%, #1d4ed8 100%)",
    text: "#f0f9ff",
    sub: "#bae6fd",
    heading: "#e0f2fe",
    accent: "#ffffff",
    divider: "rgba(255,255,255,0.26)",
    dark: true,
  },
};

/** Resolve the surface palette for a slide background id. */
export function slideSurface(id: SlideBackground): SlideSurface {
  return SURFACES[id] ?? SURFACES.light;
}

/** Background swatch metadata for the inspector + palette. */
export const SLIDE_BACKGROUNDS: {
  id: SlideBackground;
  label: string;
  swatch: string;
}[] = [
  { id: "light", label: "Light", swatch: "#ffffff" },
  { id: "dark", label: "Dark", swatch: "#0b1220" },
  {
    id: "brand",
    label: "Brand",
    swatch: "linear-gradient(135deg,#0b1220,#1e3a8a)",
  },
  {
    id: "accent",
    label: "Accent",
    swatch: "linear-gradient(135deg,#0e7490,#1d4ed8)",
  },
];

/* ── Block registry (drives the insert palette + thumbnails) ───────────────── */
export interface BlockDef {
  type: SlideBlockType;
  label: string;
  icon: IconType;
  blurb: string;
  /** Blocks that always sit on their own "widget" surface (map/chart/table/image). */
  widget: boolean;
}

export const BLOCK_DEFS: BlockDef[] = [
  {
    type: "text",
    label: "Text",
    icon: Type,
    blurb: "A paragraph of copy",
    widget: false,
  },
  {
    type: "bullets",
    label: "Bullets",
    icon: AlignLeft,
    blurb: "A bulleted list",
    widget: false,
  },
  {
    type: "map",
    label: "Map",
    icon: MapIcon,
    blurb: "A live map view",
    widget: true,
  },
  {
    type: "chart",
    label: "Chart",
    icon: BarChart3,
    blurb: "A data chart",
    widget: true,
  },
  {
    type: "table",
    label: "Table",
    icon: TableIcon,
    blurb: "A data table",
    widget: true,
  },
  {
    type: "kpi",
    label: "KPI",
    icon: Gauge,
    blurb: "A headline number",
    widget: false,
  },
  {
    type: "image",
    label: "Image",
    icon: ImageIcon,
    blurb: "An image",
    widget: true,
  },
];

export function blockDef(type: SlideBlockType): BlockDef {
  return BLOCK_DEFS.find((b) => b.type === type) ?? BLOCK_DEFS[0];
}

export const CHART_KINDS: { id: ChartKind; label: string }[] = [
  { id: "bar", label: "Bar" },
  { id: "line", label: "Line" },
  { id: "area", label: "Area" },
  { id: "pie", label: "Pie" },
];

export const BASEMAP_OPTIONS: { id: string; label: string }[] = [
  { id: "osm", label: "Streets" },
  { id: "opentopomap", label: "Topo" },
  { id: "esri-satellite", label: "Satellite" },
];

/* ── Factories ──────────────────────────────────────────────────────────────── */
let counter = 0;
/** Small, collision-resistant id (client-only, no crypto needed). */
export function uid(prefix = "id"): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

/** A fresh block with sensible starter content for its type. */
export function makeBlock(type: SlideBlockType): SlideBlock {
  const base: SlideBlock = { id: uid("blk"), type, span: 1 };
  switch (type) {
    case "text":
      return {
        ...base,
        text: "Click a block to edit it on the right. Replace this with a key idea, a finding, or a takeaway for this slide.",
      };
    case "bullets":
      return {
        ...base,
        bullets: [
          "First key point for the audience",
          "Second key point with a number",
          "Third point that drives to action",
        ],
      };
    case "map":
      return { ...base, mapId: "project", basemap: "osm" };
    case "chart":
      return { ...base, chartType: "bar" };
    case "table":
      return { ...base };
    case "kpi":
      return { ...base, kpiValue: "42%", kpiLabel: "Headline metric" };
    case "image":
      return { ...base };
  }
}

/** A fresh slide. */
export function makeSlide(
  overrides: Partial<Omit<Slide, "id">> = {}
): Slide {
  return {
    id: uid("slide"),
    name: "Slide",
    title: "New slide",
    subtitle: "",
    background: "light",
    blocks: [],
    ...overrides,
  };
}

/** A starter deck: a title slide + a content slide. */
export function defaultDeck(projectTitle?: string): Deck {
  const title = projectTitle?.trim() || "Untitled presentation";
  return {
    id: uid("deck"),
    title,
    subtitle: "A presentation built from this project's maps and data.",
    theme: "light",
    slides: [
      makeSlide({
        name: "Title",
        title,
        subtitle: "Presented with EarthIQ",
        background: "brand",
      }),
      makeSlide({
        name: "Overview",
        title: "Overview",
        subtitle: "What this project covers",
        blocks: [makeBlock("text"), makeBlock("map")],
      }),
    ],
  };
}