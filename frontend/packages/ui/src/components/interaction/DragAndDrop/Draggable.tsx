"use client";

import React, { useRef, useEffect as _useEffect } from "react";
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
      aria-grabbed={isDragging}
      aria-roledescription="draggable"
      data-drag-id={id}
      data-dragging={isDragging}
      role="listitem"
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "transition-opacity duration-200",
        isDragging && "opacity-50",
        isDragging && dragClassName,
        disabled && "cursor-not-allowed opacity-60",
        !disabled && "cursor-grab active:cursor-grabbing",
        className
      )}
    >
      {typeof children === "function" ? children(dragState) : children}
    </div>
  );
}
