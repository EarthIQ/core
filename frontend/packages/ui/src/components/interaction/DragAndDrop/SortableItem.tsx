"use client";

import React, { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { cn } from "../../../utils/cn";
import type { SortableItemProps, DragItem } from "./types";

export const SortableItem: React.FC<SortableItemProps> = ({
  id,
  index,
  type,
  disabled = false,
  direction = "vertical",
  children,
  className,
  dragClassName,
  onMove,
  onDragStart,
  onDragEnd,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type,
    item: () => {
      onDragStart?.();
      return { id, index, type } as DragItem;
    },
    canDrag: !disabled,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: () => {
      onDragEnd?.();
    },
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: type,
    hover: (draggedItem: DragItem, monitor) => {
      if (!ref.current) return;
      const fromIndex = draggedItem.index;
      const toIndex = index;

      if (fromIndex === toIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      if (direction === "vertical") {
        const hoverMiddleY =
          (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;

        // Moving down: only trigger when cursor is below 50%
        if (fromIndex < toIndex && hoverClientY < hoverMiddleY) return;
        // Moving up: only trigger when cursor is above 50%
        if (fromIndex > toIndex && hoverClientY > hoverMiddleY) return;
      } else {
        const hoverMiddleX =
          (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
        const hoverClientX = clientOffset.x - hoverBoundingRect.left;

        if (fromIndex < toIndex && hoverClientX < hoverMiddleX) return;
        if (fromIndex > toIndex && hoverClientX > hoverMiddleX) return;
      }

      onMove(fromIndex, toIndex);
      // Mutate the monitor item to reflect the new index
      draggedItem.index = toIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  drag(drop(ref));

  const dragState = { isDragging, canDrag: !disabled };

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-200",
        isDragging && "z-50 scale-[1.02] opacity-40 shadow-lg",
        isDragging && dragClassName,
        isOver && canDrop && !isDragging && "border-t-2 border-blue-400",
        disabled && "cursor-not-allowed opacity-60",
        !disabled && "cursor-grab active:cursor-grabbing",
        className
      )}
      data-sortable-id={id}
      data-sortable-index={index}
      data-dragging={isDragging}
      role="listitem"
      aria-grabbed={isDragging}
      aria-roledescription="sortable"
      tabIndex={disabled ? -1 : 0}
    >
      {typeof children === "function" ? children(dragState) : children}
    </div>
  );
};
