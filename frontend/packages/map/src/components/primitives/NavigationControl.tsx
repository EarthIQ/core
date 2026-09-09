import * as maplibregl from "maplibre-gl";
import { useEffect } from "react";

import { useMap } from "../../hooks/useMap";

import type React from "react";

export interface NavigationControlProps {
  /** Position on map */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Show compass */
  showCompass?: boolean;
  /** Show zoom buttons */
  showZoom?: boolean;
  /** Visualize pitch with compass */
  visualizePitch?: boolean;
}

export const NavigationControl: React.FC<NavigationControlProps> = ({
  position = "top-right",
  showCompass = true,
  showZoom = true,
  visualizePitch = true,
}) => {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const control = new maplibregl.NavigationControl({
      showCompass,
      showZoom,
      visualizePitch,
    });

    map.addControl(control, position);

    return () => {
      map.removeControl(control);
    };
  }, [map, isLoaded, position, showCompass, showZoom, visualizePitch]);

  return null;
};
