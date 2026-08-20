import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Search,
  Share2,
  ChevronDown,
  Check,
  Map,
} from "lucide-react";
import { Button, Tooltip } from "@packages/ui";
import { useAuth } from "@/lib/auth";
import type { MapItem } from "@/lib/maps";
import type { CollaboratorState } from "@/lib/useCollaboration";
import { ShareDialog } from "./share/ShareDialog";
import { Avatar } from "./share/Avatar";

interface MapNavbarProps {
  projectName: string;
  mapId: string | null;
  availableMaps: MapItem[];
  activeMapId: string | null;
  canManageSharing?: boolean;
  publishedMapsOpen?: boolean;
  publishedMapsCount?: number;
  onTogglePublishedMaps?: () => void;
  onSelectMap: (id: string) => void;
  onBack: () => void;
  /** Active collaborators (excluding self) */
  collaborators?: CollaboratorState[];
  isCollabConnected?: boolean;
}

export function MapNavbar({
  projectName,
  mapId,
  availableMaps,
  activeMapId,
  canManageSharing = true,
  publishedMapsOpen = false,
  publishedMapsCount = 0,
  onTogglePublishedMaps,
  onSelectMap,
  onBack,
  collaborators = [],
  isCollabConnected = false,
}: MapNavbarProps) {
  const { user } = useAuth();
  const [searchVal, setSearchVal] = useState("");
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : "U";

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
      <header className="absolute top-0 left-0 right-0 z-30 h-14 bg-elevated/90 backdrop-blur-xl border-b border-border-primary flex items-center justify-between px-4">
        {/* Left: back + map switcher (unchanged) */}
        <div className="flex items-center gap-3">
          <Tooltip content="Back to projects" placement="bottom">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={onBack}
              aria-label="Back"
              className="text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft size={18} />
            </Button>
          </Tooltip>
          <span className="w-px h-5 bg-border-primary" />

          <div className="relative" ref={switcherRef}>
            <button
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
              className="flex flex-col items-start px-1.5 py-0.5 rounded-md hover:bg-surface-hover transition-colors"
            >
              <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider leading-none flex items-center gap-1">
                Project
                {availableMaps.length > 1 && (
                  <ChevronDown
                    size={10}
                    className={`transition-transform ${switcherOpen ? "rotate-180" : ""}`}
                  />
                )}
              </span>
              <span
                className="text-sm font-bold text-text-primary truncate max-w-[200px]"
                title={projectName}
              >
                {projectName}
              </span>
            </button>

            {switcherOpen && availableMaps.length > 0 && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-elevated border border-border-primary rounded-xl shadow-dropdown py-1.5 z-50 animate-fade-in max-h-80 overflow-y-auto scrollbar-thin">
                <div className="px-3 py-1 text-[0.65rem] uppercase tracking-widest text-text-quaternary font-semibold">
                  Switch Map
                </div>
                {availableMaps.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelectMap(m.id);
                      setSwitcherOpen(false);
                    }}
                    className="dropdown-item w-full gap-2 justify-between"
                  >
                    <span className="truncate">{m.title}</span>
                    {m.id === activeMapId && (
                      <Check size={13} className="text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center search (unchanged) */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative flex items-center bg-surface-hover/50 border border-border-secondary rounded-lg px-3 py-1 hover:border-border-primary transition-colors">
            <Search size={16} className="text-text-tertiary mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search locations..."
              className="input input-sm border-none bg-transparent w-full p-0 text-xs focus:ring-0 focus:outline-none placeholder:text-text-quaternary"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
          </div>
        </div>

        {/* Right: collaborators + share */}
        <div className="flex items-center gap-2">
          {/* Collaborator avatars — Google Docs style */}
          {collaborators.length > 0 && (
            <div className="flex items-center">
              {/* Show up to 4 avatars, stacked with overlap */}
              {collaborators.slice(0, 4).map((c) => (
                <Tooltip
                  key={c.user_id}
                  content={
                    <span className="flex flex-col gap-0.5">
                      <span className="font-semibold">
                        {c.full_name || c.email}
                      </span>
                      <span className="text-[10px] text-text-tertiary">
                        {c.email}
                      </span>
                      <span className="text-[10px] text-emerald-400">
                        ● Editing now
                      </span>
                    </span>
                  }
                  placement="bottom"
                >
                  <div className="relative -ml-2 first:ml-0">
                    <Avatar
                      email={c.email}
                      name={c.full_name ?? undefined}
                      size={30}
                    />
                    {/* Live pulse dot */}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-elevated rounded-full animate-pulse" />
                  </div>
                </Tooltip>
              ))}
              {collaborators.length > 4 && (
                <div className="-ml-2 w-[30px] h-[30px] rounded-full bg-surface-hover border border-border-primary text-text-secondary text-[10px] font-semibold flex items-center justify-center shrink-0">
                  +{collaborators.length - 4}
                </div>
              )}
            </div>
          )}

          {/* Connection status dot */}
          {isCollabConnected && (
            <Tooltip content="Live collaboration active" placement="bottom">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            </Tooltip>
          )}

          <span className="w-px h-5 bg-border-primary" />

          {/* Self avatar */}
          <Tooltip content={user?.email || "User Profile"} placement="bottom">
            <div className="w-8 h-8 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center shrink-0 border border-primary/20 cursor-pointer">
              {userInitial}
            </div>
          </Tooltip>
          {/* Published Maps button */}
          {onTogglePublishedMaps && (
            <Tooltip content="Published maps" placement="bottom">
              <button
                type="button"
                onClick={onTogglePublishedMaps}
                className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  publishedMapsOpen
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                }`}
                aria-label="Toggle published maps"
              >
                <Map size={15} />
                <span className="hidden sm:inline">Maps</span>
                {publishedMapsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {publishedMapsCount}
                  </span>
                )}
              </button>
            </Tooltip>
          )}

          <span className="w-px h-5 bg-border-primary" />

          <Tooltip content="Share project  (⌘⇧S)" placement="bottom">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShareOpen(true)}
              leftIcon={<Share2 size={16} />}
              className="text-text-secondary hover:text-text-primary gap-1.5"
            >
              <span className="text-xs font-semibold hidden sm:inline">
                Share
              </span>
            </Button>
          </Tooltip>
        </div>
      </header>

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        entityType="project"
        entityId={mapId}
        entityTitle={projectName}
        canManage={canManageSharing}
      />
    </>
  );
}
