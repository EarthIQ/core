import { TerrainControl } from "@packages/map";
import { Button, Tooltip } from "@packages/ui";
import { Compass, Bookmark } from "lucide-react";
import { useState } from "react";

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

export const MapBottomBar = ({
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
}: MapBottomBarProps) => {
  const [basemapOpen, setBasemapOpen] = useState(false);
  const activeOption = BASEMAP_OPTIONS.find((b) => b.id === activeBasemap);
  const isRotated = Math.abs(bearing) > 0.5;

  return (
    <div className="bg-elevated border-border-primary absolute right-0 bottom-0 left-0 z-20 flex h-10 items-center gap-1 border-t px-3 text-xs">
      <Tooltip
        content="Toggle AI Assistant"
        placement="top"
      >
        <Button
          className="text-text-secondary hover:text-text-primary gap-1"
          size="sm"
          variant="ghost"
          onClick={onToggleAI}
        >
          <span>✨</span>
          <span className="text-xs font-semibold">AI</span>
        </Button>
      </Tooltip>
      <div className="bg-border-primary mx-1.5 h-5 w-px" />

      <Tooltip
        content="Zoom out"
        placement="top"
      >
        <Button
          iconOnly
          aria-label="Zoom out"
          className="text-text-secondary hover:text-text-primary"
          disabled={!mapReady}
          size="sm"
          variant="ghost"
          onClick={onZoomOut}
        >
          −
        </Button>
      </Tooltip>

      <span className="text-text-secondary min-w-[3rem] text-center font-mono text-[0.7rem] tabular-nums">
        {zoomLevel.toFixed(1)}×
      </span>

      <Tooltip
        content="Zoom in"
        placement="top"
      >
        <Button
          iconOnly
          aria-label="Zoom in"
          className="text-text-secondary hover:text-text-primary"
          disabled={!mapReady}
          size="sm"
          variant="ghost"
          onClick={onZoomIn}
        >
          +
        </Button>
      </Tooltip>

      {isRotated && onResetNorth ? (
        <Tooltip
          content="Reset north"
          placement="top"
        >
          <Button
            iconOnly
            className="text-text-secondary hover:text-text-primary animate-fade-in"
            size="sm"
            variant="ghost"
            onClick={onResetNorth}
          >
            <Compass
              size={14}
              style={{ transform: `rotate(${-bearing}deg)` }}
            />
          </Button>
        </Tooltip>
      ) : null}

      <div className="bg-border-primary mx-1.5 h-5 w-px" />

      <div className="relative">
        <Button
          className="text-text-secondary hover:text-text-primary gap-1.5"
          disabled={!mapReady}
          size="sm"
          variant="ghost"
          onClick={() => setBasemapOpen((v) => !v)}
        >
          <span>{activeOption?.icon ?? "🗺️"}</span>
          <span className="text-xs">{activeOption?.name ?? "Basemap"}</span>
          <span className="text-[0.55rem] opacity-50">
            {basemapOpen ? "▲" : "▼"}
          </span>
        </Button>

        {basemapOpen ? (
          <div className="bg-elevated border-border-primary shadow-dropdown animate-fade-in-up absolute bottom-full left-0 mb-1.5 w-44 rounded-lg border py-1">
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
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
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
        ) : null}
      </div>
      <TerrainControl
        exaggeration={TERRAIN_EXAGGERATION}
        source={TERRAIN_SOURCE_URL}
        onChange={onTerrainChange}
      />

      {/* Bookmark - pinned to the right end of the bar */}
      {onToggleBookmark ? (
        <div className="ml-auto">
          <Tooltip
            content="Bookmark"
            placement="top"
          >
            <Button
              iconOnly
              aria-label="Bookmark"
              aria-pressed={bookmarkActive}
              size="sm"
              variant="ghost"
              className={
                bookmarkActive
                  ? "text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }
              onClick={onToggleBookmark}
            >
              <Bookmark
                fill={bookmarkActive ? "currentColor" : "none"}
                size={16}
              />
            </Button>
          </Tooltip>
        </div>
      ) : null}
    </div>
  );
};
