import { Button, Tooltip } from "@packages/ui";
import {
  Layers,
  ChevronDown,
  Plus,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { type LayerItem } from "@/types/map";

export const LayerPanel = ({
  vectorLayers,
  rasterLayers,
  _onToggleVector,
  _onToggleRaster,
  _onOpenStyle,
  _onRemoveLayer,
  onOpenImport,
  canEdit,
  saving,
  onSave,
  statusMsg,
  isAvailableModule,
  aiOpen,
}: {
  vectorLayers: LayerItem[];
  rasterLayers: LayerItem[];
  onToggleVector: (id: string) => void;
  onToggleRaster: (id: string) => void;
  onOpenStyle: (layer: LayerItem) => void;
  onRemoveLayer: (id: string) => void;
  onOpenImport: () => void;
  canEdit: boolean;
  saving: boolean;
  onSave: () => void;
  statusMsg: string | null;
  isAvailableModule: (id: string) => boolean;
  aiOpen?: boolean;
}) => {
  const [minimized, setMinimized] = useState(false);
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);
  const layersMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!layersMenuOpen) return;
    function handler(e: MouseEvent) {
      if (
        layersMenuRef.current &&
        !layersMenuRef.current.contains(e.target as Node)
      ) {
        setLayersMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [layersMenuOpen]);

  const leftStyle = minimized
    ? aiOpen
      ? { left: 360 + 12 }
      : { left: 12 }
    : aiOpen
      ? { left: 360 + 12 }
      : undefined;

  const totalLayers = vectorLayers.length + rasterLayers.length;

  return (
    <div
      style={leftStyle}
      className={`absolute top-16 z-20 flex flex-col bg-elevated border border-border-primary rounded-xl shadow-xl transition-all duration-300 ease-in-out ${
        minimized ? "w-10" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1 py-1 border-b border-border-secondary shrink-0">
        {!minimized && (
          <div ref={layersMenuRef} className="relative flex items-center">
            {/* "Layers ▾" dropdown trigger */}
            <button
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-surface-hover transition-colors group"
              id="layers-dropdown-trigger"
              type="button"
              onClick={() => setLayersMenuOpen((v) => !v)}
            >
              <Layers className="text-text-secondary" size={14} />
              <span className="text-xs font-bold text-text-primary">
                Layers
              </span>
              {totalLayers > 0 && (
                <span className="text-[0.6rem] font-mono bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                  {totalLayers}
                </span>
              )}
              <ChevronDown
                className={`text-text-quaternary transition-transform duration-200 ${layersMenuOpen ? "rotate-180" : ""}`}
                size={12}
              />
            </button>

            {/* Layers dropdown menu */}
            {layersMenuOpen ? <div className="absolute left-0 top-full mt-1.5 w-48 bg-elevated border border-border-primary rounded-xl shadow-dropdown py-1.5 z-50 animate-fade-in">
                <button
                  className="dropdown-item w-full gap-2.5"
                  id="add-data-to-map"
                  type="button"
                  onClick={() => {
                    setLayersMenuOpen(false);
                    onOpenImport();
                  }}
                >
                  <Plus className="text-primary" size={13} />
                  <span>Add Data</span>
                </button>

                {isAvailableModule("resource-module") && (
                  <button
                    className="dropdown-item w-full gap-2.5"
                    type="button"
                    onClick={() => {
                      setLayersMenuOpen(false);
                      onOpenImport();
                    }}
                  >
                    <span>🧩</span>
                    <span>From Resource Module</span>
                  </button>
                )}

                {totalLayers > 0 && (
                  <>
                    <div className="h-px bg-border-secondary mx-2 my-1" />
                    <button
                      className="dropdown-item w-full gap-2 text-text-tertiary text-[0.72rem]"
                      type="button"
                      onClick={() => {
                        setLayersMenuOpen(false);
                      }}
                    >
                      <span>📋</span>
                      <span>
                        {totalLayers} layer{totalLayers !== 1 ? "s" : ""} loaded
                      </span>
                    </button>
                  </>
                )}
              </div> : null}
          </div>
        )}

        <Tooltip
          content={minimized ? "Expand panel" : "Collapse panel"}
          placement="right"
        >
          <Button
            iconOnly
            aria-label={minimized ? "Expand panel" : "Collapse panel"}
            id="layer-panel-toggle"
            onClick={() => setMinimized((v) => !v)}
          >
            {minimized ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </Tooltip>
      </div>

      {/* Body */}
      {!minimized && (
        <div className="flex flex-col gap-3 p-3 overflow-y-auto max-h-[calc(100vh-12rem)] scrollbar-thin">
          {/* Empty state */}
          {totalLayers === 0 ? (
            <div className="flex flex-col items-center gap-2 py-5 text-center">
              <Layers className="text-text-quaternary opacity-40" size={24} />
              <div className="text-[0.72rem] text-text-tertiary leading-snug">
                No layers yet.
              </div>
              <button
                className="flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/25 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                id="add-first-layer"
                type="button"
                onClick={onOpenImport}
              >
                <Plus size={13} />
                Add Data
              </button>
            </div>
          ) : (
            <>
              {/* Hydrology Module (conditional) */}
              {isAvailableModule("hydrology-module") && (
                <div className="flex flex-col gap-1">Hydrology Module</div>
              )}
            </>
          )}

          {/* Save Button */}
          {canEdit ? <div className="flex flex-col gap-1.5 pt-1">
              <Button
                fullWidth
                id="save-viewport-btn"
                loading={saving}
                loadingText="Saving…"
                size="sm"
                variant="primary"
                onClick={onSave}
              >
                💾 Save Viewport
              </Button>
              {statusMsg ? <div className="text-[0.7rem] text-primary text-center animate-fade-in">
                  {statusMsg}
                </div> : null}
            </div> : null}
        </div>
      )}
    </div>
  );
}
