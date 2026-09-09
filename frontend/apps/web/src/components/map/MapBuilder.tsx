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
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState, useCallback } from "react";

import { BASEMAP_STYLES } from "@/hooks/useMapLibre";

import type { Annotation } from "@/lib/mapEditor/types";
import type { MapLayerItem } from "@/lib/maps";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editingMap: any;
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

export const MapBuilder = ({
  isOpen,
  onClose,
  _projectId,
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
}: MapBuilderProps) => {
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
      setBearing(editingMap.bearing ?? 0);
      setPitch(editingMap.pitch ?? 0);
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
          layer.visible ? "visible" : "none"
        );
      }
    });
  }, [layers, mapReady]);

  /* ── Toggle a layer's included/visible state ───────────────────────────── */
  const toggleLayerVisible = useCallback((layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
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
    <div className="bg-bg-primary animate-fade-in fixed inset-0 z-[2000] flex flex-col">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="border-border-primary bg-elevated flex shrink-0 items-center justify-between border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <button
            aria-label="Close builder"
            className="hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-lg p-1.5 transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Map
              className="text-primary"
              size={16}
            />
            <h1 className="text-text-primary text-sm font-bold">
              {editingMap ? "Edit Published Map" : "Map Builder"}
            </h1>
          </div>
          {editingMap ? (
            <span className="text-text-tertiary font-mono text-[10px]">
              Editing: {editingMap.title}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-primary btn-sm flex items-center gap-1.5 disabled:opacity-50"
            disabled={!title.trim() || publishing}
            onClick={handlePublish}
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
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Live Map Preview */}
        <div className="relative flex-1">
          <div
            ref={previewRef}
            className="absolute inset-0 h-full w-full"
          />

          {/* Live widget overlays (mirrors what the viewer will see) */}
          {widgets.titleCard && title ? (
            <div className="bg-elevated border-border-primary pointer-events-none absolute top-4 left-4 z-10 max-w-xs rounded-xl border p-3.5 shadow-xl">
              <h2 className="text-text-primary text-sm font-bold">{title}</h2>
              {description ? (
                <p className="text-text-secondary mt-1 text-[11px]">
                  {description}
                </p>
              ) : null}
            </div>
          ) : null}

          {widgets.layerList && layers.filter((l) => l.url).length > 0 ? (
            <div className="bg-elevated border-border-primary pointer-events-none absolute top-4 right-4 z-10 w-52 rounded-xl border p-3 shadow-xl">
              <div className="text-text-primary mb-2 flex items-center gap-1.5 text-xs font-bold">
                <Layers
                  className="text-primary"
                  size={12}
                />
                Layers
              </div>
              <div className="flex flex-col gap-1.5">
                {layers
                  .filter((l) => l.url)
                  .map((l) => (
                    <div
                      key={l.id}
                      className="text-text-secondary flex items-center gap-2 text-[11px]"
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${l.visible ? "bg-success" : "bg-text-quaternary"}`}
                      />
                      <span className="truncate">{l.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}

          {/* Zoom controls overlay */}
          {widgets.zoomControls ? (
            <div className="pointer-events-none absolute right-6 bottom-6 z-10 flex flex-col gap-1">
              <div className="bg-elevated border-border-primary text-text-tertiary flex h-8 w-8 items-center justify-center rounded-lg border">
                <ZoomIn size={14} />
              </div>
              <div className="bg-elevated border-border-primary text-text-tertiary flex h-8 w-8 items-center justify-center rounded-lg border">
                <Compass size={14} />
              </div>
            </div>
          ) : null}

          {/* Scale bar indicator */}
          {widgets.scaleBar ? (
            <div className="pointer-events-none absolute bottom-6 left-6 z-10 flex items-center gap-1.5">
              <div className="bg-text-secondary/60 h-0.5 w-24 rounded" />
              <span className="text-text-tertiary text-[9px]">10 km</span>
            </div>
          ) : null}

          {/* Attribution */}
          {widgets.attribution ? (
            <div className="text-text-quaternary pointer-events-none absolute right-2 bottom-2 z-10 text-[9px]">
              © OpenStreetMap © CARTO | Powered by EarthIQ
            </div>
          ) : null}

          {/* Map status badge */}
          <div className="bg-elevated border-border-primary pointer-events-none absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1.5">
            <span className="bg-success h-2 w-2 animate-pulse rounded-full" />
            <span className="text-text-secondary text-[10px] font-semibold">
              Live Preview
            </span>
          </div>
        </div>

        {/* RIGHT: Configuration Panel */}
        <aside className="border-border-primary bg-elevated flex w-80 shrink-0 flex-col border-l">
          {/* Tab bar */}
          <nav className="border-border-primary flex shrink-0 border-b">
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
                className={`flex-1 border-b-2 py-2.5 text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "text-primary border-primary"
                    : "text-text-tertiary hover:text-text-secondary border-transparent"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Tab content */}
          <div className="flex-1 scrollbar-thin overflow-y-auto p-4">
            {/* ── MAP TAB ─────────────────────────────────────────────────── */}
            {activeTab === "map" && (
              <div className="flex flex-col gap-5">
                {/* Title */}
                <div className="form-field">
                  <label className="form-label text-xs">Map Title *</label>
                  <input
                    className="input input-sm"
                    placeholder="e.g. Wetland Extent Dashboard"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="form-field">
                  <label className="form-label text-xs">Description</label>
                  <textarea
                    className="input textarea input-sm"
                    placeholder="Shown in the title card..."
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Basemap picker */}
                <div className="form-field">
                  <label className="form-label text-xs">Basemap</label>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    {BASEMAP_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-all ${
                          basemap === opt.id
                            ? "border-primary bg-primary/5"
                            : "border-border-secondary hover:border-border-primary"
                        }`}
                        onClick={() => setBasemap(opt.id)}
                      >
                        <div
                          className="border-border-secondary h-7 w-10 rounded border"
                          style={{ backgroundColor: opt.color }}
                        />
                        <span className="text-text-secondary text-[10px] font-medium">
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Viewport */}
                <div className="form-field">
                  <label className="form-label text-xs">Viewport</label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-text-tertiary text-[10px]">
                        Center Lng
                      </label>
                      <input
                        className="input input-sm"
                        max={180}
                        min={-180}
                        step="0.001"
                        type="number"
                        value={centerLng}
                        onChange={(e) =>
                          setCenterLng(parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-text-tertiary text-[10px]">
                        Center Lat
                      </label>
                      <input
                        className="input input-sm"
                        max={90}
                        min={-90}
                        step="0.001"
                        type="number"
                        value={centerLat}
                        onChange={(e) =>
                          setCenterLat(parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-text-tertiary text-[10px]">
                        Zoom
                      </label>
                      <input
                        className="input input-sm"
                        max={22}
                        min={0}
                        step="0.1"
                        type="number"
                        value={zoom}
                        onChange={(e) =>
                          setZoom(parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-text-tertiary text-[10px]">
                        Pitch (°)
                      </label>
                      <input
                        className="input input-sm"
                        max={85}
                        min={0}
                        step="1"
                        type="number"
                        value={pitch}
                        onChange={(e) =>
                          setPitch(parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-text-tertiary text-[10px]">
                        Bearing (°)
                      </label>
                      <input
                        className="input input-sm"
                        max={180}
                        min={-180}
                        step="1"
                        type="number"
                        value={bearing}
                        onChange={(e) =>
                          setBearing(parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>
                  <p className="text-text-quaternary mt-1.5 text-[10px]">
                    Tip: Pan / zoom the preview map to set these values.
                  </p>
                </div>
              </div>
            )}

            {/* ── WIDGETS TAB ─────────────────────────────────────────────── */}
            {activeTab === "widgets" && (
              <div className="flex flex-col gap-3">
                <div className="text-text-tertiary mb-1 text-xs">
                  Select which interactive widgets appear in the published map.
                </div>
                {WIDGETS.map((w) => (
                  <button
                    key={w.key}
                    className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                      widgets[w.key]
                        ? "border-primary/60 bg-primary/5"
                        : "border-border-secondary hover:border-border-primary"
                    }`}
                    onClick={() => toggleWidget(w.key)}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        widgets[w.key]
                          ? "bg-primary/20 text-primary"
                          : "bg-surface/50 text-text-tertiary"
                      }`}
                    >
                      <w.icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-text-primary text-xs font-semibold">
                        {w.label}
                      </div>
                      <div className="text-text-tertiary truncate text-[10px]">
                        {w.desc}
                      </div>
                    </div>
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${
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
                <div className="text-text-tertiary mb-1 text-xs">
                  Choose which layers are visible in the published map.
                </div>
                {layers.length === 0 ? (
                  <div className="text-text-tertiary py-8 text-center text-xs">
                    No layers configured in this project.
                  </div>
                ) : (
                  layers
                    .filter((l) => l.url)
                    .map((layer) => (
                      <div
                        key={layer.id}
                        className="border-border-secondary bg-surface/30 flex items-center gap-3 rounded-lg border p-3"
                      >
                        <button
                          title={layer.visible ? "Hide layer" : "Show layer"}
                          className={`rounded-lg p-1.5 transition-colors ${
                            layer.visible
                              ? "text-primary bg-primary/10"
                              : "text-text-tertiary bg-surface/50 hover:text-text-secondary"
                          }`}
                          onClick={() => toggleLayerVisible(layer.id)}
                        >
                          {layer.visible ? (
                            <Eye size={14} />
                          ) : (
                            <EyeOff size={14} />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="text-text-primary truncate text-xs font-medium">
                            {layer.name}
                          </div>
                          <div className="text-text-tertiary text-[10px] capitalize">
                            {layer.type}
                          </div>
                        </div>
                        {layer.style?.color ? (
                          <span
                            className="h-3 w-3 shrink-0 rounded-full border border-white/20"
                            style={{
                              backgroundColor: layer.style.color as string,
                            }}
                          />
                        ) : null}
                      </div>
                    ))
                )}
              </div>
            )}

            {/* ── SHARE TAB ───────────────────────────────────────────────── */}
            {activeTab === "share" && (
              <div className="flex flex-col gap-4">
                <div className="border-border-secondary bg-surface/30 flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-text-primary text-xs font-semibold">
                      Public Access
                    </div>
                    <div className="text-text-tertiary text-[10px]">
                      {isPublic
                        ? "Anyone with the link can view this map"
                        : "Only invited members can view this map"}
                    </div>
                  </div>
                  <input
                    checked={isPublic}
                    className="accent-primary h-4 w-4 cursor-pointer"
                    type="checkbox"
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                </div>

                <div className="bg-surface/20 border-border-secondary/50 rounded-lg border p-3">
                  <div className="text-text-primary mb-1.5 flex items-center gap-2 text-xs font-semibold">
                    {isPublic ? (
                      <Globe
                        className="text-success"
                        size={13}
                      />
                    ) : (
                      <Lock
                        className="text-accent"
                        size={13}
                      />
                    )}
                    {isPublic ? "Shareable" : "Private"}
                  </div>
                  <p className="text-text-tertiary text-[11px] leading-relaxed">
                    {isPublic
                      ? "The map will be accessible at /share/map/{id}. You can copy the link after publishing."
                      : "The map requires authentication and explicit permission to view."}
                  </p>
                </div>

                {/* Summary */}
                <div className="border-border-secondary border-t pt-4">
                  <div className="text-text-primary mb-2 text-xs font-bold">
                    Publish Summary
                  </div>
                  <div className="text-text-secondary flex flex-col gap-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Title</span>
                      <span className="font-medium">{title || "-"}</span>
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
          <div className="border-border-primary shrink-0 border-t p-3">
            <button
              className="btn btn-primary btn-md flex w-full items-center justify-center gap-2 disabled:opacity-50"
              disabled={!title.trim() || publishing}
              onClick={handlePublish}
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
};
