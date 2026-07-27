import { useState, useCallback, useEffect } from "react";
import { Globe, Map as MapIcon } from "lucide-react";
import { useMap } from "@packages/map";
import { ControlButton } from "./MapControlButton";

type GlobeControlProps = {
  className?: string;
  labels?: {
    switchToGlobe?: string;
    switchToMercator?: string;
  };
};

export function GlobeControl({ className, labels = {} }: GlobeControlProps) {
  const { map, isLoaded } = useMap();
  const [isGlobe, setIsGlobe] = useState(false);

  const {
    switchToGlobe = "Switch to Globe",
    switchToMercator = "Switch to Mercator",
  } = labels;

  useEffect(() => {
    if (!map || !isLoaded) return;

    const updateProjection = () => {
      const projection = map.getProjection()?.type;
      setIsGlobe(projection === "globe");
    };

    updateProjection();

    map.on("styledata", updateProjection);
    return () => {
      map.off("styledata", updateProjection);
    };
  }, [map, isLoaded]);

  const toggleProjection = useCallback(() => {
    if (!map) return;

    const nextIsGlobe = !isGlobe;

    map.setProjection({
      type: nextIsGlobe ? "globe" : "mercator",
    });

    setIsGlobe(nextIsGlobe);
  }, [map, isGlobe]);

  if (!isLoaded) return null;

  return (
    <ControlButton
      className={className}
      icon={
        isGlobe ? (
          <MapIcon className="h-4 w-4" />
        ) : (
          <Globe className="h-4 w-4" />
        )
      }
      label={isGlobe ? switchToMercator : switchToGlobe}
      active={isGlobe}
      onClick={toggleProjection}
    />
  );
}
