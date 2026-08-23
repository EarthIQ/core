import React, { useEffect } from "react";
import * as maplibregl from "maplibre-gl";
import { useMap } from "../../hooks/useMap";

export interface AttributionControlProps {
  /** Position on map */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Compact mode */
  compact?: boolean;
  /** Custom attribution HTML */
  customAttribution?: string | string[];
}

export const AttributionControl: React.FC<AttributionControlProps> = ({
  position = "bottom-right",
  compact = false,
  customAttribution,
}) => {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const control = new maplibregl.AttributionControl({
      compact,
      ...(customAttribution ? { customAttribution } : {}),
    });

    map.addControl(control, position);

    return () => {
      map.removeControl(control);
    };
  }, [map, isLoaded, position, compact, customAttribution]);

  return null;
};
