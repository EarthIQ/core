import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  fetchMaps,
  fetchMapById,
  updateMap,
  MapItem,
  MapLayerItem,
} from "@/lib/maps";
import { useModules } from "@/lib/modules";
import { useAuth } from "@/lib/auth";
import { Button, Switch, Tooltip } from "@packages/ui";
import {
  ArrowLeft,
  Search,
  Share2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import AIChatPanel from "@/components/Map/AIChatPanel";

interface LayerItem {
  id: string;
  name: string;
  type: "vector" | "raster";
  visible: boolean;
}

const DEFAULT_VECTOR_LAYERS: LayerItem[] = [
  {
    id: "admin-boundaries",
    name: "Admin Boundaries",
    type: "vector",
    visible: false,
  },
  { id: "land-use", name: "Land Use / LULC", type: "vector", visible: false },
  {
    id: "elevation-contours",
    name: "Elevation Contours",
    type: "vector",
    visible: false,
  },
];

const DEFAULT_RASTER_LAYERS: LayerItem[] = [
  {
    id: "sentinel-2-rgb",
    name: "Sentinel-2 RGB",
    type: "raster",
    visible: false,
  },
  { id: "ndvi-2024", name: "NDVI 2024", type: "raster", visible: false },
  { id: "dem-30m", name: "DEM 30m", type: "raster", visible: false },
];

const BASEMAP_URLS: Record<string, string> = {
  "dataviz-dark":
    "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  "dataviz-light":
    "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  satellite: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
};

const BASEMAP_OPTIONS = [
  { id: "dataviz-dark", name: "Dark Matter", icon: "🌑" },
  { id: "dataviz-light", name: "Light", icon: "☀️" },
  { id: "satellite", name: "Voyager", icon: "🛰️" },
];

const ACTION_BUTTONS = [
  { id: "inspect", icon: "⊕", label: "Inspect" },
  { id: "select", icon: "⬚", label: "Select" },
  { id: "draw", icon: "✏️", label: "Draw" },
  { id: "measure", icon: "📐", label: "Measure" },
  { id: "analysis", icon: "📊", label: "Analysis" },
  { id: "annotate", icon: "💬", label: "Annotate" },
  { id: "tools", icon: "🔧", label: "Tools" },
  { id: "export", icon: "⬆️", label: "Export" },
];

/* ──────────────────────────────────────────────────────────── */
/*  LayerRow                                                    */
/* ──────────────────────────────────────────────────────────── */
function LayerRow({
  layer,
  onToggle,
}: {
  layer: LayerItem;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-2.5 py-1.5 px-1 rounded-md hover:bg-surface-hover transition-colors duration-150"
      id={`layer-toggle-${layer.id}`}
    >
      <Switch
        size="sm"
        checked={layer.visible}
        onChange={() => onToggle(layer.id)}
        aria-label={layer.name}
      />
      <span className="text-xs text-text-secondary truncate">{layer.name}</span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Section Header (reusable within panels)                     */
/* ──────────────────────────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[0.65rem] font-semibold uppercase tracking-widest text-text-quaternary mb-1.5 select-none">
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Floating Layer Panel                                        */
/* ──────────────────────────────────────────────────────────── */
function LayerPanel({
  availableMaps,
  mapId,
  currentMap,
  onMapChange,
  vectorLayers,
  rasterLayers,
  onToggleVector,
  onToggleRaster,
  canEdit,
  saving,
  onSave,
  statusMsg,
  isAvailableModule,
  aiOpen,
}: {
  availableMaps: MapItem[];
  mapId: string | null;
  currentMap: MapItem | null;
  onMapChange: (id: string) => void;
  vectorLayers: LayerItem[];
  rasterLayers: LayerItem[];
  onToggleVector: (id: string) => void;
  onToggleRaster: (id: string) => void;
  canEdit: boolean;
  saving: boolean;
  onSave: () => void;
  statusMsg: string | null;
  isAvailableModule: (id: string) => boolean;
  aiOpen?: boolean;
}) {
  const [minimized, setMinimized] = useState(false);

  const leftStyle = minimized
    ? aiOpen
      ? { left: 360 + 12 }
      : { left: 12 }
    : aiOpen
    ? { left: 360 + 12 }
    : undefined;

  return (
    <div
      className={`absolute top-16 z-20 flex flex-col bg-elevated/95 backdrop-blur-xl border border-border-primary rounded-xl shadow-xl transition-all duration-300 ease-in-out ${
        minimized ? "w-10" : "w-64"
      }`}
      style={leftStyle}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1 py-1 border-b border-border-secondary shrink-0">
        {!minimized && (
          <div className="flex items-center gap-2">
            <span className="text-sm">🗂️</span>
            <span className="text-xs font-bold text-text-primary">Layers</span>
          </div>
        )}
        <Tooltip
          content={minimized ? "Expand panel" : "Collapse panel"}
          placement="right"
        >
          <Button
            iconOnly
            id="layer-panel-toggle"
            onClick={() => setMinimized((v) => !v)}
            aria-label={minimized ? "Expand panel" : "Collapse panel"}
          >
            {minimized ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </Tooltip>
      </div>

      {/* Body — hidden when minimized */}
      {!minimized && (
        <div className="flex flex-col gap-4 p-3 overflow-y-auto max-h-[calc(100vh-12rem)] scrollbar-thin">
          {/* Vector Layers */}
          <div className="flex flex-col gap-1">
            <SectionTitle>Vector Layers</SectionTitle>
            {vectorLayers.map((l) => (
              <LayerRow key={l.id} layer={l} onToggle={onToggleVector} />
            ))}
          </div>

          {/* Raster Layers */}
          <div className="flex flex-col gap-1">
            <SectionTitle>Raster Layers</SectionTitle>
            {rasterLayers.map((l) => (
              <LayerRow key={l.id} layer={l} onToggle={onToggleRaster} />
            ))}
          </div>

          {/* Hydrology Module (conditional) */}
          {isAvailableModule("hydrology-module") && (
            <div className="flex flex-col gap-1">
              <SectionTitle>Hydrology Module</SectionTitle>
            </div>
          )}

          {/* Save Button */}
          {canEdit && (
            <div className="flex flex-col gap-1.5">
              <Button
                variant="primary"
                size="sm"
                fullWidth
                loading={saving}
                loadingText="Saving…"
                onClick={onSave}
                id="save-viewport-btn"
              >
                💾 Save Viewport
              </Button>
              {statusMsg && (
                <div className="text-[0.7rem] text-primary text-center animate-fade-in">
                  {statusMsg}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Bottom Bar                                                  */
/* ──────────────────────────────────────────────────────────── */
function MapBottomBar({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  activeBasemap,
  onBasemapChange,
  coords,
  availableMaps,
  mapId,
  onMapChange,
  mapReady,
  onToggleAI,
}: {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  activeBasemap: string;
  onBasemapChange: (id: string) => void;
  coords: { lat: number; lng: number } | null;
  availableMaps: MapItem[];
  mapId: string | null;
  onMapChange: (id: string) => void;
  mapReady: boolean;
  onToggleAI: () => void;
}) {
  const [basemapOpen, setBasemapOpen] = useState(false);
  const activeOption = BASEMAP_OPTIONS.find((b) => b.id === activeBasemap);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-1 px-3 h-10 bg-elevated/90 backdrop-blur-lg border-t border-border-primary text-xs">
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
      {/* Divider */}
      <div className="w-px h-5 bg-border-primary mx-1.5" />
      {/* Zoom Controls */}
      <Tooltip content="Zoom out" placement="top">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          id="zoom-out"
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
          id="zoom-in"
          onClick={onZoomIn}
          disabled={!mapReady}
          aria-label="Zoom in"
          className="text-text-secondary hover:text-text-primary"
        >
          +
        </Button>
      </Tooltip>

      {/* Divider */}
      <div className="w-px h-5 bg-border-primary mx-1.5" />

      {/* Basemap Dropdown */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          id="basemap-dropdown-trigger"
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
                id={`basemap-${bm.id}`}
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

      {/* Spacer */}
      <div className="flex-1" />

      {/* Live Coordinates */}
      {coords && (
        <span
          className="font-mono text-[0.7rem] text-text-tertiary tabular-nums tracking-tight"
          id="map-coords"
        >
          {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </span>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Action Toolbar (Google Meet–style)                          */
/* ──────────────────────────────────────────────────────────── */
function MapActionBar({
  activeAction,
  onActionChange,
}: {
  activeAction: string | null;
  onActionChange: (id: string) => void;
}) {
  return (
    <div
      className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 px-2 py-1.5 bg-elevated/90 backdrop-blur-xl border border-border-primary rounded-2xl shadow-xl"
      id="map-action-bar"
    >
      {ACTION_BUTTONS.map((btn, i) => (
        <span key={btn.id} className="contents">
          {/* Separator before "Tools" */}
          {i === 6 && (
            <div className="w-px h-7 bg-border-primary mx-1 shrink-0" />
          )}
          <Tooltip content={btn.label} placement="top">
            <button
              id={`action-btn-${btn.id}`}
              type="button"
              className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-xl border-none cursor-pointer transition-all duration-150 min-w-[3rem] ${
                activeAction === btn.id
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
              onClick={() => onActionChange(btn.id)}
              aria-label={btn.label}
              aria-pressed={activeAction === btn.id}
            >
              <span className="text-base leading-none">{btn.icon}</span>
              <span className="text-[0.6rem] font-medium leading-none">
                {btn.label}
              </span>
            </button>
          </Tooltip>
        </span>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  MapNavbar                                                   */
/* ──────────────────────────────────────────────────────────── */
function MapNavbar({
  projectName,
  onBack,
  onShare,
}: {
  projectName: string;
  onBack: () => void;
  onShare: () => void;
}) {
  const { user } = useAuth();
  const [searchVal, setSearchVal] = useState("");
  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : "U";

  return (
    <header className="absolute top-0 left-0 right-0 z-30 h-14 bg-elevated/90 backdrop-blur-xl border-b border-border-primary flex items-center justify-between px-4">
      {/* Left: Back button & Project Name */}
      <div className="flex items-center gap-3">
        <Tooltip content="Back to projects" placement="bottom">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={onBack}
            aria-label="Back"
            className="text-text-secondary hover:text-text-primary animate-fade-in"
          >
            <ArrowLeft size={18} />
          </Button>
        </Tooltip>
        <span className="w-px h-5 bg-border-primary" />
        <div className="flex flex-col">
          <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider leading-none">
            Project
          </span>
          <span
            className="text-sm font-bold text-text-primary truncate max-w-[200px]"
            title={projectName}
          >
            {projectName}
          </span>
        </div>
      </div>

      {/* Center: Search Locations */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative flex items-center bg-surface-hover/50 border border-border-secondary rounded-lg px-3 py-1 hover:border-border-primary transition-colors">
          <Search size={16} className="text-text-tertiary mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search locations..."
            className="input input-sm border-none bg-transparent w-full p-0 text-xs focus:ring-0 focus:outline-none placeholder:text-text-quaternary"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
          />
        </div>
      </div>

      {/* Right: User icon & Share button */}
      <div className="flex items-center gap-2">
        <Tooltip content={user?.email || "User Profile"} placement="bottom">
          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center shrink-0 border border-primary/20 cursor-pointer">
            {userInitial}
          </div>
        </Tooltip>
        <span className="w-px h-5 bg-border-primary" />
        <Tooltip content="Share map" placement="bottom">
          <Button
            variant="ghost"
            size="sm"
            onClick={onShare}
            leftIcon={<Share2 size={16} />}
            className="text-text-secondary hover:text-text-primary gap-1.5"
          >
            <span className="text-xs font-semibold hidden sm:inline">
              Share
            </span>
          </Button>
        </Tooltip>
      </div>
    </header>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Main MapPage                                                */
/* ──────────────────────────────────────────────────────────── */
export default function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mapId = searchParams.get("mapId");
  const navigate = useNavigate();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  // Holds the last-requested camera position/zoom while the map instance
  // (or its style) isn't fully ready yet. Applied as soon as it is.
  const pendingFlyToRef = useRef<{
    center: [number, number];
    zoom: number;
  } | null>(null);

  const [availableMaps, setAvailableMaps] = useState<MapItem[]>([]);
  const [currentMap, setCurrentMap] = useState<MapItem | null>(null);

  const [activeBasemap, setActiveBasemap] = useState("dataviz-dark");
  const [vectorLayers, setVectorLayers] = useState(DEFAULT_VECTOR_LAYERS);
  const [rasterLayers, setRasterLayers] = useState(DEFAULT_RASTER_LAYERS);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(2.5);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  const { isAvailable } = useModules();

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.resize();
      }, 300);
    }
  }, [aiChatOpen]);

  /* ── 1. Fetch available maps ─────────────────────────────── */
  useEffect(() => {
    fetchMaps()
      .then((data) => {
        setAvailableMaps(data);
        if (!mapId && data.length > 0) {
          setSearchParams({ mapId: data[0].id });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 2. Initialize MapLibre — runs exactly ONCE ──────────── */
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let cancelled = false;

    import("maplibre-gl").then(({ Map }) => {
      if (cancelled || !mapContainerRef.current) return;

      const map = new Map({
        container: mapContainerRef.current,
        style: BASEMAP_URLS[activeBasemap] || BASEMAP_URLS["dataviz-dark"],
        center: [0, 20],
        zoom: 2.5,
        attributionControl: false,
      });

      map.on("load", () => {
        setMapReady(true);
        setZoomLevel(map.getZoom());
        const c = map.getCenter();
        setCoords({ lat: c.lat, lng: c.lng });

        // Apply any camera move that was requested before the map was ready.
        if (pendingFlyToRef.current) {
          map.jumpTo(pendingFlyToRef.current);
          pendingFlyToRef.current = null;
        }
      });

      map.on("zoom", () => setZoomLevel(map.getZoom()));
      map.on("mousemove", (e: any) => {
        setCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });

      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      if (mapRef.current?.remove) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
    };
    // Intentionally empty deps — the map instance is created once and
    // reused for the life of this component. Camera/style changes are
    // applied imperatively via flyTo/setStyle in the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 3. Load map configuration whenever mapId changes ───────── */
  useEffect(() => {
    if (!mapId) return;
    fetchMapById(mapId)
      .then((mapData) => {
        setCurrentMap(mapData);
        setActiveBasemap(mapData.basemap || "dataviz-dark");

        if (mapData.layers_config && mapData.layers_config.length > 0) {
          const vectors = mapData.layers_config.filter(
            (l) => l.type === "vector",
          );
          const rasters = mapData.layers_config.filter(
            (l) => l.type === "raster",
          );
          setVectorLayers(
            vectors.length ? (vectors as LayerItem[]) : DEFAULT_VECTOR_LAYERS,
          );
          setRasterLayers(
            rasters.length ? (rasters as LayerItem[]) : DEFAULT_RASTER_LAYERS,
          );
        } else {
          setVectorLayers(DEFAULT_VECTOR_LAYERS);
          setRasterLayers(DEFAULT_RASTER_LAYERS);
        }

        const target: { center: [number, number]; zoom: number } = {
          center: [mapData.center_lng, mapData.center_lat],
          zoom: mapData.zoom,
        };

        const map = mapRef.current;
        if (map && mapReady) {
          map.flyTo(target);
        } else {
          // Map isn't created/loaded yet — apply once it is.
          pendingFlyToRef.current = target;
        }
      })
      .catch((err) => setStatusMsg("Failed to load map: " + String(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId, mapReady]);

  /* ── 4. Basemap switching ─────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.setStyle || !mapReady) return;

    // Preserve camera across style swaps (setStyle can reset it in some
    // versions depending on options), so capture then restore.
    const center = map.getCenter();
    const zoom = map.getZoom();
    const bearing = map.getBearing?.() ?? 0;
    const pitch = map.getPitch?.() ?? 0;

    const url = BASEMAP_URLS[activeBasemap] || BASEMAP_URLS["dataviz-dark"];
    map.setStyle(url);

    map.once("styledata", () => {
      map.jumpTo({ center, zoom, bearing, pitch });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBasemap]);

  /* ── Layer toggles ───────────────────────────────────────── */
  function toggleVector(id: string) {
    setVectorLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    );
  }

  function toggleRaster(id: string) {
    setRasterLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    );
  }

  function handleMapChange(id: string) {
    if (id === mapId) return;
    setSearchParams({ mapId: id });
  }

  /* ── Zoom controls — actually drive the map now ─────────── */
  const handleZoomIn = useCallback(() => {
    const map = mapRef.current;
    if (map?.zoomIn) map.zoomIn({ duration: 200 });
  }, []);

  const handleZoomOut = useCallback(() => {
    const map = mapRef.current;
    if (map?.zoomOut) map.zoomOut({ duration: 200 });
  }, []);

  const handleToggleAI = useCallback(() => {
    setAiChatOpen((v) => !v);
  }, []);

  /* ── Save current viewport/config ────────────────────────── */
  async function handleSaveConfig() {
    if (!mapId || !currentMap) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const map = mapRef.current;
      const center = map?.getCenter?.() || {
        lng: currentMap.center_lng,
        lat: currentMap.center_lat,
      };
      const zoom = map?.getZoom ? map.getZoom() : currentMap.zoom;
      const allLayers: MapLayerItem[] = [...vectorLayers, ...rasterLayers];

      const updated = await updateMap(mapId, {
        center_lng: center.lng,
        center_lat: center.lat,
        zoom: Number(zoom.toFixed(2)),
        basemap: activeBasemap,
        layers_config: allLayers,
      });
      setCurrentMap(updated);
      setStatusMsg("Map configuration saved!");
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setStatusMsg("Save failed: " + String(err));
    } finally {
      setSaving(false);
    }
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setStatusMsg("Map link copied to clipboard!");
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const canEdit =
    currentMap?.user_permission === "admin" ||
    currentMap?.user_permission === "write";

  return (
    <div className="relative w-full h-full overflow-hidden bg-bg-primary">
      <MapNavbar
        projectName={currentMap?.title || "EarthIQ Map"}
        onBack={() => navigate("/projects")}
        onShare={handleShare}
      />

      {/* Full-bleed map canvas */}
      <div
        className="absolute z-0 h-full"
        ref={mapContainerRef}
        id="map-canvas"
        style={{ top: 0, right: 0, bottom: 0, left: aiChatOpen ? 360 : 0 }}
      />

      {/* Loading overlay until map style has loaded */}
      {!mapReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-primary/60 backdrop-blur-sm pointer-events-none">
          <span className="text-xs text-text-tertiary animate-pulse">
            Loading map…
          </span>
        </div>
      )}

      {/* Floating Layer Panel (left) */}
      <LayerPanel
        availableMaps={availableMaps}
        mapId={mapId}
        currentMap={currentMap}
        onMapChange={handleMapChange}
        vectorLayers={vectorLayers}
        rasterLayers={rasterLayers}
        onToggleVector={toggleVector}
        onToggleRaster={toggleRaster}
        canEdit={canEdit}
        saving={saving}
        onSave={handleSaveConfig}
        statusMsg={statusMsg}
        isAvailableModule={isAvailable}
        aiOpen={aiChatOpen}
      />

      {/* Action Toolbar */}
      <MapActionBar
        activeAction={activeAction}
        onActionChange={(id) =>
          setActiveAction((prev) => (prev === id ? null : id))
        }
      />

      {/* Bottom Bar */}
      <MapBottomBar
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        activeBasemap={activeBasemap}
        onBasemapChange={setActiveBasemap}
        coords={coords}
        availableMaps={availableMaps}
        mapId={mapId}
        onMapChange={handleMapChange}
        mapReady={mapReady}
        onToggleAI={handleToggleAI}
      />

      {/* AI Chat Panel (left) */}
      <div className="absolute top-14 left-0 bottom-0 z-20">
        <AIChatPanel isOpen={aiChatOpen} onClose={() => setAiChatOpen(false)} />
      </div>
    </div>
  );
}
