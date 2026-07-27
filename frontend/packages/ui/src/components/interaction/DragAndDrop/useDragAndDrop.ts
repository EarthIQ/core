"use client";

import { useState, useCallback } from "react";

export interface UseDragAndDropOptions<T extends { id: string | number }> {
  initialItems: T[];
  onReorder?: (items: T[]) => void;
}

export function useDragAndDrop<T extends { id: string | number }>({
  initialItems,
  onReorder,
}: UseDragAndDropOptions<T>) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleReorder = useCallback(
    (reorderedItems: T[], fromIndex: number, toIndex: number) => {
      setItems(reorderedItems);
      onReorder?.(reorderedItems);
    },
    [onReorder]
  );

  const handleDragStart = useCallback((item: T) => {
    setActiveId(item.id);
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setActiveId(null);
    setIsDragging(false);
  }, []);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  const addItem = useCallback((item: T, index?: number) => {
    setItems((prev) => {
      if (index !== undefined) {
        const updated = [...prev];
        updated.splice(index, 0, item);
        return updated;
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((id: string | number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    items,
    setItems,
    activeId,
    isDragging,
    handleReorder,
    handleDragStart,
    handleDragEnd,
    moveItem,
    addItem,
    removeItem,
  };
}
