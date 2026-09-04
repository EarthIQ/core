/**
 * EarthIQ Core — Map Toolbox contract + module discovery
 *
 * This file is the single source of truth for the **optional** tool contract
 * that modules may follow to surface tools in the core Map → Toolbox panel.
 * The core shell contains NO module names: it walks the enabled modules
 * (from /api/v1/modules ∩ the auto-generated moduleRegistry), imports each
 * bundle, and picks up a valid `tools` export when present.
 *
 * ── Module contract (what a module must do to appear here) ─────────────────
 * A module's frontend entry (`modules/<name>-module/frontend/src/index.ts`)
 * MAY export:
 *
 *   export const tools: ModuleTool[] = [ ... ];
 *   // or a promise of an array (e.g. built from the module's own API):
 *   export const tools: Promise<ModuleTool[]> = fetchCatalog().then(toTools);
 *
 * Each entry is validated with `isModuleTool` below; invalid entries are
 * skipped (with a console warning) and never rendered.
 */
import { useEffect, useState } from "react";
import { api } from "./api";
import type { ModuleInfo } from "./modules";
import { moduleRegistry } from "../module-registry.generated";

/* ──────────────────────────────────────────────────────────────────────── */
/*  Contract types                                                           */
/* ──────────────────────────────────────────────────────────────────────── */

export type ToolInputType =
  | "text"
  | "textarea"
  | "number"
  | "integer"
  | "select"
  | "boolean";

export interface ToolInput {
  /** Key under which the value is passed to `run`. */
  key: string;
  /** Human-readable label (falls back to the key). */
  label?: string;
  /** Helper text shown under the field. */
  description?: string;
  type: ToolInputType;
  required?: boolean;
  /** Initial value (coerced per type by the panel). */
  default?: unknown;
  /** Allowed values — required for `type: "select"`. */
  options?: string[];
}

/** Snapshot of the live map, passed to every tool run. */
export interface ToolMapState {
  /** [lng, lat] of the map center. */
  center: [number, number];
  zoom: number;
  /** [west, south, east, north] of the current viewport. */
  bounds: [number, number, number, number];
  basemap: string;
  layers: { id: string; name: string; visible: boolean }[];
}

/** Context the core hands to a tool's `run`. */
export interface ToolRunContext {
  /** Authenticated core API client (same as `lib/api`). */
  api: typeof api;
  /** Live map state (undefined when the map isn't ready). */
  map?: ToolMapState;
}

/** One tool a module exposes to the core Map Toolbox. */
export interface ModuleTool {
  /** Unique id (the core de-dupes across modules). */
  id: string;
  label: string;
  /** Grouping used by the Toolbox panel (e.g. "Hydrology", "Urban Planning"). */
  category: string;
  description?: string;
  /** Emoji, or a known lucide icon name (e.g. "sparkles"). */
  icon?: string;
  inputs?: ToolInput[];
  /** The process: run the tool with the collected inputs. */
  run: (
    inputs: Record<string, unknown>,
    ctx: ToolRunContext,
  ) => Promise<unknown> | unknown;
}

/** A tool resolved with the module it came from. */
export interface ResolvedTool extends ModuleTool {
  moduleName: string;
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Validation — "the specific condition" for a tool to be accepted          */
/* ──────────────────────────────────────────────────────────────────────── */

const INPUT_TYPES: ToolInputType[] = [
  "text",
  "textarea",
  "number",
  "integer",
  "select",
  "boolean",
];

export function isToolInput(value: unknown): value is ToolInput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.key !== "string" || v.key.trim().length === 0) return false;
  if (!INPUT_TYPES.includes(v.type as ToolInputType)) return false;
  if (v.label !== undefined && typeof v.label !== "string") return false;
  if (v.description !== undefined && typeof v.description !== "string") return false;
  if (v.options !== undefined && !Array.isArray(v.options)) return false;
  if (v.type === "select" && (!Array.isArray(v.options) || v.options.length === 0))
    return false;
  return true;
}

/**
 * A valid tool is a plain object with:
 *  - `id`, `label`, `category`: non-empty strings
 *  - `description` / `icon`: optional strings
 *  - `inputs`: optional array of valid ToolInput
 *  - `run`: a function
 */
export function isModuleTool(value: unknown): value is ModuleTool {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || v.id.trim().length === 0) return false;
  if (typeof v.label !== "string" || v.label.trim().length === 0) return false;
  if (typeof v.category !== "string" || v.category.trim().length === 0) return false;
  if (v.description !== undefined && typeof v.description !== "string") return false;
  if (v.icon !== undefined && typeof v.icon !== "string") return false;
  if (
    v.inputs !== undefined &&
    (!Array.isArray(v.inputs) || !v.inputs.every(isToolInput))
  )
    return false;
  if (typeof v.run !== "function") return false;
  return true;
}


/* ──────────────────────────────────────────────────────────────────────── */
/*  Discovery — find tools across all enabled modules (no names hardcoded)   */
/* ──────────────────────────────────────────────────────────────────────── */

let _toolsCache: ResolvedTool[] | null = null;
let _toolsPromise: Promise<ResolvedTool[]> | null = null;

async function collectModuleTools(): Promise<ResolvedTool[]> {
  if (_toolsPromise) return _toolsPromise;

  _toolsPromise = (async () => {
    const modules = await api.get<ModuleInfo[]>("/api/v1/modules");
    const tools: ResolvedTool[] = [];
    const seenIds = new Set<string>();

    for (const mod of modules) {
      if (!mod.enabled) continue;
      const loader = moduleRegistry[mod.name];
      if (!loader) continue; // installed server-side but no frontend bundle

      let bundle: { tools?: unknown } | null;
      try {
        bundle = (await loader()) as { tools?: unknown } | null;
      } catch (err) {
        console.warn(`[toolbox] failed to import module '${mod.name}':`, err);
        continue;
      }

      // Modules without a `tools` export are skipped — the core never needs
      // to know about individual modules.
      if (!bundle || bundle.tools === undefined || bundle.tools === null) {
        continue;
      }

      let list: unknown;
      try {
        // Supports both static arrays and promise-based catalogs.
        list = await Promise.resolve(bundle.tools);
      } catch (err) {
        console.warn(`[toolbox] '${mod.name}' tools export rejected:`, err);
        continue;
      }
      if (!Array.isArray(list)) {
        console.warn(
          `[toolbox] '${mod.name}' exported a non-array \`tools\`; skipped.`,
        );
        continue;
      }

      for (const candidate of list) {
        if (!isModuleTool(candidate)) {
          console.warn(
            `[toolbox] '${mod.name}' exported an invalid tool entry; skipped.`,
            candidate,
          );
          continue;
        }
        if (seenIds.has(candidate.id)) {
          console.warn(
            `[toolbox] duplicate tool id '${candidate.id}' from '${mod.name}' (already provided by another module); skipped.`,
          );
          continue;
        }
        seenIds.add(candidate.id);
        tools.push({ ...candidate, moduleName: mod.name });
      }
    }

    _toolsCache = tools;
    return tools;
  })().catch((err) => {
    _toolsPromise = null;
    _toolsCache = null;
    throw err;
  });

  return _toolsPromise;
}

export interface UseModuleToolsResult {
  tools: ResolvedTool[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Resolves all valid tools exposed by enabled modules.
 * Uses the same module-level caching pattern as `useModules` / App.tsx.
 */
export function useModuleTools(): UseModuleToolsResult {
  const [tools, setTools] = useState<ResolvedTool[]>(_toolsCache ?? []);
  const [isLoading, setIsLoading] = useState(_toolsCache === null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (_toolsCache !== null) {
      setTools(_toolsCache);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    collectModuleTools()
      .then((t) => {
        setTools(t);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      });
  }, [tick]);

  const refetch = () => {
    _toolsCache = null;
    _toolsPromise = null;
    setTick((t) => t + 1);
  };

  return { tools, isLoading, error, refetch };
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Grouping helper                                                          */
/* ──────────────────────────────────────────────────────────────────────── */

export interface ToolCategory {
  category: string;
  tools: ResolvedTool[];
}

/** Groups tools by category, preserving first-seen order. */
export function groupToolsByCategory(tools: ResolvedTool[]): ToolCategory[] {
  const order: string[] = [];
  const map = new Map<string, ResolvedTool[]>();
  for (const tool of tools) {
    const cat = tool.category.trim() || "General";
    if (!map.has(cat)) {
      map.set(cat, []);
      order.push(cat);
    }
    map.get(cat)!.push(tool);
  }
  return order.map((category) => ({ category, tools: map.get(category)! }));
}