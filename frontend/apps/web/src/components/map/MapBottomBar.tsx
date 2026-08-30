import { useState } from "react";
import { Button, Tooltip } from "@packages/ui";
import { TerrainControl } from "@packages/map";
import { Compass, Bookmark } from "lucide-react";

/**
 * Terrain source for the 3D terrain toggle (MapTern terrarium tiles).
 * Must stay in sync with the `source` prop passed to TerrainControl in
 * MapPage (which also re-applies terrain after a basemap switch).
 */
export const TERRAIN_SOURCE_URL =
  "https://tiles.mapterhorn.com/{z}/{x}/{y}.webp";
export const TERRAIN_SOURCE_ID = "terrain-source";
export const TERRAIN_EXAGGERATION = 1.5;

const BASEMAP_OPTIONS = [
  { id: "osm", name: "OpenStreetMap", icon: "🗺️" },
  { id: "esri-satellite", name: "ESRI Satellite", icon: "🛰️" },
  { id: "opentopomap", name: "OpenTopoMap", icon: "⛰️" },
];

interface MapBottomBarProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  activeBasemap: string;
  onBasemapChange: (id: string) => void;
  mapReady: boolean;
  bearing?: number;
  onResetNorth?: () => void;
  onToggleAI: () => void;
  /** Notified when the 3D terrain toggle changes (on = terrain active). */
  onTerrainChange?: (enabled: boolean) => void;
  /** Bookmark panel open state (drives the toggle button's active style). */
  bookmarkActive?: boolean;
  /** Toggles the bookmark panel. Omit to hide the button. */
  onToggleBookmark?: () => void;
}

export function MapBottomBar({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  activeBasemap,
  onBasemapChange,
  mapReady,
  bearing = 0,
  onResetNorth,
  onToggleAI,
  onTerrainChange,
  bookmarkActive = false,
  onToggleBookmark,
}: MapBottomBarProps) {
  const [basemapOpen, setBasemapOpen] = useState(false);
  const activeOption = BASEMAP_OPTIONS.find((b) => b.id === activeBasemap);
  const isRotated = Math.abs(bearing) > 0.5;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-1 px-3 h-10 bg-elevated border-t border-border-primary text-xs">
      <Tooltip content="Toggle AI Assistant" placement="top">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleAI}
          className="text-text-secondary hover:text-text-primary gap-1"
        >
          <span>✨</span>
          <span className="font-semibold text-xs">AI</span>
        </Button>
      </Tooltip>
      <div className="w-px h-5 bg-border-primary mx-1.5" />

      <Tooltip content="Zoom out" placement="top">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={onZoomOut}
          disabled={!mapReady}
          aria-label="Zoom out"
          className="text-text-secondary hover:text-text-primary"
        >
          −
        </Button>
      </Tooltip>

      <span className="text-[0.7rem] font-mono text-text-secondary tabular-nums min-w-[3rem] text-center">
        {zoomLevel.toFixed(1)}×
      </span>

      <Tooltip content="Zoom in" placement="top">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={onZoomIn}
          disabled={!mapReady}
          aria-label="Zoom in"
          className="text-text-secondary hover:text-text-primary"
        >
          +
        </Button>
      </Tooltip>

      {isRotated && onResetNorth && (
        <Tooltip content="Reset north" placement="top">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={onResetNorth}
            className="text-text-secondary hover:text-text-primary animate-fade-in"
          >
            <Compass
              size={14}
              style={{ transform: `rotate(${-bearing}deg)` }}
            />
          </Button>
        </Tooltip>
      )}

      <div className="w-px h-5 bg-border-primary mx-1.5" />

      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setBasemapOpen((v) => !v)}
          disabled={!mapReady}
          className="text-text-secondary hover:text-text-primary gap-1.5"
        >
          <span>{activeOption?.icon ?? "🗺️"}</span>
          <span className="text-xs">{activeOption?.name ?? "Basemap"}</span>
          <span className="text-[0.55rem] opacity-50">
            {basemapOpen ? "▲" : "▼"}
          </span>
        </Button>

        {basemapOpen && (
          <div className="absolute bottom-full left-0 mb-1.5 w-44 bg-elevated border border-border-primary rounded-lg shadow-dropdown py-1 animate-fade-in-up">
            {BASEMAP_OPTIONS.map((bm) => (
              <button
                key={bm.id}
                type="button"
                className={`dropdown-item w-full gap-2 ${
                  activeBasemap === bm.id ? "text-primary font-semibold" : ""
                }`}
                onClick={() => {
                  onBasemapChange(bm.id);
                  setBasemapOpen(false);
                }}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    activeBasemap === bm.id
                      ? "bg-primary"
                      : "bg-text-quaternary"
                  }`}
                />
                <span>{bm.icon}</span>
                <span>{bm.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <TerrainControl
        source={TERRAIN_SOURCE_URL}
        exaggeration={TERRAIN_EXAGGERATION}
        onChange={onTerrainChange}
      />

      {/* Bookmark — pinned to the right end of the bar */}
      {onToggleBookmark && (
        <div className="ml-auto">
          <Tooltip content="Bookmark" placement="top">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={onToggleBookmark}
              aria-label="Bookmark"
              aria-pressed={bookmarkActive}
              className={
                bookmarkActive
                  ? "text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }
            >
              <Bookmark
                size={16}
                fill={bookmarkActive ? "currentColor" : "none"}
              />
            </Button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
