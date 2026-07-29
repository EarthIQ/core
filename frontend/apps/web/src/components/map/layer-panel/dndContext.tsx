import { createContext, useContext, useState } from "react";
import type { DropPos } from "./dnd";

interface DropTargetInfo {
  id: string;
  position: DropPos;
}

interface DndContextValue {
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  dropTarget: DropTargetInfo | null;
  setDropTarget: (t: DropTargetInfo | null) => void;
  reset: () => void;
}

const LayerDndContext = createContext<DndContextValue | null>(null);

export function LayerDndProvider({ children }: { children: React.ReactNode }) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTargetInfo | null>(null);
  const reset = () => {
    setDraggingId(null);
    setDropTarget(null);
  };
  return (
    <LayerDndContext.Provider
      value={{ draggingId, setDraggingId, dropTarget, setDropTarget, reset }}
    >
      {children}
    </LayerDndContext.Provider>
  );
}

export function useLayerDnd() {
  const ctx = useContext(LayerDndContext);
  if (!ctx) throw new Error("useLayerDnd must be used within LayerDndProvider");
  return ctx;
}
