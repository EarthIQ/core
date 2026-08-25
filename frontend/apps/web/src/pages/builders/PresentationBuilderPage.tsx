import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlignLeft, Map, Presentation, Type } from "lucide-react";
import { BuilderScaffold } from "@/components/builder/BuilderScaffold";
import {
  BuilderWorkspace,
  SidebarHeader,
  SidebarItem,
} from "@/components/builder/BuilderWorkspace";
import { getProjectBuilder } from "@/lib/builders";

interface Slide {
  id: string;
  title: string;
}

/** Block types a presentation slide can hold (shown as coming-soon chips). */
const SLIDE_BLOCKS = [
  { label: "Map view", icon: Map },
  { label: "Text", icon: Type },
  { label: "Chart", icon: AlignLeft },
];

/**
 * Map Presentation builder — PowerPoint-style slide decks, but for maps.
 *
 * Initial structure: a slide list on the left (add / select) and a slide
 * canvas with a block toolbar on the right. Block types are rendered as
 * disabled chips until the slide editor is implemented.
 */
export default function PresentationBuilderPage() {
  const [params] = useSearchParams();
  const projectId = params.get("projectId") ?? "";
  const builder = getProjectBuilder("presentation");

  const [slides, setSlides] = useState<Slide[]>([
    { id: "slide-1", title: "Slide 1" },
  ]);
  const [activeId, setActiveId] = useState("slide-1");

  if (!builder) return null;

  const activeIndex = Math.max(
    0,
    slides.findIndex((s) => s.id === activeId),
  );

  function addSlide() {
    const id = `slide-${Date.now()}`;
    setSlides((prev) => [...prev, { id, title: `Slide ${prev.length + 1}` }]);
    setActiveId(id);
  }

  return (
    <BuilderScaffold builder={builder} projectId={projectId}>
      <BuilderWorkspace
        sidebar={
          <>
            <SidebarHeader
              icon={Presentation}
              title="Slides"
              addLabel="Add"
              onAdd={addSlide}
            />
            <div className="flex flex-col gap-0.5">
              {slides.map((slide) => (
                <SidebarItem
                  key={slide.id}
                  icon={Presentation}
                  title={slide.title}
                  subtitle="Empty slide"
                  active={slide.id === activeId}
                  onClick={() => setActiveId(slide.id)}
                />
              ))}
            </div>
          </>
        }
        main={
          <div className="flex flex-col gap-4">
            {/* Slide canvas */}
            <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-[var(--shadow-lg)]">
              <div className="px-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Presentation size={22} />
                </div>
                <p className="mt-3 text-sm font-semibold text-[var(--text-secondary)]">
                  {slides[activeIndex]?.title ?? "Slide"}
                </p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Map views, text and charts will render on this canvas
                </p>
              </div>
              <span className="absolute right-3 top-3 rounded-md bg-[var(--surface-hover)] px-2 py-0.5 text-[0.65rem] font-medium text-[var(--text-tertiary)]">
                {activeIndex + 1} / {slides.length}
              </span>
            </div>

            {/* Block toolbar */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-3">
              <span className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Blocks
              </span>
              {SLIDE_BLOCKS.map((block) => {
                const BlockIcon = block.icon;
                return (
                  <button
                    key={block.label}
                    type="button"
                    disabled
                    className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-dashed border-[var(--border-primary)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-tertiary)] opacity-70"
                  >
                    <BlockIcon size={13} />
                    {block.label}
                    <span className="rounded bg-[var(--surface-hover)] px-1 text-[0.6rem] uppercase tracking-wide">
                      soon
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        }
      />
    </BuilderScaffold>
  );
}