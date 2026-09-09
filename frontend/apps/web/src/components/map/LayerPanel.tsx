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
      className={`bg-elevated border-border-primary absolute top-16 z-20 flex flex-col rounded-xl border shadow-xl transition-all duration-300 ease-in-out ${
        minimized ? "w-10" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="border-border-secondary flex shrink-0 items-center justify-between border-b px-1 py-1">
        {!minimized && (
          <div
            ref={layersMenuRef}
            className="relative flex items-center"
          >
            {/* "Layers ▾" dropdown trigger */}
            <button
              className="hover:bg-surface-hover group flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors"
              id="layers-dropdown-trigger"
              type="button"
              onClick={() => setLayersMenuOpen((v) => !v)}
            >
              <Layers
                className="text-text-secondary"
                size={14}
              />
              <span className="text-text-primary text-xs font-bold">
                Layers
              </span>
              {totalLayers > 0 && (
                <span className="bg-primary/15 text-primary rounded-full px-1.5 py-0.5 font-mono text-[0.6rem]">
                  {totalLayers}
                </span>
              )}
              <ChevronDown
                className={`text-text-quaternary transition-transform duration-200 ${layersMenuOpen ? "rotate-180" : ""}`}
                size={12}
              />
            </button>

            {/* Layers dropdown menu */}
            {layersMenuOpen ? (
              <div className="bg-elevated border-border-primary shadow-dropdown animate-fade-in absolute top-full left-0 z-50 mt-1.5 w-48 rounded-xl border py-1.5">
                <button
                  className="dropdown-item w-full gap-2.5"
                  id="add-data-to-map"
                  type="button"
                  onClick={() => {
                    setLayersMenuOpen(false);
                    onOpenImport();
                  }}
                >
                  <Plus
                    className="text-primary"
                    size={13}
                  />
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
                    <div className="bg-border-secondary mx-2 my-1 h-px" />
                    <button
                      className="dropdown-item text-text-tertiary w-full gap-2 text-[0.72rem]"
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
              </div>
            ) : null}
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
        <div className="flex max-h-[calc(100vh-12rem)] scrollbar-thin flex-col gap-3 overflow-y-auto p-3">
          {/* Empty state */}
          {totalLayers === 0 ? (
            <div className="flex flex-col items-center gap-2 py-5 text-center">
              <Layers
                className="text-text-quaternary opacity-40"
                size={24}
              />
              <div className="text-text-tertiary text-[0.72rem] leading-snug">
                No layers yet.
              </div>
              <button
                className="bg-primary/10 border-primary/25 text-primary hover:bg-primary/20 mt-1 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
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
          {canEdit ? (
            <div className="flex flex-col gap-1.5 pt-1">
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
              {statusMsg ? (
                <div className="text-primary animate-fade-in text-center text-[0.7rem]">
                  {statusMsg}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
