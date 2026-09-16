/**
 * storymap/useStoryItem.ts
 * ------------------------
 * Owns a **single story map item** - a `maps` row with `kind="story_map"` whose
 * `content` is `{ story: StoryMap }`. The hook loads the story from the server
 * on mount, exposes every scene/block operation (create/update/reorder/
 * duplicate/remove), and **auto-saves** debounced writes back to the server
 * (title + description + hydrated content, so the public link is always
 * self-contained).
 *
 * Every mutation produces new objects so consumers can rely on referential
 * changes for rendering.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchMapById, updateMap } from "@/lib/maps";

import { hydrateForShare, type StoryShareData } from "./share";
import {
  defaultStory,
  makeBlock,
  makeScene,
  uid,
  type StoryBlock,
  type StoryBlockType,
  type StoryMap,
  type StoryScene,
} from "./types";

export type SaveState = "idle" | "saving" | "saved" | "error";

/** Deep-copy a scene with fresh block ids (for duplication). */
function copyScene(scene: StoryScene): StoryScene {
  return {
    ...scene,
    id: uid("scene"),
    blocks: scene.blocks.map((b) => ({ ...b, id: uid("blk") })),
  };
}

/** Parse and validate a stored story payload (defensive). */
function parseStory(
  content: Record<string, unknown> | null | undefined
): StoryMap | null {
  const raw = content?.story;
  if (!raw || typeof raw !== "object") return null;
  const s = raw as StoryMap;
  if (
    typeof s.title !== "string" ||
    !Array.isArray(s.scenes) ||
    s.scenes.some((sc) => !Array.isArray(sc.blocks))
  ) {
    return null;
  }
  return s;
}

export function useStoryItem(storyId: string, shareData?: StoryShareData) {
  const [story, setStory] = useState<StoryMap | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string>("");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  /* Latest share data, without re-triggering saves when the object churns. */
  const shareDataRef = useRef<StoryShareData | undefined>(shareData);
  shareDataRef.current = shareData;

  /* ── Load ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchMapById(storyId)
      .then((map) => {
        if (!active) return;
        const parsed = parseStory(map.content);
        setStory(
          parsed ?? {
            ...defaultStory(),
            id: map.id,
            title: map.title || "Untitled story",
          }
        );
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load story map");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [storyId]);

  /* First valid story sets the active scene. */
  const initialised = useRef(false);
  useEffect(() => {
    if (!story || initialised.current) return;
    initialised.current = true;
    setActiveSceneId(story.scenes[0]?.id ?? "");
  }, [story]);

  const activeScene = useMemo(
    () =>
      story?.scenes.find((s) => s.id === activeSceneId) ??
      story?.scenes[0] ??
      null,
    [story, activeSceneId]
  );
  const selectedBlock = useMemo(
    () => activeScene?.blocks.find((b) => b.id === selectedBlockId) ?? null,
    [activeScene, selectedBlockId]
  );

  /* ── Auto-save (debounced) ────────────────────────────────────────────── */
  const firstSave = useRef(true);
  useEffect(() => {
    if (!story) return;
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    setSaveState("saving");
    const t = window.setTimeout(async () => {
      try {
        const hydrated = hydrateForShare(story, shareDataRef.current);
        await updateMap(storyId, {
          title: story.title,
          description: story.subtitle || undefined,
          content: { story: hydrated },
        });
        setSaveState("saved");
      } catch (e) {
        console.error("Failed to save story map:", e);
        setSaveState("error");
      }
    }, 1000);
    return () => window.clearTimeout(t);
  }, [story, storyId]);

  /* ── Story-level ──────────────────────────────────────────────────────── */
  const updateStory = useCallback(
    (patch: Partial<Omit<StoryMap, "id" | "scenes">>) => {
      setStory((s) =>
        s ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s
      );
    },
    []
  );

  /* ── Scene operations ─────────────────────────────────────────────────── */
  const addScene = useCallback(() => {
    const scene = makeScene({ name: "Scene" });
    setStory((s) =>
      s
        ? {
            ...s,
            scenes: [...s.scenes, scene],
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    setActiveSceneId(scene.id);
  }, []);

  const updateScene = useCallback(
    (sceneId: string, patch: Partial<Omit<StoryScene, "id" | "blocks">>) => {
      setStory((s) =>
        s
          ? {
              ...s,
              scenes: s.scenes.map((sc) =>
                sc.id === sceneId ? { ...sc, ...patch } : sc
              ),
              updatedAt: new Date().toISOString(),
            }
          : s
      );
    },
    []
  );

  const duplicateScene = useCallback((sceneId: string) => {
    setStory((s) => {
      if (!s) return s;
      const src = s.scenes.find((sc) => sc.id === sceneId);
      if (!src) return s;
      const copy = copyScene(src);
      const idx = s.scenes.findIndex((sc) => sc.id === sceneId);
      const scenes = [...s.scenes];
      scenes.splice(idx + 1, 0, copy);
      return { ...s, scenes, updatedAt: new Date().toISOString() };
    });
  }, []);

  const removeScene = useCallback((sceneId: string) => {
    setStory((s) =>
      s
        ? {
            ...s,
            scenes: s.scenes.filter((sc) => sc.id !== sceneId),
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    setSelectedBlockId(null);
  }, []);

  const moveScene = useCallback((sceneId: string, dir: -1 | 1) => {
    setStory((s) => {
      if (!s) return s;
      const idx = s.scenes.findIndex((sc) => sc.id === sceneId);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= s.scenes.length) return s;
      const scenes = [...s.scenes];
      const [moved] = scenes.splice(idx, 1);
      scenes.splice(to, 0, moved);
      return { ...s, scenes, updatedAt: new Date().toISOString() };
    });
  }, []);

  /* ── Block operations (target the active scene) ────────────────────────── */
  const addBlock = useCallback(
    (type: StoryBlockType) => {
      const block = makeBlock(type);
      setStory((s) =>
        s
          ? {
              ...s,
              scenes: s.scenes.map((sc) =>
                sc.id === activeSceneId
                  ? { ...sc, blocks: [...sc.blocks, block] }
                  : sc
              ),
              updatedAt: new Date().toISOString(),
            }
          : s
      );
      setSelectedBlockId(block.id);
    },
    [activeSceneId]
  );

  const updateBlock = useCallback(
    (blockId: string, patch: Partial<StoryBlock>) => {
      setStory((s) =>
        s
          ? {
              ...s,
              scenes: s.scenes.map((sc) =>
                sc.id === activeSceneId
                  ? {
                      ...sc,
                      blocks: sc.blocks.map((b) =>
                        b.id === blockId ? { ...b, ...patch } : b
                      ),
                    }
                  : sc
              ),
              updatedAt: new Date().toISOString(),
            }
          : s
      );
    },
    [activeSceneId]
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      setStory((s) =>
        s
          ? {
              ...s,
              scenes: s.scenes.map((sc) =>
                sc.id === activeSceneId
                  ? {
                      ...sc,
                      blocks: sc.blocks.filter((b) => b.id !== blockId),
                    }
                  : sc
              ),
              updatedAt: new Date().toISOString(),
            }
          : s
      );
      setSelectedBlockId((cur) => (cur === blockId ? null : cur));
    },
    [activeSceneId]
  );

  const duplicateBlock = useCallback(
    (blockId: string) => {
      const src = activeScene?.blocks.find((b) => b.id === blockId);
      if (!src) return;
      const copy: StoryBlock = { ...src, id: uid("blk") };
      setStory((s) =>
        s
          ? {
              ...s,
              scenes: s.scenes.map((sc) => {
                if (sc.id !== activeSceneId) return sc;
                const idx = sc.blocks.findIndex((b) => b.id === blockId);
                const blocks = [...sc.blocks];
                blocks.splice(idx + 1, 0, copy);
                return { ...sc, blocks };
              }),
              updatedAt: new Date().toISOString(),
            }
          : s
      );
      setSelectedBlockId(copy.id);
    },
    [activeScene, activeSceneId]
  );

  const moveBlock = useCallback(
    (blockId: string, dir: -1 | 1) => {
      setStory((s) =>
        s
          ? {
              ...s,
              scenes: s.scenes.map((sc) => {
                if (sc.id !== activeSceneId) return sc;
                const idx = sc.blocks.findIndex((b) => b.id === blockId);
                const to = idx + dir;
                if (idx < 0 || to < 0 || to >= sc.blocks.length) return sc;
                const blocks = [...sc.blocks];
                const [moved] = blocks.splice(idx, 1);
                blocks.splice(to, 0, moved);
                return { ...sc, blocks };
              }),
              updatedAt: new Date().toISOString(),
            }
          : s
      );
    },
    [activeSceneId]
  );

  return {
    story,
    loading,
    error,
    saveState,
    activeSceneId: activeScene?.id ?? "",
    activeScene,
    selectedBlock,
    setActiveSceneId,
    setSelectedBlockId,
    updateStory,
    addScene,
    updateScene,
    duplicateScene,
    removeScene,
    moveScene,
    addBlock,
    updateBlock,
    removeBlock,
    duplicateBlock,
    moveBlock,
  };
}
