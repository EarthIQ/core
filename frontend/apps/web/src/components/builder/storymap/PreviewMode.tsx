/**
 * storymap/PreviewMode.tsx
 * ------------------------
 * Fullscreen guided viewing of a story map - the same experience a viewer
 * gets on the public link, but launched from the builder. Reuses
 * `StorySceneView` in present mode so what you preview is what you share.
 * Keyboard: ← / → (or Space) change scene, Home / End jump, Escape exits.
 */
import { Button, cn, useLockBodyScroll } from "@packages/ui";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";

import { StorySceneView } from "./StorySceneView";

import type { SceneData } from "./StorySceneView";
import type { StoryMap } from "./types";

export const PreviewMode = ({
  story,
  data,
  onClose,
}: {
  story: StoryMap;
  data?: SceneData | null;
  onClose: () => void;
}) => {
  const scenes = story.scenes;
  const [index, setIndex] = useState(0);
  const scene = scenes[Math.min(index, Math.max(scenes.length - 1, 0))];
  useLockBodyScroll(true);

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
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scenes.length, onClose]);

  const ghostBtn =
    "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]";

  return (
    <div
      aria-label="Story preview"
      aria-modal="true"
      className="fixed inset-0 z-[var(--z-modal)] flex flex-col bg-[var(--bg-secondary)]"
      role="dialog"
    >
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <span className="truncate font-medium text-[var(--text-primary)]">
            {story.title}
          </span>
          <span aria-hidden>·</span>
          <span>
            {index + 1} / {scenes.length}
          </span>
        </div>
        <Button
          iconOnly
          aria-label="Exit preview"
          className={ghostBtn}
          size="sm"
          variant="ghost"
          onClick={onClose}
        >
          <X size={16} />
        </Button>
      </div>

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
      <div className="min-h-0 flex-1 px-4 py-4">
        {scene ? (
          <div className="mx-auto flex h-full max-w-6xl flex-col rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-6">
            <StorySceneView
              key={scene.id}
              data={data}
              index={index}
              mode="present"
              scene={scene}
              total={scenes.length}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--text-tertiary)]">
            This story has no scenes yet.
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex shrink-0 items-center justify-center gap-3 px-4 py-4">
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

        <Button
          className={ghostBtn}
          disabled={index === scenes.length - 1}
          rightIcon={<ChevronRight size={16} />}
          size="sm"
          variant="ghost"
          onClick={() => setIndex((i) => Math.min(i + 1, scenes.length - 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
