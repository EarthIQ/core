/**
 * presentation/PresentMode.tsx
 * ----------------------------
 * Fullscreen slide show for a deck. Reuses `SlideCanvas` in "present" mode so
 * what you see here is exactly what was authored. Navigation is keyboard and
 * mouse friendly, speaker notes are toggleable, and Escape exits.
 */
import { useEffect, useState } from "react";

import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { Button, cn, useLockBodyScroll } from "@packages/ui";

import type { ProjectData } from "./useProjectData";
import type { Deck } from "./types";
import { SlideCanvas } from "./SlideCanvas";

export function PresentMode({
  deck,
  data,
  onClose,
}: {
  deck: Deck;
  data: ProjectData;
  onClose: () => void;
}) {
  const slides = deck.slides;
  const [index, setIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const slide = slides[Math.min(index, slides.length - 1)];
  useLockBodyScroll(true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, slides.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Home") {
        setIndex(0);
      } else if (e.key === "End") {
        setIndex(slides.length - 1);
      } else if (e.key.toLowerCase() === "n") {
        setShowNotes((s) => !s);
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length, onClose]);

  const ghostBtn = "text-white/80 hover:bg-white/10";

  return (
    <div
      aria-label="Presentation"
      aria-modal="true"
      className="fixed inset-0 z-[var(--z-modal)] flex flex-col bg-[#05070d]"
      role="dialog"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span className="font-medium text-white">{deck.title}</span>
          <span aria-hidden>·</span>
          <span>
            {index + 1} / {slides.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            className={ghostBtn}
            size="sm"
            variant="ghost"
            onClick={() => setShowNotes((s) => !s)}
          >
            {showNotes ? "Hide notes" : "Notes"}
          </Button>
          <Button
            aria-label="Exit presentation"
            className={ghostBtn}
            iconOnly
            size="sm"
            variant="ghost"
            onClick={onClose}
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Stage */}
      <div className="flex flex-1 items-center justify-center px-4 pb-2">
        <div className="w-full max-w-[1200px]">
          <SlideCanvas data={data} key={slide.id} mode="present" slide={slide} />
          {showNotes && slide.notes ? (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
              <span className="mb-1 block text-xs font-semibold tracking-wide text-white/50 uppercase">
                Speaker notes
              </span>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/85">
                {slide.notes}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-4 py-4">
        <Button
          className={ghostBtn}
          disabled={index === 0}
          leftIcon={<ChevronLeft size={16} />}
          size="sm"
          variant="ghost"
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
        >
          Prev
        </Button>

        <div className="flex items-center gap-1.5" role="tablist" aria-label="Slides">
          {slides.map((s, i) => (
            <button
              aria-label={`Go to slide ${i + 1}`}
              aria-selected={i === index}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index
                  ? "w-6 bg-white"
                  : "w-2 bg-white/30 hover:bg-white/60"
              )}
              key={s.id}
              role="tab"
              type="button"
              onClick={() => setIndex(i)}
            />
          ))}
        </div>

        <Button
          className={ghostBtn}
          disabled={index === slides.length - 1}
          leftIcon={<ChevronRight size={16} />}
          size="sm"
          variant="ghost"
          onClick={() => setIndex((i) => Math.min(i + 1, slides.length - 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}