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

import { type MapItem ,type  MapLayerItem } from "@/lib/maps";

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
    null,
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
      {isOpen ? <div
          className="fixed inset-0 z-[19] pointer-events-auto"
          onClick={onClose}
        /> : null}

      {/* Slide-in panel */}
      <div
        className={`absolute top-14 right-0 bottom-0 z-20 flex flex-col w-72 bg-elevated border-l border-border-primary shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-secondary shrink-0">
          <div className="flex items-center gap-1.5">
            <Map className="text-primary" size={14} />
            <span className="text-xs font-bold text-text-primary">
              Published Maps
            </span>
            {maps.length > 0 && (
              <span className="text-[0.65rem] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {maps.length}
              </span>
            )}
          </div>
          <button
            aria-label="Close panel"
            className="p-1 rounded hover:bg-surface-hover text-text-tertiary hover:text-text-primary transition-colors"
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content list */}
        {isOpen ? <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 scrollbar-thin">
            {canEdit ? <button
                className="w-full py-1.5 border border-dashed border-border-primary hover:border-primary/50 rounded-lg text-xs font-semibold text-text-secondary hover:text-primary flex items-center justify-center gap-1.5 bg-surface/30 hover:bg-primary/5 transition-all duration-200"
                onClick={() => {
                  setBuilderEditingMap(null);
                  setBuilderOpen(true);
                }}
              >
                <Plus size={14} />
                Publish Viewport
              </button> : null}

            {maps.length === 0 ? (
              <div className="text-center py-8 text-xs text-text-tertiary">
                No maps published yet. Publish current workspace to share links!
              </div>
            ) : (
              maps.map((m) => (
                <div
                  key={m.id}
                  className="p-2.5 border border-border-secondary hover:border-border-primary bg-surface/30 rounded-lg flex flex-col gap-2 transition-colors"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs font-bold text-text-primary truncate"
                        title={m.title}
                      >
                        {m.title}
                      </div>
                      <div className="text-[10px] text-text-tertiary line-clamp-1">
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
                  <div className="flex items-center justify-between border-t border-border-secondary/40 pt-2 mt-0.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        className={`text-[10px] font-medium flex items-center gap-1 transition-colors ${
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
                        className="text-[10px] text-text-secondary hover:text-text-primary font-medium flex items-center gap-1"
                        href={`/share/map/${m.id}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <ExternalLink size={11} />
                        View
                      </a>

                      <button
                        className="text-[10px] text-text-secondary hover:text-text-primary font-medium flex items-center gap-1"
                        title="Manage sharing"
                        type="button"
                        onClick={() => setShareMap(m)}
                      >
                        <Share2 size={11} />
                        Share
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {canEdit ? <>
                          <button
                            className="p-1 rounded hover:bg-surface-hover text-text-tertiary hover:text-text-primary transition-colors"
                            title="Edit Map Builder"
                            onClick={() => {
                              setBuilderEditingMap(m);
                              setBuilderOpen(true);
                            }}
                          >
                            <Settings size={11} />
                          </button>
                          <button
                            className="p-1 rounded hover:bg-surface-hover text-text-tertiary hover:text-danger-hover transition-colors"
                            title="Delete Publish"
                            onClick={() => onDelete(m.id)}
                          >
                            <Trash2 size={11} />
                          </button>
                        </> : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div> : null}
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
      {shareMap ? <ShareDialog
          canManage={canEdit}
          entityId={shareMap.id}
          entityTitle={shareMap.title}
          entityType="map"
          open={!!shareMap}
          onClose={() => setShareMap(null)}
        /> : null}
    </>
  );
}
