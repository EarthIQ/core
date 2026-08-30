import { isFolder, type TreeNode } from "./types";
import { LayerRow } from "./LayerRow";
import { FolderRow } from "./FolderRow";
import { useLayerDnd } from "./dndContext";
import type { DropPos } from "./dnd";

interface LayerTreeProps {
  childrenOf: (parentId: string | null) => TreeNode[];
  descendantLayers: (folderId: string) => TreeNode[];
  onToggleVisibility: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onOpenStyle: (layer: TreeNode) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
  /** Edit a saved vector layer's shapes on the map. */
  onEditLayer?: (layer: TreeNode) => void;
  onMove: (id: string, newParentId: string | null, targetIndex: number) => void;
  onAddFolderInside: (parentId: string) => void;
  onAddDataToFolder: (parentId: string) => void;
  /** When set, only nodes in this id-set are rendered (search filter). */
  filterIds?: Set<string> | null;
}

export function LayerTree({
  childrenOf,
  descendantLayers,
  onToggleVisibility,
  onToggleCollapse,
  onOpenStyle,
  onRemove,
  onRename,
  onEditLayer,
  onMove,
  onAddFolderInside,
  onAddDataToFolder,
  filterIds = null,
}: LayerTreeProps) {
  const { draggingId, setDraggingId, dropTarget, setDropTarget, reset } =
    useLayerDnd();

  function handleDrop(node: TreeNode, pos: DropPos) {
    if (!draggingId || draggingId === node.id) {
      reset();
      return;
    }
    if (isFolder(node) && pos === "inside") {
      onMove(draggingId, node.id, childrenOf(node.id).length);
    } else {
      const siblings = childrenOf(node.parentId);
      const idx = siblings.findIndex((s) => s.id === node.id);
      const finalPos = pos === "inside" ? "after" : pos;
      onMove(draggingId, node.parentId, finalPos === "before" ? idx : idx + 1);
    }
    reset();
  }

  function renderLevel(parentId: string | null, depth: number) {
    return childrenOf(parentId).map((node) => {
      // Search filter: skip nodes that are not in the visible set.
      if (filterIds && !filterIds.has(node.id)) return null;

      if (isFolder(node)) {
        // While filtering, folders with visible children stay expanded.
        const hasVisibleChildren =
          filterIds !== null &&
          childrenOf(node.id).some((c) => filterIds.has(c.id));
        const expanded = !node.collapsed || hasVisibleChildren;
        return (
          <div key={node.id}>
          <FolderRow
            folder={node}
            depth={depth}
            childCount={childrenOf(node.id).length}
            anyVisible={descendantLayers(node.id).some((l: any) => l.visible)}
            isDragging={draggingId === node.id}
            isDropTarget={dropTarget?.id === node.id}
            dropPosition={
              dropTarget?.id === node.id ? dropTarget.position : null
            }
            onToggleCollapse={() => onToggleCollapse(node.id)}
            onToggleVisibility={() => onToggleVisibility(node.id)}
            onRemove={() => onRemove(node.id)}
            onRename={(name) => onRename(node.id, name)}
            onAddSubfolder={() => onAddFolderInside(node.id)}
            onAddDataHere={() => onAddDataToFolder(node.id)}
            onDragStart={() => setDraggingId(node.id)}
            onDragEnd={reset}
            onDragOverRow={(pos) =>
              setDropTarget({ id: node.id, position: pos })
            }
            onDrop={(pos) => handleDrop(node, pos)}
          >
            {expanded && renderLevel(node.id, depth + 1)}
            </FolderRow>
          </div>
        );
      }

      return (
        <LayerRow
          key={node.id}
          layer={node}
          depth={depth}
          isDragging={draggingId === node.id}
          isDropTarget={dropTarget?.id === node.id}
          dropPosition={dropTarget?.id === node.id ? dropTarget.position : null}
          onToggle={() => onToggleVisibility(node.id)}
          onOpenStyle={() => onOpenStyle(node)}
          onRemove={() => onRemove(node.id)}
          onRename={(name) => onRename(node.id, name)}
          onEditLayer={
            onEditLayer && !node.pending
              ? () => onEditLayer(node)
              : undefined
          }
          onDragStart={() => setDraggingId(node.id)}
          onDragEnd={reset}
          onDragOverRow={(pos) => setDropTarget({ id: node.id, position: pos })}
          onDrop={(pos) => handleDrop(node, pos)}
        />
      );
    });
  }

  return <div className="flex flex-col gap-0.5">{renderLevel(null, 0)}</div>;
}
