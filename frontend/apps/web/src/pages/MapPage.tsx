import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

// ── Types ──────────────────────────────────────────────────────────────────────

interface LayerItem {
  id: string;
  name: string;
  type: "vector" | "raster";
  visible: boolean;
}

const VECTOR_LAYERS: LayerItem[] = [
  { id: "admin-boundaries", name: "Admin Boundaries", type: "vector", visible: false },
  { id: "land-use", name: "Land Use / LULC", type: "vector", visible: false },
  { id: "elevation-contours", name: "Elevation Contours", type: "vector", visible: false },
];

const RASTER_LAYERS: LayerItem[] = [
  { id: "sentinel-2-rgb", name: "Sentinel-2 RGB", type: "raster", visible: false },
  { id: "ndvi-2024", name: "NDVI 2024", type: "raster", visible: false },
  { id: "dem-30m", name: "DEM 30m", type: "raster", visible: false },
];

const BASEMAPS = [
  { id: "dark", name: "Dark", url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" },
  { id: "light", name: "Light", url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" },
  { id: "voyager", name: "Voyager", url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json" },
];

// ── Layer toggle row ───────────────────────────────────────────────────────────

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

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const [activeBasemap, setActiveBasemap] = useState(BASEMAPS[0].id);
  const [vectorLayers, setVectorLayers] = useState(VECTOR_LAYERS);
  const [rasterLayers, setRasterLayers] = useState(RASTER_LAYERS);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Dynamic import to avoid SSR / bundle-splitting issues
    import("maplibre-gl").then(({ Map }) => {
      const map = new Map({
        container: mapContainerRef.current!,
        style: BASEMAPS[0].url,
        center: [0, 20] as [number, number],
        zoom: 2.5,
      });
      mapRef.current = map;
      return () => map.remove();
    });

    return () => {
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Basemap switching
  useEffect(() => {
    const map = mapRef.current as { setStyle?: (url: string) => void } | null;
    if (!map?.setStyle) return;
    const bm = BASEMAPS.find((b) => b.id === activeBasemap);
    if (bm) map.setStyle(bm.url);
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

  return (
    <div className="eq-map-layout">
      {/* ── Sidebar ── */}
      <aside className="eq-map-sidebar">
        <div className="eq-map-sidebar__section">
          <div className="eq-map-sidebar__title">Basemap</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {BASEMAPS.map((bm) => (
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
                  transition: "all var(--eq-transition)",
                }}
              >
                {bm.name}
              </button>
            ))}
          </div>
        </div>

        <div className="eq-map-sidebar__section">
          <div className="eq-map-sidebar__title">Vector layers</div>
          {vectorLayers.map((l) => (
            <LayerRow key={l.id} layer={l} onToggle={toggleVector} />
          ))}
        </div>

        <div className="eq-map-sidebar__section">
          <div className="eq-map-sidebar__title">Raster layers</div>
          {rasterLayers.map((l) => (
            <LayerRow key={l.id} layer={l} onToggle={toggleRaster} />
          ))}
        </div>
      </aside>

      {/* ── Map canvas ── */}
      <div className="eq-map-canvas" ref={mapContainerRef} id="map-canvas" />
    </div>
  );
}
