import React, {
  useEffect,
  useCallback,
  useRef,
  useState,
  useMemo,
} from "react";
import { useMap } from "../../hooks/useMap";

export interface RasterTileSourceProps {
  /** Unique source ID */
  id: string;
  /** TileJSON URL */
  url?: string;
  /** Array of tile URL templates */
  tiles?: string[];
  /** Tile bounds [west, south, east, north] */
  bounds?: [number, number, number, number];
  /** Tile URL scheme */
  scheme?: "xyz" | "tms";
  /** Minimum zoom level */
  minzoom?: number;
  /** Maximum zoom level */
  maxzoom?: number;
  /** Tile size in pixels */
  tileSize?: number;
  /** Attribution text */
  attribution?: string;
  /** Callback when source is loaded */
  onLoad?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Children (layers) */
  children?: React.ReactNode;
}

/**
 * RasterTileSource component that manages a MapLibre raster tile source
 * and only renders children (layers) after the source is confirmed added.
 */
export const RasterTileSource: React.FC<RasterTileSourceProps> = ({
  id,
  url,
  tiles,
  bounds,
  scheme = "xyz",
  minzoom,
  maxzoom,
  tileSize = 256,
  attribution,
  onLoad,
  onError,
  children,
}) => {
  const { map, isLoaded } = useMap();
  const [sourceAdded, setSourceAdded] = useState(false);
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const tilesKey = useMemo(() => JSON.stringify(tiles), [tiles]);
  const boundsKey = useMemo(() => JSON.stringify(bounds), [bounds]);

  useEffect(() => {
    if (!id) {
      onErrorRef.current?.(
        new Error("RasterTileSource: 'id' prop must be a non-empty string")
      );
    }
  }, [id]);

  // ---------------------------------------------------------------
  // Main effect – add / update / remove the source
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!map || !isLoaded || !id) return;

    // Parse the stabilized values back into their typed forms.
    // Because the effect depends on `tilesKey` / `boundsKey` (strings),
    // these will only be re-parsed when the actual content changes.
    const parsedTiles: string[] | undefined = tilesKey
      ? JSON.parse(tilesKey)
      : undefined;
    const parsedBounds: [number, number, number, number] | undefined = boundsKey
      ? JSON.parse(boundsKey)
      : undefined;

    const existingSource = map.getSource(id);

    if (existingSource) {
      try {
        const rasterSource = existingSource as maplibregl.RasterTileSource;

        // Update tiles or URL in-place when possible
        if (parsedTiles && typeof rasterSource.setTiles === "function") {
          rasterSource.setTiles(parsedTiles);
        } else if (url && typeof rasterSource.setUrl === "function") {
          rasterSource.setUrl(url);
        }

        // For properties that cannot be updated in-place (scheme,
        // tileSize, minzoom, maxzoom, attribution) the source must
        // be recreated.  A production-ready version could detect
        // which props actually changed and only recreate when
        // necessary.  For now, the in-place path handles the most
        // common live-update scenario (swapping tile endpoints).

        setSourceAdded(true);
        return; // Skip full recreation
      } catch (error) {
        onErrorRef.current?.(error as Error);
      }
    }

    // ------------------------------------------------------------------
    // Create the source from scratch
    // ------------------------------------------------------------------
    try {
      const sourceConfig: maplibregl.RasterSourceSpecification = {
        type: "raster",
        scheme,
        tileSize,
      };

      if (minzoom !== undefined) {
        sourceConfig.minzoom = minzoom;
      }
      if (maxzoom !== undefined) {
        sourceConfig.maxzoom = maxzoom;
      }

      if (attribution !== undefined) {
        sourceConfig.attribution = attribution;
      }

      if (url) {
        sourceConfig.url = url;
      } else if (parsedTiles && parsedTiles.length > 0) {
        sourceConfig.tiles = parsedTiles;
      } else {
        throw new Error(
          "RasterTileSource: Either 'url' or 'tiles' must be provided"
        );
      }

      if (parsedBounds) {
        sourceConfig.bounds = parsedBounds;
      }

      map.addSource(id, sourceConfig);
      setSourceAdded(true);

      const onSourceData = (e: maplibregl.MapSourceDataEvent) => {
        if (e.sourceId === id && e.isSourceLoaded) {
          map.off("sourcedata", onSourceData);
          onLoadRef.current?.();
        }
      };
      map.on("sourcedata", onSourceData);

      // Store for cleanup so the listener doesn't leak
      return () => {
        // Always remove the listener
        map.off("sourcedata", onSourceData);

        try {
          const style = map.getStyle();
          if (!style) return;

          // Remove every layer that references this source
          const layersToRemove =
            style.layers?.filter(
              (layer: any) => "source" in layer && layer.source === id
            ) || [];

          layersToRemove.forEach((layer: any) => {
            try {
              if (map.getLayer(layer.id)) {
                map.removeLayer(layer.id);
              }
            } catch {
              // Layer may already have been removed
            }
          });

          if (map.getSource(id)) {
            map.removeSource(id);
          }
        } catch {
          // Map was already destroyed – nothing to clean up
        }

        setSourceAdded(false);
      };
    } catch (error) {
      onErrorRef.current?.(error as Error);
      setSourceAdded(false);
    }
  }, [
    map,
    isLoaded,
    id,
    url,
    // Stable string representations instead of raw arrays
    tilesKey,
    boundsKey,
    scheme,
    minzoom,
    maxzoom,
    tileSize,
    attribution,
    // onLoad / onError deliberately excluded — accessed via refs
  ]);

  return <>{sourceAdded ? children : null}</>;
};

// ===================================================================
// Hook for consuming a raster tile source
// ===================================================================
export const useRasterTileSource = (id: string) => {
  const { map, isLoaded } = useMap();
  const [source, setSource] = useState<maplibregl.RasterTileSource | null>(
    null
  );

  useEffect(() => {
    if (!map || !isLoaded || !id) {
      setSource(null);
      return;
    }

    // Attempt to read the source right away (it may already exist)
    const existing = map.getSource(id) as
      | maplibregl.RasterTileSource
      | undefined;
    setSource(existing ?? null);

    // Re-check whenever sources change
    const handleSourceData = (e: maplibregl.MapSourceDataEvent) => {
      if (e.sourceId === id) {
        const src = map.getSource(id) as
          | maplibregl.RasterTileSource
          | undefined;
        setSource(src ?? null);
      }
    };

    // Also handle source removal
    const handleSourceRemove = (e: { sourceId: string }) => {
      if (e.sourceId === id) {
        setSource(null);
      }
    };

    map.on("sourcedata", handleSourceData);
    // Not all MapLibre versions fire "sourceremove" – guard with try
    try {
      (map as any).on("sourceremove", handleSourceRemove);
    } catch {
      // Event not supported
    }

    return () => {
      map.off("sourcedata", handleSourceData);
      try {
        (map as any).off("sourceremove", handleSourceRemove);
      } catch {
        // Event not supported
      }
    };
  }, [map, isLoaded, id]);

  // Provide a manual getter as well for imperative access
  const getSource = useCallback(() => {
    if (!map || !isLoaded || !id) return null;
    return (map.getSource(id) as maplibregl.RasterTileSource) ?? null;
  }, [map, isLoaded, id]);

  return { source, getSource };
};
