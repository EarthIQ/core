// src/components/Layers/RasterLayer.tsx
import React, { useEffect, useState } from "react";
import { useMap } from "../../hooks/useMap";

interface RasterLayerProps {
  /** Unique layer ID */
  id: string;
  /** Source ID this layer reads from */
  source: string;
  /** Opacity 0-1 */
  opacity?: number;
  /** Whether the layer is visible */
  visible?: boolean;
  /** Insert this layer before another layer */
  beforeId?: string;
  /** Minimum zoom for this layer */
  minzoom?: number;
  /** Maximum zoom for this layer */
  maxzoom?: number;
  /** Saturation 0-1 */
  saturation?: number;
}

export const RasterLayer: React.FC<RasterLayerProps> = ({
  id,
  source,
  opacity = 1,
  visible = false,
  beforeId,
  minzoom = 0,
  maxzoom = 24,
  saturation = 0,
}) => {
  const { map, isLoaded } = useMap();

  // Add the layer
  useEffect(() => {
    if (!map || !isLoaded) return;

    // Ensure the source exists before adding the layer
    if (!map.getSource(source)) {
      console.warn(`RasterLayer "${id}": source "${source}" not found`);
      return;
    }

    if (!map.getLayer(id)) {
      map.addLayer(
        {
          id,
          type: "raster",
          source,
          minzoom,
          maxzoom,
          paint: {
            "raster-opacity": opacity,
            "raster-saturation": saturation,
          },
          layout: {
            visibility: visible ? "visible" : "none",
          },
        },
        beforeId
      );
    }

    return () => {
      try {
        if (map.getLayer(id)) {
          map.removeLayer(id);
        }
      } catch {
        // Map may already be destroyed
      }
    };
  }, [map, isLoaded, id, source, beforeId, minzoom, maxzoom]);

  // Update opacity dynamically
  useEffect(() => {
    if (!map || !isLoaded || !map.getLayer(id)) return;
    map.setPaintProperty(id, "raster-opacity", opacity);
  }, [map, isLoaded, id, opacity]);

  // Update visibility dynamically
  useEffect(() => {
    if (!map || !isLoaded || !map.getLayer(id)) return;
    map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
  }, [map, isLoaded, id, visible]);

  return null;
};
