/**
 * presentation/useDeck.ts
 * -----------------------
 * Owns the presentation `Deck` for a project: active slide, selected block,
 * and all create/update/reorder/duplicate/remove operations - plus localStorage
 * persistence so a draft deck survives reloads (keyed by project id).
 *
 * State is plain JSON (see types.ts) and every mutation produces a new `deck`,
 * so consumers can rely on referential changes for rendering.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  defaultDeck,
  makeBlock,
  makeSlide,
  uid,
  type Deck,
  type Slide,
  type SlideBlock,
  type SlideBlockType,
} from "./types";

function storageKey(projectId: string): string {
  return `eaiq:presentation:${projectId}`;
}

function loadDeck(projectId: string, projectTitle?: string): Deck {
  if (projectId) {
    try {
      const raw = localStorage.getItem(storageKey(projectId));
      if (raw) {
        const parsed = JSON.parse(raw) as Deck;
        if (parsed && Array.isArray(parsed.slides) && parsed.slides.length) {
          return parsed;
        }
      }
    } catch {
      /* fall through to a fresh deck */
    }
  }
  return defaultDeck(projectTitle);
}

export function useDeck(projectId: string, projectTitle?: string) {
  const [deck, setDeck] = useState<Deck>(() =>
    loadDeck(projectId, projectTitle)
  );
  const [activeId, setActiveId] = useState<string>(
    () => deck.slides[0]?.id ?? ""
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Re-initialise when the project in scope changes.
  const prevProject = useRef(projectId);
  useEffect(() => {
    if (prevProject.current === projectId) return;
    prevProject.current = projectId;
    const fresh = loadDeck(projectId, projectTitle);
    setDeck(fresh);
    setActiveId(fresh.slides[0]?.id ?? "");
    setSelectedBlockId(null);
  }, [projectId, projectTitle]);

  // Persist on every change (skipped when there is no project to scope to).
  useEffect(() => {
    if (!projectId) return;
    try {
      localStorage.setItem(storageKey(projectId), JSON.stringify(deck));
    } catch {
      /* storage full / unavailable - non-fatal */
    }
  }, [deck, projectId]);

  const activeSlide = useMemo(
    () => deck.slides.find((s) => s.id === activeId) ?? deck.slides[0] ?? null,
    [deck.slides, activeId]
  );
  const selectedBlock = useMemo(
    () => activeSlide?.blocks.find((b) => b.id === selectedBlockId) ?? null,
    [activeSlide, selectedBlockId]
  );

  /* ── Deck-level ──────────────────────────────────────────────────────── */
  const setDeckTitle = useCallback(
    (title: string) => setDeck((d) => ({ ...d, title })),
    []
  );
  const setDeckSubtitle = useCallback(
    (subtitle: string) => setDeck((d) => ({ ...d, subtitle })),
    []
  );
  const resetDeck = useCallback(
    (title?: string) => {
      const fresh = defaultDeck(title);
      setDeck(fresh);
      setActiveId(fresh.slides[0]?.id ?? "");
      setSelectedBlockId(null);
    },
    []
  );

  /* ── Slide operations ────────────────────────────────────────────────── */
  const addSlide = useCallback(() => {
    const slide = makeSlide();
    setDeck((d) => ({
      ...d,
      slides: [
        ...d.slides,
        { ...slide, name: `Slide ${d.slides.length + 1}`, title: "New slide" },
      ],
    }));
    setActiveId(slide.id);
    setSelectedBlockId(null);
  }, []);

  const duplicateSlide = useCallback(
    (slideId: string) => {
      const src = deck.slides.find((s) => s.id === slideId);
      if (!src) return;
      const copy: Slide = {
        ...src,
        id: uid("slide"),
        name: `${src.name} copy`,
        blocks: src.blocks.map((b) => ({ ...b, id: uid("blk") })),
      };
      setDeck((d) => {
        const idx = d.slides.findIndex((s) => s.id === slideId);
        const slides = [...d.slides];
        slides.splice(idx + 1, 0, copy);
        return { ...d, slides };
      });
      setActiveId(copy.id);
      setSelectedBlockId(null);
    },
    [deck.slides]
  );

  const removeSlide = useCallback(
    (slideId: string) => {
      if (deck.slides.length <= 1) return;
      const idx = deck.slides.findIndex((s) => s.id === slideId);
      const remaining = deck.slides.filter((s) => s.id !== slideId);
      const neighbor =
        remaining[Math.min(idx, remaining.length - 1)]?.id ?? "";
      setDeck((d) => ({
        ...d,
        slides: d.slides.filter((s) => s.id !== slideId),
      }));
      setActiveId(neighbor);
      setSelectedBlockId(null);
    },
    [deck.slides]
  );

  const moveSlide = useCallback((slideId: string, dir: -1 | 1) => {
    setDeck((d) => {
      const idx = d.slides.findIndex((s) => s.id === slideId);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= d.slides.length) return d;
      const slides = [...d.slides];
      const [moved] = slides.splice(idx, 1);
      slides.splice(to, 0, moved);
      return { ...d, slides };
    });
  }, []);

  const updateSlide = useCallback((slideId: string, patch: Partial<Slide>) => {
    setDeck((d) => ({
      ...d,
      slides: d.slides.map((s) => (s.id === slideId ? { ...s, ...patch } : s)),
    }));
  }, []);

  /* ── Block operations (target the active slide) ────────────────────────── */
  const addBlock = useCallback(
    (type: SlideBlockType) => {
      const block = makeBlock(type);
      setDeck((d) => ({
        ...d,
        slides: d.slides.map((s) =>
          s.id === activeId ? { ...s, blocks: [...s.blocks, block] } : s
        ),
      }));
      setSelectedBlockId(block.id);
    },
    [activeId]
  );

  const updateBlock = useCallback(
    (blockId: string, patch: Partial<SlideBlock>) => {
      setDeck((d) => ({
        ...d,
        slides: d.slides.map((s) =>
          s.id === activeId
            ? {
                ...s,
                blocks: s.blocks.map((b) =>
                  b.id === blockId ? { ...b, ...patch } : b
                ),
              }
            : s
        ),
      }));
    },
    [activeId]
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      setDeck((d) => ({
        ...d,
        slides: d.slides.map((s) =>
          s.id === activeId
            ? { ...s, blocks: s.blocks.filter((b) => b.id !== blockId) }
            : s
        ),
      }));
      setSelectedBlockId((cur) => (cur === blockId ? null : cur));
    },
    [activeId]
  );

  const duplicateBlock = useCallback(
    (blockId: string) => {
      const src = activeSlide?.blocks.find((b) => b.id === blockId);
      if (!src) return;
      const copy: SlideBlock = { ...src, id: uid("blk") };
      setDeck((d) => ({
        ...d,
        slides: d.slides.map((s) => {
          if (s.id !== activeId) return s;
          const idx = s.blocks.findIndex((b) => b.id === blockId);
          const blocks = [...s.blocks];
          blocks.splice(idx + 1, 0, copy);
          return { ...s, blocks };
        }),
      }));
      setSelectedBlockId(copy.id);
    },
    [activeSlide, activeId]
  );

  const moveBlock = useCallback(
    (blockId: string, dir: -1 | 1) => {
      setDeck((d) => ({
        ...d,
        slides: d.slides.map((s) => {
          if (s.id !== activeId) return s;
          const idx = s.blocks.findIndex((b) => b.id === blockId);
          const to = idx + dir;
          if (idx < 0 || to < 0 || to >= s.blocks.length) return s;
          const blocks = [...s.blocks];
          const [moved] = blocks.splice(idx, 1);
          blocks.splice(to, 0, moved);
          return { ...s, blocks };
        }),
      }));
    },
    [activeId]
  );

  return {
    deck,
    activeId,
    activeSlide,
    selectedBlock,
    setActiveId,
    setSelectedBlockId,
    setDeckTitle,
    setDeckSubtitle,
    resetDeck,
    addSlide,
    duplicateSlide,
    removeSlide,
    moveSlide,
    updateSlide,
    addBlock,
    updateBlock,
    removeBlock,
    duplicateBlock,
    moveBlock,
  };
}