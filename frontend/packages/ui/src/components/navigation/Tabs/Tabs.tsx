import { motion } from "framer-motion";
import React, {
  useState,
  createContext,
  useContext,
  type ReactNode,
} from "react";

import { cn } from "../../../utils/cn";

// Context for compound component pattern
interface TabsContextValue {
  activeKey: string;
  onTabChange: (key: string) => void;
  variant: "default" | "pills" | "underline";
  size: "sm" | "md" | "lg";
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(
      "Tabs compound components must be used within a Tabs component"
    );
  }
  return context;
}

// ============ Types ============

interface TabItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  content: ReactNode;
}

interface TabsBaseProps {
  variant?: "default" | "pills" | "underline";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
}

// Items-based props
interface TabsItemsProps extends TabsBaseProps {
  items: TabItem[];
  defaultActiveKey?: string;
  activeKey?: string;
  onChange?: (key: string) => void;
  children?: never;
}

// Compound component props
interface TabsCompoundProps extends TabsBaseProps {
  children: ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  items?: never;
}

type TabsProps = TabsItemsProps | TabsCompoundProps;

// ============ Size Classes ============

const sizeClasses = {
  sm: "text-sm px-3 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-base px-5 py-2.5",
};

// ============ Scrollable Tab List Wrapper ============
// Wraps the tab list with horizontal scroll on mobile,
// hiding the scrollbar visually across all browsers.

interface ScrollableTabListProps {
  children: ReactNode;
  className?: string;
}

const ScrollableTabList = ({ children, className }: ScrollableTabListProps) => {
  return (
    <div
      className={cn(
        // Allow horizontal scrolling when tabs overflow
        "overflow-x-auto",
        // Hide scrollbar - Webkit (Chrome, Safari)
        "[&::-webkit-scrollbar]:hidden",
        // Hide scrollbar - Firefox
        "scrollbar-none",
        // Prevent layout shift from scrollbar appearing
        "-mb-px",
        className
      )}
      // Hide scrollbar - IE/Edge legacy
      style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
    >
      {children}
    </div>
  );
}

// ============ Main Tabs Component ============

export const Tabs = (props: TabsProps) => {
  const {
    variant = "default",
    size = "md",
    fullWidth = false,
    className,
  } = props;

  const isItemsPattern = "items" in props && props.items !== undefined;

  if (isItemsPattern) {
    return (
      <TabsWithItems
        {...(props)}
        className={className}
        fullWidth={fullWidth}
        size={size}
        variant={variant}
      />
    );
  }

  return (
    <TabsCompound
      {...(props)}
      className={className}
      fullWidth={fullWidth}
      size={size}
      variant={variant}
    />
  );
}

// ============ Items Pattern Component ============

const TabsWithItems = ({
  items,
  defaultActiveKey,
  activeKey: controlledActiveKey,
  onChange,
  variant = "default",
  size = "md",
  fullWidth = false,
  className,
}: TabsItemsProps) => {
  const [internalActiveKey, setInternalActiveKey] = useState(
    defaultActiveKey || items[0]?.key
  );

  const activeKey = controlledActiveKey ?? internalActiveKey;

  const handleTabClick = (key: string) => {
    if (!controlledActiveKey) {
      setInternalActiveKey(key);
    }
    onChange?.(key);
  };

  const activeTab = items.find((item) => item.key === activeKey);

  return (
    <div className={cn("w-full", className)}>
      {/*
        ScrollableTabList handles overflow on mobile.
        When fullWidth is set we skip scrolling since tabs
        expand to fill the container anyway.
      */}
      <ScrollableTabList className={fullWidth ? "overflow-x-visible" : ""}>
        <div
          className={cn(
            "flex",
            // When fullWidth, expand to container; otherwise keep natural width
            // so the scrollable wrapper can detect overflow correctly.
            fullWidth ? "w-full" : "w-max min-w-full",
            variant === "default" && [
              "border border-[var(--border-primary)] bg-[var(--surface)]",
              "gap-1 rounded-[var(--radius-lg)] p-1 backdrop-blur-sm",
              "shadow-[var(--shadow-xs)]",
            ],
            variant === "pills" && "gap-2",
            variant === "underline" &&
              "gap-2 border-b border-[var(--border-primary)]"
          )}
        >
          {items.map((item) => {
            const isActive = item.key === activeKey;

            return (
              <TabButton
                key={item.key}
                disabled={item.disabled}
                fullWidth={fullWidth}
                icon={item.icon}
                isActive={isActive}
                layoutIdSuffix="items"
                size={size}
                variant={variant}
                onClick={() => !item.disabled && handleTabClick(item.key)}
              >
                {item.label}
              </TabButton>
            );
          })}
        </div>
      </ScrollableTabList>

      <div className="mt-4">
        <motion.div
          key={activeKey}
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab?.content}
        </motion.div>
      </div>
    </div>
  );
}

// ============ Shared Tab Button ============

interface TabButtonProps {
  isActive: boolean;
  disabled?: boolean;
  variant: "default" | "pills" | "underline";
  size: "sm" | "md" | "lg";
  fullWidth?: boolean;
  layoutIdSuffix: string;
  onClick: () => void;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const TabButton = ({
  isActive,
  disabled = false,
  variant,
  size,
  fullWidth = false,
  layoutIdSuffix,
  onClick,
  icon,
  children,
  className,
}: TabButtonProps) => {
  return (
    <button
      disabled={disabled}
      className={cn(
        "relative flex cursor-pointer items-center justify-center gap-2 font-medium",
        "transition-all duration-[var(--transition-normal)]",
        "focus:outline-none focus-visible:ring-2",
        "focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
        "focus-visible:ring-offset-[var(--ring-offset)]",
        // Prevent tabs from shrinking below their natural size when scrolling
        "shrink-0 whitespace-nowrap",
        fullWidth && "flex-1",
        sizeClasses[size],
        disabled && "cursor-not-allowed",
        variant === "default" && [
          "rounded-[var(--radius-md)]",
          isActive
            ? "text-[var(--text-primary)]"
            : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
        ],
        variant === "pills" && [
          "rounded-[var(--radius-full)]",
          isActive
            ? [
                "bg-[var(--info-bg)] text-[var(--primary)]",
                "border border-[var(--info-border)]",
              ]
            : [
                "text-[var(--text-tertiary)]",
                "hover:text-[var(--text-primary)]",
                "hover:bg-[var(--surface-hover)]",
              ],
        ],
        variant === "underline" && [
          "pb-3",
          isActive
            ? "text-[var(--text-primary)]"
            : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
        ],
        className
      )}
      onClick={onClick}
    >
      {icon}
      {children}

      {isActive && variant === "default" ? <motion.div
          className="absolute inset-0 rounded-[var(--radius-md)] bg-[var(--surface-active)]"
          layoutId={`activeTab-${layoutIdSuffix}`}
          style={{ zIndex: -1 }}
          transition={{ type: "spring", duration: 0.3 }}
        /> : null}

      {isActive && variant === "underline" ? <motion.div
          className="absolute right-0 bottom-0 left-0 h-0.5 bg-[var(--primary)]"
          layoutId={`activeTabUnderline-${layoutIdSuffix}`}
          transition={{ type: "spring", duration: 0.3 }}
        /> : null}
    </button>
  );
}

// ============ Compound Pattern Component ============

const TabsCompound = ({
  children,
  defaultValue,
  value: controlledValue,
  onValueChange,
  variant = "default",
  size = "md",
  className,
}: TabsCompoundProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue || "");

  const activeKey = controlledValue ?? internalValue;

  const handleTabChange = (key: string) => {
    if (controlledValue === undefined) {
      setInternalValue(key);
    }
    onValueChange?.(key);
  };

  return (
    <TabsContext.Provider
      value={{ activeKey, onTabChange: handleTabChange, variant, size }}
    >
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

// ============ TabsList Component ============

interface TabsListProps {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export const TabsList = ({
  children,
  className,
  fullWidth = false,
}: TabsListProps) => {
  const { variant } = useTabsContext();

  return (
    // ScrollableTabList provides the overflow scroll container
    <ScrollableTabList className={fullWidth ? "overflow-x-visible" : ""}>
      <div
        className={cn(
          "flex",
          fullWidth ? "w-full" : "w-max min-w-full",
          variant === "default" && [
            "border border-[var(--border-primary)] bg-[var(--surface)]",
            "gap-1 rounded-[var(--radius-lg)] p-1 backdrop-blur-sm",
            "shadow-[var(--shadow-xs)]",
          ],
          variant === "pills" && "gap-2",
          variant === "underline" &&
            "gap-2 border-b border-[var(--border-primary)]",
          className
        )}
      >
        {children}
      </div>
    </ScrollableTabList>
  );
}

// ============ TabsTrigger Component ============

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export const TabsTrigger = ({
  value,
  children,
  icon,
  disabled = false,
  className,
}: TabsTriggerProps) => {
  const { activeKey, onTabChange, variant, size } = useTabsContext();
  const isActive = value === activeKey;

  return (
    <TabButton
      className={className}
      disabled={disabled}
      icon={icon}
      isActive={isActive}
      layoutIdSuffix="compound"
      size={size}
      variant={variant}
      onClick={() => !disabled && onTabChange(value)}
    >
      {children}
    </TabButton>
  );
}

// ============ TabsContent Component ============

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
  forceMount?: boolean;
}

export const TabsContent = ({
  value,
  children,
  className,
  forceMount = false,
}: TabsContentProps) => {
  const { activeKey } = useTabsContext();
  const isActive = value === activeKey;

  if (!isActive && !forceMount) {
    return null;
  }

  return (
    <motion.div
      animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 10 }}
      className={cn("mt-4", !isActive && "hidden", className)}
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
