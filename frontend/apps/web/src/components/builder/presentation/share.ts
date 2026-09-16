/**
 * presentation/share.ts
 * ---------------------
 * Self-contained presentation share payload.
 *
 * A published presentation is a `maps` row (`kind="presentation"`) whose
 * `content` is `{ deck, context }`. The `context` inlines everything the
 * public viewer needs to render the deck with **no authentication**: the
 * referenced published maps, the project view (fallback for map blocks), and
 * bounded data previews for the chart/table blocks - so `/share/presentation/:id`
 * renders charts and tables without access to the author's project.
 */

import type { Deck } from "./types";
import type { ProjectData } from "./useProjectData";
import type { StoryShareData } from "@/components/builder/storymap/share";
import type { DatasetPreview } from "@/lib/datasets";

export interface DeckShareContext {
  /** Published maps referenced by map blocks. */
  maps: StoryShareData["maps"];
  /** Bounded previews for chart/table blocks, keyed by dataset id. */
  previews: Record<string, DatasetPreview>;
  /** The project's own view (fallback for `mapId: "project"` blocks). */
  project: StoryShareData["project"];
}

/**
 * Build the `context` payload for a deck: referenced maps + project view +
 * data previews for every chart/table block. `data.getPreview` is cached by
 * `useProjectData`, so repeated saves are cheap.
 */
export async function buildDeckContext(
  data: Pick<ProjectData, "maps" | "project" | "getPreview">,
  deck: Deck
): Promise<DeckShareContext> {
  const datasetIds = new Set<string>();
  for (const slide of deck.slides) {
    for (const block of slide.blocks) {
      if (
        (block.type === "chart" || block.type === "table") &&
        block.datasetId
      ) {
        datasetIds.add(block.datasetId);
      }
    }
  }

  const previews: Record<string, DatasetPreview> = {};
  await Promise.all(
    [...datasetIds].map(async (id) => {
      try {
        previews[id] = await data.getPreview(id, 24);
      } catch {
        /* a missing dataset shouldn't block saving the deck */
      }
    })
  );

  return {
    maps: data.maps.map((m) => ({
      id: m.id,
      center_lng: m.center_lng,
      center_lat: m.center_lat,
      zoom: m.zoom,
      basemap: m.basemap,
      layers_config: m.layers_config,
    })),
    previews,
    project: data.project
      ? {
          center_lng: data.project.center_lng,
          center_lat: data.project.center_lat,
          zoom: data.project.zoom,
          basemap: data.project.basemap,
          layers_config: data.project.layers_config,
        }
      : null,
  };
}
