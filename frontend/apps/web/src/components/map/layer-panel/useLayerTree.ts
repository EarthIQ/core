import { useCallback, useMemo, useState } from "react";
import type {
  TreeNode,
  FolderTreeNode,
  LayerTreeNode,
  LayerKind,
  NodeSource,
  GeometryType,
} from "./types";

let _uid = 0;
function genId(prefix = "node") {
  _uid += 1;
  return `${prefix}_${Date.now().toString(36)}_${_uid}`;
}

export const LAYER_COLORS = [
  "#22d3a0",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];
let _colorIdx = 0;
export function nextLayerColor() {
  return LAYER_COLORS[_colorIdx++ % LAYER_COLORS.length];
}

export interface NewLayerInput {
  id?: string;
  name: string;
  layerType: LayerKind;
  tileUrl?: string;
  source?: NodeSource;
  visible?: boolean;
  color?: string;
  opacity?: number;
  lineWidth?: number;
  datasetId?: string;
  geometryType?: GeometryType;
}

export function useLayerTree(initial: TreeNode[] = []) {
  const [nodes, setNodes] = useState<TreeNode[]>(initial);

  const childrenOf = useCallback(
    (parentId: string | null) =>
      nodes
        .filter((n) => n.parentId === parentId)
        .sort((a, b) => a.order - b.order),
    [nodes],
  );

  const getNode = useCallback(
    (id: string) => nodes.find((n) => n.id === id),
    [nodes],
  );

  const descendantIds = useCallback(
    (folderId: string): string[] => {
      const direct = nodes.filter((n) => n.parentId === folderId);
      let acc: string[] = direct.map((n) => n.id);
      direct.forEach((n) => {
        if (n.kind === "folder") acc = acc.concat(descendantIds(n.id));
      });
      return acc;
    },
    [nodes],
  );

  const descendantLayers = useCallback(
    (folderId: string): LayerTreeNode[] =>
      descendantIds(folderId)
        .map((id) => getNode(id))
        .filter((n): n is LayerTreeNode => !!n && n.kind === "layer"),
    [descendantIds, getNode],
  );

  /* ── Add ─────────────────────────────────────────────── */
  const addLayers = useCallback(
    (layers: NewLayerInput[], parentId: string | null = null) => {
      setNodes((prev) => {
        const siblingCount = prev.filter((n) => n.parentId === parentId).length;
        const additions: LayerTreeNode[] = layers.map((l, i) => ({
          id: l.id ?? genId("layer"),
          kind: "layer",
          name: l.name,
          parentId,
          order: siblingCount + i,
          layerType: l.layerType,
          visible: l.visible ?? true,
          tileUrl: l.tileUrl,
          color: l.color ?? nextLayerColor(),
          opacity: l.opacity ?? 0.8,
          lineWidth: l.lineWidth ?? 2,
          datasetId: l.datasetId,
          geometryType: l.geometryType,
          source: l.source ?? "catalog",
        }));
        return [...prev, ...additions];
      });
    },
    [],
  );

  const addFolder = useCallback(
    (name = "New Folder", parentId: string | null = null) => {
      const id = genId("folder");
      setNodes((prev) => {
        const siblingCount = prev.filter((n) => n.parentId === parentId).length;
        const folder: FolderTreeNode = {
          id,
          kind: "folder",
          name,
          parentId,
          order: siblingCount,
          collapsed: false,
        };
        return [...prev, folder];
      });
      return id;
    },
    [],
  );

  /* ── Remove (cascades to children) ─────────────────────── */
  const removeNode = useCallback(
    (id: string) => {
      setNodes((prev) => {
        const toRemove = new Set([id, ...descendantIds(id)]);
        return prev.filter((n) => !toRemove.has(n.id));
      });
    },
    [descendantIds],
  );

  const renameNode = useCallback((id: string, name: string) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, name } : n)));
  }, []);

  /* ── Toggle visibility (folder cascades to descendants) ─── */
  const toggleVisibility = useCallback(
    (id: string) => {
      const node = getNode(id);
      if (!node) return;
      if (node.kind === "layer") {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === id && n.kind === "layer"
              ? { ...n, visible: !n.visible }
              : n,
          ),
        );
      } else {
        const layers = descendantLayers(id);
        const nextVisible = !layers.some((l) => l.visible);
        const ids = new Set(layers.map((l) => l.id));
        setNodes((prev) =>
          prev.map((n) =>
            ids.has(n.id) && n.kind === "layer"
              ? { ...n, visible: nextVisible }
              : n,
          ),
        );
      }
    },
    [getNode, descendantLayers],
  );

  const toggleCollapse = useCallback((id: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id && n.kind === "folder"
          ? { ...n, collapsed: !n.collapsed }
          : n,
      ),
    );
  }, []);

  const patchLayer = useCallback(
    (id: string, patch: Partial<LayerTreeNode>) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id && n.kind === "layer" ? { ...n, ...patch } : n,
        ),
      );
    },
    [],
  );

  /* ── Move / reorder (drag & drop backbone) ─────────────── */
  const moveNode = useCallback(
    (id: string, newParentId: string | null, targetIndex: number) => {
      setNodes((prev) => {
        if (newParentId) {
          // prevent dropping a folder into its own descendant (or itself)
          const isDescendant = (checkId: string): boolean => {
            const n = prev.find((x) => x.id === checkId);
            if (!n) return false;
            if (n.id === id) return true;
            if (n.parentId === null) return false;
            return isDescendant(n.parentId);
          };
          if (id === newParentId || isDescendant(newParentId)) return prev;
        }

        const moving = prev.find((n) => n.id === id);
        if (!moving) return prev;

        const withoutMoving = prev.filter((n) => n.id !== id);
        const siblings = withoutMoving
          .filter((n) => n.parentId === newParentId)
          .sort((a, b) => a.order - b.order);

        const clamped = Math.max(0, Math.min(targetIndex, siblings.length));
        siblings.splice(clamped, 0, { ...moving, parentId: newParentId });

        const reindexed = siblings.map((n, i) => ({ ...n, order: i }));
        const reindexedIds = new Set(reindexed.map((n) => n.id));

        return [
          ...withoutMoving.filter((n) => !reindexedIds.has(n.id)),
          ...reindexed,
        ];
      });
    },
    [],
  );

  const totalLayerCount = useMemo(
    () => nodes.filter((n) => n.kind === "layer").length,
    [nodes],
  );

  return {
    nodes,
    setNodes,
    childrenOf,
    getNode,
    descendantIds,
    descendantLayers,
    addLayers,
    addFolder,
    removeNode,
    renameNode,
    toggleVisibility,
    toggleCollapse,
    patchLayer,
    moveNode,
    totalLayerCount,
  };
}
