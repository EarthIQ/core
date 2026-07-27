import { Building } from "lucide-react";
import { ControlButton } from "./MapControlButton";
import useMap from "../../hooks/useMap";
import { useState } from "react";

interface BuildingControlProps {
  icon?: React.ReactNode;
  label?: string;
  minZoom?: number;
  sourceUrl?: string;
  sourceLayer?: string;
  colors?: {
    low?: string;
    mid?: string;
    high?: string;
  };
  heightThresholds?: {
    mid?: number;
    high?: number;
  };
}

export const BuildingControl: React.FC<BuildingControlProps> = ({
  icon = <Building className="h-4 w-4" />,
  label = "Buildings",
  minZoom = 14,
  sourceUrl = "https://tiles.openfreemap.org/planet",
  sourceLayer = "building",
  colors = {
    low: "lightgray",
    mid: "royalblue",
    high: "lightblue",
  },
  heightThresholds = {
    mid: 200,
    high: 400,
  },
}) => {
  const { map } = useMap();
  const [isActive, setIsActive] = useState(false);

  const addBuildingLayer = () => {
    if (!map) return;

    if (!map.getSource("openfreemap")) {
      map.addSource("openfreemap", {
        url: sourceUrl,
        type: "vector",
      });
    }

    if (!map.getLayer("3d-buildings")) {
      map.addLayer({
        id: "3d-buildings",
        source: "openfreemap",
        "source-layer": sourceLayer,
        type: "fill-extrusion",
        minzoom: minZoom,
        filter: ["!=", ["get", "hide_3d"], true],
        paint: {
          "fill-extrusion-color": [
            "interpolate",
            ["linear"],
            ["get", "render_height"],
            0,
            colors.low ?? "royalblue",
            heightThresholds.mid ?? 200,
            colors.mid ?? "royalblue",
            heightThresholds.high ?? 400,
            colors.high ?? "lightblue",
          ],
          "fill-extrusion-height": [
            "interpolate",
            ["linear"],
            ["zoom"],
            minZoom,
            0,
            minZoom + 1,
            ["get", "render_height"],
          ],
          "fill-extrusion-base": [
            "case",
            [">=", ["get", "zoom"], minZoom + 1],
            ["get", "render_min_height"],
            0,
          ],
        },
      });
    }
  };

  const toggleBuildings = () => {
    if (!map) return;

    const newActiveState = !isActive;
    setIsActive(newActiveState);

    if (newActiveState) {
      if (!map.getLayer("3d-buildings")) {
        addBuildingLayer();
      }
      map.setLayoutProperty("3d-buildings", "visibility", "visible");
    } else {
      if (map.getLayer("3d-buildings")) {
        map.setLayoutProperty("3d-buildings", "visibility", "none");
      }
    }
  };

  return (
    <ControlButton
      icon={icon}
      label={label}
      active={isActive}
      onClick={toggleBuildings}
    />
  );
};
