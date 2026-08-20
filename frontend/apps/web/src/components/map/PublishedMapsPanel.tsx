import { useState } from "react";
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
import type { MapItem } from "@/lib/maps";
import { ShareDialog } from "./share/ShareDialog";

interface PublishedMapsPanelProps {
  maps: MapItem[];
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onPublish: (title: string, desc: string, isPublic: boolean, widgets: any) => Promise<void>;
  onDelete: (mapId: string) => Promise<void>;
  onUpdate: (mapId: string, isPublic: boolean, widgets: any) => Promise<void>;
  canEdit: boolean;
}

export function PublishedMapsPanel({
  maps,
  projectId,
  isOpen,
  onClose,
  onPublish,
  onDelete,
  onUpdate,
  canEdit,
}: PublishedMapsPanelProps) {
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [configMap, setConfigMap] = useState<MapItem | null>(null);
  
  // Publish Form State
  const [pubTitle, setPubTitle] = useState("");
  const [pubDesc, setPubDesc] = useState("");
  const [pubPublic, setPubPublic] = useState(true);
  const [pubWidgets, setPubWidgets] = useState({
    titleCard: true,
    legend: true,
    layerList: true,
    zoomControls: true,
  });
  const [publishing, setPublishing] = useState(false);
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

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubTitle.trim()) return;
    setPublishing(true);
    try {
      await onPublish(pubTitle.trim(), pubDesc.trim(), pubPublic, pubWidgets);
      setPublishModalOpen(false);
      setPubTitle("");
      setPubDesc("");
    } catch (err) {
      console.error(err);
    } finally {
      setPublishing(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configMap) return;
    try {
      await onUpdate(configMap.id, configMap.is_public, configMap.widgets_config);
      setConfigMap(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {/* Backdrop — click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[19] pointer-events-auto"
          onClick={onClose}
        />
      )}

      {/* Slide-in panel */}
      <div
        className={`absolute top-14 right-0 bottom-0 z-20 flex flex-col w-72 bg-elevated/98 backdrop-blur-xl border-l border-border-primary shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-secondary shrink-0">
          <div className="flex items-center gap-1.5">
            <Map size={14} className="text-primary" />
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
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-hover text-text-tertiary hover:text-text-primary transition-colors"
            aria-label="Close panel"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content list */}
        {isOpen && (
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 scrollbar-thin">
            {canEdit && (
              <button
                onClick={() => setPublishModalOpen(true)}
                className="w-full py-1.5 border border-dashed border-border-primary hover:border-primary/50 rounded-lg text-xs font-semibold text-text-secondary hover:text-primary flex items-center justify-center gap-1.5 bg-surface/30 hover:bg-primary/5 transition-all duration-200"
              >
                <Plus size={14} />
                Publish Viewport
              </button>
            )}

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
                      <div className="text-xs font-bold text-text-primary truncate" title={m.title}>
                        {m.title}
                      </div>
                      <div className="text-[10px] text-text-tertiary line-clamp-1">
                        {m.description || "No description"}
                      </div>
                    </div>

                    <span className="shrink-0">
                      {m.is_public ? (
                        <Globe size={11} className="text-success" title="Public" />
                      ) : (
                        <Lock size={11} className="text-accent" title="Private" />
                      )}
                    </span>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center justify-between border-t border-border-secondary/40 pt-2 mt-0.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyLink(m.id)}
                        className={`text-[10px] font-medium flex items-center gap-1 transition-colors ${
                          copiedId === m.id
                            ? "text-success"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        <Copy size={11} />
                        {copiedId === m.id ? "Copied" : "Copy Link"}
                      </button>

                      <a
                        href={`/share/map/${m.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-text-secondary hover:text-text-primary font-medium flex items-center gap-1"
                      >
                        <ExternalLink size={11} />
                        View
                      </a>

                      <button
                        type="button"
                        onClick={() => setShareMap(m)}
                        className="text-[10px] text-text-secondary hover:text-text-primary font-medium flex items-center gap-1"
                        title="Manage sharing"
                      >
                        <Share2 size={11} />
                        Share
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <>
                          <button
                            onClick={() => setConfigMap(m)}
                            className="p-1 rounded hover:bg-surface-hover text-text-tertiary hover:text-text-primary transition-colors"
                            title="Widgets & Settings"
                          >
                            <Settings size={11} />
                          </button>
                          <button
                            onClick={() => onDelete(m.id)}
                            className="p-1 rounded hover:bg-surface-hover text-text-tertiary hover:text-danger-hover transition-colors"
                            title="Delete Publish"
                          >
                            <Trash2 size={11} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Publish Modal */}
      {publishModalOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overlay animate-fade-in"
          onClick={() => setPublishModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-elevated border border-border-primary rounded-2xl shadow-2xl animate-scale-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-primary">
              <h3 className="text-base font-bold text-text-primary">
                Publish Map Viewport
              </h3>
              <button
                onClick={() => setPublishModalOpen(false)}
                className="text-text-tertiary hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePublishSubmit} className="p-5 flex flex-col gap-4">
              <div className="form-field">
                <label className="form-label text-xs">Map Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wetland Extent Layer"
                  value={pubTitle}
                  onChange={(e) => setPubTitle(e.target.value)}
                  className="input input-sm"
                />
              </div>

              <div className="form-field">
                <label className="form-label text-xs">Description</label>
                <textarea
                  rows={2}
                  placeholder="Details shown in viewer..."
                  value={pubDesc}
                  onChange={(e) => setPubDesc(e.target.value)}
                  className="input textarea input-sm"
                />
              </div>

              {/* Public toggle */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <div className="text-xs font-semibold text-text-primary">
                    Public Shareable Link
                  </div>
                  <div className="text-[10px] text-text-tertiary">
                    Anyone with the link can view this map
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={pubPublic}
                  onChange={(e) => setPubPublic(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>

              {/* Widgets configuration */}
              <div className="border-t border-border-secondary pt-3 flex flex-col gap-2">
                <div className="text-xs font-bold text-text-primary mb-1">
                  Viewer Interactive Widgets
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-surface/30 rounded border border-border-secondary/40 hover:border-border-primary text-xs text-text-primary">
                    <input
                      type="checkbox"
                      checked={pubWidgets.titleCard}
                      onChange={(e) =>
                        setPubWidgets({ ...pubWidgets, titleCard: e.target.checked })
                      }
                      className="accent-primary"
                    />
                    Title Card
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-surface/30 rounded border border-border-secondary/40 hover:border-border-primary text-xs text-text-primary">
                    <input
                      type="checkbox"
                      checked={pubWidgets.legend}
                      onChange={(e) =>
                        setPubWidgets({ ...pubWidgets, legend: e.target.checked })
                      }
                      className="accent-primary"
                    />
                    Layer Legend
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-surface/30 rounded border border-border-secondary/40 hover:border-border-primary text-xs text-text-primary">
                    <input
                      type="checkbox"
                      checked={pubWidgets.layerList}
                      onChange={(e) =>
                        setPubWidgets({ ...pubWidgets, layerList: e.target.checked })
                      }
                      className="accent-primary"
                    />
                    Layer Toggle
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-surface/30 rounded border border-border-secondary/40 hover:border-border-primary text-xs text-text-primary">
                    <input
                      type="checkbox"
                      checked={pubWidgets.zoomControls}
                      onChange={(e) =>
                        setPubWidgets({ ...pubWidgets, zoomControls: e.target.checked })
                      }
                      className="accent-primary"
                    />
                    Zoom Controls
                  </label>
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setPublishModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="btn btn-primary btn-sm"
                >
                  {publishing ? "Publishing..." : "Publish Map"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Settings Modal */}
      {configMap && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overlay animate-fade-in"
          onClick={() => setConfigMap(null)}
        >
          <div
            className="w-full max-w-md bg-elevated border border-border-primary rounded-2xl shadow-2xl animate-scale-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-primary">
              <h3 className="text-base font-bold text-text-primary">
                Widgets & Sharing Configuration
              </h3>
              <button
                onClick={() => setConfigMap(null)}
                className="text-text-tertiary hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between py-1">
                <div>
                  <div className="text-xs font-semibold text-text-primary">
                    Public Shareable Link
                  </div>
                  <div className="text-[10px] text-text-tertiary">
                    Anyone with the link can view this map
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={configMap.is_public}
                  onChange={(e) =>
                    setConfigMap({ ...configMap, is_public: e.target.checked })
                  }
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>

              <div className="border-t border-border-secondary pt-3 flex flex-col gap-2">
                <div className="text-xs font-bold text-text-primary mb-1">
                  Active Widgets
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {["titleCard", "legend", "layerList", "zoomControls"].map((key) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 cursor-pointer p-2 bg-surface/30 rounded border border-border-secondary/40 hover:border-border-primary text-xs text-text-primary capitalize"
                    >
                      <input
                        type="checkbox"
                        checked={!!(configMap.widgets_config as any)?.[key]}
                        onChange={(e) => {
                          const conf = { ...(configMap.widgets_config || {}) };
                          conf[key] = e.target.checked;
                          setConfigMap({ ...configMap, widgets_config: conf });
                        }}
                        className="accent-primary"
                      />
                      {key.replace(/([A-Z])/g, " $1")}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setConfigMap(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Per-map Share Dialog */}
      {shareMap && (
        <ShareDialog
          open={!!shareMap}
          onClose={() => setShareMap(null)}
          entityType="map"
          entityId={shareMap.id}
          entityTitle={shareMap.title}
          canManage={canEdit}
        />
      )}
    </>
  );
}
