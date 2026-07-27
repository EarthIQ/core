"use client";

import React, { useCallback, useState } from "react";
import { cn } from "../../../utils/cn";
import { SortableItem } from "./SortableItem";
import type { SortableListProps } from "./types";

export function SortableList<T extends { id: string | number }>({
  items,
  type = "SORTABLE_ITEM",
  direction = "vertical",
  gap = 8,
  disabled = false,
  className,
  itemClassName,
  dragItemClassName,
  renderItem,
  onReorder,
  onDragStart,
  onDragEnd,
  keyExtractor,
}: SortableListProps<T>) {
  const [internalItems, setInternalItems] = useState(items);

  // Sync with external items
  React.useEffect(() => {
    setInternalItems(items);
  }, [items]);

  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    setInternalItems((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  const handleDragEnd = useCallback(
    (item: T, index: number) => {
      // Find where the item ended up
      const finalIndex = internalItems.findIndex((i) => i.id === item.id);
      const originalIndex = items.findIndex((i) => i.id === item.id);

      if (finalIndex !== originalIndex) {
        onReorder(internalItems, originalIndex, finalIndex);
      }
      onDragEnd?.(item, index);
    },
    [internalItems, items, onReorder, onDragEnd]
  );

  const directionStyles = {
    vertical: "flex flex-col",
    horizontal: "flex flex-row flex-wrap",
    grid: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
  };

  return (
    <div
      className={cn(directionStyles[direction], className)}
      style={{ gap: `${gap}px` }}
      role="list"
      aria-label="Sortable list"
    >
      {internalItems.map((item, index) => {
        const key = keyExtractor ? keyExtractor(item) : item.id;
        return (
          <SortableItem
            key={key}
            id={item.id}
            index={index}
            type={type}
            disabled={disabled}
            direction={direction === "grid" ? "horizontal" : direction}
            className={itemClassName}
            dragClassName={dragItemClassName}
            onMove={handleMove}
            onDragStart={() => onDragStart?.(item, index)}
            onDragEnd={() => handleDragEnd(item, index)}
          >
            {(dragState) => renderItem(item, index, dragState)}
          </SortableItem>
        );
      })}
    </div>
  );
}
