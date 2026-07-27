import React, { type ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../utils/cn";

/**
 * Represents a single navigation link or folder in the sidebar.
 */
interface SidebarItem {
  /** Unique identifier for the item. Used for React keys. */
  key: string;

  /** The text to display for the item. */
  label: string;

  /**
   * Icon displayed to the left of the label.
   * @example <HomeIcon />
   */
  icon?: ReactNode;

  /**
   * URL to navigate to.
   * If provided, the item renders as an anchor tag.
   */
  href?: string;

  /**
   * Whether this item is currently selected.
   * Changes the styling to highlight the item.
   */
  active?: boolean;

  /**
   * A small badge displayed to the right of the label (e.g., notification count).
   * Only visible when the sidebar is expanded.
   */
  badge?: string | number;

  /**
   * Badge variant for different visual styles
   * @default 'default'
   */
  badgeVariant?: "default" | "success" | "warning" | "error";

  /**
   * Nested items. If present, this item acts as a collapsible folder.
   */
  children?: SidebarItem[];

  /**
   * Callback fired when the item is clicked.
   */
  onClick?: () => void;

  /**
   * Whether the item is disabled
   * @default false
   */
  disabled?: boolean;
}

interface SidebarProps {
  /**
   * The array of navigation items to render.
   * Supports nested structures via the `children` property.
   */
  items: SidebarItem[];

  /**
   * Content rendered at the very top of the sidebar (e.g., Logo, Brand Name).
   */
  header?: ReactNode;

  /**
   * Content rendered at the very bottom of the sidebar (e.g., User Profile, Logout).
   */
  footer?: ReactNode;

  /**
   * Controls the width of the sidebar.
   * - `true`: Width shrinks to 72px, labels hide, badges hide.
   * - `false`: Width expands to 260px.
   * @default false
   */
  collapsed?: boolean;

  /**
   * Callback fired when the toggle button is clicked.
   * If provided, a toggle button will appear on the right edge.
   */
  onCollapse?: (collapsed: boolean) => void;

  /**
   * Width of the sidebar when expanded
   * @default 260
   */
  expandedWidth?: number;

  /**
   * Width of the sidebar when collapsed
   * @default 72
   */
  collapsedWidth?: number;

  /** Additional CSS classes for the sidebar container. */
  className?: string;
}

/**
 * Badge variant styles
 */
const badgeVariants = {
  default: "bg-[var(--primary)]/15 text-[var(--primary)]",
  success: "bg-[var(--success-bg)] text-[var(--success-text)]",
  warning: "bg-[var(--warning-bg)] text-[var(--warning-text)]",
  error: "bg-[var(--error-bg)] text-[var(--error-text)]",
};

/**
 * Individual sidebar item component
 */
function SidebarItemComponent({
  item,
  collapsed,
  depth = 0,
}: {
  item: SidebarItem;
  collapsed: boolean;
  depth?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isDisabled = item.disabled;

  const handleClick = (e: React.MouseEvent) => {
    if (isDisabled) {
      e.preventDefault();
      return;
    }

    if (hasChildren) {
      e.preventDefault();
      setIsOpen(!isOpen);
    }

    item.onClick?.();
  };

  const Component = item.href && !hasChildren ? "a" : "button";

  return (
    <div>
      <Component
        href={item.href}
        onClick={handleClick}
        disabled={isDisabled}
        aria-expanded={hasChildren ? isOpen : undefined}
        aria-current={item.active ? "page" : undefined}
        className={cn(
          // Base styles
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5",
          "text-left text-sm font-medium",
          "transition-all duration-[var(--transition-fast)]",
          // Focus state
          "focus-visible:ring-2 focus-visible:outline-none",
          "focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1",
          "focus-visible:ring-offset-[var(--ring-offset)]",
          // Hover state (non-active)
          !item.active && !isDisabled && "hover:bg-[var(--surface-hover)]",
          // Active state
          item.active && [
            "bg-[var(--primary)]/10",
            "text-[var(--primary)]",
            "border border-[var(--primary)]/20",
          ],
          // Non-active text
          !item.active &&
            "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          // Disabled state
          isDisabled && "cursor-not-allowed opacity-50",
          // Nested item indentation
          depth > 0 && "ml-4"
        )}
      >
        {/* Icon */}
        {item.icon && (
          <span
            className={cn(
              "flex h-5 w-5 flex-shrink-0 items-center justify-center",
              item.active
                ? "text-[var(--primary)]"
                : "text-[var(--text-tertiary)]"
            )}
          >
            {item.icon}
          </span>
        )}

        {/* Label - animated visibility */}
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 truncate"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Badge */}
        {!collapsed && item.badge !== undefined && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              badgeVariants[item.badgeVariant || "default"]
            )}
          >
            {item.badge}
          </span>
        )}

        {/* Expand/Collapse chevron for folders */}
        {!collapsed && hasChildren && (
          <motion.svg
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="h-4 w-4 text-[var(--text-tertiary)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </motion.svg>
        )}
      </Component>

      {/* Nested children */}
      <AnimatePresence>
        {hasChildren && isOpen && !collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-1 space-y-1 overflow-hidden"
          >
            {item.children!.map((child) => (
              <SidebarItemComponent
                key={child.key}
                item={child}
                collapsed={collapsed}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Sidebar Component
 *
 * A collapsible sidebar navigation component with support for nested items,
 * badges, and smooth animations. Automatically adapts to light/dark mode.
 *
 * @example
 * // Basic usage
 * <Sidebar
 *   items={[
 *     { key: 'home', label: 'Home', icon: <HomeIcon />, href: '/', active: true },
 *     { key: 'settings', label: 'Settings', icon: <SettingsIcon />, href: '/settings' },
 *   ]}
 * />
 *
 * @example
 * // With header and footer
 * <Sidebar
 *   header={<Logo />}
 *   footer={<UserProfile />}
 *   items={navItems}
 * />
 *
 * @example
 * // Collapsible sidebar
 * const [collapsed, setCollapsed] = useState(false);
 * <Sidebar
 *   items={navItems}
 *   collapsed={collapsed}
 *   onCollapse={setCollapsed}
 * />
 *
 * @example
 * // Nested navigation
 * <Sidebar
 *   items={[
 *     {
 *       key: 'products',
 *       label: 'Products',
 *       icon: <BoxIcon />,
 *       children: [
 *         { key: 'all', label: 'All Products', href: '/products' },
 *         { key: 'new', label: 'Add New', href: '/products/new' },
 *       ],
 *     },
 *   ]}
 * />
 */
export function Sidebar({
  items,
  header,
  footer,
  collapsed = false,
  onCollapse,
  expandedWidth = 260,
  collapsedWidth = 72,
  className,
}: SidebarProps) {
  return (
    <motion.aside
      animate={{ width: collapsed ? collapsedWidth : expandedWidth }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className={cn(
        // Base styles
        "relative flex h-screen flex-col",
        // Background and border
        "bg-[var(--bg-secondary)]",
        "border-r border-[var(--border-primary)]",
        // Prevent content overflow during animation
        "overflow-hidden",
        className
      )}
      aria-label="Sidebar navigation"
    >
      {/* Header */}
      {header && (
        <div
          className={cn(
            "flex-shrink-0 border-b border-[var(--border-primary)] p-4",
            collapsed && "flex items-center justify-center"
          )}
        >
          {header}
        </div>
      )}

      {/* Navigation */}
      <nav
        className={cn(
          "flex-1 space-y-1 overflow-x-hidden overflow-y-auto p-3",
          // Custom scrollbar styling (from your theme)
          "[&::-webkit-scrollbar]:w-2",
          "[&::-webkit-scrollbar-track]:bg-transparent",
          "[&::-webkit-scrollbar-thumb]:bg-[var(--scrollbar-thumb)]",
          "[&::-webkit-scrollbar-thumb]:rounded-full",
          "[&::-webkit-scrollbar-thumb:hover]:bg-[var(--scrollbar-thumb-hover)]"
        )}
        aria-label="Main navigation"
      >
        {items.map((item) => (
          <SidebarItemComponent
            key={item.key}
            item={item}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Footer */}
      {footer && (
        <div
          className={cn(
            "flex-shrink-0 border-t border-[var(--border-primary)] p-4",
            collapsed && "flex items-center justify-center"
          )}
        >
          {footer}
        </div>
      )}

      {/* Collapse Toggle Button */}
      {onCollapse && (
        <button
          onClick={() => onCollapse(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className={cn(
            // Position
            "absolute top-1/2 right-0 z-10",
            "translate-x-1/2 -translate-y-1/2",
            // Size and shape
            "flex h-6 w-6 items-center justify-center rounded-full",
            // Colors
            "bg-[var(--bg-elevated)] text-[var(--text-tertiary)]",
            "border border-[var(--border-primary)]",
            "shadow-[var(--shadow-sm)]",
            // Transitions
            "transition-all duration-[var(--transition-fast)]",
            // Hover state
            "hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
            "hover:shadow-[var(--shadow-md)]",
            // Focus state
            "focus-visible:ring-2 focus-visible:outline-none",
            "focus-visible:ring-[var(--ring)]"
          )}
        >
          <motion.svg
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </motion.svg>
        </button>
      )}
    </motion.aside>
  );
}
