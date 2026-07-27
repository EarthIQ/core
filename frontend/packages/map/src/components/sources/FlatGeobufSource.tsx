import React, { useEffect, useId, useState } from 'react';
import { useMap } from '../../hooks/useMap';
import { geojson as fgbGeojson } from 'flatgeobuf';

export interface FlatGeobufSourceProps {
  /** Unique source ID */
  id?: string;
  /** FlatGeobuf URL */
  url: string;
  /** Bounding box filter [minX, minY, maxX, maxY] */
  bounds?: [number, number, number, number];
  /** Layer configuration */
  layer: {
    type: 'fill' | 'line' | 'circle' | 'symbol';
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
  /** Progressive loading */
  progressive?: boolean;
  /** Callback with features count */
  onProgress?: (count: number) => void;
  /** Callback when complete */
  onLoad?: (featureCount: number) => void;
}

export const FlatGeobufSource: React.FC<FlatGeobufSourceProps> = ({
  id: propId,
  url,
  bounds,
  layer,
  outlineLayer,
  progressive = true,
  onProgress,
  onLoad
}) => {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId || `fgb-source-${autoId}`;
  const sourceId = `${id}-source`;
  const [features, setFeatures] = useState<any[]>([]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    let cancelled = false;

    const loadFGB = async () => {
      const loadedFeatures: any[] = [];

      // Create bounding box filter if provided
      const rect = bounds ? {
        minX: bounds[0],
        minY: bounds[1],
        maxX: bounds[2],
        maxY: bounds[3]
      } : undefined;

      // Stream features from FlatGeobuf
      const iter = fgbGeojson.deserialize(url, rect);

      for await (const feature of iter) {
        if (cancelled) break;

        loadedFeatures.push(feature);

        if (progressive && loadedFeatures.length % 1000 === 0) {
          onProgress?.(loadedFeatures.length);

          // Update source with current features
          const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
          if (source) {
            source.setData({
              type: 'FeatureCollection',
              features: [...loadedFeatures]
            });
          }
        }
      }

      if (!cancelled) {
        setFeatures(loadedFeatures);
        onLoad?.(loadedFeatures.length);

        // Final update
        const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features: loadedFeatures
          });
        }
      }
    };

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        generateId: true
      });
    }

    if (!map.getLayer(id)) {
      map.addLayer({
        id,
        type: layer.type,
        source: sourceId,
        paint: layer.paint || {},
        layout: layer.layout || {}
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

    loadFGB();

    return () => {
      cancelled = true;
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getLayer(`${id}-outline`)) map.removeLayer(`${id}-outline`);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, isLoaded, url, bounds]);

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