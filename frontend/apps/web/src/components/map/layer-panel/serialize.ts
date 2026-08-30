import type { TreeNode, FolderTreeNode, LayerTreeNode } from "./types";

export function toMapLayerItems(nodes: TreeNode[]): any[] {
  return nodes.map((n) => {
    if (n.kind === "folder") {
      const f = n as FolderTreeNode;
      return {
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        order: f.order,
        kind: "folder",
        collapsed: f.collapsed,
      };
    }
    const l = n as LayerTreeNode;
    return {
      id: l.id,
      name: l.name,
      parentId: l.parentId,
      order: l.order,
      kind: "layer",
      type: l.layerType,
      visible: l.visible,
      url: l.tileUrl,
      datasetId: l.datasetId,
      geometryType: l.geometryType,
      style: {
        color: l.color,
        opacity: l.opacity,
        lineWidth: l.lineWidth,
        minZoom: l.minZoom,
        maxZoom: l.maxZoom,
        brightness: l.brightness,
        contrast: l.contrast,
      },
    };
  });
}

export function fromMapLayerItems(items: any[]): TreeNode[] {
  return items.map((raw, i) => {
    if (raw.kind === "folder") {
      return {
        id: raw.id,
        kind: "folder",
        name: raw.name ?? "Folder",
        parentId: raw.parentId ?? null,
        order: raw.order ?? i,
        collapsed: !!raw.collapsed,
      } as FolderTreeNode;
    }
    return {
      id: raw.id,
      kind: "layer",
      name: raw.name ?? "Layer",
      parentId: raw.parentId ?? null,
      order: raw.order ?? i,
      layerType: raw.type ?? raw.layerType ?? "vector",
      visible: raw.visible ?? true,
      tileUrl: raw.url ?? raw.tileUrl,
      datasetId: raw.datasetId ?? undefined,
      geometryType: raw.geometryType ?? undefined,
      color: raw.style?.color ?? raw.color,
      opacity: raw.style?.opacity ?? raw.opacity,
      lineWidth: raw.style?.lineWidth ?? raw.lineWidth,
      minZoom: raw.style?.minZoom ?? raw.minZoom,
      maxZoom: raw.style?.maxZoom ?? raw.maxZoom,
      brightness: raw.style?.brightness ?? raw.brightness,
      contrast: raw.style?.contrast ?? raw.contrast,
      source: raw.source,
    } as LayerTreeNode;
  });
}
