export type LayerKind = "vector" | "raster";
export type NodeSource = "catalog" | "resource" | "uploaded";

/** Dominant geometry kind of a vector layer (drives the panel's type icon). */
export type GeometryType = "point" | "line" | "polygon";

export interface BaseTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
}

export interface FolderTreeNode extends BaseTreeNode {
  kind: "folder";
  collapsed: boolean;
}

export interface LayerTreeNode extends BaseTreeNode {
  kind: "layer";
  layerType: LayerKind;
  visible: boolean;
  tileUrl?: string;
  /** Source dataset id (catalog layer) — used to fetch the geometry summary. */
  datasetId?: string;
  /** Dominant geometry kind for vector layers (point / line / polygon). */
  geometryType?: GeometryType;
  color?: string;
  opacity?: number;
  lineWidth?: number;
  minZoom?: number;
  maxZoom?: number;
  brightness?: number;
  contrast?: number;
  source?: NodeSource;
}

export type TreeNode = FolderTreeNode | LayerTreeNode;

export function isFolder(n: TreeNode): n is FolderTreeNode {
  return n.kind === "folder";
}
export function isLayer(n: TreeNode): n is LayerTreeNode {
  return n.kind === "layer";
}
