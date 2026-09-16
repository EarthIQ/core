/**
 * Story Map builder - narrative, guided journeys through a project's maps.
 *
 * Two views under one route (`?projectId=`, optionally `&storyId=`):
 *   - **no storyId** → a `PublishedGrid` of the project's story maps
 *     (`maps` rows with `kind="story_map"`): create, open, duplicate, share,
 *     delete - sharing rides the standard `ShareDialog` + share subsystem.
 *   - **storyId**    → the single-story editor (scene rail · canvas ·
 *     inspector) that **auto-saves to the server**; Preview uses
 *     `PreviewMode`, the public link is `/share/story/:id`
 *     (rendered by `PublicStoryMapPage`).
 *
 * Scene content is composed from blocks (text, key points, live map, image,
 * KPI, quote) with an ArcGIS-style scene layout - authored in the canvas +
 * inspector, rendered by the shared `StorySceneView`.
 */
import { Button, Input, Spinner, useToast } from "@packages/ui";
import { ArrowLeft, BookOpen, Play, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { BuilderScaffold } from "@/components/builder/BuilderScaffold";
import { SidebarHeader } from "@/components/builder/BuilderWorkspace";
import { useProjectData } from "@/components/builder/presentation";
import { PublishedGrid } from "@/components/builder/PublishedGrid";
import {
  Inspector,
  PreviewMode,
  SceneThumb,
  StorySceneView,
  defaultStory,
  hydrateForShare,
  useStoryItem,
  type BlockAction,
  type StoryMap,
  type StoryShareData,
} from "@/components/builder/storymap";
import { ShareDialog } from "@/components/map/share/ShareDialog";
import { getProjectBuilder } from "@/lib/builders";
import { createMap, deleteMap, fetchMaps, type MapItem } from "@/lib/maps";

const origin = typeof window !== "undefined" ? window.location.origin : "";
const shareUrlFor = (id: string) => `${origin}/share/story/${id}`;
const canManage = (item: MapItem) =>
  item.user_permission === "admin" || item.user_permission === "write";

/* ── List view ────────────────────────────────────────────────────────────── */

const StoryMapList = ({ projectId }: { projectId: string }) => {
  const data = useProjectData(projectId);
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [shareTarget, setShareTarget] = useState<MapItem | null>(null);

  const shareData = useMemo<StoryShareData>(
    () => ({ maps: data.maps, project: data.project }),
    [data.maps, data.project]
  );

  const openEditor = (id: string) =>
    navigate(
      `/builder/story-map?projectId=${encodeURIComponent(projectId)}&storyId=${encodeURIComponent(id)}`
    );

  const handleNew = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const story = defaultStory(data.project?.title);
      const map = await createMap({
        title: story.title,
        description: story.subtitle || undefined,
        kind: "story_map",
        is_public: false,
        project_id: projectId,
        content: { story: hydrateForShare(story, shareData) },
      });
      openEditor(map.id);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to create story map");
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicate = async (item: MapItem) => {
    if (busy) return;
    setBusy(true);
    try {
      const story =
        (item.content?.story as StoryMap | undefined) ??
        defaultStory(item.title);
      await createMap({
        title: `${item.title} (copy)`,
        description: item.description,
        kind: "story_map",
        is_public: false,
        project_id: projectId,
        content: { story },
      });
      toastSuccess(`Duplicated "${item.title}"`);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toastError(
        e instanceof Error ? e.message : "Failed to duplicate story map"
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (item: MapItem) => {
    await deleteMap(item.id);
    toastSuccess(`Deleted "${item.title}"`);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-3">
      <PublishedGrid
        Icon={BookOpen}
        canManage={canManage}
        fetchItems={() => fetchMaps({ projectId, kind: "story_map" })}
        iconClassName="text-[var(--accent)] bg-[var(--accent)]/10"
        noun="story map"
        refreshKey={refreshKey}
        shareUrlFor={(m) => shareUrlFor(m.id)}
        metaFor={(m) => {
          const story = m.content?.story as StoryMap | undefined;
          const n = story?.scenes?.length ?? 0;
          return n ? `${n} scene${n === 1 ? "" : "s"}` : "";
        }}
        onDelete={(m) => void handleDelete(m)}
        onDuplicate={(m) => void handleDuplicate(m)}
        onNew={() => void handleNew()}
        onOpen={(m) => openEditor(m.id)}
        onShare={(m) => setShareTarget(m)}
      />
      {shareTarget ? (
        <ShareDialog
          canManage={canManage(shareTarget)}
          entityId={shareTarget.id}
          entityTitle={shareTarget.title}
          entityType="map"
          open={!!shareTarget}
          shareUrl={shareUrlFor(shareTarget.id)}
          onClose={() => setShareTarget(null)}
        />
      ) : null}
    </div>
  );
};

/* ── Editor view ──────────────────────────────────────────────────────────── */

const StoryMapEditor = ({
  projectId,
  storyId,
}: {
  projectId: string;
  storyId: string;
}) => {
  const data = useProjectData(projectId);
  const navigate = useNavigate();
  const [previewing, setPreviewing] = useState(false);
  const [sharing, setSharing] = useState(false);

  const shareData = useMemo<StoryShareData>(
    () => ({ maps: data.maps, project: data.project }),
    [data.maps, data.project]
  );
  const lib = useStoryItem(storyId, shareData);

  const story = lib.story;
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

  const backToList = () =>
    navigate(`/builder/story-map?projectId=${encodeURIComponent(projectId)}`);

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

  const saveLabel =
    lib.saveState === "saving"
      ? "Saving…"
      : lib.saveState === "saved"
        ? "Saved"
        : lib.saveState === "error"
          ? "Save failed"
          : null;

  /* ── Loading / error ──────────────────────────────────────────────────── */
  if (lib.loading) {
    return (
      <div className="flex h-[calc(100vh-220px)] min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[var(--text-tertiary)]">
          <Spinner size="lg" />
          <p className="text-sm">Loading story map…</p>
        </div>
      </div>
    );
  }

  if (lib.error) {
    return (
      <div className="flex h-[calc(100vh-220px)] min-h-[420px] items-center justify-center">
        <div className="max-w-md rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-5 text-center">
          <p className="text-sm font-semibold text-[var(--error-text)]">
            Couldn't open this story map
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {lib.error}
          </p>
          <Button
            className="mt-4"
            size="sm"
            variant="ghost"
            onClick={backToList}
          >
            <ArrowLeft size={14} />
            Back to story maps
          </Button>
        </div>
      </div>
    );
  }

  if (!story) return null;

  const sceneData = { maps: data.maps, project: data.project };

  return (
    <div className="flex flex-col gap-3">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          iconOnly
          aria-label="Back to story maps"
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          size="sm"
          variant="ghost"
          onClick={backToList}
        >
          <ArrowLeft size={16} />
        </Button>
        <div className="w-64 max-w-full">
          <Input
            aria-label="Story map title"
            inputSize="sm"
            value={story.title}
            onChange={(e) => lib.updateStory({ title: e.target.value })}
          />
        </div>
        <span className="text-xs text-[var(--text-tertiary)]">
          {scenes.length} scene{scenes.length === 1 ? "" : "s"}
        </span>
        {saveLabel ? (
          <span
            aria-live="polite"
            className={`text-xs ${
              lib.saveState === "error"
                ? "text-[var(--error-text)]"
                : "text-[var(--text-tertiary)]"
            }`}
          >
            {saveLabel}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <Button
            leftIcon={<Share2 size={14} />}
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

      {/* ── 3-pane body ──────────────────────────────────────────────────── */}
      <div className="flex h-[calc(100vh-220px)] min-h-[460px] gap-3">
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

      {/* ── Overlays ─────────────────────────────────────────────────────── */}
      {previewing ? (
        <PreviewMode
          data={sceneData}
          story={story}
          onClose={() => setPreviewing(false)}
        />
      ) : null}
      {sharing ? (
        <ShareDialog
          canManage
          entityId={storyId}
          entityTitle={story.title}
          entityType="map"
          open={sharing}
          shareUrl={shareUrlFor(storyId)}
          onClose={() => setSharing(false)}
        />
      ) : null}
    </div>
  );
};

/* ── Page ─────────────────────────────────────────────────────────────────── */

/**
 * Story Map builder page. Reads `?projectId=` (and optional `&storyId=`)
 * from the URL and renders the list or the editor inside the shared builder
 * scaffold (full-width for the wide canvas).
 */
export default function StoryMapBuilderPage() {
  const [params] = useSearchParams();
  const projectId = params.get("projectId") ?? "";
  const storyId = params.get("storyId");
  const builder = getProjectBuilder("story-map");

  if (!builder) return null;

  return (
    <BuilderScaffold
      wide
      builder={builder}
      projectId={projectId}
    >
      {storyId ? (
        <StoryMapEditor
          projectId={projectId}
          storyId={storyId}
        />
      ) : (
        <StoryMapList projectId={projectId} />
      )}
    </BuilderScaffold>
  );
}
