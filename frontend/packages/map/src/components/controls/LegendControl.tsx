import React, { useState, useMemo } from "react";
import { useMap } from "../../hooks/useMap";
import { useDraggablePosition, cn } from "@packages/ui";
import {
  ChevronDown,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Square,
  MapPin,
  Palette,
} from "lucide-react";

export interface LegendItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Legend type */
  type:
    | "fill"
    | "line"
    | "circle"
    | "symbol"
    | "gradient"
    | "category"
    | "proportional";
  /** Color(s) */
  color?: string | string[];
  /** Size (for circles/symbols) */
  size?: number | number[];
  /** Icon URL (for symbols) */
  icon?: string;
  /** Stroke/border color */
  strokeColor?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Opacity */
  opacity?: number;
  /** For gradient: min/max values */
  range?: [number, number];
  /** For gradient: color stops */
  colorStops?: { value: number; color: string; label?: string }[];
  /** For category: items */
  categories?: { value: any; color: string; label: string; count?: number }[];
  /** For proportional: size range */
  sizeRange?: [number, number];
  /** Associated layer ID */
  layerId?: string;
  /** Nested items */
  children?: LegendItem[];
  /** Unit for values */
  unit?: string;
}

export interface LegendControlProps {
  /** Legend items */
  items: LegendItem[];
  /** Position on map */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Title */
  title?: string;
  /** Collapsible */
  collapsible?: boolean;
  /** Initially collapsed */
  defaultCollapsed?: boolean;
  /** Show layer visibility toggles */
  showVisibilityToggle?: boolean;
  /** Callback on visibility change */
  onVisibilityChange?: (itemId: string, visible: boolean) => void;
  /** Max height */
  maxHeight?: number;
  /** Custom className */
  className?: string;
  /** Orientation */
  orientation?: "vertical" | "horizontal";
  /** Background style */
  background?: "solid" | "transparent" | "blur";
  /** Make legend draggable */
  isDraggable?: boolean;
  /** Initial position when draggable */
  initialPosition?: { x: number; y: number };
  /** Default expanded items */
  defaultExpandedItems?: string[];
}

export const LegendControl: React.FC<LegendControlProps> = ({
  items,
  position = "bottom-right",
  title = "Legend",
  collapsible = true,
  defaultCollapsed = false,
  showVisibilityToggle = true,
  onVisibilityChange,
  maxHeight = 400,
  className,
  orientation = "vertical",
  background = "blur",
  isDraggable = false,
  initialPosition,
  defaultExpandedItems,
}) => {
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const { map, isLoaded } = useMap();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Auto-collapse on mobile initially
  React.useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set(defaultExpandedItems ?? items.map((i) => i.id))
  );
  const [visibility, setVisibility] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((item) => [item.id, true]))
  );

  const defaultInitialPosition = useMemo(() => {
    if (initialPosition) return initialPosition;
    switch (position) {
      case "top-left":
        return { x: 12, y: 12 };
      case "top-right":
        return { x: 12, y: 12 };
      case "bottom-left":
        return { x: 12, y: 12 };
      case "bottom-right":
        return { x: 12, y: 12 };
      default:
        return { x: 12, y: 12 };
    }
  }, [initialPosition, position]);

  const {
    position: dragPosition,
    isDragging,
    dragRef,
    handleMouseDown,
    handleTouchStart,
    setPercentPosition,
  } = useDraggablePosition({
    initialPosition: defaultInitialPosition,
    bounds: "parent",
  });

  React.useEffect(() => {
    if (isCollapsed && isDraggable) {
      setPercentPosition(0, 100);
    }
  }, [isCollapsed, isDraggable, setPercentPosition]);

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleVisibilityChange = (itemId: string, visible: boolean) => {
    setVisibility((prev) => ({ ...prev, [itemId]: visible }));

    const item = items.find((i) => i.id === itemId);
    if (map && isLoaded && item?.layerId) {
      if (map.getLayer(item.layerId)) {
        map.setLayoutProperty(
          item.layerId,
          "visibility",
          visible ? "visible" : "none"
        );
      }
    }

    onVisibilityChange?.(itemId, visible);
  };

  const positionClasses: Record<string, string> = {
    "top-left": "top-3 left-3",
    "top-right": "top-3 right-3",
    "bottom-left": "bottom-6 left-3",
    "bottom-right": "bottom-6 right-3",
  };

  const backgroundClasses: Record<string, string> = {
    solid: "bg-[var(--surface)]",
    transparent: "bg-[var(--surface)]",
    blur: "bg-[var(--surface)] backdrop-blur-lg",
  };

  if (isMobile && isCollapsed) {
    return (
      <div
        ref={isDraggable ? dragRef : undefined}
        className={cn(
          "absolute z-50",
          !isDraggable && positionClasses[position],
          className
        )}
        style={{
          ...(isDraggable ? { left: dragPosition.x, top: dragPosition.y } : {}),
        }}
      >
        <button
          onClick={() => setIsCollapsed(false)}
          className="mb-6 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-primary)]/80 bg-[var(--surface)]/90 text-[var(--text-secondary)] shadow-lg backdrop-blur-md transition-all hover:bg-[var(--surface-hover)] active:scale-95"
          aria-label="Open Legend"
          style={{ marginLeft: "10px" }}
        >
          <Palette className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={isDraggable ? dragRef : undefined}
      className={cn(
        "absolute z-50",
        "rounded-xl",
        backgroundClasses[background],
        "border border-[var(--border-primary)]",
        "shadow-[var(--shadow-lg)]",
        "overflow-hidden",
        "max-w-[320px] min-w-[220px]",
        !isDraggable && positionClasses[position],
        isDragging && "shadow-primary cursor-grabbing opacity-90",
        className
      )}
      style={{
        ...(isDraggable ? { left: dragPosition.x, top: dragPosition.y } : {}),
        userSelect: isDraggable ? "none" : undefined,
      }}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-2",
          "px-3 py-2.5",
          "border-b border-[var(--border-secondary)]",
          isDraggable && "cursor-grab",
          isDragging && "cursor-grabbing"
        )}
        onMouseDown={isDraggable ? handleMouseDown : undefined}
        onTouchStart={isDraggable ? handleTouchStart : undefined}
      >
        {isDraggable && (
          <GripVertical className="h-4 w-4 flex-shrink-0 text-[var(--text-tertiary)]" />
        )}

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Layers className="h-4 w-4 flex-shrink-0 text-[var(--primary)]" />
          <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </span>
        </div>

        {collapsible && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md",
              "text-[var(--text-tertiary)]",
              "hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]",
              "transition-colors duration-[var(--transition-fast)]"
            )}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-[var(--transition-fast)]",
                isCollapsed && "-rotate-90"
              )}
            />
          </button>
        )}
      </div>

      {/* Body */}
      <div
        className={cn(
          "transition-all duration-[var(--transition-slow)] ease-out",
          isCollapsed ? "max-h-0 overflow-hidden opacity-0" : "opacity-100"
        )}
        style={{ maxHeight: isCollapsed ? 0 : maxHeight }}
      >
        <div
          className={cn(
            "space-y-1 overflow-y-auto p-2",
            orientation === "horizontal" && "flex flex-wrap gap-2 space-y-0"
          )}
          style={{ maxHeight: maxHeight - 50 }}
        >
          {items.map((item) => (
            <LegendItemCard
              key={item.id}
              item={item}
              isExpanded={expandedItems.has(item.id)}
              onToggleExpand={() => toggleExpanded(item.id)}
              showVisibilityToggle={showVisibilityToggle}
              isVisible={visibility[item.id] ?? true}
              onVisibilityChange={(visible) =>
                handleVisibilityChange(item.id, visible)
              }
              expandedItems={expandedItems}
              onToggleChildExpand={toggleExpanded}
              visibility={visibility}
              onChildVisibilityChange={handleVisibilityChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Legend Item Card ─────────────────────────────────────────────────
interface LegendItemCardProps {
  item: LegendItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showVisibilityToggle: boolean;
  isVisible: boolean;
  onVisibilityChange: (visible: boolean) => void;
  depth?: number;
  expandedItems: Set<string>;
  onToggleChildExpand: (id: string) => void;
  visibility: Record<string, boolean>;
  onChildVisibilityChange: (id: string, visible: boolean) => void;
}

const LegendItemCard: React.FC<LegendItemCardProps> = ({
  item,
  isExpanded,
  onToggleExpand,
  showVisibilityToggle,
  isVisible,
  onVisibilityChange,
  depth = 0,
  expandedItems,
  onToggleChildExpand,
  visibility,
  onChildVisibilityChange,
}) => {
  const hasExpandableContent =
    item.type === "gradient" ||
    item.type === "category" ||
    item.type === "proportional" ||
    (item.children && item.children.length > 0);

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)]",
        "bg-[var(--surface-hover)]/50",
        "transition-all duration-[var(--transition-fast)]",
        !isVisible && "opacity-50",
        depth > 0 && "ml-4"
      )}
    >
      {/* Item Header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        {/* Expand/Collapse Button */}
        {hasExpandableContent ? (
          <button
            onClick={onToggleExpand}
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded",
              "text-[var(--text-tertiary)]",
              "hover:bg-[var(--surface-active)] hover:text-[var(--text-secondary)]",
              "transition-all duration-[var(--transition-fast)]"
            )}
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-[var(--transition-fast)]",
                !isExpanded && "-rotate-90"
              )}
            />
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Symbol */}
        <LegendSymbol item={item} />

        {/* Label */}
        <span className="flex-1 truncate text-xs font-medium text-[var(--text-primary)]">
          {item.label}
        </span>

        {/* Visibility Toggle */}
        {showVisibilityToggle && (
          <button
            onClick={() => onVisibilityChange(!isVisible)}
            title={isVisible ? "Hide layer" : "Show layer"}
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded",
              "text-[var(--text-tertiary)]",
              "hover:bg-[var(--surface-active)] hover:text-[var(--text-secondary)]",
              "transition-colors duration-[var(--transition-fast)]"
            )}
          >
            {isVisible ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Expanded Content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-[var(--transition-fast)]",
          isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-2 pb-2">
          {/* Gradient */}
          {item.type === "gradient" && item.colorStops && (
            <GradientLegend
              colorStops={item.colorStops}
              range={item.range}
              unit={item.unit}
            />
          )}

          {/* Category */}
          {item.type === "category" && item.categories && (
            <CategoryLegend categories={item.categories} />
          )}

          {/* Proportional */}
          {item.type === "proportional" && item.sizeRange && (
            <ProportionalLegend
              sizeRange={item.sizeRange}
              range={item.range}
              color={item.color as string}
              unit={item.unit}
            />
          )}

          {/* Nested Children */}
          {item.children && item.children.length > 0 && (
            <div className="mt-1 space-y-1">
              {item.children.map((child) => (
                <LegendItemCard
                  key={child.id}
                  item={child}
                  isExpanded={expandedItems.has(child.id)}
                  onToggleExpand={() => onToggleChildExpand(child.id)}
                  showVisibilityToggle={showVisibilityToggle}
                  isVisible={visibility[child.id] ?? true}
                  onVisibilityChange={(visible) =>
                    onChildVisibilityChange(child.id, visible)
                  }
                  depth={depth + 1}
                  expandedItems={expandedItems}
                  onToggleChildExpand={onToggleChildExpand}
                  visibility={visibility}
                  onChildVisibilityChange={onChildVisibilityChange}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Legend Symbol ────────────────────────────────────────────────────
const LegendSymbol: React.FC<{ item: LegendItem }> = ({ item }) => {
  const baseClass = "flex-shrink-0";

  switch (item.type) {
    case "fill":
      return (
        <div
          className={cn(
            baseClass,
            "h-3 w-4 rounded-sm border border-black/10 dark:border-white/10"
          )}
          style={{
            backgroundColor: item.color as string,
            opacity: item.opacity ?? 1,
          }}
        />
      );

    case "line":
      return (
        <div className={cn(baseClass, "flex w-5 items-center justify-center")}>
          <div
            className="w-full rounded-full"
            style={{
              height: Math.max(2, item.strokeWidth || 3),
              backgroundColor: item.color as string,
              opacity: item.opacity ?? 1,
            }}
          />
        </div>
      );

    case "circle":
      const circleSize = Math.min((item.size as number) || 12, 16);
      return (
        <div
          className={cn(
            baseClass,
            "rounded-full border border-black/10 dark:border-white/10"
          )}
          style={{
            width: circleSize,
            height: circleSize,
            backgroundColor: item.color as string,
            opacity: item.opacity ?? 1,
          }}
        />
      );

    case "symbol":
      if (item.icon) {
        return (
          <img
            src={item.icon}
            alt={item.label}
            className={cn(baseClass, "h-4 w-4 object-contain")}
          />
        );
      }
      return (
        <MapPin
          className={cn(baseClass, "h-4 w-4")}
          style={{ color: item.color as string }}
        />
      );

    case "gradient":
      return (
        <div
          className={cn(baseClass, "h-3 w-4 rounded-sm")}
          style={{
            background: item.colorStops
              ? `linear-gradient(to right, ${item.colorStops.map((s) => s.color).join(", ")})`
              : (item.color as string),
          }}
        />
      );

    case "category":
      return (
        <div className={cn(baseClass, "flex gap-0.5")}>
          {(item.categories?.slice(0, 3) || []).map((cat, i) => (
            <div
              key={i}
              className="h-3 w-1.5 rounded-sm first:rounded-l last:rounded-r"
              style={{ backgroundColor: cat.color }}
            />
          ))}
        </div>
      );

    case "proportional":
      return (
        <div className={cn(baseClass, "flex items-end gap-0.5")}>
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: item.color as string }}
          />
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color as string }}
          />
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color as string }}
          />
        </div>
      );

    default:
      return (
        <Square
          className={cn(baseClass, "h-4 w-4 text-[var(--text-tertiary)]")}
        />
      );
  }
};

// ─── Gradient Legend ──────────────────────────────────────────────────
const GradientLegend: React.FC<{
  colorStops: { value: number; color: string; label?: string }[];
  range?: [number, number];
  unit?: string;
}> = ({ colorStops, range, unit }) => {
  const gradientStyle = `linear-gradient(to right, ${colorStops.map((s) => s.color).join(", ")})`;

  return (
    <div className="ml-5 space-y-1.5">
      {/* Gradient bar */}
      <div
        className="h-2.5 w-full rounded-md shadow-inner"
        style={{ background: gradientStyle }}
      />

      {/* Labels */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-[var(--text-tertiary)] tabular-nums">
          {colorStops[0].label ?? range?.[0] ?? colorStops[0].value}
        </span>
        {unit && (
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {unit}
          </span>
        )}
        <span className="text-[10px] font-medium text-[var(--text-tertiary)] tabular-nums">
          {colorStops[colorStops.length - 1].label ??
            range?.[1] ??
            colorStops[colorStops.length - 1].value}
        </span>
      </div>

      {/* Optional: Color stops with labels */}
      {colorStops.length > 2 && colorStops.some((s) => s.label) && (
        <div className="mt-1 flex justify-between">
          {colorStops.map((stop, i) => (
            <div
              key={i}
              className="flex flex-col items-center"
            >
              <div
                className="h-2 w-2 rounded-full border border-black/10 dark:border-white/10"
                style={{ backgroundColor: stop.color }}
              />
              {stop.label && (
                <span className="mt-0.5 text-[9px] text-[var(--text-tertiary)]">
                  {stop.label}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Category Legend ──────────────────────────────────────────────────
const CategoryLegend: React.FC<{
  categories: { value: any; color: string; label: string; count?: number }[];
}> = ({ categories }) => {
  return (
    <div className="ml-5 grid grid-cols-1 gap-0.5">
      {categories.map((cat, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded px-1 py-0.5 transition-colors hover:bg-[var(--surface-active)]"
        >
          <div
            className="h-3 w-3 flex-shrink-0 rounded-sm border border-black/10 dark:border-white/10"
            style={{ backgroundColor: cat.color }}
          />
          <span className="flex-1 truncate text-[11px] text-[var(--text-secondary)]">
            {cat.label}
          </span>
          {cat.count !== undefined && (
            <span className="rounded-full bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)] tabular-nums">
              {cat.count.toLocaleString()}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Proportional Legend ──────────────────────────────────────────────
const ProportionalLegend: React.FC<{
  sizeRange: [number, number];
  range?: [number, number];
  color: string;
  unit?: string;
}> = ({ sizeRange, range, color, unit }) => {
  const steps = 4;
  const sizes = Array.from(
    { length: steps },
    (_, i) => sizeRange[0] + (sizeRange[1] - sizeRange[0]) * (i / (steps - 1))
  );
  const values = range
    ? Array.from(
        { length: steps },
        (_, i) => range[0] + (range[1] - range[0]) * (i / (steps - 1))
      )
    : sizes;

  const formatValue = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return Math.round(val).toString();
  };

  return (
    <div className="ml-5">
      <div className="flex items-end justify-around gap-3 py-2">
        {sizes.map((size, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1"
          >
            <div
              className="rounded-full border border-black/10 dark:border-white/10"
              style={{
                width: Math.max(6, size),
                height: Math.max(6, size),
                backgroundColor: color,
                opacity: 0.8,
              }}
            />
            <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">
              {formatValue(values[i])}
            </span>
          </div>
        ))}
      </div>
      {unit && (
        <div className="text-center">
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {unit}
          </span>
        </div>
      )}
    </div>
  );
};

export default LegendControl;
