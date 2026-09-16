/**
 * PublicStoryMapPage.tsx
 * ----------------------
 * Public, no-auth viewer for a shared story map (`/share/story/:id`). The id
 * is a `maps` row with `kind="story_map"`; its `content.story` is a
 * self-contained snapshot (map blocks hydrated with layer sources + view
 * data), so this page needs no account and no project access - it just
 * fetches, validates and plays the scenes.
 *
 * Mirrors the in-builder preview (`PreviewMode`): scene-by-scene guided
 * viewing with keyboard navigation, a scene rail of dots and a progress bar.
 *
 * `StoryViewer` is exported so `PublicMapPage` (the `/share/map/:id`
 * dispatcher) can render story maps from a single fetch.
 */
import { Button, cn, useLockBodyScroll } from "@packages/ui";
import { BookOpen, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { StorySceneView, type StoryMap } from "@/components/builder/storymap";
import {
  PublicDenied,
  usePublicEntity,
} from "@/components/map/share/PublicEntity";

/* ── Scene player (shared with the /share/map dispatcher) ────────────────── */

export const StoryViewer = ({ story }: { story: StoryMap }) => {
  const [index, setIndex] = useState(0);
  useLockBodyScroll(true);
  const scenes = story.scenes;

  /* Keyboard navigation */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, scenes.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Home") {
        setIndex(0);
      } else if (e.key === "End") {
        setIndex(scenes.length - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scenes.length]);

  const scene = scenes[Math.min(index, Math.max(scenes.length - 1, 0))];
  const ghostBtn =
    "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-secondary)]">
      <header className="flex shrink-0 items-center justify-between px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <BookOpen
            aria-hidden
            className="text-[var(--primary)]"
            size={18}
          />
          <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {story.title}
          </span>
          <span className="text-xs text-[var(--text-tertiary)] tabular-nums">
            {index + 1} / {scenes.length}
          </span>
        </div>
      </header>

      {/* Progress */}
      <div
        aria-hidden
        className="mx-4 h-0.5 shrink-0 overflow-hidden rounded-full bg-[var(--surface-hover)]"
      >
        <div
          className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
          style={{
            width: `${((index + 1) / Math.max(scenes.length, 1)) * 100}%`,
          }}
        />
      </div>

      {/* Stage */}
      <main className="min-h-[60vh] flex-1 px-4 py-4">
        {scene ? (
          <div className="mx-auto flex h-full max-w-6xl flex-col rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-6">
            <StorySceneView
              key={scene.id}
              data={null}
              index={index}
              mode="present"
              scene={scene}
              total={scenes.length}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--text-tertiary)]">
            This story has no scenes.
          </div>
        )}
      </main>

      {/* Controls + attribution */}
      <footer className="shrink-0 px-4 py-4">
        <div className="flex items-center justify-center gap-3">
          <Button
            className={ghostBtn}
            disabled={index === 0}
            leftIcon={<ChevronLeft size={16} />}
            size="sm"
            variant="ghost"
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          >
            Previous
          </Button>

          <div
            aria-label="Scenes"
            className="flex items-center gap-1.5"
            role="tablist"
          >
            {scenes.map((s, i) => (
              <button
                key={s.id}
                aria-label={`Go to scene ${i + 1}: ${s.name}`}
                aria-selected={i === index}
                role="tab"
                type="button"
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index
                    ? "w-6 bg-[var(--primary)]"
                    : "w-2 bg-[var(--surface-hover)] hover:bg-[var(--border-hover)]"
                )}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>

          {index === scenes.length - 1 ? (
            <Button
              className={ghostBtn}
              leftIcon={<RotateCcw size={16} />}
              size="sm"
              variant="ghost"
              onClick={() => setIndex(0)}
            >
              Start over
            </Button>
          ) : (
            <Button
              className={ghostBtn}
              rightIcon={<ChevronRight size={16} />}
              size="sm"
              variant="ghost"
              onClick={() =>
                setIndex((i) => Math.min(i + 1, scenes.length - 1))
              }
            >
              Next
            </Button>
          )}
        </div>
        <p className="mt-3 text-center text-[0.65rem] text-[var(--text-tertiary)]">
          © OpenStreetMap contributors · Powered by{" "}
          <span className="font-semibold text-[var(--primary)]">EarthIQ</span>
        </p>
      </footer>
    </div>
  );
};

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function PublicStoryMapPage() {
  const { mapId } = useParams<{ mapId: string }>();
  const { row, loading, denied, errorMsg } = usePublicEntity(mapId ?? "");

  const story = (() => {
    const raw = row?.content?.story;
    if (!raw || typeof raw !== "object") return null;
    const s = raw as StoryMap;
    if (typeof s.title !== "string" || !Array.isArray(s.scenes)) return null;
    return s;
  })();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--bg-secondary)] text-[var(--text-tertiary)]">
        <BookOpen
          className="animate-pulse text-[var(--primary)]"
          size={36}
        />
        <p className="text-sm">Loading story…</p>
      </div>
    );
  }

  if (denied) {
    return (
      <PublicDenied
        entityId={mapId ?? ""}
        from={mapId ? `/share/story/${mapId}` : "/share"}
        noun="story map"
      />
    );
  }

  if (errorMsg || !story) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)] px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
            <BookOpen size={24} />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
            This story can't be shown
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-tertiary)]">
            {errorMsg ??
              "This story has been deleted or is currently unavailable."}
          </p>
          <Link
            className="mt-5 inline-flex"
            to="/"
          >
            <Button variant="ghost">Go to the home page</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <StoryViewer story={story} />;
}
