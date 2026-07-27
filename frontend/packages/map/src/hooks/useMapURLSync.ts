import { useCallback, useEffect, useMemo, useRef } from "react";

interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
  layers?: string[];
}

interface UseMapURLSyncOptions {
  defaults?: Partial<MapViewState>;
  layers?: string[];
  debounceMs?: number;
  precision?: number;
}

const DEFAULT_VIEW: MapViewState = {
  longitude: 0,
  latitude: 0,
  zoom: 2,
  pitch: 0,
  bearing: 0,
  layers: [],
};

export function useMapURLSync(options: UseMapURLSyncOptions = {}) {
  const {
    defaults = DEFAULT_VIEW,
    layers = [],
    debounceMs = 300,
    precision = 6,
  } = options;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<any>(null);

  // Parse URL params once on mount
  const initialViewState: MapViewState = useMemo(() => {
    const params = new URLSearchParams(window.location.search);

    const lng = params.get("x");
    const lat = params.get("y");
    const z = params.get("z");
    const p = params.get("p");
    const b = params.get("b");
    const l = params.get("l")?.split(",").filter(Boolean) ?? [];

    const parseParam = (
      val: string | null,
      def: number | undefined,
      fallback: number
    ): number => {
      const parsed = val ? parseFloat(val) : undefined;
      if (parsed !== undefined && !isNaN(parsed)) return parsed;
      return def ?? fallback;
    };

    return {
      longitude: parseParam(
        lng,
        defaults.longitude,
        DEFAULT_VIEW.longitude ?? 0
      ),
      latitude: parseParam(lat, defaults.latitude, DEFAULT_VIEW.latitude ?? 0),
      zoom: parseParam(z, defaults.zoom, DEFAULT_VIEW.zoom ?? 2),
      pitch: parseParam(p, defaults.pitch, DEFAULT_VIEW.pitch ?? 0),
      bearing: parseParam(b, defaults.bearing, DEFAULT_VIEW.bearing ?? 0),
      layers: l,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced URL writer
  const writeToURL = useCallback(
    (viewState: MapViewState) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set("x", viewState.longitude.toFixed(precision));
        url.searchParams.set("y", viewState.latitude.toFixed(precision));
        url.searchParams.set("z", viewState.zoom.toFixed(2));

        if (viewState.pitch && viewState.pitch !== 0) {
          url.searchParams.set("p", viewState.pitch.toFixed(1));
        } else {
          url.searchParams.delete("p");
        }

        if (viewState.bearing && viewState.bearing !== 0) {
          url.searchParams.set("b", viewState.bearing.toFixed(1));
        } else {
          url.searchParams.delete("b");
        }

        if (viewState.layers && viewState.layers.length > 0) {
          url.searchParams.set("l", viewState.layers.join(","));
        }

        window.history.replaceState({}, "", url.toString());
      }, debounceMs);
    },
    [debounceMs, precision]
  );

  // Attach moveend listener to the maplibre instance
  const bindMap = useCallback(
    (map: any) => {
      mapRef.current = map;

      const handleMoveEnd = () => {
        const center = map.getCenter();
        writeToURL({
          longitude: center.lng,
          latitude: center.lat,
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
          layers: layers,
        });
      };

      map.on("moveend", handleMoveEnd);

      // Write initial position to URL
      handleMoveEnd();

      // Return cleanup function
      return () => {
        map.off("moveend", handleMoveEnd);
      };
    },
    [writeToURL, layers]
  );

  // Update URL when layers change
  useEffect(() => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    writeToURL({
      longitude: center.lng,
      latitude: center.lat,
      zoom: mapRef.current.getZoom(),
      pitch: mapRef.current.getPitch() ?? DEFAULT_VIEW.pitch,
      bearing: mapRef.current.getBearing() ?? DEFAULT_VIEW.bearing,
      layers: layers,
    });
  }, [layers, writeToURL]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { initialViewState, bindMap };
}
