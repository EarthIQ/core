/**
 * presentation/useDeckItem.ts
 * ---------------------------
 * Owns a **single presentation item** - a `maps` row with
 * `kind="presentation"` whose `content` is `{ deck, context }`. The hook loads
 * the deck from the server on mount, exposes every slide/block operation
 * (create/update/reorder/duplicate/remove), and **auto-saves** debounced
 * writes back to the server - rebuilding the share context on each save so the
 * public link always renders charts, tables and maps.
 *
 * Every mutation produces a new `deck`, so consumers can rely on referential
 * changes for rendering.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchMapById, updateMap } from "@/lib/maps";

import { buildDeckContext } from "./share";
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

import type { ProjectData } from "./useProjectData";
import type { SaveState } from "@/components/builder/storymap/useStoryItem";

/** Parse and validate a stored deck payload (defensive). */
function parseDeck(
  content: Record<string, unknown> | null | undefined
): Deck | null {
  const raw = content?.deck;
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Deck;
  if (typeof d.title !== "string" || !Array.isArray(d.slides)) return null;
  return d;
}

export function useDeckItem(deckId: string, data?: ProjectData) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [activeId, setActiveId] = useState<string>("");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  /* Latest project data, without re-triggering saves when the object churns. */
  const dataRef = useRef<ProjectData | undefined>(data);
  dataRef.current = data;

  /* ── Load ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchMapById(deckId)
      .then((map) => {
        if (!active) return;
        const parsed = parseDeck(map.content);
        setDeck(
          parsed ?? {
            ...defaultDeck(map.title || undefined),
            id: map.id,
            title: map.title || "Untitled presentation",
          }
        );
      })
      .catch((e) => {
        if (active) {
          setError(
            e instanceof Error ? e.message : "Failed to load presentation"
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [deckId]);

  const initialised = useRef(false);
  useEffect(() => {
    if (!deck || initialised.current) return;
    initialised.current = true;
    setActiveId(deck.slides[0]?.id ?? "");
  }, [deck]);

  const activeSlide = useMemo(
    () =>
      deck?.slides.find((s) => s.id === activeId) ?? deck?.slides[0] ?? null,
    [deck, activeId]
  );
  const selectedBlock = useMemo(
    () => activeSlide?.blocks.find((b) => b.id === selectedBlockId) ?? null,
    [activeSlide, selectedBlockId]
  );

  /* ── Auto-save (debounced; rebuilds the share context) ────────────────── */
  const firstSave = useRef(true);
  useEffect(() => {
    if (!deck) return;
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    setSaveState("saving");
    const t = window.setTimeout(async () => {
      try {
        const context = dataRef.current
          ? await buildDeckContext(dataRef.current, deck)
          : { maps: [], previews: {}, project: null };
        await updateMap(deckId, {
          title: deck.title,
          description: deck.subtitle || undefined,
          content: { deck, context },
        });
        setSaveState("saved");
      } catch (e) {
        console.error("Failed to save presentation:", e);
        setSaveState("error");
      }
    }, 1000);
    return () => window.clearTimeout(t);
  }, [deck, deckId]);

  /* ── Deck-level ───────────────────────────────────────────────────────── */
  const setDeckTitle = useCallback((title: string) => {
    setDeck((d) => (d ? { ...d, title } : d));
  }, []);
  const setDeckSubtitle = useCallback((subtitle: string) => {
    setDeck((d) => (d ? { ...d, subtitle } : d));
  }, []);

  /* ── Slide operations ─────────────────────────────────────────────────── */
  const addSlide = useCallback(() => {
    const slide = makeSlide();
    setDeck((d) => (d ? { ...d, slides: [...d.slides, slide] } : d));
    setActiveId(slide.id);
  }, []);

  const duplicateSlide = useCallback((slideId: string) => {
    setDeck((d) => {
      if (!d) return d;
      const src = d.slides.find((s) => s.id === slideId);
      if (!src) return d;
      const copy: Slide = {
        ...src,
        id: uid("slide"),
        blocks: src.blocks.map((b) => ({ ...b, id: uid("blk") })),
      };
      const idx = d.slides.findIndex((s) => s.id === slideId);
      const slides = [...d.slides];
      slides.splice(idx + 1, 0, copy);
      return { ...d, slides };
    });
  }, []);

  const removeSlide = useCallback((slideId: string) => {
    setDeck((d) =>
      d ? { ...d, slides: d.slides.filter((s) => s.id !== slideId) } : d
    );
    setSelectedBlockId(null);
  }, []);

  const moveSlide = useCallback((slideId: string, dir: -1 | 1) => {
    setDeck((d) => {
      if (!d) return d;
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
    setDeck((d) =>
      d
        ? {
            ...d,
            slides: d.slides.map((s) =>
              s.id === slideId ? { ...s, ...patch } : s
            ),
          }
        : d
    );
  }, []);

  /* ── Block operations (target the active slide) ───────────────────────── */
  const addBlock = useCallback(
    (type: SlideBlockType) => {
      const block = makeBlock(type);
      setDeck((d) =>
        d
          ? {
              ...d,
              slides: d.slides.map((s) =>
                s.id === activeId ? { ...s, blocks: [...s.blocks, block] } : s
              ),
            }
          : d
      );
      setSelectedBlockId(block.id);
    },
    [activeId]
  );

  const updateBlock = useCallback(
    (blockId: string, patch: Partial<SlideBlock>) => {
      setDeck((d) =>
        d
          ? {
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
            }
          : d
      );
    },
    [activeId]
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      setDeck((d) =>
        d
          ? {
              ...d,
              slides: d.slides.map((s) =>
                s.id === activeId
                  ? { ...s, blocks: s.blocks.filter((b) => b.id !== blockId) }
                  : s
              ),
            }
          : d
      );
      setSelectedBlockId((cur) => (cur === blockId ? null : cur));
    },
    [activeId]
  );

  const duplicateBlock = useCallback(
    (blockId: string) => {
      const src = activeSlide?.blocks.find((b) => b.id === blockId);
      if (!src) return;
      const copy: SlideBlock = { ...src, id: uid("blk") };
      setDeck((d) =>
        d
          ? {
              ...d,
              slides: d.slides.map((s) => {
                if (s.id !== activeId) return s;
                const idx = s.blocks.findIndex((b) => b.id === blockId);
                const blocks = [...s.blocks];
                blocks.splice(idx + 1, 0, copy);
                return { ...s, blocks };
              }),
            }
          : d
      );
      setSelectedBlockId(copy.id);
    },
    [activeSlide, activeId]
  );

  const moveBlock = useCallback(
    (blockId: string, dir: -1 | 1) => {
      setDeck((d) =>
        d
          ? {
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
            }
          : d
      );
    },
    [activeId]
  );

  return {
    deck,
    loading,
    error,
    saveState,
    activeId: activeSlide?.id ?? "",
    activeSlide,
    selectedBlock,
    setActiveId,
    setSelectedBlockId,
    setDeckTitle,
    setDeckSubtitle,
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
