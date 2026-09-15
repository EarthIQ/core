import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Play, RotateCcw } from "lucide-react";

import { Button, Input } from "@packages/ui";

import { BuilderScaffold } from "@/components/builder/BuilderScaffold";
import { getProjectBuilder } from "@/lib/builders";
import {
  Inspector,
  PresentMode,
  SlideCanvas,
  SlideThumb,
  useDeck,
  useProjectData,
  type BlockAction,
} from "@/components/builder/presentation";

/**
 * The 3-pane presentation workspace: a slide rail, the live slide canvas and a
 * context-aware inspector. All deck state lives in `useDeck` (persisted per
 * project) and all source material in `useProjectData`. Present mode overlays
 * the app.
 */
function Editor({ projectId }: { projectId: string }) {
  const data = useProjectData(projectId);
  const deck = useDeck(projectId, data.project?.title);
  const [presenting, setPresenting] = useState(false);

  const slide = deck.activeSlide;

  function handleBlockAction(blockId: string, action: BlockAction) {
    switch (action) {
      case "up":
        deck.moveBlock(blockId, -1);
        break;
      case "down":
        deck.moveBlock(blockId, 1);
        break;
      case "duplicate":
        deck.duplicateBlock(blockId);
        break;
      case "delete":
        deck.removeBlock(blockId);
        break;
      case "span": {
        const target = slide?.blocks.find((b) => b.id === blockId);
        deck.updateBlock(blockId, {
          span: target && target.span === 2 ? 1 : 2,
        });
        break;
      }
    }
  }

  function handleReset() {
    if (
      window.confirm("Reset this deck? All slides and blocks will be cleared.")
    ) {
      deck.resetDeck(data.project?.title);
    }
  }

  if (data.loading) {
    return (
      <div className="flex h-[calc(100vh-150px)] min-h-[520px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[var(--text-tertiary)]">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-primary)] border-t-[var(--primary)]" />
          <p className="text-sm">Loading project data…</p>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="flex h-[calc(100vh-150px)] min-h-[520px] items-center justify-center">
        <div className="max-w-md rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-5 text-center">
          <p className="text-sm font-semibold text-[var(--error-text)]">
            Couldn't load project data
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{data.error}</p>
        </div>
      </div>
    );
  }

  const slideCount = deck.deck.slides.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-60 max-w-full">
          <Input
            aria-label="Deck title"
            inputSize="sm"
            value={deck.deck.title}
            onChange={(e) => deck.setDeckTitle(e.target.value)}
          />
        </div>
        <span className="text-xs text-[var(--text-tertiary)]">
          {slideCount} slide{slideCount === 1 ? "" : "s"}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Button
            leftIcon={<RotateCcw size={14} />}
            size="sm"
            variant="ghost"
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button
            leftIcon={<Plus size={14} />}
            size="sm"
            variant="ghost"
            onClick={deck.addSlide}
          >
            Add slide
          </Button>
          <Button
            leftIcon={<Play size={14} />}
            size="sm"
            onClick={() => setPresenting(true)}
          >
            Present
          </Button>
        </div>
      </div>

      {/* 3-pane body */}
      <div className="flex h-[calc(100vh-220px)] min-h-[460px] gap-3">
        {/* Slide rail */}
        <aside className="flex w-[232px] shrink-0 flex-col rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-2">
          <span className="mb-2 px-1 text-xs font-semibold tracking-wider text-[var(--text-tertiary)] uppercase">
            Slides
          </span>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto pr-1">
            {deck.deck.slides.map((s, i) => (
              <SlideThumb
                key={s.id}
                index={i}
                slide={s}
                active={s.id === deck.activeId}
                canRemove={slideCount > 1}
                onSelect={() => deck.setActiveId(s.id)}
                onDuplicate={() => deck.duplicateSlide(s.id)}
                onRemove={() => deck.removeSlide(s.id)}
              />
            ))}
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex min-w-0 flex-1 items-start justify-center overflow-auto rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
          {slide ? (
            <div className="w-full max-w-[940px]">
              <SlideCanvas
                data={data}
                edit={{
                  selectedBlockId: deck.selectedBlock?.id ?? null,
                  onSelect: (id) => deck.setSelectedBlockId(id),
                  onAction: handleBlockAction,
                }}
                mode="edit"
                slide={slide}
              />
            </div>
          ) : null}
        </main>

        {/* Inspector */}
        <aside className="w-[316px] shrink-0 overflow-auto rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-4">
          {slide ? (
            <Inspector
              block={deck.selectedBlock}
              data={data}
              onAddBlock={(t) => deck.addBlock(t)}
              onBlockAction={handleBlockAction}
              onUpdateBlock={(id, patch) => deck.updateBlock(id, patch)}
              onUpdateSlide={(patch) => deck.updateSlide(slide.id, patch)}
              slide={slide}
            />
          ) : null}
        </aside>
      </div>

      {presenting ? (
        <PresentMode
          data={data}
          deck={deck.deck}
          onClose={() => setPresenting(false)}
        />
      ) : null}
    </div>
  );
}

/**
 * Map Presentation builder - PowerPoint-style slide decks built from a
 * project's maps and data. Reads `?projectId=` from the URL and renders the
 * editor inside the shared builder scaffold (full-width for the wide canvas).
 */
export default function PresentationBuilderPage() {
  const [params] = useSearchParams();
  const projectId = params.get("projectId") ?? "";
  const builder = getProjectBuilder("presentation");

  if (!builder) return null;

  return (
    <BuilderScaffold builder={builder} projectId={projectId} wide>
      <Editor projectId={projectId} />
    </BuilderScaffold>
  );
}