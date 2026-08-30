import { useEffect, useRef, useState, useCallback } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  X,
  Map,
  Globe,
  Layers,
  ZoomIn,
  Compass,
  Ruler,
  Crosshair,
  Info,
  Eye,
  EyeOff,
  Check,
  Lock,
  Save,
} from "lucide-react";
import { BASEMAP_STYLES } from "@/hooks/useMapLibre";
import type { MapLayerItem } from "@/lib/maps";
import type { Annotation } from "@/lib/mapEditor/types";

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                      */
/* ──────────────────────────────────────────────────────────────────────────── */

export interface MapBuilderConfig {
  title: string;
  description: string;
  is_public: boolean;
  basemap: string;
  center_lng: number;
  center_lat: number;
  zoom: number;
  bearing: number;
  pitch: number;
  layers_config: MapLayerItem[];
  widgets_config: Record<string, boolean>;
}

interface MapBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  /* Current project state to initialize the builder */
  currentBasemap: string;
  currentCenter: [number, number];
  currentZoom: number;
  currentBearing: number;
  currentPitch: number;
  currentLayers: MapLayerItem[];
  currentAnnotations: Annotation[];
  /* Existing map being edited (null = new publish) */
  editingMap: any | null;
  /* Actions */
  onPublish: (config: MapBuilderConfig) => Promise<void>;
  onUpdate: (mapId: string, config: MapBuilderConfig) => Promise<void>;
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Widget definitions                                                         */
/* ──────────────────────────────────────────────────────────────────────────── */

const WIDGETS = [
  {
    key: "titleCard",
    label: "Title Card",
    desc: "Map title & description overlay",
    icon: Info,
  },
  {
    key: "legend",
    label: "Layer Legend",
    desc: "Color-coded legend for layers",
    icon: Layers,
  },
  {
    key: "layerList",
    label: "Layer Toggle",
    desc: "Toggle layer visibility",
    icon: Eye,
  },
  {
    key: "zoomControls",
    label: "Zoom Controls",
    desc: "Zoom in / out / reset",
    icon: ZoomIn,
  },
  {
    key: "compass",
    label: "North Compass",
    desc: "Bearing indicator & reset",
    icon: Compass,
  },
  {
    key: "scaleBar",
    label: "Scale Bar",
    desc: "Distance scale reference",
    icon: Ruler,
  },
  {
    key: "geolocate",
    label: "Geolocate",
    desc: "Jump to user location",
    icon: Crosshair,
  },
  {
    key: "attribution",
    label: "Attribution",
    desc: "Data source credit",
    icon: Globe,
  },
] as const;

const BASEMAP_OPTIONS = [
  { id: "osm", label: "OpenStreetMap", color: "#e8ecd9" },
  { id: "esri-satellite", label: "ESRI Satellite", color: "#233a2b" },
  { id: "opentopomap", label: "OpenTopoMap", color: "#f3ead7" },
] as const;

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Component                                                                  */
/* ──────────────────────────────────────────────────────────────────────────── */

export function MapBuilder({
  isOpen,
  onClose,
  projectId,
  currentBasemap,
  currentCenter,
  currentZoom,
  currentBearing,
  currentPitch,
  currentLayers,
  currentAnnotations,
  editingMap,
  onPublish,
  onUpdate,
}: MapBuilderProps) {
  /* ── Builder state ─────────────────────────────────────────────────────── */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [basemap, setBasemap] = useState("opentopomap");
  const [centerLng, setCenterLng] = useState(0);
  const [centerLat, setCenterLat] = useState(20);
  const [zoom, setZoom] = useState(2.5);
  const [bearing, setBearing] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [layers, setLayers] = useState<MapLayerItem[]>([]);
  const [widgets, setWidgets] = useState<Record<string, boolean>>({
    titleCard: true,
    legend: true,
    layerList: true,
    zoomControls: true,
    compass: false,
    scaleBar: false,
    geolocate: false,
    attribution: true,
  });
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "map" | "widgets" | "layers" | "share"
  >("map");

  /* ── Map preview ───────────────────────────────────────────────────────── */
  const previewRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  /* ── Initialize from props / editing map ───────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    if (editingMap) {
      setTitle(editingMap.title || "");
      setDescription(editingMap.description || "");
      setIsPublic(!!editingMap.is_public);
      setBasemap(editingMap.basemap || "opentopomap");
      setCenterLng(editingMap.center_lng ?? 0);
      setCenterLat(editingMap.center_lat ?? 20);
      setZoom(editingMap.zoom ?? 2.5);
      setBearing((editingMap as any).bearing ?? 0);
      setPitch((editingMap as any).pitch ?? 0);
      setLayers(editingMap.layers_config || []);
      setWidgets({
        titleCard: true,
        legend: true,
        layerList: true,
        zoomControls: true,
        compass: false,
        scaleBar: false,
        geolocate: false,
        attribution: true,
        ...(editingMap.widgets_config || {}),
      });
    } else {
      setTitle("");
      setDescription("");
      setIsPublic(true);
      setBasemap(currentBasemap);
      setCenterLng(currentCenter[0]);
      setCenterLat(currentCenter[1]);
      setZoom(currentZoom);
      setBearing(currentBearing);
      setPitch(currentPitch);
      setLayers(currentLayers);
      setWidgets({
        titleCard: true,
        legend: true,
        layerList: true,
        zoomControls: true,
        compass: false,
        scaleBar: false,
        geolocate: false,
        attribution: true,
      });
    }
    setActiveTab("map");
  }, [isOpen, editingMap, currentBasemap, currentCenter, currentZoom]);

  /* ── Create / destroy preview map ──────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen || !previewRef.current) return;
    let cancelled = false;

    import("maplibre-gl").then(
      ({ Map, Marker, NavigationControl, ScaleControl, GeolocateControl }) => {
        if (cancelled || !previewRef.current) return;

        const map = new Map({
          container: previewRef.current,
          style: BASEMAP_STYLES[basemap] || BASEMAP_STYLES["opentopomap"],
          center: [centerLng, centerLat],
          zoom: zoom,
          bearing: bearing,
          pitch: pitch,
          attributionControl: false,
        });

        map.on("load", () => {
          setMapReady(true);

          // Add configured layers
          layers.forEach((layer) => {
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
                  layout: { visibility: layer.visible ? "visible" : "none" },
                });
              } else {
                map.addSource(layer.id, { type: "vector", tiles: [layer.url] });
                map.addLayer({
                  id: layer.id,
                  type: "fill",
                  source: layer.id,
                  "source-layer": "default",
                  paint: {
                    "fill-color": (layer.style?.color as string) || "#3b82f6",
                    "fill-opacity": (layer.style?.opacity as number) ?? 0.6,
                  },
                  layout: { visibility: layer.visible ? "visible" : "none" },
                });
              }
            } catch (e) {
              console.error("MapBuilder: error adding layer", e);
            }
          });

          // Add annotations as simple markers
          currentAnnotations.forEach((ann: any) => {
            if (ann.lngLat) {
              new Marker({
                color: ann.color || "#50aad1",
                anchor: "bottom",
              })
                .setLngLat(ann.lngLat)
                .addTo(map);
            }
          });

          // Add built-in controls based on widget config
          if (widgets.compass || widgets.zoomControls) {
            map.addControl(
              new NavigationControl({
                showCompass: widgets.compass,
                showZoom: widgets.zoomControls,
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
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
    };
    // Only re-create on basemap change (full style swap)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, basemap]);

  /* ── Sync viewport changes to the preview map ──────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.jumpTo({
      center: [centerLng, centerLat],
      zoom: zoom,
      bearing: bearing,
      pitch: pitch,
    });
  }, [centerLng, centerLat, zoom, bearing, pitch, mapReady]);

  /* ── Sync layer visibility to the preview map ──────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    layers.forEach((layer) => {
      if (map.getLayer(layer.id)) {
        map.setLayoutProperty(
          layer.id,
          "visibility",
          layer.visible ? "visible" : "none",
        );
      }
    });
  }, [layers, mapReady]);

  /* ── Toggle a layer's included/visible state ───────────────────────────── */
  const toggleLayerVisible = useCallback((layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l)),
    );
  }, []);

  /* ── Toggle a widget ───────────────────────────────────────────────────── */
  const toggleWidget = useCallback((key: string) => {
    setWidgets((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  /* ── Publish / Update ──────────────────────────────────────────────────── */
  const handlePublish = async () => {
    if (!title.trim()) return;
    setPublishing(true);
    const config: MapBuilderConfig = {
      title: title.trim(),
      description: description.trim(),
      is_public: isPublic,
      basemap,
      center_lng: centerLng,
      center_lat: centerLat,
      zoom: Number(zoom.toFixed(2)),
      bearing: Number(bearing.toFixed(1)),
      pitch: Number(pitch.toFixed(1)),
      layers_config: layers,
      widgets_config: widgets,
    };
    try {
      if (editingMap) {
        await onUpdate(editingMap.id, config);
      } else {
        await onPublish(config);
      }
      onClose();
    } catch (err) {
      console.error("MapBuilder: publish failed", err);
    } finally {
      setPublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col bg-bg-primary animate-fade-in">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border-primary bg-elevated shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Close builder"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Map size={16} className="text-primary" />
            <h1 className="text-sm font-bold text-text-primary">
              {editingMap ? "Edit Published Map" : "Map Builder"}
            </h1>
          </div>
          {editingMap && (
            <span className="text-[10px] font-mono text-text-tertiary">
              Editing: {editingMap.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePublish}
            disabled={!title.trim() || publishing}
            className="btn btn-primary btn-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save size={13} />
            {publishing
              ? "Saving..."
              : editingMap
                ? "Save Changes"
                : "Publish Map"}
          </button>
        </div>
      </header>

      {/* ── Body: Split view ──────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Live Map Preview */}
        <div className="flex-1 relative">
          <div ref={previewRef} className="w-full h-full absolute inset-0" />

          {/* Live widget overlays (mirrors what the viewer will see) */}
          {widgets.titleCard && title && (
            <div className="absolute top-4 left-4 z-10 max-w-xs bg-elevated border border-border-primary rounded-xl p-3.5 shadow-xl pointer-events-none">
              <h2 className="text-sm font-bold text-text-primary">{title}</h2>
              {description && (
                <p className="text-[11px] text-text-secondary mt-1">
                  {description}
                </p>
              )}
            </div>
          )}

          {widgets.layerList && layers.filter((l) => l.url).length > 0 && (
            <div className="absolute top-4 right-4 z-10 w-52 bg-elevated border border-border-primary rounded-xl p-3 shadow-xl pointer-events-none">
              <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary mb-2">
                <Layers size={12} className="text-primary" />
                Layers
              </div>
              <div className="flex flex-col gap-1.5">
                {layers
                  .filter((l) => l.url)
                  .map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center gap-2 text-[11px] text-text-secondary"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${l.visible ? "bg-success" : "bg-text-quaternary"}`}
                      />
                      <span className="truncate">{l.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Zoom controls overlay */}
          {widgets.zoomControls && (
            <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-1 pointer-events-none">
              <div className="w-8 h-8 rounded-lg bg-elevated border border-border-primary flex items-center justify-center text-text-tertiary">
                <ZoomIn size={14} />
              </div>
              <div className="w-8 h-8 rounded-lg bg-elevated border border-border-primary flex items-center justify-center text-text-tertiary">
                <Compass size={14} />
              </div>
            </div>
          )}

          {/* Scale bar indicator */}
          {widgets.scaleBar && (
            <div className="absolute bottom-6 left-6 z-10 flex items-center gap-1.5 pointer-events-none">
              <div className="w-24 h-0.5 bg-text-secondary/60 rounded" />
              <span className="text-[9px] text-text-tertiary">10 km</span>
            </div>
          )}

          {/* Attribution */}
          {widgets.attribution && (
            <div className="absolute bottom-2 right-2 z-10 text-[9px] text-text-quaternary pointer-events-none">
              © OpenStreetMap © CARTO | Powered by EarthIQ
            </div>
          )}

          {/* Map status badge */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-elevated border border-border-primary pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-semibold text-text-secondary">
              Live Preview
            </span>
          </div>
        </div>

        {/* RIGHT: Configuration Panel */}
        <aside className="w-80 border-l border-border-primary bg-elevated flex flex-col shrink-0">
          {/* Tab bar */}
          <nav className="flex border-b border-border-primary shrink-0">
            {(
              [
                { id: "map", label: "Map" },
                { id: "widgets", label: "Widgets" },
                { id: "layers", label: "Layers" },
                { id: "share", label: "Share" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? "text-primary border-primary"
                    : "text-text-tertiary border-transparent hover:text-text-secondary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            {/* ── MAP TAB ─────────────────────────────────────────────────── */}
            {activeTab === "map" && (
              <div className="flex flex-col gap-5">
                {/* Title */}
                <div className="form-field">
                  <label className="form-label text-xs">Map Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Wetland Extent Dashboard"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input input-sm"
                  />
                </div>

                {/* Description */}
                <div className="form-field">
                  <label className="form-label text-xs">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Shown in the title card..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input textarea input-sm"
                  />
                </div>

                {/* Basemap picker */}
                <div className="form-field">
                  <label className="form-label text-xs">Basemap</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {BASEMAP_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setBasemap(opt.id)}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all ${
                          basemap === opt.id
                            ? "border-primary bg-primary/5"
                            : "border-border-secondary hover:border-border-primary"
                        }`}
                      >
                        <div
                          className="w-10 h-7 rounded border border-border-secondary"
                          style={{ backgroundColor: opt.color }}
                        />
                        <span className="text-[10px] font-medium text-text-secondary">
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Viewport */}
                <div className="form-field">
                  <label className="form-label text-xs">Viewport</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <label className="text-[10px] text-text-tertiary">
                        Center Lng
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min={-180}
                        max={180}
                        value={centerLng}
                        onChange={(e) =>
                          setCenterLng(parseFloat(e.target.value) || 0)
                        }
                        className="input input-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-tertiary">
                        Center Lat
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min={-90}
                        max={90}
                        value={centerLat}
                        onChange={(e) =>
                          setCenterLat(parseFloat(e.target.value) || 0)
                        }
                        className="input input-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-tertiary">
                        Zoom
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        max={22}
                        value={zoom}
                        onChange={(e) =>
                          setZoom(parseFloat(e.target.value) || 0)
                        }
                        className="input input-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-tertiary">
                        Pitch (°)
                      </label>
                      <input
                        type="number"
                        step="1"
                        min={0}
                        max={85}
                        value={pitch}
                        onChange={(e) =>
                          setPitch(parseFloat(e.target.value) || 0)
                        }
                        className="input input-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-tertiary">
                        Bearing (°)
                      </label>
                      <input
                        type="number"
                        step="1"
                        min={-180}
                        max={180}
                        value={bearing}
                        onChange={(e) =>
                          setBearing(parseFloat(e.target.value) || 0)
                        }
                        className="input input-sm"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-text-quaternary mt-1.5">
                    Tip: Pan / zoom the preview map to set these values.
                  </p>
                </div>
              </div>
            )}

            {/* ── WIDGETS TAB ─────────────────────────────────────────────── */}
            {activeTab === "widgets" && (
              <div className="flex flex-col gap-3">
                <div className="text-xs text-text-tertiary mb-1">
                  Select which interactive widgets appear in the published map.
                </div>
                {WIDGETS.map((w) => (
                  <button
                    key={w.key}
                    onClick={() => toggleWidget(w.key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                      widgets[w.key]
                        ? "border-primary/60 bg-primary/5"
                        : "border-border-secondary hover:border-border-primary"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        widgets[w.key]
                          ? "bg-primary/20 text-primary"
                          : "bg-surface/50 text-text-tertiary"
                      }`}
                    >
                      <w.icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-text-primary">
                        {w.label}
                      </div>
                      <div className="text-[10px] text-text-tertiary truncate">
                        {w.desc}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        widgets[w.key]
                          ? "bg-primary text-white"
                          : "bg-surface text-transparent"
                      }`}
                    >
                      <Check size={12} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ── LAYERS TAB ──────────────────────────────────────────────── */}
            {activeTab === "layers" && (
              <div className="flex flex-col gap-3">
                <div className="text-xs text-text-tertiary mb-1">
                  Choose which layers are visible in the published map.
                </div>
                {layers.length === 0 ? (
                  <div className="text-center py-8 text-xs text-text-tertiary">
                    No layers configured in this project.
                  </div>
                ) : (
                  layers
                    .filter((l) => l.url)
                    .map((layer) => (
                      <div
                        key={layer.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border-secondary bg-surface/30"
                      >
                        <button
                          onClick={() => toggleLayerVisible(layer.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            layer.visible
                              ? "text-primary bg-primary/10"
                              : "text-text-tertiary bg-surface/50 hover:text-text-secondary"
                          }`}
                          title={layer.visible ? "Hide layer" : "Show layer"}
                        >
                          {layer.visible ? (
                            <Eye size={14} />
                          ) : (
                            <EyeOff size={14} />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-text-primary truncate">
                            {layer.name}
                          </div>
                          <div className="text-[10px] text-text-tertiary capitalize">
                            {layer.type}
                          </div>
                        </div>
                        {layer.style?.color && (
                          <span
                            className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                            style={{
                              backgroundColor: layer.style.color as string,
                            }}
                          />
                        )}
                      </div>
                    ))
                )}
              </div>
            )}

            {/* ── SHARE TAB ───────────────────────────────────────────────── */}
            {activeTab === "share" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border-secondary bg-surface/30">
                  <div>
                    <div className="text-xs font-semibold text-text-primary">
                      Public Access
                    </div>
                    <div className="text-[10px] text-text-tertiary">
                      {isPublic
                        ? "Anyone with the link can view this map"
                        : "Only invited members can view this map"}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 accent-primary cursor-pointer"
                  />
                </div>

                <div className="p-3 rounded-lg bg-surface/20 border border-border-secondary/50">
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-primary mb-1.5">
                    {isPublic ? (
                      <Globe size={13} className="text-success" />
                    ) : (
                      <Lock size={13} className="text-accent" />
                    )}
                    {isPublic ? "Shareable" : "Private"}
                  </div>
                  <p className="text-[11px] text-text-tertiary leading-relaxed">
                    {isPublic
                      ? "The map will be accessible at /share/map/{id}. You can copy the link after publishing."
                      : "The map requires authentication and explicit permission to view."}
                  </p>
                </div>

                {/* Summary */}
                <div className="border-t border-border-secondary pt-4">
                  <div className="text-xs font-bold text-text-primary mb-2">
                    Publish Summary
                  </div>
                  <div className="flex flex-col gap-1.5 text-[11px] text-text-secondary">
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Title</span>
                      <span className="font-medium">{title || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Basemap</span>
                      <span className="font-medium">{basemap}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Layers</span>
                      <span className="font-medium">
                        {layers.filter((l) => l.visible && l.url).length}{" "}
                        visible
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Widgets</span>
                      <span className="font-medium">
                        {Object.values(widgets).filter(Boolean).length} active
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Access</span>
                      <span className="font-medium">
                        {isPublic ? "Public" : "Private"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer action */}
          <div className="p-3 border-t border-border-primary shrink-0">
            <button
              onClick={handlePublish}
              disabled={!title.trim() || publishing}
              className="w-full btn btn-primary btn-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={14} />
              {publishing
                ? "Saving..."
                : editingMap
                  ? "Save Changes"
                  : "Publish Map"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
