/**
 * storymap/SceneThumb.tsx
 * -----------------------
 * One row in the scene rail: number, name, a content summary, and hover
 * actions (duplicate / remove). Clicking selects the scene for editing.
 */
import { cn } from "@packages/ui";
import { Copy, Map as MapIcon, Trash2, Type } from "lucide-react";

import { type StoryScene } from "./types";

export const SceneThumb = ({
  scene,
  index,
  active,
  canRemove,
  onSelect,
  onDuplicate,
  onRemove,
}: {
  scene: StoryScene;
  index: number;
  active: boolean;
  canRemove: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) => {
  const hasMap = scene.blocks.some((b) => b.type === "map");
  const summary = scene.blocks.length
    ? `${scene.blocks.length} block${scene.blocks.length === 1 ? "" : "s"}${
        hasMap ? " · map" : ""
      }`
    : "Empty scene";

  return (
    <div
      className={cn(
        "group relative flex w-full items-start gap-2 rounded-xl pr-1 transition-colors duration-150",
        active
          ? "bg-[var(--surface-active)]"
          : "hover:bg-[var(--surface-hover)]"
      )}
    >
      <button
        className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 rounded-xl px-2.5 py-2 text-left"
        type="button"
        onClick={onSelect}
      >
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums",
            active
              ? "bg-[var(--primary)]/10 text-[var(--primary)]"
              : "bg-[var(--surface-hover)] text-[var(--text-secondary)]"
          )}
        >
          {index + 1}
        </span>
        <span className="min-w-0">
          <span
            className={cn(
              "block truncate text-sm font-medium",
              active
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-secondary)]"
            )}
          >
            {scene.name}
          </span>
          <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
            {hasMap ? <MapIcon size={11} /> : <Type size={11} />}
            <span className="truncate">{summary}</span>
          </span>
        </span>
      </button>

      <span className="mt-2 hidden shrink-0 items-center gap-0.5 group-hover:flex">
        <button
          aria-label={`Duplicate ${scene.name}`}
          className="cursor-pointer rounded-md p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          title="Duplicate scene"
          type="button"
          onClick={onDuplicate}
        >
          <Copy size={13} />
        </button>
        {canRemove ? (
          <button
            aria-label={`Remove ${scene.name}`}
            className="cursor-pointer rounded-md p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--error-text)]"
            title="Remove scene"
            type="button"
            onClick={onRemove}
          >
            <Trash2 size={13} />
          </button>
        ) : null}
      </span>
    </div>
  );
};
