import { Globe, Layers, ZoomIn, ZoomOut, Compass, LogIn } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { AccessRequestCard } from "@/components/map/share/AccessRequestCard";
import { BASEMAP_STYLES } from "@/hooks/useMapLibre";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fetchMapById, type MapItem } from "@/lib/maps";

export default function PublicMapPage() {
  const { mapId } = useParams<{ mapId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapData, setMapData] = useState<MapItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [layersList, setLayersList] = useState<any[]>([]);

  // Fetch map details on mount
  useEffect(() => {
    if (!mapId) return;
    fetchMapById(mapId)
      .then((data) => {
        setMapData(data);
        setLayersList(data.layers_config || []);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setDenied(true);
        console.error(err);
        setErrorMsg(
          "This map could not be loaded. It may be private or deleted."
        );
        setLoading(false);
      });
  }, [mapId]);

  // Initialize MapLibre
  useEffect(() => {
    if (loading || errorMsg || !mapData || !mapContainerRef.current) return;

    let cancelled = false;
    import("maplibre-gl").then(
      ({ Map, NavigationControl, ScaleControl, GeolocateControl }) => {
        if (cancelled || !mapContainerRef.current) return;

        const widgets = mapData.widgets_config || {};

        const map = new Map({
          container: mapContainerRef.current,
          style:
            BASEMAP_STYLES[mapData.basemap] || BASEMAP_STYLES["opentopomap"],
          center: [mapData.center_lng, mapData.center_lat],
          zoom: mapData.zoom,
          bearing: (mapData as any).bearing || 0,
          pitch: (mapData as any).pitch || 0,
          attributionControl: false,
        });

        map.on("load", () => {
          setMapReady(true);
          // Add layers if any are configured
          (mapData.layers_config || []).forEach((layer: any) => {
            if (!layer.url) return;
            try {
              if (layer.type === "raster") {
                map.addSource(layer.id, {
                  type: "raster",
                  tiles: [layer.url],
                  tileSize: 256,
                });
                map.addLayer({
                  id: layer.id,
                  type: "raster",
                  source: layer.id,
                  layout: {
                    visibility: layer.visible ? "visible" : "none",
                  },
                });
              } else {
                // Assume vector
                map.addSource(layer.id, {
                  type: "vector",
                  tiles: [layer.url],
                });
                map.addLayer({
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
            map.addControl(
              new NavigationControl({
                showCompass: !!widgets.compass,
                showZoom: !!widgets.zoomControls,
              }),
              "bottom-right"
            );
          }
          if (widgets.scaleBar) {
            map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");
          }
          if (widgets.geolocate) {
            map.addControl(
              new GeolocateControl({
                positionOptions: { enableHighAccuracy: true },
              }),
              "bottom-right"
            );
          }
        });

        mapRef.current = map;
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
  }, [loading, errorMsg, mapData]);

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

  if (loading || (denied && authLoading)) {
    return (
      <div className="bg-bg-primary text-text-primary flex h-screen w-screen flex-col items-center justify-center">
        <Globe
          className="text-primary mb-4 animate-spin"
          size={40}
        />
        <span className="animate-pulse text-sm font-semibold tracking-wider">
          Loading map dashboard...
        </span>
      </div>
    );
  }

  /* ── 403 on a private map ────────────────────────────────────────────────
     Logged in  → Google-Docs style "Request access" card
     Logged out → login UI first (return here afterwards)                     */
  if (denied) {
    if (isAuthenticated) {
      return (
        <div className="bg-bg-primary flex h-screen w-screen items-center justify-center p-6">
          <AccessRequestCard
            entityId={mapId ?? ""}
            entityType="map"
          />
        </div>
      );
    }
    const from = mapId ? `/share/map/${mapId}` : "/share";
    return (
      <div className="bg-bg-primary text-text-primary flex h-screen w-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 text-5xl">🔒</div>
        <h3 className="text-text-primary text-lg font-bold">
          Sign in to continue
        </h3>
        <p className="text-text-secondary mt-2 max-w-sm text-sm leading-relaxed">
          This map is private. Sign in to view it, or to request access from the
          owner.
        </p>
        <button
          className="btn btn-primary btn-md mt-6 inline-flex items-center gap-2"
          type="button"
          onClick={() =>
            navigate("/login", { state: { from: { pathname: from } } })
          }
        >
          <LogIn size={15} /> Sign in
        </button>
      </div>
    );
  }

  if (errorMsg || !mapData) {
    return (
      <div className="bg-bg-primary text-text-primary flex h-screen w-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 text-5xl">🔒</div>
        <h3 className="text-text-primary text-lg font-bold">Access Denied</h3>
        <p className="text-text-secondary mt-2 max-w-sm text-sm">
          {errorMsg ||
            "This published map has been restricted or removed by the administrator."}
        </p>
        <a
          className="btn btn-primary btn-md mt-6"
          href="/projects"
        >
          Back to Dashboard
        </a>
      </div>
    );
  }

  const widgets = mapData.widgets_config || {};

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
            {mapData.title}
          </h1>
          {mapData.description ? (
            <p className="text-text-secondary text-[11px] leading-relaxed">
              {mapData.description}
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
}
