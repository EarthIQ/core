"use client";

import React, { useCallback, useState } from "react";

import { SortableItem } from "./SortableItem";
import { cn } from "../../../utils/cn";

import type { SortableListProps } from "./types";

export const SortableList = <T extends { id: string | number }>({
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
}: SortableListProps<T>) => {
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
      aria-label="Sortable list"
      className={cn(directionStyles[direction], className)}
      role="list"
      style={{ gap: `${gap}px` }}
    >
      {internalItems.map((item, index) => {
        const key = keyExtractor ? keyExtractor(item) : item.id;
        return (
          <SortableItem
            key={key}
            className={itemClassName}
            direction={direction === "grid" ? "horizontal" : direction}
            disabled={disabled}
            dragClassName={dragItemClassName}
            id={item.id}
            index={index}
            type={type}
            onDragEnd={() => handleDragEnd(item, index)}
            onDragStart={() => onDragStart?.(item, index)}
            onMove={handleMove}
          >
            {(dragState) => renderItem(item, index, dragState)}
          </SortableItem>
        );
      })}
    </div>
  );
}
