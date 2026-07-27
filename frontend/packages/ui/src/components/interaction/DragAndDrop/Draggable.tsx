"use client";

import React, { useRef, useEffect } from "react";
import { useDrag } from "react-dnd";
import { cn } from "../../../utils/cn";
import type { DraggableProps, DragItem } from "./types";

export function Draggable<T = unknown>({
  id,
  index,
  type,
  data,
  disabled = false,
  children,
  className,
  dragClassName,
  onDragStart,
  onDragEnd,
}: DraggableProps<T>) {
  const ref = useRef<HTMLDivElement>(null);

  const dragItem: DragItem<T> = { id, index, type, data };

  const [{ isDragging, canDrag }, drag] = useDrag({
    type,
    item: () => {
      onDragStart?.(dragItem);
      return dragItem;
    },
    canDrag: () => !disabled,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
      canDrag: monitor.canDrag(),
    }),
    end: (_item, monitor) => {
      onDragEnd?.(dragItem, monitor.didDrop());
    },
  });

  drag(ref);

  const dragState = { isDragging, canDrag };

  return (
    <div
      ref={ref}
      className={cn(
        "transition-opacity duration-200",
        isDragging && "opacity-50",
        isDragging && dragClassName,
        disabled && "cursor-not-allowed opacity-60",
        !disabled && "cursor-grab active:cursor-grabbing",
        className
      )}
      data-dragging={isDragging}
      data-drag-id={id}
      aria-grabbed={isDragging}
      aria-roledescription="draggable"
      role="listitem"
      tabIndex={disabled ? -1 : 0}
    >
      {typeof children === "function" ? children(dragState) : children}
    </div>
  );
}
