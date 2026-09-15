/**
 * storymap/share.ts
 * -----------------
 * Self-contained story-map share links.
 *
 * The link carries a **snapshot** of the story (see `hydrateForShare`): every
 * map block gets its resolved centre/zoom/basemap and a snapshot of its vector
 * layers inlined, so the public viewer at `/share/story/:token` renders the
 * story without any authentication or project lookup. The token is a
 * base64url-encoded JSON payload - plain, inspectable, and URL-safe.
 */
import type { StoryBlock, StoryMap } from "./types";
import type { MapLayerItem } from "@/lib/maps";

interface SharePayload {
  v: 1;
  /** App name, for provenance on the public viewer. */
  app: string;
  story: StoryMap;
}

/** Unicode-safe base64url encode/decode. */
function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(token: string): string {
  const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export interface StoryShareData {
  /** Maps referenced by map blocks (published maps of the project). */
  maps: Array<{
    id: string;
    center_lng?: number;
    center_lat?: number;
    zoom?: number;
    basemap?: string;
    layers_config?: MapLayerItem[];
  }>;
  /** The project's own view (fallback for `mapId: "project"` blocks). */
  project?: {
    center_lng?: number;
    center_lat?: number;
    zoom?: number;
    basemap?: string;
    layers_config?: MapLayerItem[];
  } | null;
}

/**
 * Inline each map block's view data + layer sources so the story renders
 * without the author's project. Returns a new story (input is untouched).
 */
export function hydrateForShare(
  story: StoryMap,
  data?: StoryShareData
): StoryMap {
  return {
    ...story,
    scenes: story.scenes.map((scene) => ({
      ...scene,
      blocks: scene.blocks.map((block): StoryBlock => {
        if (block.type !== "map") return block;
        const map =
          block.mapId && block.mapId !== "project"
            ? data?.maps.find((m) => m.id === block.mapId)
            : undefined;
        const layers = map?.layers_config ?? data?.project?.layers_config ?? [];
        return {
          ...block,
          centerLng:
            block.centerLng ?? map?.center_lng ?? data?.project?.center_lng,
          centerLat:
            block.centerLat ?? map?.center_lat ?? data?.project?.center_lat,
          zoom: block.zoom ?? map?.zoom ?? data?.project?.zoom,
          basemap: block.basemap ?? map?.basemap ?? data?.project?.basemap,
          layersSnapshot: layers
            .filter((l) => l.type !== "raster" && l.datasetId)
            .map((l) => ({
              datasetId: l.datasetId,
              name: l.name,
              geometryType: l.geometryType,
            })),
        };
      }),
    })),
  };
}

/** Encode a story (and its data context) into a share token. */
export function encodeStoryToken(
  story: StoryMap,
  data?: StoryShareData
): string {
  const payload: SharePayload = {
    v: 1,
    app: "EarthIQ",
    story: hydrateForShare(story, data),
  };
  return toBase64Url(JSON.stringify(payload));
}

/** Decode a share token back into a story; `null` when invalid. */
export function decodeStoryToken(token: string): StoryMap | null {
  if (!token) return null;
  try {
    const json = fromBase64Url(token);
    const payload = JSON.parse(json) as SharePayload;
    const story = payload?.story;
    if (
      payload?.v !== 1 ||
      !story ||
      typeof story.title !== "string" ||
      !Array.isArray(story.scenes) ||
      story.scenes.some((s) => !Array.isArray(s.blocks))
    ) {
      return null;
    }
    return story;
  } catch {
    return null;
  }
}

/** Absolute share URL for a token. */
export function buildShareUrl(token: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/share/story/${token}`;
}
