/**
 * Presentation builder - decks composed of slides (title · text · KPI · chart ·
 * table · map) built on the same block + inspector patterns as the story map.
 *
 * Two views under one route (`?projectId=`, optionally `&deckId=`):
 *   - **no deckId** → a `PublishedGrid` of the project's presentations
 *     (`maps` rows with `kind="presentation"`): create, open, duplicate,
 *     share, delete - sharing rides the standard `ShareDialog` + share
 *     subsystem.
 *   - **deckId**    → the single-deck editor (slide rail · canvas · inspector)
 *     that **auto-saves to the server** (rebuilding the share context on each
 *     save); Present mode uses `PresentMode`, the public link is
 *     `/share/presentation/:id` (rendered by `PublicPresentationPage`).
 */
import { Button, Input, Spinner, useToast } from "@packages/ui";
import { ArrowLeft, MonitorPlay, Plus, Share2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { BuilderScaffold } from "@/components/builder/BuilderScaffold";
import { SidebarHeader } from "@/components/builder/BuilderWorkspace";
import {
  Inspector,
  PresentMode,
  SlideCanvas,
  SlideThumb,
  defaultDeck,
  useDeckItem,
  useProjectData,
  type BlockAction,
  type Deck,
} from "@/components/builder/presentation";
import { PublishedGrid } from "@/components/builder/PublishedGrid";
import { ShareDialog } from "@/components/map/share/ShareDialog";
import { getProjectBuilder } from "@/lib/builders";
import { createMap, deleteMap, fetchMaps, type MapItem } from "@/lib/maps";

const origin = typeof window !== "undefined" ? window.location.origin : "";
const shareUrlFor = (id: string) => `${origin}/share/presentation/${id}`;
const canManage = (item: MapItem) =>
  item.user_permission === "admin" || item.user_permission === "write";

/* ── List view ────────────────────────────────────────────────────────────── */

const PresentationList = ({ projectId }: { projectId: string }) => {
  const data = useProjectData(projectId);
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [shareTarget, setShareTarget] = useState<MapItem | null>(null);

  const openEditor = (id: string) =>
    navigate(
      `/builder/presentation?projectId=${encodeURIComponent(projectId)}&deckId=${encodeURIComponent(id)}`
    );

  const handleNew = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const deck = defaultDeck(data.project?.title);
      const map = await createMap({
        title: deck.title,
        description: deck.subtitle || undefined,
        kind: "presentation",
        is_public: false,
        project_id: projectId,
        content: {
          deck,
          context: { maps: [], previews: {}, project: null },
        },
      });
      openEditor(map.id);
    } catch (e) {
      toastError(
        e instanceof Error ? e.message : "Failed to create presentation"
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicate = async (item: MapItem) => {
    if (busy) return;
    setBusy(true);
    try {
      const deck =
        (item.content?.deck as Deck | undefined) ?? defaultDeck(item.title);
      await createMap({
        title: `${item.title} (copy)`,
        description: item.description,
        kind: "presentation",
        is_public: false,
        project_id: projectId,
        content: { deck, context: { maps: [], previews: {}, project: null } },
      });
      toastSuccess(`Duplicated "${item.title}"`);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toastError(
        e instanceof Error ? e.message : "Failed to duplicate presentation"
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
        Icon={MonitorPlay}
        canManage={canManage}
        fetchItems={() => fetchMaps({ projectId, kind: "presentation" })}
        iconClassName="text-[var(--secondary)] bg-[var(--secondary)]/10"
        noun="presentation"
        refreshKey={refreshKey}
        shareUrlFor={(m) => shareUrlFor(m.id)}
        metaFor={(m) => {
          const deck = m.content?.deck as Deck | undefined;
          const n = deck?.slides?.length ?? 0;
          return n ? `${n} slide${n === 1 ? "" : "s"}` : "";
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

const PresentationEditor = ({
  projectId,
  deckId,
}: {
  projectId: string;
  deckId: string;
}) => {
  const data = useProjectData(projectId);
  const navigate = useNavigate();
  const [presenting, setPresenting] = useState(false);
  const [sharing, setSharing] = useState(false);

  const lib = useDeckItem(deckId, data);

  const deck = lib.deck;
  const slide = lib.activeSlide;
  const slides = deck?.slides ?? [];

  const backToList = () =>
    navigate(
      `/builder/presentation?projectId=${encodeURIComponent(projectId)}`
    );

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
          <p className="text-sm">Loading presentation…</p>
        </div>
      </div>
    );
  }

  if (lib.error) {
    return (
      <div className="flex h-[calc(100vh-220px)] min-h-[420px] items-center justify-center">
        <div className="max-w-md rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-5 text-center">
          <p className="text-sm font-semibold text-[var(--error-text)]">
            Couldn't open this presentation
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
            Back to presentations
          </Button>
        </div>
      </div>
    );
  }

  if (!deck) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          iconOnly
          aria-label="Back to presentations"
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          size="sm"
          variant="ghost"
          onClick={backToList}
        >
          <ArrowLeft size={16} />
        </Button>
        <div className="w-64 max-w-full">
          <Input
            aria-label="Presentation title"
            inputSize="sm"
            value={deck.title}
            onChange={(e) => lib.setDeckTitle(e.target.value)}
          />
        </div>
        <span className="text-xs text-[var(--text-tertiary)]">
          {slides.length} slide{slides.length === 1 ? "" : "s"}
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
            leftIcon={<Plus size={14} />}
            size="sm"
            variant="ghost"
            onClick={lib.addSlide}
          >
            Slide
          </Button>
          <Button
            leftIcon={<MonitorPlay size={14} />}
            size="sm"
            onClick={() => setPresenting(true)}
          >
            Present
          </Button>
        </div>
      </div>

      {/* ── 3-pane body ──────────────────────────────────────────────────── */}
      <div className="flex h-[calc(100vh-220px)] min-h-[460px] gap-3">
        {/* Slide rail */}
        <aside className="flex w-[232px] shrink-0 flex-col rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-2">
          <SidebarHeader
            addLabel="Add"
            title="Slides"
            onAdd={lib.addSlide}
          />
          <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
            {slides.map((s, i) => (
              <SlideThumb
                key={s.id}
                active={s.id === slide?.id}
                canRemove={slides.length > 1}
                index={i}
                slide={s}
                onDuplicate={() => lib.duplicateSlide(s.id)}
                onRemove={() => lib.removeSlide(s.id)}
                onSelect={() => lib.setActiveId(s.id)}
              />
            ))}
          </div>
        </aside>

        {/* Canvas */}
        <main className="min-w-0 flex-1 overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
          {slide ? (
            <SlideCanvas
              data={data}
              mode="edit"
              slide={slide}
              edit={{
                selectedBlockId: lib.selectedBlock?.id ?? null,
                onSelect: (id) => lib.setSelectedBlockId(id),
                onAction: handleBlockAction,
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--text-tertiary)]">
              Add a slide to start the presentation.
            </div>
          )}
        </main>

        {/* Inspector */}
        <aside className="w-[316px] shrink-0 overflow-y-auto rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-4">
          {slide ? (
            <Inspector
              block={lib.selectedBlock}
              data={data}
              slide={slide}
              onAddBlock={lib.addBlock}
              onBlockAction={handleBlockAction}
              onUpdateBlock={lib.updateBlock}
              onUpdateSlide={(patch) => lib.updateSlide(slide.id, patch)}
            />
          ) : (
            <p className="text-sm text-[var(--text-tertiary)]">
              Select a slide to edit it.
            </p>
          )}
        </aside>
      </div>

      {/* ── Overlays ─────────────────────────────────────────────────────── */}
      {presenting ? (
        <PresentMode
          data={data}
          deck={deck}
          onClose={() => setPresenting(false)}
        />
      ) : null}
      {sharing ? (
        <ShareDialog
          canManage
          entityId={deckId}
          entityTitle={deck.title}
          entityType="map"
          open={sharing}
          shareUrl={shareUrlFor(deckId)}
          onClose={() => setSharing(false)}
        />
      ) : null}
    </div>
  );
};

/* ── Page ─────────────────────────────────────────────────────────────────── */

/**
 * Presentation builder page. Reads `?projectId=` (and optional `&deckId=`)
 * from the URL and renders the list or the editor inside the shared builder
 * scaffold (full-width for the wide canvas).
 */
export default function PresentationBuilderPage() {
  const [params] = useSearchParams();
  const projectId = params.get("projectId") ?? "";
  const deckId = params.get("deckId");
  const builder = getProjectBuilder("presentation");

  if (!builder) return null;

  return (
    <BuilderScaffold
      wide
      builder={builder}
      projectId={projectId}
    >
      {deckId ? (
        <PresentationEditor
          deckId={deckId}
          projectId={projectId}
        />
      ) : (
        <PresentationList projectId={projectId} />
      )}
    </BuilderScaffold>
  );
}
