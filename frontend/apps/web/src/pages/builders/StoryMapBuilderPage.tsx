/**
 * Story Map builder - narrative, guided journeys through a project's maps.
 *
 * Mirrors the presentation builder's architecture: a data-driven 3-pane
 * workspace (scene rail · scene canvas · inspector) inside the shared
 * `BuilderScaffold`, with state in `useStory` (a **library of multiple story
 * maps** per project, persisted to localStorage). Toolbar actions:
 *   - switch / manage story maps (new, duplicate, delete) via the stories menu
 *   - Preview: fullscreen guided viewing (`PreviewMode`)
 *   - Share: a self-contained public link (`ShareStoryDialog` →
 *     `/share/story/:token`, rendered by `PublicStoryMapPage`)
 *
 * Scene content is composed from blocks (text, key points, live map, image,
 * KPI, quote) with an ArcGIS-style scene layout (text·map, map·text,
 * map-on-top, stacked) - authored in the canvas + inspector, rendered by the
 * shared `StorySceneView`.
 */
import { Button, Input } from "@packages/ui";
import {
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Link2,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { BuilderScaffold } from "@/components/builder/BuilderScaffold";
import { SidebarHeader } from "@/components/builder/BuilderWorkspace";
import { useProjectData } from "@/components/builder/presentation";
import {
  Inspector,
  PreviewMode,
  SceneThumb,
  ShareStoryDialog,
  StorySceneView,
  useStory,
  type BlockAction,
} from "@/components/builder/storymap";
import { getProjectBuilder } from "@/lib/builders";

const Editor = ({ projectId }: { projectId: string }) => {
  const data = useProjectData(projectId);
  const lib = useStory(projectId, data.project?.title);
  const [previewing, setPreviewing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /* Close the stories menu on outside click / Escape */
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const story = lib.activeStory;
  const scene = lib.activeScene;
  const scenes = story?.scenes ?? [];
  const sceneIndex = scene
    ? Math.max(
        scenes.findIndex((s) => s.id === scene.id),
        0
      )
    : 0;
  const blockIndex =
    scene && lib.selectedBlock
      ? scene.blocks.findIndex((b) => b.id === lib.selectedBlock?.id)
      : -1;

  function handleBlockAction(blockId: string, action: BlockAction) {
    switch (action) {
      case "up":
        lib.moveBlock(blockId, -1);
        break;
      case "down":
        lib.moveBlock(blockId, 1);
        break;
      case "duplicate":
        lib.duplicateBlock(blockId);
        break;
      case "delete":
        lib.removeBlock(blockId);
        break;
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
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {data.error}
          </p>
        </div>
      </div>
    );
  }

  if (!story) return null;

  /* Maps + project view for the canvas (structural match with SceneData). */
  const sceneData = { maps: data.maps, project: data.project };

  return (
    <div className="flex flex-col gap-3">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56 max-w-full">
          <Input
            aria-label="Story map title"
            inputSize="sm"
            value={story.title}
            onChange={(e) =>
              lib.updateStory(story.id, { title: e.target.value })
            }
          />
        </div>

        {/* Stories menu: switch / manage the project's story maps */}
        <div
          ref={menuRef}
          className="relative"
        >
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <BookOpen
              className="text-[var(--primary)]"
              size={15}
            />
            {lib.stories.length} story map
            {lib.stories.length === 1 ? "" : "s"}
            <ChevronDown
              className="text-[var(--text-tertiary)]"
              size={14}
            />
          </button>

          {menuOpen ? (
            <div
              className="absolute top-full left-0 z-[var(--z-dropdown)] mt-1 w-72 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-2 shadow-lg"
              role="menu"
            >
              <p className="px-2 pt-1 pb-1.5 text-xs font-semibold tracking-wider text-[var(--text-tertiary)] uppercase">
                Your story maps
              </p>
              <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
                {lib.stories.map((s) => {
                  const active = s.id === story.id;
                  return (
                    <div
                      key={s.id}
                      className="group flex items-center gap-1 rounded-lg"
                    >
                      <button
                        aria-checked={active}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--surface-hover)]"
                        role="menuitemradio"
                        type="button"
                        onClick={() => {
                          lib.setActiveStoryId(s.id);
                          setMenuOpen(false);
                        }}
                      >
                        <span className="flex w-4 shrink-0 justify-center">
                          {active ? (
                            <Check
                              className="text-[var(--primary)]"
                              size={14}
                            />
                          ) : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[var(--text-primary)]">
                            {s.title}
                          </span>
                          <span className="block text-xs text-[var(--text-tertiary)]">
                            {s.scenes.length} scene
                            {s.scenes.length === 1 ? "" : "s"}
                          </span>
                        </span>
                      </button>
                      <button
                        aria-label={`Duplicate ${s.title}`}
                        className="cursor-pointer rounded-md p-1.5 text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                        title="Duplicate story map"
                        type="button"
                        onClick={() => {
                          lib.duplicateStory(s.id);
                          setMenuOpen(false);
                        }}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        aria-label={`Delete ${s.title}`}
                        className="cursor-pointer rounded-md p-1.5 text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--surface-hover)] hover:text-[var(--error-text)] disabled:pointer-events-none disabled:opacity-30"
                        disabled={lib.stories.length <= 1}
                        type="button"
                        title={
                          lib.stories.length <= 1
                            ? "A project keeps at least one story map"
                            : "Delete story map"
                        }
                        onClick={() => {
                          lib.removeStory(s.id);
                          setMenuOpen(false);
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="my-1.5 h-px border-[var(--border-primary)]" />
              <button
                className="text-primary hover:bg-primary/10 flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors"
                role="menuitem"
                type="button"
                onClick={() => {
                  lib.addStory();
                  setMenuOpen(false);
                }}
              >
                <Plus size={14} />
                New story map
              </button>
            </div>
          ) : null}
        </div>

        <span className="text-xs text-[var(--text-tertiary)]">
          {scenes.length} scene{scenes.length === 1 ? "" : "s"}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Button
            leftIcon={<Link2 size={14} />}
            size="sm"
            variant="ghost"
            onClick={() => setSharing(true)}
          >
            Share
          </Button>
          <Button
            leftIcon={<Play size={14} />}
            size="sm"
            onClick={() => setPreviewing(true)}
          >
            Preview
          </Button>
        </div>
      </div>

      {/* ── 3-pane body: scenes · canvas · inspector ────────────────────── */}
      <div className="flex h-[calc(100vh-240px)] min-h-[460px] gap-3">
        {/* Scene rail */}
        <aside className="flex w-[232px] shrink-0 flex-col rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-2">
          <SidebarHeader
            addLabel="Add"
            title="Scenes"
            onAdd={lib.addScene}
          />
          <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
            {scenes.map((s, i) => (
              <SceneThumb
                key={s.id}
                active={s.id === scene?.id}
                canRemove={scenes.length > 1}
                index={i}
                scene={s}
                onDuplicate={() => lib.duplicateScene(s.id)}
                onRemove={() => lib.removeScene(s.id)}
                onSelect={() => lib.setActiveSceneId(s.id)}
              />
            ))}
          </div>
        </aside>

        {/* Canvas */}
        <main className="min-w-0 flex-1 overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
          {scene ? (
            <StorySceneView
              data={sceneData}
              index={sceneIndex}
              mode="edit"
              scene={scene}
              total={scenes.length}
              edit={{
                selectedBlockId: lib.selectedBlock?.id ?? null,
                onSelect: (id) => lib.setSelectedBlockId(id),
                onAction: handleBlockAction,
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--text-tertiary)]">
              Add a scene to start building the story.
            </div>
          )}
        </main>

        {/* Inspector */}
        <aside className="w-[316px] shrink-0 overflow-y-auto rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-4">
          {scene ? (
            <Inspector
              block={lib.selectedBlock}
              blockCount={scene.blocks.length}
              blockIndex={blockIndex}
              maps={data.maps.map((m) => ({ id: m.id, title: m.title }))}
              scene={scene}
              onAddBlock={lib.addBlock}
              onBlockAction={handleBlockAction}
              onScene={(patch) => lib.updateScene(scene.id, patch)}
              onUpdateBlock={lib.updateBlock}
            />
          ) : (
            <p className="text-sm text-[var(--text-tertiary)]">
              Select a scene to edit it.
            </p>
          )}
        </aside>
      </div>

      {/* ── Overlays ────────────────────────────────────────────────────── */}
      {previewing ? (
        <PreviewMode
          data={sceneData}
          story={story}
          onClose={() => setPreviewing(false)}
        />
      ) : null}
      <ShareStoryDialog
        data={sceneData}
        open={sharing}
        story={story}
        onClose={() => setSharing(false)}
      />
    </div>
  );
};

/**
 * Story Map builder page. Reads `?projectId=` from the URL and renders the
 * editor inside the shared builder scaffold (full-width for the wide canvas).
 */
export default function StoryMapBuilderPage() {
  const [params] = useSearchParams();
  const projectId = params.get("projectId") ?? "";
  const builder = getProjectBuilder("story-map");

  if (!builder) return null;

  return (
    <BuilderScaffold
      wide
      builder={builder}
      projectId={projectId}
    >
      <Editor projectId={projectId} />
    </BuilderScaffold>
  );
}
