"use client";

import React, { useRef } from "react";
import { useDrop } from "react-dnd";
import { cn } from "../../../utils/cn";
import type { DroppableProps, DragItem } from "./types";

export function Droppable<T = unknown>({
  accept,
  children,
  className,
  activeClassName = "ring-2 ring-blue-400 ring-offset-2",
  hoverClassName = "bg-blue-50 dark:bg-blue-950/30",
  disabled = false,
  onDrop,
  onHover,
  canDrop: canDropFn,
}: DroppableProps<T>) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isOver, canDrop, itemType }, drop] = useDrop({
    accept,
    drop: (item: DragItem<T>) => {
      if (!disabled) onDrop?.(item);
    },
    hover: (item: DragItem<T>) => {
      if (!disabled) onHover?.(item);
    },
    canDrop: (item: DragItem<T>) => {
      if (disabled) return false;
      return canDropFn ? canDropFn(item) : true;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
      itemType: monitor.getItemType(),
    }),
  });

  drop(ref);

  const dropState = { isOver, canDrop, itemType };

  return (
    <div
      ref={ref}
      className={cn(
        "min-h-[48px] rounded-lg border-2 border-dashed border-gray-300 p-4 transition-all duration-200",
        "dark:border-gray-600",
        canDrop && activeClassName,
        canDrop && isOver && hoverClassName,
        !canDrop && isOver && "border-red-300 bg-red-50 dark:bg-red-950/30",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
      data-drop-active={isOver && canDrop}
      aria-dropeffect={canDrop ? "move" : "none"}
      role="list"
    >
      {typeof children === "function" ? children(dropState) : children}
    </div>
  );
}
