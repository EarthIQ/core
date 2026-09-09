import { Button, Tooltip } from "@packages/ui";
import {
  ArrowLeft,
  Share2,
  ChevronDown,
  Check,
  Blocks,
  MessageSquare,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { BuilderPicker } from "@/components/builder/BuilderPicker";
import { useAuth } from "@/lib/auth";
import { useMapEditor } from "@/lib/mapEditor/store";

import { PlaceSearch } from "./PlaceSearch";
import { Avatar } from "./share/Avatar";
import { ShareDialog } from "./share/ShareDialog";

import type { MapItem } from "@/lib/maps";
import type { CollaboratorState } from "@/lib/useCollaboration";

interface MapNavbarProps {
  projectName: string;
  mapId: string | null;
  /** Project id used to scope builder navigation (`?projectId=`). */
  projectId?: string | null;
  availableMaps: MapItem[];
  activeMapId: string | null;
  canManageSharing?: boolean;
  onSelectMap: (id: string) => void;
  onBack: () => void;
  /** Active collaborators (excluding self) */
  collaborators?: CollaboratorState[];
  isCollabConnected?: boolean;
  /** Live maplibre instance ref - powers the location search (fly-to). */
  mapRef?: React.MutableRefObject<any>;
  /** True once the map instance is ready. */
  mapReady?: boolean;
}

export const MapNavbar = ({
  projectName,
  mapId,
  projectId,
  availableMaps,
  activeMapId,
  canManageSharing = true,
  onSelectMap,
  onBack,
  collaborators = [],
  isCollabConnected = false,
  mapRef,
  mapReady = false,
}: MapNavbarProps) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  // Source of truth for scoping builder navigation - always carry the project
  // id currently in the URL so opening any builder keeps this project's context.
  const pickerProjectId =
    searchParams.get("projectId") ?? projectId ?? mapId ?? "";
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : "U";

  /* Comments history (threaded, pinned discussions on the map) */
  const commentsOpen = useMapEditor((s) => s.commentsOpen);
  const setCommentsOpen = useMapEditor((s) => s.setCommentsOpen);
  const setCommentPlacement = useMapEditor((s) => s.setCommentPlacement);
  const openCommentCount = useMapEditor((s) =>
    s.comments.reduce((n, c) => n + (c.resolved ? 0 : 1), 0)
  );

  useEffect(() => {
    if (!switcherOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        switcherRef.current &&
        !switcherRef.current.contains(e.target as Node)
      ) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [switcherOpen]);

  /* ⌘/Ctrl + Shift + S opens share (like Docs) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "s"
      ) {
        e.preventDefault();
        setShareOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="bg-elevated border-border-primary absolute top-0 right-0 left-0 z-30 flex h-14 items-center justify-between border-b px-4">
        {/* Left: back + map switcher (unchanged) */}
        <div className="flex items-center gap-3">
          <Tooltip
            content="Back to projects"
            placement="bottom"
          >
            <Button
              iconOnly
              aria-label="Back"
              className="text-text-secondary hover:text-text-primary"
              size="sm"
              variant="ghost"
              onClick={onBack}
            >
              <ArrowLeft size={18} />
            </Button>
          </Tooltip>
          <span className="bg-border-primary h-5 w-px" />

          <div
            ref={switcherRef}
            className="relative"
          >
            <button
              className="hover:bg-surface-hover flex flex-col items-start rounded-md px-1.5 py-0.5 transition-colors"
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
            >
              <span className="text-text-tertiary flex items-center gap-1 text-[10px] leading-none font-medium tracking-wider uppercase">
                Project
                {availableMaps.length > 1 && (
                  <ChevronDown
                    className={`transition-transform ${switcherOpen ? "rotate-180" : ""}`}
                    size={10}
                  />
                )}
              </span>
              <span
                className="text-text-primary max-w-[200px] truncate text-sm font-bold"
                title={projectName}
              >
                {projectName}
              </span>
            </button>

            {switcherOpen && availableMaps.length > 0 ? (
              <div className="bg-elevated border-border-primary shadow-dropdown animate-fade-in absolute top-full left-0 z-50 mt-1.5 max-h-80 w-64 scrollbar-thin overflow-y-auto rounded-xl border py-1.5">
                <div className="text-text-quaternary px-3 py-1 text-[0.65rem] font-semibold tracking-widest uppercase">
                  Switch Map
                </div>
                {availableMaps.map((m) => (
                  <button
                    key={m.id}
                    className="dropdown-item w-full justify-between gap-2"
                    type="button"
                    onClick={() => {
                      onSelectMap(m.id);
                      setSwitcherOpen(false);
                    }}
                  >
                    <span className="truncate">{m.title}</span>
                    {m.id === activeMapId && (
                      <Check
                        className="text-primary shrink-0"
                        size={13}
                      />
                    )}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Center: location search (Nominatim - flies the map + drops a marker) */}
        <div className="mx-4 max-w-md flex-1">
          {mapRef ? (
            <PlaceSearch
              mapReady={mapReady}
              mapRef={mapRef}
            />
          ) : (
            <div className="h-8" />
          )}
        </div>

        {/* Right: collaborators + share */}
        <div className="flex items-center gap-2">
          {/* Collaborator avatars - Google Docs style */}
          {collaborators.length > 0 && (
            <div className="flex items-center">
              {/* Show up to 4 avatars, stacked with overlap */}
              {collaborators.slice(0, 4).map((c) => (
                <Tooltip
                  key={c.user_id}
                  placement="bottom"
                  content={
                    <span className="flex flex-col gap-0.5">
                      <span className="font-semibold">
                        {c.full_name || c.email}
                      </span>
                      <span className="text-text-tertiary text-[10px]">
                        {c.email}
                      </span>
                      <span className="text-[10px] text-emerald-400">
                        ● Editing now
                      </span>
                    </span>
                  }
                >
                  <div className="relative -ml-2 first:ml-0">
                    <Avatar
                      email={c.email}
                      name={c.full_name ?? undefined}
                      size={30}
                    />
                    {/* Live pulse dot */}
                    <span className="border-elevated absolute right-0 bottom-0 h-2.5 w-2.5 animate-pulse rounded-full border-2 bg-emerald-400" />
                  </div>
                </Tooltip>
              ))}
              {collaborators.length > 4 && (
                <div className="bg-surface-hover border-border-primary text-text-secondary -ml-2 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold">
                  +{collaborators.length - 4}
                </div>
              )}
            </div>
          )}

          {/* Connection status dot */}
          {isCollabConnected ? (
            <Tooltip
              content="Live collaboration active"
              placement="bottom"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
            </Tooltip>
          ) : null}

          <span className="bg-border-primary h-5 w-px" />

          {/* General builder picker - open any project builder (Map, Story Map,
              Presentation, Report, Forms) for this project. */}
          <Tooltip
            content="Builders - open Map, Story Map, Presentations…"
            placement="bottom"
          >
            <BuilderPicker
              hostId="map"
              projectId={pickerProjectId}
              trigger={
                <button
                  aria-label="Project builders"
                  className="text-text-secondary hover:text-text-primary hover:bg-surface-hover relative flex items-center justify-center rounded-lg p-1.5 transition-all duration-150"
                  type="button"
                >
                  <Blocks size={16} />
                </button>
              }
            />
          </Tooltip>

          <Tooltip
            content="Share project  (⌘⇧S)"
            placement="bottom"
          >
            <Button
              iconOnly
              aria-label="Share project"
              className="text-text-secondary hover:text-text-primary"
              size="sm"
              variant="ghost"
              onClick={() => setShareOpen(true)}
            >
              <Share2 size={16} />
            </Button>
          </Tooltip>

          {/* Comments history - open / resolved threads on the map */}
          <Tooltip
            content={commentsOpen ? "Close comments" : "Comments history"}
            placement="bottom"
          >
            <button
              aria-label="Comments history"
              aria-pressed={commentsOpen}
              type="button"
              className={`relative flex items-center justify-center rounded-lg p-1.5 transition-colors ${
                commentsOpen
                  ? "bg-primary/10 text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
              onClick={() => {
                if (commentsOpen) {
                  setCommentsOpen(false);
                } else {
                  setCommentPlacement(false);
                  setCommentsOpen(true);
                }
              }}
            >
              <MessageSquare size={16} />
              {openCommentCount > 0 && (
                <span className="bg-primary border-elevated absolute -top-1 -right-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border px-1 text-[9px] font-bold text-white">
                  {openCommentCount}
                </span>
              )}
            </button>
          </Tooltip>

          {/* Self avatar - right end of the bar */}
          <Tooltip
            content={user?.email || "User Profile"}
            placement="bottom"
          >
            <div className="bg-primary/15 text-primary border-primary/20 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border text-sm font-bold">
              {userInitial}
            </div>
          </Tooltip>
        </div>
      </header>

      <ShareDialog
        canManage={canManageSharing}
        entityId={mapId}
        entityTitle={projectName}
        entityType="project"
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </>
  );
};
