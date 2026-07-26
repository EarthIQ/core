import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  fetchMaps,
  fetchMapById,
  updateMap,
  MapItem,
  MapLayerItem,
} from "@/lib/maps";
import { useModules } from "@/lib/modules";

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
  { id: "dataviz-dark", name: "Dark" },
  { id: "dataviz-light", name: "Light" },
  { id: "satellite", name: "Satellite" },
];

function LayerRow({
  layer,
  onToggle,
}: {
  layer: LayerItem;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      className="eq-layer-item"
      onClick={() => onToggle(layer.id)}
      id={`layer-toggle-${layer.id}`}
    >
      <div
        className={`eq-layer-item__toggle${layer.visible ? " eq-layer-item__toggle--on" : ""}`}
      />
      <span className="eq-layer-item__name">{layer.name}</span>
    </div>
  );
}

export default function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mapId = searchParams.get("mapId");

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const [availableMaps, setAvailableMaps] = useState<MapItem[]>([]);
  const [currentMap, setCurrentMap] = useState<MapItem | null>(null);

  const [activeBasemap, setActiveBasemap] = useState("dataviz-dark");
  const [vectorLayers, setVectorLayers] = useState(DEFAULT_VECTOR_LAYERS);
  const [rasterLayers, setRasterLayers] = useState(DEFAULT_RASTER_LAYERS);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const { isAvailable } = useModules();

  // 1. Fetch available maps list for selector
  useEffect(() => {
    fetchMaps()
      .then((data) => {
        setAvailableMaps(data);
        if (!mapId && data.length > 0) {
          // Default to first accessible map
          setSearchParams({ mapId: data[0].id });
        }
      })
      .catch(() => {});
  }, []);

  // 2. Load active map configuration when mapId changes
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
          if (vectors.length) setVectorLayers(vectors as LayerItem[]);
          if (rasters.length) setRasterLayers(rasters as LayerItem[]);
        }

        // Fly to saved map center & zoom if map instance exists
        if (mapRef.current?.flyTo) {
          mapRef.current.flyTo({
            center: [mapData.center_lng, mapData.center_lat],
            zoom: mapData.zoom,
          });
        }
      })
      .catch((err) => setStatusMsg("Failed to load map: " + String(err)));
  }, [mapId]);

  // 3. Initialize MapLibre map canvas
  useEffect(() => {
    if (!mapContainerRef.current) return;

    import("maplibre-gl").then(({ Map }) => {
      const map = new Map({
        container: mapContainerRef.current!,
        style: BASEMAP_URLS[activeBasemap] || BASEMAP_URLS["dataviz-dark"],
        center: currentMap
          ? [currentMap.center_lng, currentMap.center_lat]
          : [0, 20],
        zoom: currentMap ? currentMap.zoom : 2.5,
      });
      mapRef.current = map;
    });

    return () => {
      if (mapRef.current?.remove) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapId]);

  // Basemap switching
  useEffect(() => {
    if (!mapRef.current?.setStyle) return;
    const url = BASEMAP_URLS[activeBasemap] || BASEMAP_URLS["dataviz-dark"];
    mapRef.current.setStyle(url);
  }, [activeBasemap]);

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

  async function handleSaveConfig() {
    if (!mapId || !currentMap) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const center = mapRef.current?.getCenter() || {
        lng: currentMap.center_lng,
        lat: currentMap.center_lat,
      };
      const zoom = mapRef.current?.getZoom() || currentMap.zoom;
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

  const canEdit =
    currentMap?.user_permission === "admin" ||
    currentMap?.user_permission === "write";

  return (
    <div className="eq-map-layout">
      {/* ── Sidebar ── */}
      <aside className="eq-map-sidebar">
        {/* Map Selector & Header */}
        <div className="eq-map-sidebar__section">
          <Link
            to="/projects"
            className="eq-btn-back"
            style={{
              marginBottom: "0.85rem",
              width: "100%",
              justifyContent: "center",
              padding: "0.45rem",
            }}
          >
            ← Back to Projects
          </Link>
          <div className="eq-map-sidebar__title">Configured Maps</div>
          <select
            value={mapId || ""}
            onChange={(e) => setSearchParams({ mapId: e.target.value })}
            style={{
              width: "100%",
              padding: "0.4rem 0.6rem",
              background: "#090d16",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "var(--eq-radius-sm)",
              color: "#e2e8f0",
              fontSize: "0.8125rem",
              outline: "none",
            }}
          >
            {availableMaps.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.is_public ? "Public" : "Private"})
              </option>
            ))}
          </select>

          {currentMap && (
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.75rem",
                color: "#94a3b8",
              }}
            >
              <div style={{ fontWeight: 600, color: "#e2e8f0" }}>
                {currentMap.title}
              </div>
              <div>
                Access:{" "}
                <span style={{ color: "#22d3a0" }}>
                  {currentMap.user_permission}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Basemap picker */}
        <div className="eq-map-sidebar__section">
          <div className="eq-map-sidebar__title">Basemap</div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
          >
            {BASEMAP_OPTIONS.map((bm) => (
              <button
                key={bm.id}
                id={`basemap-${bm.id}`}
                onClick={() => setActiveBasemap(bm.id)}
                style={{
                  padding: "0.4rem 0.75rem",
                  borderRadius: "var(--eq-radius-sm)",
                  background:
                    activeBasemap === bm.id
                      ? "var(--eq-accent-dim)"
                      : "transparent",
                  border:
                    activeBasemap === bm.id
                      ? "1px solid var(--eq-border-accent)"
                      : "1px solid transparent",
                  color:
                    activeBasemap === bm.id
                      ? "var(--eq-accent)"
                      : "var(--eq-text-secondary)",
                  textAlign: "left",
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                }}
              >
                {bm.name}
              </button>
            ))}
          </div>
        </div>

        {/* Vector layers */}
        <div className="eq-map-sidebar__section">
          <div className="eq-map-sidebar__title">Vector layers</div>
          {vectorLayers.map((l) => (
            <LayerRow key={l.id} layer={l} onToggle={toggleVector} />
          ))}
        </div>

        {/* Raster layers */}
        <div className="eq-map-sidebar__section">
          <div className="eq-map-sidebar__title">Raster layers</div>
          {rasterLayers.map((l) => (
            <LayerRow key={l.id} layer={l} onToggle={toggleRaster} />
          ))}
        </div>

        {isAvailable("hydrology-module") && (
          <div className="eq-map-sidebar__section">
            <div className="eq-map-sidebar__title">Hydrology Module</div>
          </div>
        )}

        {/* Save button for users with write/admin permission */}
        {canEdit && (
          <div
            className="eq-map-sidebar__section"
            style={{ marginTop: "auto" }}
          >
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "var(--eq-radius-sm)",
                background: "#22d3a0",
                color: "#090d16",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                fontSize: "0.8125rem",
              }}
            >
              {saving ? "Saving..." : "Save Map Viewport"}
            </button>
            {statusMsg && (
              <div
                style={{
                  marginTop: "0.4rem",
                  fontSize: "0.75rem",
                  color: "#22d3a0",
                  textAlign: "center",
                }}
              >
                {statusMsg}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ── Map canvas ── */}
      <div className="eq-map-canvas" ref={mapContainerRef} id="map-canvas" />
    </div>
  );
}
