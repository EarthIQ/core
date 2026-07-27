import React, { useEffect } from "react";
import { useMap } from "../../hooks/useMap";

interface AnchorLayerProps {
  /** Unique ID for the anchor layer */
  id: string;
  /** ID of an existing layer to insert this anchor before */
  beforeId?: string;
}

/**
 * A hidden layer that serves as a marker in the map's layer stack.
 * Useful for ensuring certain groups of layers stay above or below others.
 */
export const AnchorLayer: React.FC<AnchorLayerProps> = ({ id, beforeId }) => {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const sourceId = `${id}-source`;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    if (!map.getLayer(id)) {
      map.addLayer(
        {
          id,
          type: "circle",
          source: sourceId,
          paint: {
            "circle-radius": 0,
            "circle-opacity": 0,
          },
        },
        beforeId
      );
    }

    return () => {
      try {
        if (map.style && map.getLayer(id)) {
          map.removeLayer(id);
        }
        if (map.style && map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      } catch (e) {
        console.warn("Failed to remove anchor layer:", e);
      }
    };
  }, [map, isLoaded, id, beforeId]);

  return null;
};
