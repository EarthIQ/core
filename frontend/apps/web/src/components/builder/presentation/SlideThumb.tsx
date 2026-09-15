/**
 * presentation/SlideThumb.tsx
 * ---------------------------
 * A lightweight 16:9 thumbnail of a slide for the slide rail. Deliberately
 * non-interactive content (no live maps) so a long deck renders cheaply.
 */
import { Copy, Trash2 } from "lucide-react";

import { cn } from "@packages/ui";

import { blockDef, slideSurface, type Slide } from "./types";

function MiniAction({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded bg-[var(--bg-elevated)]/90 transition-colors",
        danger
          ? "text-[var(--error-text)] hover:bg-[var(--error-bg)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
      )}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

export function SlideThumb({
  slide,
  index,
  active,
  canRemove,
  onSelect,
  onDuplicate,
  onRemove,
}: {
  slide: Slide;
  index: number;
  active: boolean;
  canRemove: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const surface = slideSurface(slide.background);
  const isTitle = slide.blocks.length === 0;
  const tileBg = surface.dark ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.10)";
  const tileFg = surface.dark ? "rgba(255,255,255,0.85)" : "rgba(15,23,42,0.6)";

  return (
    <div className="group flex w-full flex-col">
      <button
        aria-current={active ? "true" : undefined}
        aria-label={`Slide ${index + 1}: ${slide.name}`}
        className={cn(
          "relative block w-full overflow-hidden rounded-lg border text-left transition",
          active
            ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/25"
            : "border-[var(--border-primary)] hover:border-[var(--border-hover)]"
        )}
        style={{ aspectRatio: "16 / 9", background: surface.background }}
        type="button"
        onClick={onSelect}
      >
        <div className="flex h-full w-full flex-col gap-1 p-1.5">
          <div
            className="h-1 w-2/3 rounded"
            style={{ background: surface.accent }}
          />
          {isTitle ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1">
              <div
                className="h-1 w-3/4 rounded"
                style={{ background: tileBg }}
              />
              <div
                className="h-0.5 w-1/2 rounded"
                style={{ background: tileBg }}
              />
            </div>
          ) : (
            <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-1">
              {slide.blocks.slice(0, 4).map((block) => {
                const Icon = blockDef(block.type).icon;
                return (
                  <div
                    key={block.id}
                    className={cn(
                      "flex items-center justify-center rounded",
                      block.span === 2 && "col-span-2"
                    )}
                    style={{ background: tileBg, color: tileFg }}
                  >
                    <Icon size={12} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <span
          className="absolute top-1 left-1 rounded px-1 text-[9px] font-semibold"
          style={{
            background: surface.dark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.75)",
            color: surface.dark ? "#fff" : "#0f172a",
          }}
        >
          {index + 1}
        </span>

        <span className="absolute top-1 right-1 hidden gap-0.5 group-hover:flex">
          <MiniAction label="Duplicate slide" onClick={onDuplicate}>
            <Copy size={11} />
          </MiniAction>
          {canRemove ? (
            <MiniAction danger label="Delete slide" onClick={onRemove}>
              <Trash2 size={11} />
            </MiniAction>
          ) : null}
        </span>
      </button>

      <p
        className={cn(
          "mt-1 truncate px-0.5 text-xs",
          active
            ? "font-semibold text-[var(--text-primary)]"
            : "text-[var(--text-tertiary)]"
        )}
        title={slide.name}
      >
        {slide.name}
      </p>
    </div>
  );
}