/**
 * PublicMapPage.tsx
 * -----------------
 * Public, no-auth viewer for `/share/map/:mapId`. All published content is a
 * `maps` row with a `kind` discriminator, so the page fetches the row once
 * and dispatches to the right viewer:
 *
 *   - kind "map"          → `PublicMapViewer` (this file, MapLibre dashboard)
 *   - kind "story_map"    → `StoryViewer` (pages/PublicStoryMapPage)
 *   - kind "presentation" → `PresentationViewer` (pages/PublicPresentationPage)
 *
 * Private content falls through to the shared `PublicDenied` screen
 * (sign-in or request access).
 */
import { Globe, Layers, ZoomIn, ZoomOut, Compass } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import {
  PublicDenied,
  usePublicEntity,
} from "@/components/map/share/PublicEntity";
import { BASEMAP_STYLES } from "@/hooks/useMapLibre";
import { type MapItem } from "@/lib/maps";
import { PresentationViewer } from "@/pages/PublicPresentationPage";
import { StoryViewer } from "@/pages/PublicStoryMapPage";

import type { Deck } from "@/components/builder/presentation";
import type { StoryMap } from "@/components/builder/storymap";

/* ── Dispatcher ───────────────────────────────────────────────────────────── */

export default function PublicMapPage() {
  const { mapId } = useParams<{ mapId: string }>();
  const { row, loading, denied, errorMsg } = usePublicEntity(mapId ?? "");

  if (loading) {
    return (
      <div className="bg-bg-primary text-text-primary flex h-screen w-screen flex-col items-center justify-center">
        <Globe
          className="text-primary mb-4 animate-spin"
          size={40}
        />
        <span className="animate-pulse text-sm font-semibold tracking-wider">
          Loading…
        </span>
      </div>
    );
  }

  if (denied) {
    return (
      <PublicDenied
        entityId={mapId ?? ""}
        from={mapId ? `/share/map/${mapId}` : "/share"}
        noun={
          row?.kind === "story_map"
            ? "story map"
            : row?.kind === "presentation"
              ? "presentation"
              : "map"
        }
      />
    );
  }

  if (errorMsg || !row) {
    return (
      <div className="bg-bg-primary text-text-primary flex h-screen w-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 text-5xl">🔒</div>
        <h3 className="text-text-primary text-lg font-bold">
          This content isn't available
        </h3>
        <p className="text-text-secondary mt-2 max-w-sm text-sm">
          {errorMsg ??
            "This link is incomplete or the content has been removed."}
        </p>
        <a
          className="btn btn-primary btn-md mt-6"
          href="/"
        >
          Go home
        </a>
      </div>
    );
  }

  /* Story map */
  if (row.kind === "story_map") {
    const raw = row.content?.story;
    const story =
      raw &&
      typeof raw === "object" &&
      typeof (raw as StoryMap).title === "string" &&
      Array.isArray((raw as StoryMap).scenes)
        ? (raw as StoryMap)
        : null;
    return (
      <>
        {story ? (
          <StoryViewer story={story} />
        ) : (
          <EmptyContent noun="story map" />
        )}
      </>
    );
  }

  /* Presentation */
  if (row.kind === "presentation") {
    const raw = row.content?.deck;
    const deck =
      raw &&
      typeof raw === "object" &&
      typeof (raw as Deck).title === "string" &&
      Array.isArray((raw as Deck).slides)
        ? (raw as Deck)
        : null;
    return deck ? (
      <PresentationViewer
        context={row.content?.context}
        deck={deck}
      />
    ) : (
      <EmptyContent noun="presentation" />
    );
  }

  /* Plain map (default + legacy rows) */
  return <PublicMapViewer map={row} />;
}

const EmptyContent = ({ noun }: { noun: string }) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--bg-secondary)] px-6 text-center">
      <p className="text-sm text-[var(--text-primary)]">
        This {noun} has no content yet.
      </p>
      <a
        className="btn btn-primary btn-md"
        href="/"
      >
        Go home
      </a>
    </div>
  );
};

/* ── Map dashboard viewer ─────────────────────────────────────────────────── */

export const PublicMapViewer = ({ map }: { map: MapItem }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [layersList, setLayersList] = useState<any[]>(map.layers_config || []);

  // Initialize MapLibre
  useEffect(() => {
    if (!map || !mapContainerRef.current) return;

    let cancelled = false;
    import("maplibre-gl").then(
      ({ Map, NavigationControl, ScaleControl, GeolocateControl }) => {
        if (cancelled || !mapContainerRef.current) return;

        const widgets = map.widgets_config || {};

        const maplibre = new Map({
          container: mapContainerRef.current,
          style: BASEMAP_STYLES[map.basemap] || BASEMAP_STYLES["opentopomap"],
          center: [map.center_lng, map.center_lat],
          zoom: map.zoom,
          bearing: (map as any).bearing || 0,
          pitch: (map as any).pitch || 0,
          attributionControl: false,
        });

        maplibre.on("load", () => {
          setMapReady(true);
          // Add layers if any are configured
          (map.layers_config || []).forEach((layer: any) => {
            if (!layer.url) return;
            try {
              if (layer.type === "raster") {
                maplibre.addSource(layer.id, {
                  type: "raster",
                  tiles: [layer.url],
                  tileSize: 256,
                });
                maplibre.addLayer({
                  id: layer.id,
                  type: "raster",
                  source: layer.id,
                  layout: {
                    visibility: layer.visible ? "visible" : "none",
                  },
                });
              } else {
                // Assume vector
                maplibre.addSource(layer.id, {
                  type: "vector",
                  tiles: [layer.url],
                });
                maplibre.addLayer({
                  id: layer.id,
                  type: "fill",
                  source: layer.id,
                  "source-layer": "default",
                  paint: {
                    "fill-color": (layer.style?.color as string) || "#3b82f6",
                    "fill-opacity": (layer.style?.opacity as number) ?? 0.6,
                  },
                  layout: {
                    visibility: layer.visible ? "visible" : "none",
                  },
                });
              }
            } catch (e) {
              console.error("Error adding map layer:", e);
            }
          });

          // Add controls based on widget config
          if (widgets.compass || widgets.zoomControls) {
            maplibre.addControl(
              new NavigationControl({
                showCompass: !!widgets.compass,
                showZoom: !!widgets.zoomControls,
              }),
              "bottom-right"
            );
          }
          if (widgets.scaleBar) {
            maplibre.addControl(
              new ScaleControl({ unit: "metric" }),
              "bottom-left"
            );
          }
          if (widgets.geolocate) {
            maplibre.addControl(
              new GeolocateControl({
                positionOptions: { enableHighAccuracy: true },
              }),
              "bottom-right"
            );
          }
        });

        mapRef.current = maplibre;
      }
    );

    return () => {
      cancelled = true;
      if (mapRef.current?.remove) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
    };
  }, [map]);

  // Sync layer toggles to MapLibre layers
  const toggleLayerVisibility = (layerId: string) => {
    setLayersList((prev) =>
      prev.map((l) => {
        if (l.id === layerId) {
          const nextVal = !l.visible;
          const map = mapRef.current;
          if (map && mapReady && map.getLayer(layerId)) {
            map.setLayoutProperty(
              layerId,
              "visibility",
              nextVal ? "visible" : "none"
            );
          }
          return { ...l, visible: nextVal };
        }
        return l;
      })
    );
  };

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleResetNorth = () => mapRef.current?.resetNorthPitch();

  const widgets = map.widgets_config || {};

  return (
    <div className="bg-bg-primary relative h-screen w-screen overflow-hidden select-none">
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 z-0 h-full w-full"
      />

      {/* Title Card Widget */}
      {widgets.titleCard ? (
        <div className="bg-elevated border-border-primary animate-fade-in absolute top-4 left-4 z-10 flex max-w-sm flex-col gap-1.5 rounded-xl border p-4 shadow-xl">
          <h1 className="text-text-primary text-sm font-bold tracking-wide">
            {map.title}
          </h1>
          {map.description ? (
            <p className="text-text-secondary text-[11px] leading-relaxed">
              {map.description}
            </p>
          ) : null}
          <div className="mt-1 flex items-center gap-1.5">
            <span className="bg-success h-2 w-2 animate-pulse rounded-full" />
            <span className="text-success font-mono text-[9px] font-bold tracking-widest uppercase">
              Published View
            </span>
          </div>
        </div>
      ) : null}

      {/* Layer Toggle Widget */}
      {widgets.layerList && layersList.filter((l) => l.url).length > 0 ? (
        <div className="bg-elevated border-border-primary animate-fade-in absolute top-4 right-4 z-10 flex w-60 flex-col gap-2 rounded-xl border p-3.5 shadow-xl">
          <div className="border-border-secondary/60 mb-1 flex items-center gap-1.5 border-b pb-1.5">
            <Layers
              className="text-primary"
              size={13}
            />
            <span className="text-text-primary text-xs font-bold">
              Map Layers
            </span>
          </div>

          <div className="flex max-h-48 scrollbar-thin flex-col gap-1.5 overflow-y-auto">
            {layersList.map((layer) => (
              <label
                key={layer.id}
                className="hover:bg-surface-hover/50 text-text-secondary hover:text-text-primary flex cursor-pointer items-center justify-between gap-2.5 rounded p-1.5 text-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <input
                    checked={!!layer.visible}
                    className="accent-primary h-3.5 w-3.5 cursor-pointer rounded"
                    type="checkbox"
                    onChange={() => toggleLayerVisibility(layer.id)}
                  />
                  <span className="max-w-[140px] truncate">{layer.name}</span>
                </div>
                {layer.style?.color ? (
                  <span
                    className="border-border-primary h-2.5 w-2.5 shrink-0 rounded-full border"
                    style={{ backgroundColor: layer.style.color }}
                  />
                ) : null}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {/* Zoom Controls Widget */}
      {widgets.zoomControls ? (
        <div className="absolute right-6 bottom-6 z-10 flex flex-col gap-1.5">
          <button
            className="bg-elevated border-border-primary text-text-secondary hover:text-text-primary flex h-8 w-8 items-center justify-center rounded-lg border shadow-lg transition-all hover:scale-105 active:scale-95"
            title="Zoom In"
            onClick={handleZoomIn}
          >
            <ZoomIn size={15} />
          </button>
          <button
            className="bg-elevated border-border-primary text-text-secondary hover:text-text-primary flex h-8 w-8 items-center justify-center rounded-lg border shadow-lg transition-all hover:scale-105 active:scale-95"
            title="Zoom Out"
            onClick={handleZoomOut}
          >
            <ZoomOut size={15} />
          </button>
          <button
            className="bg-elevated border-border-primary text-text-secondary hover:text-text-primary flex h-8 w-8 items-center justify-center rounded-lg border shadow-lg transition-all hover:scale-105 active:scale-95"
            title="Reset North"
            onClick={handleResetNorth}
          >
            <Compass size={15} />
          </button>
        </div>
      ) : null}

      {/* Scale Bar Widget */}
      {widgets.scaleBar ? (
        <div className="absolute bottom-6 left-6 z-10 flex items-center gap-1.5">
          <div className="bg-text-secondary/50 relative h-0.5 w-24 rounded">
            <div className="bg-text-secondary/50 absolute top-[-2px] left-0 h-2 w-0.5" />
            <div className="bg-text-secondary/50 absolute top-[-2px] right-0 h-2 w-0.5" />
          </div>
          <span className="text-text-tertiary text-[10px] font-medium">
            ~10 km
          </span>
        </div>
      ) : null}

      {/* Footer Branding / Attribution */}
      <div className="text-text-quaternary absolute bottom-3 left-4 z-10 text-[9px] select-none">
        {widgets.attribution ? <span>© OpenStreetMap © CARTO | </span> : null}
        Powered by <span className="text-primary font-bold">EarthIQ Core</span>
      </div>
    </div>
  );
};
