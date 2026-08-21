import { api } from "./api";

/**
 * Front-end client for the AI harness (``/api/ai``) + the map tool dispatcher.
 *
 * The harness is provider-agnostic (OpenAI-compatible, Anthropic, Ollama) and
 * lets any "section" of the app run an LLM with its own system prompt + context,
 * and — when it wants to act — invoke *tools* (``zoom_to_place``,
 * ``set_basemap``, …). See ``modules/ai-module`` for the server side.
 *
 * Tool-calling model
 * ------------------
 * * ``GET /api/ai/tools``  → the metadata for every tool (name, args, side).
 * * ``POST /api/ai/chat``  → with ``tools: [names]`` the model may answer with
 *   ``{"tool": name, "arguments": {...}}``. The server returns that call in
 *   ``resp.tool_call``. **Front-end** tools are dispatched here (by
 *   :func:`dispatchToolCall`) against the live map; **server** tools are
 *   already executed by the harness and their result folded into ``content``.
 */

/* ── Base contract (mirrors ``module_ai.schemas``) ─────────────────────────── */

export interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIContext {
  freetext?: string;
  data?: Record<string, unknown>;
}

export interface AISamplingParams {
  model?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}

export interface AIToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIToolResult {
  name: string;
  ok: boolean;
  side: "frontend" | "server" | "unknown";
  result?: unknown;
  error?: string | null;
}

export interface AIRequest {
  system_prompt: string;
  messages: AIChatMessage[];
  context?: AIContext;
  sampling?: AISamplingParams;
  /** Optional list of tool names to expose to the model (drives tool-calling). */
  tools?: string[];
  /** A call the client already knows about (authoritative; always executed). */
  tool_call?: AIToolCall;
  /** When true the server executes any recovered *server* tool. */
  execute_tools?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  finish_reason?: string | null;
  usage: AIUsage;
  latency_ms: number;
  tool_call?: AIToolCall | null;
  tool_result?: AIToolResult | null;
}

export interface AIConfig {
  configured: boolean;
  provider: string;
  model: string;
  base_url: string;
  has_api_key: boolean;
  supported_providers: string[];
}

/* ── Tool metadata (from ``GET /api/ai/tools``) ────────────────────────────── */

export interface AITool {
  name: string;
  description: string;
  arguments: Record<string, unknown>;
  side: "frontend" | "server";
  tags: string[];
}

/** Run a single completion through the AI harness. */
export async function aiChat(req: AIRequest): Promise<AIResponse> {
  return api.post<AIResponse>("/api/ai/chat", req);
}

/** Introspect the harness provider configuration (masked). */
export async function getAIConfig(): Promise<AIConfig> {
  return api.get<AIConfig>("/api/ai/config");
}

/** List the tools the AI can invoke (metadata only — no executors). */
export async function listAITools(): Promise<AITool[]> {
  return api.get<AITool[]>("/api/ai/tools");
}

/* ────────────────────────────────────────────────────────────────────────────
 * Live-map state (what the panel passes to the harness as context)
 * ──────────────────────────────────────────────────────────────────────────── */

export interface MapViewState {
  center: [number, number];
  zoom: number;
  basemap: string;
  layers: {
    id: string;
    name: string;
    type?: string;
    visible: boolean;
  }[];
}

/* ────────────────────────────────────────────────────────────────────────────
 * Front-end tool dispatcher
 *
 * Given an ``AIToolCall`` (recovered from the model) and the live MapLibre
 * map + app controls, perform the real effect. Returns a short human-readable
 * confirmation the chat can render, or throws for an unknown tool.
 * ──────────────────────────────────────────────────────────────────────────── */

/** A live-map handle with just the methods the tools need. */
export interface MapHandle {
  flyTo?: (opts: {
    center: [number, number];
    zoom: number;
    duration?: number;
  }) => void;
  fitBounds?: (
    bounds: [[number, number], [number, number]] | number[][],
    opts?: { padding?: number },
  ) => void;
  zoomIn?: (opts?: { duration?: number }) => void;
  zoomOut?: (opts?: { duration?: number }) => void;
  resetNorthPitch?: (opts?: { duration?: number }) => void;
  setStyle?: (style: string) => void;
  getZoom?: () => number;
  on?: (event: string, cb: () => void) => void;
  once?: (event: string, cb: () => void) => void;
}

export interface ToolDispatchContext {
  map: MapHandle;
  /** Switch the basemap (re-renders the map style + resyncs layers). */
  setBasemap: (id: string) => void;
  /** Toggle a layer's visibility in the layer tree. */
  setLayerVisible: (id: string, visible: boolean) => void;
  /** The base URL for a basemap id (used by ``set_basemap`` → map.setStyle). */
  basemapUrls: Record<string, string>;
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/* ── Client-side geocoding (natural-language place → center + zoom) ───────── */

const PLACE_GEO_PROMPT =
  "You are a geocoding assistant for the EarthIQ GIS platform. The user describes a " +
  "place, landmark, region or coordinates in natural language. Your ONLY job is to " +
  "resolve it to a geographic center and a sensible zoom level, then answer with " +
  "STRICT JSON and nothing else.\n\n" +
  'Return exactly one JSON object: {"found": true, "place": string, ' +
  '"center": [lng, lat], "zoom": number, "reason": string}\n\n' +
  "Rules:\n" +
  "- 'center' is [longitude, latitude] in decimal degrees (WGS84).\n" +
  "- 'zoom' is a number 2–20: world ~2, country ~4, region ~6, city ~10, " +
  "district ~12-14, a single building/point ~16-18.\n" +
  "- Use well-known approximate coordinates; if ambiguous, pick the most prominent " +
  "one and note it in 'reason'.\n" +
  "- If you cannot resolve it confidently, set 'found' to false with 'center': [0, 20].\n" +
  "- Output ONLY the JSON object — no prose, no markdown fences.";

/** The exact shape the geocoder is asked to return. */
export interface PlaceResolution {
  found: boolean;
  place?: string;
  center: [number, number];
  zoom: number;
  reason?: string;
}

function isCoordPair(center: unknown): center is [number, number] {
  return (
    Array.isArray(center) &&
    center.length === 2 &&
    isFiniteNumber(center[0]) &&
    isFiniteNumber(center[1])
  );
}

/**
 * Resolve a natural-language place to a map center + zoom via the AI harness.
 * Returns ``null`` when no usable coordinates were produced.
 */
export async function resolvePlaceCoordinates(
  place: string,
): Promise<PlaceResolution | null> {
  const resp = await aiChat({
    system_prompt: PLACE_GEO_PROMPT,
    messages: [{ role: "user", content: place }],
    sampling: { temperature: 0.0, max_tokens: 160 },
    metadata: { section: "map/geocode" },
  });
  // The reply is strict JSON; extract the first object defensively.
  const text = resp.content || "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    if (isCoordPair(obj.center)) {
      const lng = Math.max(-180, Math.min(180, obj.center[0]));
      const lat = Math.max(-85, Math.min(85, obj.center[1]));
      let zoom = isFiniteNumber(obj.zoom) ? obj.zoom : 10;
      zoom = Math.max(2, Math.min(20, zoom));
      return {
        found: obj.found !== false,
        place: typeof obj.place === "string" ? obj.place : undefined,
        center: [lng, lat],
        zoom,
        reason: typeof obj.reason === "string" ? obj.reason : undefined,
      };
    }
  } catch {
    /* fall through */
  }
  return null;
}

/**
 * Dispatch a front-end tool call against the live map.
 * Returns a short confirmation string.
 */
export async function dispatchToolCall(
  call: AIToolCall,
  ctx: ToolDispatchContext,
): Promise<string> {
  const a = call.arguments ?? {};
  const { map } = ctx;

  switch (call.name) {
    case "zoom_to_place": {
      const place = String(a.place ?? "");
      // 1) Fast path: an explicit "lng, lat" pair in the text.
      const ll = parseLngLat(place);
      if (ll) {
        map.flyTo?.({ center: ll, zoom: 11, duration: 2200 });
        return `Flew the map to ${ll[0].toFixed(3)}, ${ll[1].toFixed(3)}.`;
      }
      // 2) Natural-language place: resolve coordinates via the AI harness.
      const resolved = await resolvePlaceCoordinates(place);
      if (resolved && resolved.found) {
        map.flyTo?.({
          center: resolved.center,
          zoom: resolved.zoom,
          duration: 2200,
        });
        const label = resolved.place || place;
        return (
          `Flying to ${label} (≈ zoom ${resolved.zoom.toFixed(0)}).` +
          (resolved.reason ? ` — ${resolved.reason}` : "")
        );
      }
      return `I couldn't confidently find “${place}”. Try a more specific city, landmark or a pair of coordinates.`;
    }

    case "fit_extent": {
      const bounds = a.bounds as number[][] | undefined;
      if (Array.isArray(bounds) && bounds.length >= 2) {
        const flat = bounds.flat();
        const lngs = flat.filter((_, i) => i % 2 === 0);
        const lats = flat.filter((_, i) => i % 2 === 1);
        const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
        const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
        map.fitBounds?.([sw, ne], { padding: Number(a.padding_px ?? 80) });
        return `Zoomed to fit the requested extent.`;
      }
      return "That extent wasn't specific enough to fit — try a named region.";
    }

    case "zoom_by": {
      const delta = Number(a.delta ?? 1);
      if (delta >= 0) map.zoomIn?.({ duration: 200 });
      else map.zoomOut?.({ duration: 200 });
      return delta >= 0 ? "Zoomed in." : "Zoomed out.";
    }

    case "reset_north": {
      map.resetNorthPitch?.({ duration: 300 });
      return "Reset north (map is flat again).";
    }

    case "toggle_layer": {
      const id = String(a.layer_id ?? "");
      const visible = a.visible === undefined ? undefined : Boolean(a.visible);
      if (id) ctx.setLayerVisible(id, visible ?? true);
      return visible === false
        ? `Hid layer “${id}”.`
        : `Toggled layer “${id}”.`;
    }

    case "set_basemap": {
      const basemap = String(a.basemap ?? "dataviz-dark");
      const url = ctx.basemapUrls[basemap] ?? ctx.basemapUrls["dataviz-dark"];
      if (url) map.setStyle?.(url);
      ctx.setBasemap(basemap);
      return `Switched basemap to ${basemap}.`;
    }

    // Server-side tools (get_map_summary / list_layers) are already executed
    // by the harness and folded into `content`; nothing to do here.
    case "get_map_summary":
    case "list_layers":
      return "";

    default:
      throw new Error(`Unknown tool: ${call.name}`);
  }
}

/**
 * Parse a "lng, lat" (or "lat, lng") pair from a free-text place description.
 * Returns ``[lng, lat]`` or ``null`` when no clean coordinate pair is found.
 */
export function parseLngLat(text: string): [number, number] | null {
  if (!text) return null;
  const m = text.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const x = Number(m[1]);
  const y = Number(m[2]);
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;
  // Normalise to WGS84: |lng| ≤ 180, |lat| ≤ 90.
  if (Math.abs(x) <= 180 && Math.abs(y) <= 90) return [x, y];
  if (Math.abs(x) <= 90 && Math.abs(y) <= 180) return [y, x];
  return null;
}
