export interface LayerItem {
  id: string;
  name: string;
  type: "vector" | "raster";
  visible: boolean;
  tileUrl?: string;
  color?: string;
  opacity?: number;
  lineWidth?: number;
  source?: "catalog" | "resource" | "uploaded";
}
