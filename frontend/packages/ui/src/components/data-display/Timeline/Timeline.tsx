import React, { type ReactNode } from "react";
import { motion } from "framer-motion";
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

export function Timeline({
  items,
  orientation = "vertical",
  lineStyle = "solid",
  className,
}: TimelineProps) {
  if (orientation === "horizontal") {
    return (
      <div className={cn("overflow-x-auto", className)}>
        <div className="flex min-w-max items-start gap-4">
          {items.map((item, index) => (
            <HorizontalTimelineItem
              key={item.id}
              item={item}
              isLast={index === items.length - 1}
              lineStyle={lineStyle}
              index={index}
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
          item={item}
          isLast={index === items.length - 1}
          lineStyle={lineStyle}
          index={index}
        />
      ))}
    </div>
  );
}

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

function TimelineDot({ item }: { item: TimelineItem }) {
  const { dot, dotBg, icon } = getStatusClasses(item.status);

  return (
    <div
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
        dot,
        item.status === "current" &&
          "shadow-[0_0_0_4px_oklch(from_var(--primary)_l_c_h_/_0.2)]"
      )}
      style={{ backgroundColor: dotBg }}
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
          style={{ color: icon }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : null}
    </div>
  );
}

function VerticalTimelineItem({
  item,
  isLast,
  lineStyle,
  index,
}: {
  item: TimelineItem;
  isLast: boolean;
  lineStyle: "solid" | "dashed";
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative pb-8 pl-8 last:pb-0"
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
          {item.date && (
            <span className="text-xs text-[var(--text-tertiary)]">
              {item.date}
            </span>
          )}
        </div>
        {item.description && (
          <p className="mb-2 text-sm text-[var(--text-secondary)]">
            {item.description}
          </p>
        )}
        {item.content && <div className="card mt-3 p-4">{item.content}</div>}
      </div>
    </motion.div>
  );
}

function HorizontalTimelineItem({
  item,
  isLast,
  lineStyle,
  index,
}: {
  item: TimelineItem;
  isLast: boolean;
  lineStyle: "solid" | "dashed";
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative flex flex-col items-center"
      style={{ minWidth: 160 }}
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
        {item.date && (
          <span className="mb-1 block text-xs text-[var(--text-tertiary)]">
            {item.date}
          </span>
        )}
        {item.description && (
          <p className="text-xs text-[var(--text-secondary)]">
            {item.description}
          </p>
        )}
      </div>
    </motion.div>
  );
}
