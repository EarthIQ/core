"use client";

import React from "react";
import { useDragLayer } from "react-dnd";
import { cn } from "../../../utils/cn";
import type { DragOverlayProps } from "./types";

export const DragOverlay: React.FC<DragOverlayProps> = ({
  children,
  className,
}) => {
  const { isDragging, item, currentOffset } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    item: monitor.getItem(),
    currentOffset: monitor.getSourceClientOffset(),
  }));

  if (!isDragging || !currentOffset) return null;

  return (
    <div
      className={cn("pointer-events-none fixed inset-0 z-[9999]", className)}
    >
      <div
        style={{
          transform: `translate(${currentOffset.x}px, ${currentOffset.y}px)`,
        }}
        className="inline-block"
      >
        {children ?? (
          <div className="rounded-lg border border-blue-300 bg-white px-4 py-2 shadow-xl dark:bg-gray-800">
            <span className="text-sm font-medium">
              {item?.id ?? "Moving..."}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
