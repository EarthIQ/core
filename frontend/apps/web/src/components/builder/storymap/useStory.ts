/**
 * storymap/useStory.ts
 * --------------------
 * Owns the **library of story maps** for a project: every story, the active
 * story, the active scene, the selected block - and all create/update/reorder/
 * duplicate/remove operations - plus localStorage persistence so drafts survive
 * reloads (keyed by project id, like the presentation builder's `useDeck`).
 *
 * State is plain JSON (see types.ts); every mutation produces new objects so
 * consumers can rely on referential changes for rendering.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  defaultStory,
  makeBlock,
  makeScene,
  uid,
  type StoryBlock,
  type StoryBlockType,
  type StoryLibrary,
  type StoryMap,
  type StoryScene,
} from "./types";

function storageKey(projectId: string): string {
  return `eaiq:storymaps:${projectId}`;
}

/** Coerce parsed JSON into a valid library (defensive against partial saves). */
function loadLibrary(projectId: string, projectTitle?: string): StoryLibrary {
  if (projectId) {
    try {
      const raw = localStorage.getItem(storageKey(projectId));
      if (raw) {
        const parsed = JSON.parse(raw) as StoryLibrary;
        if (
          parsed &&
          Array.isArray(parsed.stories) &&
          parsed.stories.length &&
          parsed.stories.every((s) => Array.isArray(s.scenes))
        ) {
          const activeId = parsed.stories.some((s) => s.id === parsed.activeId)
            ? parsed.activeId
            : parsed.stories[0].id;
          return { stories: parsed.stories, activeId };
        }
      }
    } catch {
      /* fall through to a fresh library */
    }
  }
  const story = defaultStory(projectTitle);
  return { stories: [story], activeId: story.id };
}

/** Apply a transform to the active story inside a library update. */
function patchActive(
  lib: StoryLibrary,
  fn: (story: StoryMap) => StoryMap
): StoryLibrary {
  return {
    ...lib,
    stories: lib.stories.map((s) => (s.id === lib.activeId ? fn(s) : s)),
  };
}

export function useStory(projectId: string, projectTitle?: string) {
  const [library, setLibrary] = useState<StoryLibrary>(() =>
    loadLibrary(projectId, projectTitle)
  );
  const [activeSceneId, setActiveSceneId] = useState<string>("");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const activeStory = useMemo(
    () =>
      library.stories.find((s) => s.id === library.activeId) ??
      library.stories[0] ??
      null,
    [library]
  );
  const activeScene = useMemo(
    () =>
      activeStory?.scenes.find((s) => s.id === activeSceneId) ??
      activeStory?.scenes[0] ??
      null,
    [activeStory, activeSceneId]
  );
  const selectedBlock = useMemo(
    () => activeScene?.blocks.find((b) => b.id === selectedBlockId) ?? null,
    [activeScene, selectedBlockId]
  );

  /* Re-initialise when the project in scope changes. */
  const prevProject = useRef(projectId);
  useEffect(() => {
    if (prevProject.current === projectId) return;
    prevProject.current = projectId;
    const fresh = loadLibrary(projectId, projectTitle);
    setLibrary(fresh);
    setActiveSceneId(fresh.stories[0]?.scenes[0]?.id ?? "");
    setSelectedBlockId(null);
  }, [projectId, projectTitle]);

  /* Persist on every change (skipped when there is no project to scope to). */
  useEffect(() => {
    if (!projectId) return;
    try {
      localStorage.setItem(storageKey(projectId), JSON.stringify(library));
    } catch {
      /* storage full / unavailable - non-fatal */
    }
  }, [library, projectId]);

  /* ── Story-level operations ──────────────────────────────────────────── */
  const addStory = useCallback((title?: string) => {
    const story = defaultStory(title || undefined);
    setLibrary((lib) => ({
      stories: [...lib.stories, story],
      activeId: story.id,
    }));
    setActiveSceneId(story.scenes[0]?.id ?? "");
    setSelectedBlockId(null);
  }, []);

  const updateStory = useCallback(
    (storyId: string, patch: Partial<StoryMap>) => {
      setLibrary((lib) => ({
        ...lib,
        stories: lib.stories.map((s) =>
          s.id === storyId
            ? { ...s, ...patch, updatedAt: new Date().toISOString() }
            : s
        ),
      }));
    },
    []
  );

  const setActiveStoryId = useCallback(
    (storyId: string) => {
      const story = library.stories.find((s) => s.id === storyId);
      if (!story) return;
      setLibrary((lib) => ({ ...lib, activeId: storyId }));
      setActiveSceneId(story.scenes[0]?.id ?? "");
      setSelectedBlockId(null);
    },
    [library]
  );

  const duplicateStory = useCallback(
    (storyId: string) => {
      const src = library.stories.find((s) => s.id === storyId);
      if (!src) return;
      const copy: StoryMap = {
        ...src,
        id: uid("story"),
        title: `${src.title} (copy)`,
        updatedAt: new Date().toISOString(),
        scenes: src.scenes.map((sc) => ({
          ...sc,
          id: uid("scene"),
          blocks: sc.blocks.map((b) => ({ ...b, id: uid("blk") })),
        })),
      };
      setLibrary((lib) => {
        const idx = lib.stories.findIndex((s) => s.id === storyId);
        const stories = [...lib.stories];
        stories.splice(idx + 1, 0, copy);
        return { stories, activeId: copy.id };
      });
      setActiveSceneId(copy.scenes[0]?.id ?? "");
      setSelectedBlockId(null);
    },
    [library]
  );

  const removeStory = useCallback(
    (storyId: string) => {
      if (library.stories.length <= 1) return;
      const nextActiveId =
        storyId === library.activeId
          ? (library.stories.find((s) => s.id !== storyId)?.id ?? "")
          : library.activeId;
      const nextStory = library.stories.find((s) => s.id === nextActiveId);
      setLibrary((lib) => ({
        stories: lib.stories.filter((s) => s.id !== storyId),
        activeId: nextActiveId,
      }));
      if (storyId === library.activeId) {
        setActiveSceneId(nextStory?.scenes[0]?.id ?? "");
        setSelectedBlockId(null);
      }
    },
    [library]
  );

  /* ── Scene operations (target the active story) ───────────────────────── */
  const addScene = useCallback(() => {
    if (!activeStory) return;
    const scene = makeScene({ name: `Scene ${activeStory.scenes.length + 1}` });
    setLibrary((lib) =>
      patchActive(lib, (story) => ({
        ...story,
        scenes: [...story.scenes, scene],
        updatedAt: new Date().toISOString(),
      }))
    );
    setActiveSceneId(scene.id);
    setSelectedBlockId(null);
  }, [activeStory]);

  const updateScene = useCallback(
    (sceneId: string, patch: Partial<StoryScene>) => {
      setLibrary((lib) =>
        patchActive(lib, (story) => ({
          ...story,
          scenes: story.scenes.map((s) =>
            s.id === sceneId ? { ...s, ...patch } : s
          ),
          updatedAt: new Date().toISOString(),
        }))
      );
    },
    []
  );

  const duplicateScene = useCallback(
    (sceneId: string) => {
      const src = activeStory?.scenes.find((s) => s.id === sceneId);
      if (!activeStory || !src) return;
      const copy: StoryScene = {
        ...src,
        id: uid("scene"),
        name: `${src.name} (copy)`,
        blocks: src.blocks.map((b) => ({ ...b, id: uid("blk") })),
      };
      setLibrary((lib) =>
        patchActive(lib, (story) => {
          const idx = story.scenes.findIndex((s) => s.id === sceneId);
          if (idx < 0) return story;
          const scenes = [...story.scenes];
          scenes.splice(idx + 1, 0, copy);
          return { ...story, scenes, updatedAt: new Date().toISOString() };
        })
      );
      setActiveSceneId(copy.id);
      setSelectedBlockId(null);
    },
    [activeStory]
  );

  const removeScene = useCallback(
    (sceneId: string) => {
      const story = activeStory;
      if (!story || story.scenes.length <= 1) return;
      if (sceneId === activeSceneId) {
        const remaining = story.scenes.filter((s) => s.id !== sceneId);
        const idx = story.scenes.findIndex((s) => s.id === sceneId);
        setActiveSceneId(
          remaining[Math.min(idx, remaining.length - 1)]?.id ?? ""
        );
      }
      setSelectedBlockId(null);
      setLibrary((lib) => {
        const cur = lib.stories.find((s) => s.id === lib.activeId);
        if (!cur || cur.scenes.length <= 1) return lib;
        return patchActive(lib, (s) => ({
          ...s,
          scenes: s.scenes.filter((s2) => s2.id !== sceneId),
          updatedAt: new Date().toISOString(),
        }));
      });
    },
    [activeStory, activeSceneId]
  );

  const moveScene = useCallback((sceneId: string, dir: -1 | 1) => {
    setLibrary((lib) =>
      patchActive(lib, (story) => {
        const idx = story.scenes.findIndex((s) => s.id === sceneId);
        const to = idx + dir;
        if (idx < 0 || to < 0 || to >= story.scenes.length) return story;
        const scenes = [...story.scenes];
        const [moved] = scenes.splice(idx, 1);
        scenes.splice(to, 0, moved);
        return { ...story, scenes, updatedAt: new Date().toISOString() };
      })
    );
  }, []);

  /* ── Block operations (target the active scene) ───────────────────────── */
  const addBlock = useCallback(
    (type: StoryBlockType) => {
      const block = makeBlock(type);
      setLibrary((lib) =>
        patchActive(lib, (story) => ({
          ...story,
          scenes: story.scenes.map((s) =>
            s.id === activeSceneId ? { ...s, blocks: [...s.blocks, block] } : s
          ),
          updatedAt: new Date().toISOString(),
        }))
      );
      setSelectedBlockId(block.id);
    },
    [activeSceneId]
  );

  const updateBlock = useCallback(
    (blockId: string, patch: Partial<StoryBlock>) => {
      setLibrary((lib) =>
        patchActive(lib, (story) => ({
          ...story,
          scenes: story.scenes.map((s) =>
            s.id === activeSceneId
              ? {
                  ...s,
                  blocks: s.blocks.map((b) =>
                    b.id === blockId ? { ...b, ...patch } : b
                  ),
                }
              : s
          ),
          updatedAt: new Date().toISOString(),
        }))
      );
    },
    [activeSceneId]
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      setLibrary((lib) =>
        patchActive(lib, (story) => ({
          ...story,
          scenes: story.scenes.map((s) =>
            s.id === activeSceneId
              ? { ...s, blocks: s.blocks.filter((b) => b.id !== blockId) }
              : s
          ),
          updatedAt: new Date().toISOString(),
        }))
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
      setLibrary((lib) =>
        patchActive(lib, (story) => ({
          ...story,
          scenes: story.scenes.map((s) => {
            if (s.id !== activeSceneId) return s;
            const idx = s.blocks.findIndex((b) => b.id === blockId);
            const blocks = [...s.blocks];
            blocks.splice(idx + 1, 0, copy);
            return { ...s, blocks };
          }),
          updatedAt: new Date().toISOString(),
        }))
      );
      setSelectedBlockId(copy.id);
    },
    [activeScene, activeSceneId]
  );

  const moveBlock = useCallback(
    (blockId: string, dir: -1 | 1) => {
      setLibrary((lib) =>
        patchActive(lib, (story) => ({
          ...story,
          scenes: story.scenes.map((s) => {
            if (s.id !== activeSceneId) return s;
            const idx = s.blocks.findIndex((b) => b.id === blockId);
            const to = idx + dir;
            if (idx < 0 || to < 0 || to >= s.blocks.length) return s;
            const blocks = [...s.blocks];
            const [moved] = blocks.splice(idx, 1);
            blocks.splice(to, 0, moved);
            return { ...s, blocks };
          }),
          updatedAt: new Date().toISOString(),
        }))
      );
    },
    [activeSceneId]
  );

  return {
    stories: library.stories,
    activeStory,
    activeSceneId: activeScene?.id ?? "",
    activeScene,
    selectedBlock,
    setActiveStoryId,
    setActiveSceneId,
    setSelectedBlockId,
    addStory,
    updateStory,
    duplicateStory,
    removeStory,
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
