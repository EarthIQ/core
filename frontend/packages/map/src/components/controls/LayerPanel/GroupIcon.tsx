// src/components/controls/LayerPanel/GroupIcon.tsx

import React from "react";
import {
  Map,
  Layers,
  Folder,
  FolderOpen,
  Database,
  Globe,
  BarChart3,
  Route,
  Leaf,
  Building2,
  Wifi,
  CloudSun,
} from "lucide-react";

interface GroupIconProps {
  icon?: string;
  expanded?: boolean;
  className?: string;
}

export const GroupIcon: React.FC<GroupIconProps> = ({
  icon,
  expanded = false,
  className = "h-4 w-4",
}) => {
  switch (icon) {
    case "map":
      return <Map className={className} />;
    case "layers":
      return <Layers className={className} />;
    case "database":
      return <Database className={className} />;
    case "globe":
      return <Globe className={className} />;
    case "bar-chart":
      return <BarChart3 className={className} />;
    case "route":
      return <Route className={className} />;
    case "leaf":
      return <Leaf className={className} />;
    case "building":
      return <Building2 className={className} />;
    case "wifi":
      return <Wifi className={className} />;
    case "weather":
      return <CloudSun className={className} />;
    case "folder":
    default:
      return expanded ? (
        <FolderOpen className={className} />
      ) : (
        <Folder className={className} />
      );
  }
};
