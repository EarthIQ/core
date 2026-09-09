import {
  Map,
  ExternalLink,
  Copy,
  Trash2,
  Plus,
  Settings,
  Globe,
  Lock,
  Share2,
  X,
} from "lucide-react";
import { useState } from "react";

import { type MapItem, type MapLayerItem } from "@/lib/maps";

import { MapBuilder, type MapBuilderConfig } from "./MapBuilder";
import { ShareDialog } from "./share/ShareDialog";

import type { Annotation } from "@/lib/mapEditor/types";

interface PublishedMapsPanelProps {
  maps: MapItem[];
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onPublish: (config: MapBuilderConfig) => Promise<void>;
  onDelete: (mapId: string) => Promise<void>;
  onUpdate: (mapId: string, config: MapBuilderConfig) => Promise<void>;
  canEdit: boolean;
  /* Data needed by the MapBuilder to initialize */
  currentBasemap: string;
  currentCenter: [number, number];
  currentZoom: number;
  currentBearing: number;
  currentPitch: number;
  currentLayers: MapLayerItem[];
  currentAnnotations: Annotation[];
}

export const PublishedMapsPanel = ({
  maps,
  projectId,
  isOpen,
  onClose,
  onPublish,
  onDelete,
  onUpdate,
  canEdit,
  currentBasemap,
  currentCenter,
  currentZoom,
  currentBearing,
  currentPitch,
  currentLayers,
  currentAnnotations,
}: PublishedMapsPanelProps) => {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderEditingMap, setBuilderEditingMap] = useState<MapItem | null>(
    null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  /** Map whose share dialog is open (per-map sharing). */
  const [shareMap, setShareMap] = useState<MapItem | null>(null);

  const handleCopyLink = (mapId: string) => {
    const link = `${window.location.origin}/share/map/${mapId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(mapId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleBuilderClose = () => {
    setBuilderOpen(false);
    setBuilderEditingMap(null);
  };

  return (
    <>
      {/* Backdrop - click outside to close */}
      {isOpen ? (
        <div
          className="pointer-events-auto fixed inset-0 z-[19]"
          onClick={onClose}
        />
      ) : null}

      {/* Slide-in panel */}
      <div
        className={`bg-elevated border-border-primary absolute top-14 right-0 bottom-0 z-20 flex w-72 flex-col border-l shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="border-border-secondary flex shrink-0 items-center justify-between border-b px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <Map
              className="text-primary"
              size={14}
            />
            <span className="text-text-primary text-xs font-bold">
              Published Maps
            </span>
            {maps.length > 0 && (
              <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-mono text-[0.65rem]">
                {maps.length}
              </span>
            )}
          </div>
          <button
            aria-label="Close panel"
            className="hover:bg-surface-hover text-text-tertiary hover:text-text-primary rounded p-1 transition-colors"
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content list */}
        {isOpen ? (
          <div className="flex flex-1 scrollbar-thin flex-col gap-2.5 overflow-y-auto p-3">
            {canEdit ? (
              <button
                className="border-border-primary hover:border-primary/50 text-text-secondary hover:text-primary bg-surface/30 hover:bg-primary/5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-1.5 text-xs font-semibold transition-all duration-200"
                onClick={() => {
                  setBuilderEditingMap(null);
                  setBuilderOpen(true);
                }}
              >
                <Plus size={14} />
                Publish Viewport
              </button>
            ) : null}

            {maps.length === 0 ? (
              <div className="text-text-tertiary py-8 text-center text-xs">
                No maps published yet. Publish current workspace to share links!
              </div>
            ) : (
              maps.map((m) => (
                <div
                  key={m.id}
                  className="border-border-secondary hover:border-border-primary bg-surface/30 flex flex-col gap-2 rounded-lg border p-2.5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-text-primary truncate text-xs font-bold"
                        title={m.title}
                      >
                        {m.title}
                      </div>
                      <div className="text-text-tertiary line-clamp-1 text-[10px]">
                        {m.description || "No description"}
                      </div>
                    </div>

                    <span className="shrink-0">
                      {m.is_public ? (
                        <Globe
                          aria-label="Public"
                          className="text-success"
                          size={11}
                        />
                      ) : (
                        <Lock
                          aria-label="Private"
                          className="text-accent"
                          size={11}
                        />
                      )}
                    </span>
                  </div>

                  {/* Actions row */}
                  <div className="border-border-secondary/40 mt-0.5 flex items-center justify-between border-t pt-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${
                          copiedId === m.id
                            ? "text-success"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                        onClick={() => handleCopyLink(m.id)}
                      >
                        <Copy size={11} />
                        {copiedId === m.id ? "Copied" : "Copy Link"}
                      </button>

                      <a
                        className="text-text-secondary hover:text-text-primary flex items-center gap-1 text-[10px] font-medium"
                        href={`/share/map/${m.id}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <ExternalLink size={11} />
                        View
                      </a>

                      <button
                        className="text-text-secondary hover:text-text-primary flex items-center gap-1 text-[10px] font-medium"
                        title="Manage sharing"
                        type="button"
                        onClick={() => setShareMap(m)}
                      >
                        <Share2 size={11} />
                        Share
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {canEdit ? (
                        <>
                          <button
                            className="hover:bg-surface-hover text-text-tertiary hover:text-text-primary rounded p-1 transition-colors"
                            title="Edit Map Builder"
                            onClick={() => {
                              setBuilderEditingMap(m);
                              setBuilderOpen(true);
                            }}
                          >
                            <Settings size={11} />
                          </button>
                          <button
                            className="hover:bg-surface-hover text-text-tertiary hover:text-danger-hover rounded p-1 transition-colors"
                            title="Delete Publish"
                            onClick={() => onDelete(m.id)}
                          >
                            <Trash2 size={11} />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>

      {/* Map Builder (full-page) */}
      <MapBuilder
        currentAnnotations={currentAnnotations}
        currentBasemap={currentBasemap}
        currentBearing={currentBearing}
        currentCenter={currentCenter}
        currentLayers={currentLayers}
        currentPitch={currentPitch}
        currentZoom={currentZoom}
        editingMap={builderEditingMap}
        isOpen={builderOpen}
        projectId={projectId}
        onClose={handleBuilderClose}
        onPublish={onPublish}
        onUpdate={onUpdate}
      />

      {/* Per-map Share Dialog */}
      {shareMap ? (
        <ShareDialog
          canManage={canEdit}
          entityId={shareMap.id}
          entityTitle={shareMap.title}
          entityType="map"
          open={!!shareMap}
          onClose={() => setShareMap(null)}
        />
      ) : null}
    </>
  );
};
