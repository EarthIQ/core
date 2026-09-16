/**
 * PublicPresentationPage.tsx
 * --------------------------
 * Public, no-auth viewer for a shared presentation (`/share/presentation/:id`).
 * The id is a `maps` row with `kind="presentation"`; its `content` is
 * `{ deck, context }` where `context` inlines everything the deck needs to
 * render (referenced maps, project view, bounded data previews) - so the
 * public link works with no account and no access to the author's project.
 *
 * Reuses `PresentMode` (the in-builder slide show) so what was authored is
 * exactly what is presented: same canvas, navigation, speaker notes.
 */
import { MonitorPlay } from "lucide-react";
import { useParams } from "react-router-dom";

import {
  PresentMode,
  type Deck,
  type ProjectData,
} from "@/components/builder/presentation";
import {
  PublicDenied,
  usePublicEntity,
} from "@/components/map/share/PublicEntity";

/**
 * Build a `ProjectData`-shaped adapter from the stored share context so
 * `SlideCanvas` can read maps / project / previews / getPreview uniformly.
 */
export function contextAsProjectData(context: unknown): ProjectData {
  const ctx = (context ?? {}) as {
    maps?: ProjectData["maps"];
    project?: ProjectData["project"];
    previews?: Record<string, unknown>;
  };
  const previews = (ctx.previews ?? {}) as ProjectData["previews"];
  return {
    project: ctx.project ?? null,
    maps: ctx.maps ?? [],
    datasets: [],
    previews,
    loading: false,
    error: null,
    getPreview: (id: string) => {
      const p = previews[id];
      if (p) return Promise.resolve(p);
      return Promise.reject(new Error("No cached data for this dataset."));
    },
  };
}

/** Fullscreen slide show for a deck (shared with the /share/map dispatcher). */
export const PresentationViewer = ({
  deck,
  context,
}: {
  deck: Deck;
  context?: unknown;
}) => {
  /* PresentMode is a fullscreen overlay - in the public context it simply
     fills the page. Escape/exit is a no-op (there is no builder to return
     to). */
  return (
    <PresentMode
      data={contextAsProjectData(context)}
      deck={deck}
      onClose={() => undefined}
    />
  );
};

export default function PublicPresentationPage() {
  const { mapId } = useParams<{ mapId: string }>();
  const { row, loading, denied, errorMsg } = usePublicEntity(mapId ?? "");

  const deck: Deck | null = (() => {
    const raw = row?.content?.deck;
    if (!raw || typeof raw !== "object") return null;
    const d = raw as Deck;
    return typeof d.title === "string" && Array.isArray(d.slides) ? d : null;
  })();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--bg-secondary)] text-[var(--text-tertiary)]">
        <MonitorPlay
          className="animate-pulse text-[var(--primary)]"
          size={36}
        />
        <p className="text-sm">Loading presentation…</p>
      </div>
    );
  }

  if (denied) {
    return (
      <PublicDenied
        entityId={mapId ?? ""}
        from={mapId ? `/share/presentation/${mapId}` : "/share"}
        noun="presentation"
      />
    );
  }

  if (errorMsg || !deck) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--bg-secondary)] px-6 text-center">
        <MonitorPlay
          className="text-[var(--primary)]"
          size={36}
        />
        <p className="text-sm text-[var(--text-primary)]">
          {errorMsg ??
            "This presentation has been deleted or is currently unavailable."}
        </p>
      </div>
    );
  }

  return (
    <PresentationViewer
      context={row.content?.context}
      deck={deck}
    />
  );
}
