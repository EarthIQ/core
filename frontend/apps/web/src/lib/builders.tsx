/**
 * Project Builder Registry
 *
 * EarthIQ projects expose several "builders" — rich, project-scoped editors and
 * authoring surfaces. The **Map** builder is the classic map editor that already
 * lives at `/map`. The rest (Story Map, Presentation, Report, Forms) are new
 * buildable surfaces that share the same project context (read via `?projectId=`).
 *
 * This module is intentionally **data-driven**: every builder is declared here
 * once. The top bar picker (`BuilderPicker`), the page scaffold
 * (`BuilderScaffold`) and the app router all render from `BUILDERS`, so adding a
 * future builder means:
 *
 *   1. Create the page component (mirror the existing pages in `pages/builders/`).
 *   2. Add one entry to `BUILDERS` below with a unique `id`, `slug`, `path` and
 *      `page`.
 *   3. Done — the picker, router and scaffolding pick it up automatically.
 *
 * Nothing in the shell hard-codes a builder name except this file.
 */
import type { ComponentType } from "react";
import {
  Map,
  BookOpen,
  Presentation,
  FileText,
  ClipboardList,
} from "lucide-react";
import MapPage from "@/pages/MapPage";
import StoryMapBuilderPage from "@/pages/builders/StoryMapBuilderPage";
import PresentationBuilderPage from "@/pages/builders/PresentationBuilderPage";
import ReportBuilderPage from "@/pages/builders/ReportBuilderPage";
import FormsBuilderPage from "@/pages/builders/FormsBuilderPage";

/**
 * A constructor/icon component compatible with lucide-react icons.
 * Custom inline SVG components also work as long as they accept size/className.
 */
export type BuilderIcon = ComponentType<{ size?: number; className?: string }>;

/**
 * Any page a builder mounts must read `projectId` from the URL query params
 * itself — identical to how `MapPage` reads `?projectId=` from `useSearchParams`.
 */
export type BuilderPage = ComponentType;

export interface ProjectBuilder {
  /** Stable, unique machine id (e.g. "map", "story-map"). */
  id: string;
  /** URL-safe segment used in the builder route path. */
  slug: string;
  /** Human-friendly label shown in picker + page header. */
  label: string;
  /** One-line pitch shown under the label in the picker. */
  description: string;
  /** Icon used in the picker row + page header. */
  icon: BuilderIcon;
  /**
   * Route the builder is mounted at — WITHOUT a leading slash
   * (e.g. "map" or "builder/story-map"). Matches how `App.tsx` declares routes.
   */
  path: string;
  /** Page rendered at `path`. Reads `?projectId=` from the URL itself. */
  page: BuilderPage;
  /** Optional Tailwind classes to tint the icon chip (accent colour). */
  iconClassName?: string;
  /** Optional capability/feature-flag key for future per-builder gating. */
  capability?: string;
  /**
   * Extra query params appended when this builder is opened from the picker.
   * Lets a builder land directly on a specific view — e.g. the Map builder
   * opens with the published maps panel (`{ panel: "published" }`).
   */
  openParams?: Record<string, string>;
  /**
   * When `false` the builder is hidden from pickers and not routed.
   * Lets us ship disabled placeholders without removing code.
   */
  enabled: boolean;
}

/**
 * The built-in project builders.
 *
 * NOTE: `MapPage` is the existing map builder — it is NOT a placeholder. The
 * remaining four ship with a scaffold shell so they can be developed further
 * (each already has its own page file under `pages/builders/`).
 */
export const BUILDERS: ProjectBuilder[] = [
  {
    id: "map",
    slug: "map",
    label: "Map",
    description: "Interactive map builder with layers, annotations and tools.",
    icon: Map,
    path: "map",
    page: MapPage,
    openParams: { panel: "published" },
    enabled: true,
  },
  {
    id: "story-map",
    slug: "story-map",
    label: "Story Map",
    description: "Narrative-driven journeys that walk through your maps.",
    icon: BookOpen,
    path: "builder/story-map",
    page: StoryMapBuilderPage,
    iconClassName: "text-accent bg-accent/10",
    capability: "story-map",
    enabled: true,
  },
  {
    id: "presentation",
    slug: "presentation",
    label: "Map Presentation",
    description: "Slide-based presentations powered by your maps and data.",
    icon: Presentation,
    path: "builder/presentation",
    page: PresentationBuilderPage,
    iconClassName: "text-warning bg-warning/10",
    capability: "map-presentation",
    enabled: true,
  },
  {
    id: "report",
    slug: "report",
    label: "Report builder",
    description: "Assemble maps and project data into PDF-ready reports.",
    icon: FileText,
    path: "builder/report",
    page: ReportBuilderPage,
    iconClassName: "text-success bg-success/10",
    capability: "report",
    enabled: true,
  },
  {
    id: "forms",
    slug: "forms",
    label: "Forms",
    description: "Design dynamic forms and collect data on the project.",
    icon: ClipboardList,
    path: "builder/forms",
    page: FormsBuilderPage,
    iconClassName: "text-info bg-info/10",
    capability: "forms",
    enabled: true,
  },
];

/** Builders that are currently visible/routable. */
export const ENABLED_BUILDERS: ProjectBuilder[] = BUILDERS.filter(
  (b) => b.enabled,
);

/** Look up a builder by its stable id. */
export function getProjectBuilder(
  builderId: string,
): ProjectBuilder | undefined {
  return BUILDERS.find((b) => b.id === builderId);
}

/** Look up a builder by its URL route path (e.g. "builder/story-map"). */
export function getProjectBuilderByPath(
  path: string,
): ProjectBuilder | undefined {
  return BUILDERS.find((b) => b.path === path.replace(/^\//, ""));
}

/**
 * Build the absolute URL for a builder scoped to a project.
 * Example: buildBuilderUrl("story-map", "p1") -> "/builder/story-map?projectId=p1"
 *          buildBuilderUrl("map", "p1")         -> "/map?projectId=p1"
 * Extra params (e.g. leading a builder straight to a panel) are appended:
 *          buildBuilderUrl("map", "p1", { panel: "published" })
 *             -> "/map?projectId=p1&panel=published"
 */
export function buildBuilderUrl(
  builderId: string,
  projectId?: string | null,
  extraParams?: Record<string, string>,
): string {
  const builder = getProjectBuilder(builderId);
  // Safety net: NEVER fall back to the projects list. Even an unknown builder
  // id should still resolve to the map builder (scoped to this project when
  // available) so a click can never "take the user to the project list".
  const base = builder ? `/${builder.path}` : "/map";
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}