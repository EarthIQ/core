import { useCallback, useEffect, useRef, useState } from "react";

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

export function useMapLibre(
  containerRef: React.RefObject<HTMLDivElement>,
  initialBasemap: string,
) {
  const mapRef = useRef<any>(null);
  const pendingFlyToRef = useRef<FlyTarget | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(2.5);
  const [bearing, setBearing] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [basemap, setBasemap] = useState(initialBasemap);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    import("maplibre-gl").then(({ Map }) => {
      if (cancelled || !containerRef.current) return;
      const map = new Map({
        container: containerRef.current,
        // style: BASEMAP_URLS[basemap] || BASEMAP_URLS["dataviz-dark"],
        style: {
          version: 8,
          sources: {
            satellite: {
              type: "raster",
              tiles: [
                "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg",
              ],
              tileSize: 256,
            },
          },
          layers: [
            {
              id: "satellite",
              type: "raster",
              source: "satellite",
            },
          ],
        },
        center: [0, 20],
        zoom: 2.5,
        attributionControl: false,
      });

      map.on("load", () => {
        setMapReady(true);
        setZoomLevel(map.getZoom());
        const c = map.getCenter();
        setCoords({ lat: c.lat, lng: c.lng });
        if (pendingFlyToRef.current) {
          map.jumpTo(pendingFlyToRef.current);
          pendingFlyToRef.current = null;
        }
      });

      map.on("zoom", () => setZoomLevel(map.getZoom()));
      map.on("rotate", () => setBearing(map.getBearing()));
      map.on("mousemove", (e: any) =>
        setCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng }),
      );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.setStyle || !mapReady) return;
    const center = map.getCenter();
    const zoom = map.getZoom();
    const bearingVal = map.getBearing?.() ?? 0;
    const pitch = map.getPitch?.() ?? 0;
    const url = BASEMAP_URLS[basemap] || BASEMAP_URLS["dataviz-dark"];
    map.setStyle(url);
    map.once("styledata", () =>
      map.jumpTo({ center, zoom, bearing: bearingVal, pitch }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basemap]);

  const flyOrQueue = useCallback(
    (target: FlyTarget) => {
      const map = mapRef.current;
      if (map && mapReady) map.flyTo(target);
      else pendingFlyToRef.current = target;
    },
    [mapReady],
  );

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
