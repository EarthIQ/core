import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Build a self-contained raster basemap style.
 *
 * Inline raster styles have no remote dependencies (no sprite sheet, no glyph
 * ranges, no remote vector source), so they keep working reliably under
 * MapLibre v6 (the old CARTO "gl-style" JSONs no longer load).
 * `saturation` maps to the MapLibre `raster-saturation` paint property
 * (-1 = fully desaturated / grayscale, 0 = no change).
 */
const rasterStyle = (
  tiles: string[],
  attribution: string,
  saturation = 0,
): any => ({
  version: 8,
  sources: {
    // Note: source id must differ from the layer id — MapPage's layer
    // sync removes any style layer whose id also names an existing source.
    "basemap-source": {
      type: "raster",
      tiles,
      tileSize: 256,
      attribution,
    },
  },
  layers: [
    {
      id: "basemap",
      type: "raster",
      source: "basemap-source",
      ...(saturation ? { paint: { "raster-saturation": saturation } } : {}),
    },
  ],
});

/** Inline basemap styles (self-contained raster tiles, no remote style). */
export const BASEMAP_STYLES: Record<string, any> = {
  osm: rasterStyle(
    ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors (ODbL)',
  ),
  "esri-satellite": rasterStyle(
    [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    "© Esri, Maxar, Earthstar Geographics",
  ),
  opentopomap: rasterStyle(
    ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png"],
    '© <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA)',
    -1,
  ),
};

interface FlyTarget {
  center: [number, number];
  zoom: number;
}

/**
 * Map state + actions for a maplibre instance created by the
 * `@packages/map` `<Map>` primitive (see MapPage).
 *
 * Pass `null` until the map has loaded (via the primitive's `onLoad`);
 * once set, the hook attaches its listeners and drives basemap switching
 * on that instance. The returned `mapRef` mirrors the live instance so
 * existing children (`mapRef`-based panels/tools) keep working unchanged.
 */
export function useMapLibre(map: any | null, initialBasemap: string) {
  const mapRef = useRef<any>(null);
  const pendingFlyToRef = useRef<FlyTarget | null>(null);
  const firstBasemapSync = useRef(true);

  // Keep the ref current during render so children (which render after this
  // hook runs) always see the latest instance.
  mapRef.current = map;

  const mapReady = map !== null;
  const [zoomLevel, setZoomLevel] = useState(2.5);
  const [bearing, setBearing] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [basemap, setBasemap] = useState(initialBasemap);

  /* Attach listeners once the instance becomes available */
  useEffect(() => {
    if (!map) return;
    setZoomLevel(map.getZoom());
    const c = map.getCenter();
    setCoords({ lat: c.lat, lng: c.lng });

    const onZoom = () => setZoomLevel(map.getZoom());
    const onRotate = () => setBearing(map.getBearing());
    const onMouseMove = (e: any) =>
      setCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });

    map.on("zoom", onZoom);
    map.on("rotate", onRotate);
    map.on("mousemove", onMouseMove);

    if (pendingFlyToRef.current) {
      map.jumpTo(pendingFlyToRef.current);
      pendingFlyToRef.current = null;
    }

    return () => {
      map.off("zoom", onZoom);
      map.off("rotate", onRotate);
      map.off("mousemove", onMouseMove);
    };
  }, [map]);

  /* Basemap switching — the <Map> primitive is created with the initial
     style, so skip the very first sync and setStyle afterwards. */
  useEffect(() => {
    if (!map?.setStyle) return;
    if (firstBasemapSync.current) {
      firstBasemapSync.current = false;
      return;
    }
    const center = map.getCenter();
    const zoom = map.getZoom();
    const bearingVal = map.getBearing?.() ?? 0;
    const pitch = map.getPitch?.() ?? 0;
    const style = BASEMAP_STYLES[basemap] || BASEMAP_STYLES["opentopomap"];
    map.setStyle(style);
    map.once("styledata", () =>
      map.jumpTo({ center, zoom, bearing: bearingVal, pitch }),
    );
  }, [basemap, map]);

  const flyOrQueue = useCallback((target: FlyTarget) => {
    const map = mapRef.current;
    if (map) map.flyTo(target);
    else pendingFlyToRef.current = target;
  }, []);

  const zoomIn = useCallback(
    () => mapRef.current?.zoomIn?.({ duration: 200 }),
    [],
  );
  const zoomOut = useCallback(
    () => mapRef.current?.zoomOut?.({ duration: 200 }),
    [],
  );
  const resetNorth = useCallback(
    () => mapRef.current?.resetNorthPitch?.({ duration: 300 }),
    [],
  );

  return {
    mapRef,
    mapReady,
    zoomLevel,
    coords,
    bearing,
    basemap,
    setBasemap,
    flyOrQueue,
    zoomIn,
    zoomOut,
    resetNorth,
  };
}
