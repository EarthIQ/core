import React, { useEffect, useState, useCallback } from "react";
import { useMap } from "../../hooks/useMap";
import { ControlButton } from "./MapControlButton";

export interface TerrainControlProps {
  /** Terrain source URL */
  source?: string;
  /** Terrain exaggeration */
  exaggeration?: number;
  /** Initially enabled */
  defaultEnabled?: boolean;
  /** Show toggle button */
  showToggle?: boolean;
  /** Callback when terrain state changes */
  onChange?: (enabled: boolean) => void;
  /** Labels for the control */
  labels?: {
    enable?: string;
    disable?: string;
  };
}

export const TerrainControl: React.FC<TerrainControlProps> = ({
  // source = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
  source = "https://tiles.mapterhorn.com/{z}/{x}/{y}.webp",
  exaggeration = 1.5,
  defaultEnabled = false,
  showToggle = true,
  onChange,
  labels = {},
}) => {
  const { map, isLoaded } = useMap();
  const [isEnabled, setIsEnabled] = useState(defaultEnabled);
  const [isLoading, setIsLoading] = useState(false);

  const enableTerrain = useCallback(() => {
    if (!map || !isLoaded) return;

    setIsLoading(true);

    // Add terrain source if not exists
    if (!map.getSource("terrain-source")) {
      map.addSource("terrain-source", {
        type: "raster-dem",
        tiles: [source],
        encoding: "terrarium",
        tileSize: 512,
        maxzoom: 14,
      });
    }

    // Enable terrain
    map.setTerrain({
      source: "terrain-source",
      exaggeration,
    });

    // Add sky layer for better 3D effect
    map.setSky({
      "atmosphere-blend": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        1,
        5,
        1,
        7,
        0,
      ],
    });

    setIsEnabled(true);
    setIsLoading(false);
    onChange?.(true);
  }, [map, isLoaded, source, exaggeration, onChange]);

  const disableTerrain = useCallback(() => {
    if (!map || !isLoaded) return;

    map.setTerrain(null);

    if (map.getLayer("sky")) {
      map.removeLayer("sky");
    }

    setIsEnabled(false);
    onChange?.(false);
  }, [map, isLoaded, onChange]);

  const toggleTerrain = useCallback(() => {
    if (isEnabled) {
      disableTerrain();
    } else {
      enableTerrain();
    }
  }, [isEnabled, enableTerrain, disableTerrain]);

  // Initialize terrain if defaultEnabled
  useEffect(() => {
    if (defaultEnabled && map && isLoaded) {
      map.once("style.load", enableTerrain);
    }
  }, [map, isLoaded, defaultEnabled]);

  // Update exaggeration
  useEffect(() => {
    if (map && isLoaded && isEnabled) {
      map.setTerrain({
        source: "terrain-source",
        exaggeration,
      });
    }
  }, [exaggeration, map, isLoaded, isEnabled]);

  if (!showToggle) return null;

  return (
    <ControlButton
      onClick={toggleTerrain}
      disabled={isLoading}
      active={isEnabled}
      label={
        isEnabled
          ? labels.disable || "Disable 3D terrain"
          : labels.enable || "Enable 3D terrain"
      }
      icon={isLoading ? <span>...</span> : <span>⛰️</span>}
    />
  );
};
