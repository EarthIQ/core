/**
 * storymap/types.ts
 * -----------------
 * Data model + helpers for the project **Story Map** builder.
 *
 * A story map is a `StoryMap` (title + ordered `StoryScene`s). A scene is one
 * "beat" of the narrative: a heading, a layout (how text and map are arranged)
 * and an ordered list of `StoryBlock`s (text, key points, live map, image, KPI,
 * quote). Everything is plain JSON so a story serialises verbatim to
 * localStorage and into a self-contained share link (see share.ts).
 */
import {
  AlignLeft,
  AlignStartVertical,
  Gauge,
  Image as ImageIcon,
  ListChecks,
  Map as MapIcon,
  PanelLeft,
  PanelRight,
  Quote,
  Rows2,
} from "lucide-react";

import type { ComponentType } from "react";

/** An icon component compatible with lucide-react icons. */
export type IconType = ComponentType<{ size?: number; className?: string }>;

/** The kinds of content a scene can hold. */
export type StoryBlockType =
  "text" | "keyPoints" | "map" | "image" | "kpi" | "quote";

/**
 * One unit of scene content. All fields are optional except `id`/`type`; the
 * renderer and inspector only read the fields relevant to the block's `type`.
 */
export interface StoryBlock {
  id: string;
  type: StoryBlockType;
  /** Optional small heading rendered above the block's content. */
  heading?: string;
  /** text: body copy. */
  text?: string;
  /** keyPoints: one entry per bullet. */
  bullets?: string[];
  /** map: "project" (the project's own view) or a published map id. */
  mapId?: string;
  /** map: basemap key ("osm" | "opentopomap" | "esri-satellite"). */
  basemap?: string;
  /** map: explicit view (falls back to the referenced map/project view). */
  centerLng?: number;
  centerLat?: number;
  zoom?: number;
  /** image: the image URL. */
  imageUrl?: string;
  /** image: caption shown under the image. */
  imageCaption?: string;
  /** kpi: the headline number (formatted for display). */
  kpiValue?: string;
  /** kpi: a short caption under the number. */
  kpiLabel?: string;
  /** quote: the quoted lines. */
  quoteText?: string;
  /** quote: who said it. */
  quoteAttribution?: string;
  /**
   * Inlined snapshot of the vector layers of the map this block shows
   * (written when the story is shared, so the public viewer can render
   * the data without access to the project).
   */
  layersSnapshot?: Array<{
    datasetId: string;
    name?: string;
    geometryType?: string;
  }>;
}

/** How a scene arranges its narrative vs. its map. */
export type SceneLayout = "split-left" | "split-right" | "map-top" | "stacked";

export interface StoryScene {
  id: string;
  /** Short name shown in the scene rail. */
  name: string;
  /** The scene's title (rendered at the top of the scene). */
  title: string;
  subtitle?: string;
  layout: SceneLayout;
  blocks: StoryBlock[];
}

export interface StoryMap {
  id: string;
  title: string;
  subtitle?: string;
  /** Optional byline shown on the public viewer. */
  author?: string;
  scenes: StoryScene[];
  updatedAt: string;
}

/** The persisted library: every story map for a project + the active one. */
export interface StoryLibrary {
  stories: StoryMap[];
  activeId: string;
}

/* ── Options ─────────────────────────────────────────────────────────────── */

export interface LayoutDef {
  id: SceneLayout;
  label: string;
  icon: IconType;
  blurb: string;
}

export const LAYOUT_OPTIONS: LayoutDef[] = [
  {
    id: "split-left",
    label: "Text · Map",
    icon: PanelLeft,
    blurb: "Narrative beside the map",
  },
  {
    id: "split-right",
    label: "Map · Text",
    icon: PanelRight,
    blurb: "Map beside the narrative",
  },
  {
    id: "map-top",
    label: "Map on top",
    icon: AlignStartVertical,
    blurb: "Map above the narrative",
  },
  {
    id: "stacked",
    label: "Stacked",
    icon: Rows2,
    blurb: "Blocks flow top to bottom",
  },
];

export function layoutDef(id: SceneLayout): LayoutDef {
  return LAYOUT_OPTIONS.find((l) => l.id === id) ?? LAYOUT_OPTIONS[0];
}

export interface BlockDef {
  type: StoryBlockType;
  label: string;
  icon: IconType;
  blurb: string;
}

export const BLOCK_DEFS: BlockDef[] = [
  { type: "text", label: "Text", icon: AlignLeft, blurb: "Narrative copy" },
  {
    type: "keyPoints",
    label: "Key points",
    icon: ListChecks,
    blurb: "A short list",
  },
  { type: "map", label: "Map", icon: MapIcon, blurb: "A live map view" },
  { type: "image", label: "Image", icon: ImageIcon, blurb: "An image" },
  { type: "kpi", label: "KPI", icon: Gauge, blurb: "A headline number" },
  { type: "quote", label: "Quote", icon: Quote, blurb: "A highlighted quote" },
];

export function blockDef(type: StoryBlockType): BlockDef {
  return BLOCK_DEFS.find((b) => b.type === type) ?? BLOCK_DEFS[0];
}

export const BASEMAP_OPTIONS: { id: string; label: string }[] = [
  { id: "osm", label: "Streets" },
  { id: "opentopomap", label: "Topo" },
  { id: "esri-satellite", label: "Satellite" },
];

/* ── Factories ───────────────────────────────────────────────────────────── */

let counter = 0;
/** Small, collision-resistant id (client-only, no crypto needed). */
export function uid(prefix = "id"): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

/** A fresh block with sensible starter content for its type. */
export function makeBlock(type: StoryBlockType): StoryBlock {
  const base: StoryBlock = { id: uid("blk"), type };
  switch (type) {
    case "text":
      return {
        ...base,
        text: "Tell this part of the story here - what happens, why it matters, what the map is about to show.",
      };
    case "keyPoints":
      return {
        ...base,
        bullets: [
          "First key point for the audience",
          "Second point with a number",
        ],
      };
    case "map":
      return { ...base, mapId: "project", basemap: "osm" };
    case "image":
      return { ...base, imageUrl: "", imageCaption: "" };
    case "kpi":
      return { ...base, kpiValue: "42%", kpiLabel: "Headline metric" };
    case "quote":
      return {
        ...base,
        quoteText:
          "A quote from a resident, an official, or a source that gives this scene a voice.",
        quoteAttribution: "",
      };
  }
}

/** A fresh scene. */
export function makeScene(
  overrides: Partial<Omit<StoryScene, "id">> = {}
): StoryScene {
  return {
    id: uid("scene"),
    name: "Scene",
    title: "New scene",
    subtitle: "",
    layout: "split-left",
    blocks: [],
    ...overrides,
  };
}

/** A starter story: an intro, a map-first scene and a takeaways close. */
export function defaultStory(projectTitle?: string): StoryMap {
  const title = projectTitle?.trim() || "Untitled story";
  return {
    id: uid("story"),
    title,
    subtitle: "A guided journey through this project's maps and data.",
    author: "",
    scenes: [
      makeScene({
        name: "Introduction",
        title,
        subtitle: "Why this story matters",
        layout: "split-left",
        blocks: [makeBlock("text"), makeBlock("keyPoints"), makeBlock("map")],
      }),
      makeScene({
        name: "Key numbers",
        title: "The numbers that matter",
        subtitle: "A quick snapshot before the detail",
        layout: "map-top",
        blocks: [makeBlock("kpi"), makeBlock("map")],
      }),
      makeScene({
        name: "Takeaways",
        title: "What comes next",
        subtitle: "Close the story with a clear next step",
        layout: "stacked",
        blocks: [makeBlock("quote"), makeBlock("text")],
      }),
    ],
    updatedAt: new Date().toISOString(),
  };
}
