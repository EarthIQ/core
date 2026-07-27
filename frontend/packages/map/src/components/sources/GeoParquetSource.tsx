import React, { useEffect, useId } from "react";
import { useMap } from "../../hooks/useMap";
import { parquetRead } from "hyparquet";

export interface GeoParquetSourceProps {
  /** Unique source ID */
  id?: string;
  /** GeoParquet URL */
  url: string;
  /** Geometry column name */
  geometryColumn?: string;
  /** Columns to include in properties */
  propertyColumns?: string[];
  /** Layer configuration */
  layer: {
    type: "fill" | "line" | "circle" | "symbol";
    paint?: Record<string, any>;
    layout?: Record<string, any>;
    /** Fired when a feature is clicked */
    onClick?: (data: any) => void;
    /** Enable selection state */
    selectable?: boolean;
    /** Cursor style */
    cursor?: string;
  };
  /** Optional outline layer */
  outlineLayer?: {
    type: "line";
    paint?: Record<string, any>;
    layout?: Record<string, any>;
  };
  /** Spatial filter bounds */
  bounds?: [number, number, number, number];
  /** Row limit */
  limit?: number;
  /** Callback when loaded */
  onLoad?: (featureCount: number, metadata: any) => void;
}

export const GeoParquetSource: React.FC<GeoParquetSourceProps> = ({
  id: propId,
  url,
  geometryColumn = "geometry",
  propertyColumns,
  layer,
  outlineLayer,
  bounds,
  limit,
  onLoad,
}) => {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId || `geoparquet-source-${autoId}`;
  const sourceId = `${id}-source`;

  useEffect(() => {
    if (!map || !isLoaded) return;

    let cancelled = false;

    const loadGeoParquet = async () => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();

        // Read Parquet file
        const { data, metadata } = (await parquetRead({
          file: arrayBuffer,
          columns: propertyColumns
            ? [...propertyColumns, geometryColumn]
            : undefined,
        } as any)) as any;

        if (cancelled) return;

        // Convert to GeoJSON
        const features = data
          .slice(0, limit)
          .map((row: any) => {
            const geometry = parseGeometry(row[geometryColumn]);
            const properties = { ...row };
            delete properties[geometryColumn];

            return {
              type: "Feature",
              geometry,
              properties,
            };
          })
          .filter((f: any) => {
            if (!bounds) return true;
            // Simple bbox filter
            const [minX, minY, maxX, maxY] = bounds;
            const coords = getCoordinates(f.geometry);
            if (!coords) return false;
            return coords.some(
              (c: number[]) =>
                c && c[0] >= minX && c[0] <= maxX && c[1] >= minY && c[1] <= maxY
            );
          });

        const geojson = {
          type: "FeatureCollection",
          features,
        };

        // Update source
        const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
        if (source) {
          source.setData(geojson as any);
        }

        onLoad?.(features.length, metadata);
      } catch (error) {
        console.error("Error loading GeoParquet:", error);
      }
    };

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        generateId: true,
      });
    }

    if (!map.getLayer(id)) {
      map.addLayer({
        id,
        type: layer.type,
        source: sourceId,
        paint: layer.paint || {},
        layout: layer.layout || {},
      } as any);

      if (outlineLayer && !map.getLayer(`${id}-outline`)) {
        map.addLayer({
          id: `${id}-outline`,
          type: "line",
          source: sourceId,
          paint: outlineLayer.paint || {},
          layout: outlineLayer.layout || {}
        } as any);
      }
    }

    loadGeoParquet();

    return () => {
      cancelled = true;
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getLayer(`${id}-outline`)) map.removeLayer(`${id}-outline`);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, isLoaded, url]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleClick = (e: any) => {
      if (e.features?.length > 0) {
        layer.onClick?.({
          feature: e.features[0],
          lngLat: e.lngLat,
          point: e.point,
          originalEvent: e.originalEvent,
        });
      }
    };

    const handleMouseMove = () => {
      map.getCanvas().style.cursor = layer.cursor || "pointer";
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    if (layer.onClick) {
      map.on("click", id, handleClick);
    }
    
    map.on("mousemove", id, handleMouseMove);
    map.on("mouseleave", id, handleMouseLeave);
    if (outlineLayer) {
      map.on("mousemove", `${id}-outline`, handleMouseMove);
      map.on("mouseleave", `${id}-outline`, handleMouseLeave);
    }

    return () => {
      if (layer.onClick) {
        map.off("click", id, handleClick);
      }
      map.off("mousemove", id, handleMouseMove);
      map.off("mouseleave", id, handleMouseLeave);
      if (outlineLayer) {
        map.off("mousemove", `${id}-outline`, handleMouseMove);
        map.off("mouseleave", `${id}-outline`, handleMouseLeave);
      }
    };
  }, [map, isLoaded, id, layer.onClick, layer.cursor, outlineLayer]);

  return null;
};

// Helper to parse WKB/WKT geometry
function parseGeometry(geom: any): GeoJSON.Geometry {
  // Implementation depends on geometry encoding
  // Could be WKB, WKT, or native GeoJSON
  if (typeof geom === "object" && geom.type) {
    return geom;
  }
  // Add WKB/WKT parsing logic here
  return geom;
}

function getCoordinates(geometry: GeoJSON.Geometry): number[][] {
  // Flatten coordinates for bbox check
  switch (geometry.type) {
    case "Point":
      return [geometry.coordinates as number[]];
    case "LineString":
    case "MultiPoint":
      return geometry.coordinates as number[][];
    case "Polygon":
    case "MultiLineString":
      return (geometry.coordinates as number[][][]).flat();
    case "MultiPolygon":
      return (geometry.coordinates as number[][][][]).flat(2);
    default:
      return [];
  }
}
