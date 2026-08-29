import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "maplibre-gl/dist/maplibre-gl.css";
import { fetchMapById, MapItem } from "@/lib/maps";
import { BASEMAP_STYLES } from "@/hooks/useMapLibre";
import { Globe, Layers, ZoomIn, ZoomOut, Compass, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { AccessRequestCard } from "@/components/map/share/AccessRequestCard";

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
          "This map could not be loaded. It may be private or deleted.",
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
          style: BASEMAP_STYLES[mapData.basemap] || BASEMAP_STYLES["opentopomap"],
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
              "bottom-right",
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
              "bottom-right",
            );
          }
        });

        mapRef.current = map;
      },
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
              nextVal ? "visible" : "none",
            );
          }
          return { ...l, visible: nextVal };
        }
        return l;
      }),
    );
  };

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleResetNorth = () => mapRef.current?.resetNorthPitch();

  if (loading || (denied && authLoading)) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#090d16] text-text-primary">
        <Globe size={40} className="text-primary animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wider animate-pulse">
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
        <div className="w-screen h-screen flex items-center justify-center bg-[#090d16] p-6">
          <AccessRequestCard entityType="map" entityId={mapId ?? ""} />
        </div>
      );
    }
    const from = mapId ? `/share/map/${mapId}` : "/share";
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#090d16] text-text-primary px-6 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h3 className="text-lg font-bold text-text-primary">
          Sign in to continue
        </h3>
        <p className="mt-2 text-text-secondary text-sm max-w-sm leading-relaxed">
          This map is private. Sign in to view it, or to request access from the
          owner.
        </p>
        <button
          type="button"
          onClick={() =>
            navigate("/login", { state: { from: { pathname: from } } })
          }
          className="btn btn-primary btn-md mt-6 inline-flex items-center gap-2"
        >
          <LogIn size={15} /> Sign in
        </button>
      </div>
    );
  }

  if (errorMsg || !mapData) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#090d16] text-text-primary px-6 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h3 className="text-lg font-bold text-text-primary">Access Denied</h3>
        <p className="mt-2 text-text-secondary text-sm max-w-sm">
          {errorMsg ||
            "This published map has been restricted or removed by the administrator."}
        </p>
        <a href="/projects" className="btn btn-primary btn-md mt-6">
          Back to Dashboard
        </a>
      </div>
    );
  }

  const widgets = mapData.widgets_config || {};

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg-primary select-none">
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="w-full h-full absolute inset-0 z-0"
      />

      {/* Title Card Widget */}
      {widgets.titleCard && (
        <div className="absolute top-4 left-4 z-10 max-w-sm bg-elevated/90 backdrop-blur-xl border border-border-primary rounded-xl p-4 shadow-xl animate-fade-in flex flex-col gap-1.5">
          <h1 className="text-sm font-bold text-text-primary tracking-wide">
            {mapData.title}
          </h1>
          {mapData.description && (
            <p className="text-[11px] text-text-secondary leading-relaxed">
              {mapData.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[9px] font-mono tracking-widest text-success uppercase font-bold">
              Published View
            </span>
          </div>
        </div>
      )}

      {/* Layer Toggle Widget */}
      {widgets.layerList && layersList.filter((l) => l.url).length > 0 && (
        <div className="absolute top-4 right-4 z-10 w-60 bg-elevated/90 backdrop-blur-xl border border-border-primary rounded-xl p-3.5 shadow-xl animate-fade-in flex flex-col gap-2">
          <div className="flex items-center gap-1.5 border-b border-border-secondary/60 pb-1.5 mb-1">
            <Layers size={13} className="text-primary" />
            <span className="text-xs font-bold text-text-primary">
              Map Layers
            </span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto scrollbar-thin">
            {layersList.map((layer) => (
              <label
                key={layer.id}
                className="flex items-center justify-between gap-2.5 p-1.5 rounded hover:bg-surface-hover/50 cursor-pointer text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!layer.visible}
                    onChange={() => toggleLayerVisibility(layer.id)}
                    className="w-3.5 h-3.5 accent-primary rounded cursor-pointer"
                  />
                  <span className="truncate max-w-[140px]">{layer.name}</span>
                </div>
                {layer.style?.color && (
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white/10 shrink-0"
                    style={{ backgroundColor: layer.style.color }}
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Zoom Controls Widget */}
      {widgets.zoomControls && (
        <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-1.5">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-lg bg-elevated/90 backdrop-blur-xl border border-border-primary flex items-center justify-center text-text-secondary hover:text-text-primary shadow-lg hover:scale-105 active:scale-95 transition-all"
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-lg bg-elevated/90 backdrop-blur-xl border border-border-primary flex items-center justify-center text-text-secondary hover:text-text-primary shadow-lg hover:scale-105 active:scale-95 transition-all"
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={handleResetNorth}
            className="w-8 h-8 rounded-lg bg-elevated/90 backdrop-blur-xl border border-border-primary flex items-center justify-center text-text-secondary hover:text-text-primary shadow-lg hover:scale-105 active:scale-95 transition-all"
            title="Reset North"
          >
            <Compass size={15} />
          </button>
        </div>
      )}

      {/* Scale Bar Widget */}
      {widgets.scaleBar && (
        <div className="absolute bottom-6 left-6 z-10 flex items-center gap-1.5">
          <div className="w-24 h-0.5 bg-text-secondary/50 rounded relative">
            <div className="absolute left-0 top-[-2px] w-0.5 h-2 bg-text-secondary/50" />
            <div className="absolute right-0 top-[-2px] w-0.5 h-2 bg-text-secondary/50" />
          </div>
          <span className="text-[10px] text-text-tertiary font-medium">
            ~10 km
          </span>
        </div>
      )}

      {/* Footer Branding / Attribution */}
      {(widgets.attribution || true) && (
        <div className="absolute bottom-3 left-4 z-10 text-[9px] text-text-quaternary select-none">
          {widgets.attribution && <span>© OpenStreetMap © CARTO | </span>}
          Powered by{" "}
          <span className="font-bold text-primary">EarthIQ Core</span>
        </div>
      )}
    </div>
  );
}
