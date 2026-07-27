import React, { useEffect, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { useMap } from "../../hooks/useMap";

export interface FullscreenControlProps {
  /** Position on map */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Container element (defaults to map container) */
  container?: HTMLElement;
  /** Callback when fullscreen state changes */
  onChange?: (isFullscreen: boolean) => void;
}

export const FullscreenControl: React.FC<FullscreenControlProps> = ({
  position = "top-right",
  container,
  onChange,
}) => {
  const { map, isLoaded } = useMap();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const control = new maplibregl.FullscreenControl({
      container,
    });

    map.addControl(control, position);

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      const fullscreen = !!document.fullscreenElement;
      setIsFullscreen(fullscreen);
      onChange?.(fullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      map.removeControl(control);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [map, isLoaded, position, container, onChange]);

  return null;
};

// Hook for programmatic access
export const useFullscreen = () => {
  const { map } = useMap();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!map) return;

    const container = map.getContainer();

    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, [map]);

  return { isFullscreen, toggleFullscreen };
};
