import { motion } from "framer-motion";
import React, { type ReactNode } from "react";

import { cn } from "../../../utils/cn";

interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  date?: string;
  icon?: ReactNode;
  status?: "completed" | "current" | "pending";
  content?: ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
  orientation?: "vertical" | "horizontal";
  lineStyle?: "solid" | "dashed";
  className?: string;
}

export const Timeline = ({
  items,
  orientation = "vertical",
  lineStyle = "solid",
  className,
}: TimelineProps) => {
  if (orientation === "horizontal") {
    return (
      <div className={cn("overflow-x-auto", className)}>
        <div className="flex min-w-max items-start gap-4">
          {items.map((item, index) => (
            <HorizontalTimelineItem
              key={item.id}
              index={index}
              isLast={index === items.length - 1}
              item={item}
              lineStyle={lineStyle}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-0", className)}>
      {items.map((item, index) => (
        <VerticalTimelineItem
          key={item.id}
          index={index}
          isLast={index === items.length - 1}
          item={item}
          lineStyle={lineStyle}
        />
      ))}
    </div>
  );
};

function getStatusClasses(status: TimelineItem["status"]) {
  switch (status) {
    case "completed":
      return {
        dot: "border-[var(--success)]",
        dotBg: "var(--success)",
        icon: "var(--text-on-primary)",
      };
    case "current":
      return {
        dot: "border-[var(--primary)]",
        dotBg: "var(--primary)",
        icon: "var(--text-on-primary)",
      };
    default:
      return {
        dot: "border-[var(--border-primary)]",
        dotBg: "var(--surface-active)",
        icon: "var(--text-tertiary)",
      };
  }
}

const TimelineDot = ({ item }: { item: TimelineItem }) => {
  const { dot, dotBg, icon } = getStatusClasses(item.status);

  return (
    <div
      style={{ backgroundColor: dotBg }}
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
        dot,
        item.status === "current" &&
          "shadow-[0_0_0_4px_oklch(from_var(--primary)_l_c_h_/_0.2)]"
      )}
    >
      {item.icon ? (
        <span
          className="h-3 w-3"
          style={{ color: icon }}
        >
          {item.icon}
        </span>
      ) : item.status === "completed" ? (
        <svg
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          style={{ color: icon }}
          viewBox="0 0 24 24"
        >
          <path
            d="M5 13l4 4L19 7"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
          />
        </svg>
      ) : null}
    </div>
  );
};

const VerticalTimelineItem = ({
  item,
  isLast,
  lineStyle,
  index,
}: {
  item: TimelineItem;
  isLast: boolean;
  lineStyle: "solid" | "dashed";
  index: number;
}) => {
  return (
    <motion.div
      animate={{ opacity: 1, x: 0 }}
      className="relative pb-8 pl-8 last:pb-0"
      initial={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.1 }}
    >
      {/* Line */}
      {!isLast && (
        <div
          className={cn(
            "absolute top-6 bottom-0 left-[11px] w-0.5",
            lineStyle === "dashed"
              ? "border-l-2 border-dashed border-[var(--border-primary)]"
              : "bg-[var(--border-primary)]"
          )}
        />
      )}

      {/* Dot */}
      <div className="absolute top-1 left-0">
        <TimelineDot item={item} />
      </div>

      {/* Content */}
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-3">
          <h4 className="font-medium text-[var(--text-primary)]">
            {item.title}
          </h4>
          {item.date ? (
            <span className="text-xs text-[var(--text-tertiary)]">
              {item.date}
            </span>
          ) : null}
        </div>
        {item.description ? (
          <p className="mb-2 text-sm text-[var(--text-secondary)]">
            {item.description}
          </p>
        ) : null}
        {item.content ? (
          <div className="card mt-3 p-4">{item.content}</div>
        ) : null}
      </div>
    </motion.div>
  );
};

const HorizontalTimelineItem = ({
  item,
  isLast,
  lineStyle,
  index,
}: {
  item: TimelineItem;
  isLast: boolean;
  lineStyle: "solid" | "dashed";
  index: number;
}) => {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="relative flex flex-col items-center"
      initial={{ opacity: 0, y: 20 }}
      style={{ minWidth: 160 }}
      transition={{ delay: index * 0.1 }}
    >
      {/* Line */}
      {!isLast && (
        <div
          className={cn(
            "absolute top-3 h-0.5",
            lineStyle === "dashed"
              ? "border-t-2 border-dashed border-[var(--border-primary)]"
              : "bg-[var(--border-primary)]"
          )}
          style={{
            left: "50%",
            marginLeft: "12px",
            width: "calc(100% + 1rem)",
          }}
        />
      )}

      {/* Dot */}
      <div className="relative z-10 mb-3">
        <TimelineDot item={item} />
      </div>

      {/* Content */}
      <div className="px-2 text-center">
        <h4 className="mb-1 text-sm font-medium text-[var(--text-primary)]">
          {item.title}
        </h4>
        {item.date ? (
          <span className="mb-1 block text-xs text-[var(--text-tertiary)]">
            {item.date}
          </span>
        ) : null}
        {item.description ? (
          <p className="text-xs text-[var(--text-secondary)]">
            {item.description}
          </p>
        ) : null}
      </div>
    </motion.div>
  );
};
