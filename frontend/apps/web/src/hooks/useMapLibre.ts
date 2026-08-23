import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Build a self-contained raster basemap style.
 *
 * The CARTO "gl-style" JSONs previously used here (see BASEMAP_URLS) depend
 * on a remote sprite + glyph + vector-tile pipeline that no longer loads
 * reliably under MapLibre v6 — the map would come up blank. Inline raster
 * styles have no such dependencies (no sprite sheet, no glyph ranges, no
 * remote vector source), which is the same pattern as the manually added
 * satellite layer that kept working through the upgrade.
 */
const rasterStyle = (
  tiles: string[],
  attribution: string,
  subdomains?: string,
): any => ({
  version: 8,
  sources: {
    // Note: source id must differ from the layer id — MapPage's layer
    // sync removes any style layer whose id also names an existing source.
    "basemap-source": {
      type: "raster",
      tiles,
      ...(subdomains ? { subdomains } : {}),
      tileSize: 256,
      attribution,
    },
  },
  layers: [{ id: "basemap", type: "raster", source: "basemap-source" }],
});

/** Inline basemap styles (self-contained raster tiles, no remote style). */
export const BASEMAP_STYLES: Record<string, any> = {
  "dataviz-dark": rasterStyle(
    ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"],
    '© <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a>, © OpenStreetMap contributors',
    "abcd",
  ),
  "dataviz-light": rasterStyle(
    ["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"],
    '© <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a>, © OpenStreetMap contributors',
    "abcd",
  ),
  satellite: rasterStyle(
    [
      "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg",
    ],
    "© ESA Sentinel-2, EOX GIS",
  ),
};

/**
 * @deprecated Kept for backward compatibility (AI tooling context, etc).
 * These remote style URLs were replaced by BASEMAP_STYLES after the
 * MapLibre v6 upgrade — prefer BASEMAP_STYLES for map styling.
 */
export const BASEMAP_URLS: Record<string, string> = {
  "dataviz-dark":
    "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  "dataviz-light":
    "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  satellite: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
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
    const style = BASEMAP_STYLES[basemap] || BASEMAP_STYLES["dataviz-dark"];
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
