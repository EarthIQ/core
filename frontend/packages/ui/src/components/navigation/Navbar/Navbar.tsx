import React, { type ReactNode, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../utils/cn";
import { IconButton } from "../../primitives/Button/IconButton";

/**
 * Definition for a single navigation link within the Navbar.
 */
interface NavItem {
  /** Unique identifier for the item. Used for React keys. */
  key: string;

  /** The text to display. */
  label: string;

  /** The URL to navigate to. */
  href?: string;

  /**
   * Optional icon to display before the label.
   * @example <HomeIcon className="w-4 h-4" />
   */
  icon?: ReactNode;

  /**
   * Whether this item is currently active/selected.
   * Active items receive a highlighted background and text color.
   */
  active?: boolean;

  /** Callback fired when the item is clicked. */
  onClick?: () => void;

  /**
   * Whether the item is disabled
   * @default false
   */
  disabled?: boolean;
}

interface NavbarProps {
  /**
   * The branding element displayed on the far left.
   * Usually an SVG logo or a text element.
   */
  logo?: ReactNode;

  /**
   * Array of navigation links to display in the center (desktop)
   * or inside the menu (mobile).
   */
  items?: NavItem[];

  /**
   * Content to display on the far right (e.g., User Avatar, CTA buttons).
   * On mobile, this moves inside the dropdown menu at the bottom.
   */
  rightContent?: ReactNode;

  /**
   * Whether the navbar should stick to the top of the viewport when scrolling.
   * @default true
   */
  sticky?: boolean;

  /**
   * If `true`, the background becomes transparent (useful for overlaying on Hero images).
   * When scrolled, it will still show a background for readability.
   * @default false
   */
  transparent?: boolean;

  /**
   * Whether to show a shadow when scrolled (only when sticky is true)
   * @default true
   */
  showShadowOnScroll?: boolean;

  /**
   * Height of the navbar
   * @default 'md'
   */
  height?: "sm" | "md" | "lg";

  /**
   * Maximum width of the navbar content
   * @default '7xl'
   */
  maxWidth?: "full" | "7xl" | "6xl" | "5xl";

  /** Additional CSS classes for the navbar container. */
  className?: string;
}

/**
 * Height configuration
 */
const heightConfig = {
  sm: "h-14",
  md: "h-16",
  lg: "h-20",
};

/**
 * Max width configuration
 */
const maxWidthConfig = {
  full: "max-w-full",
  "7xl": "max-w-7xl",
  "6xl": "max-w-6xl",
  "5xl": "max-w-5xl",
};

/**
 * Navbar Component
 *
 * A responsive top navigation bar with support for sticky positioning,
 * transparent mode, and mobile menu. Automatically adapts to light/dark mode.
 *
 * @example
 * // Basic navbar
 * <Navbar
 *   logo={<span className="font-bold text-xl">MyBrand</span>}
 *   items={[
 *     { key: 'home', label: 'Home', href: '/', active: true },
 *     { key: 'about', label: 'About', href: '/about' },
 *   ]}
 *   rightContent={<Button>Login</Button>}
 * />
 *
 * @example
 * // Transparent navbar for hero sections
 * <Navbar
 *   transparent
 *   logo={<Logo />}
 *   items={navItems}
 * />
 *
 * @example
 * // With icons in nav items
 * <Navbar
 *   items={[
 *     { key: 'home', label: 'Home', icon: <HomeIcon />, href: '/' },
 *     { key: 'settings', label: 'Settings', icon: <SettingsIcon />, href: '/settings' },
 *   ]}
 * />
 */
export function Navbar({
  logo,
  items = [],
  rightContent,
  sticky = true,
  transparent = false,
  showShadowOnScroll = true,
  height = "md",
  maxWidth = "7xl",
  className,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Track scroll position for transparent navbar
  useEffect(() => {
    if (!transparent || !sticky) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial position

    return () => window.removeEventListener("scroll", handleScroll);
  }, [transparent, sticky]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };

    if (mobileMenuOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const showBackground = !transparent || isScrolled;

  return (
    <nav
      className={cn(
        // Base styles
        "z-[var(--z-sticky)] w-full",
        "transition-all duration-[var(--transition-normal)]",
        // Sticky positioning
        sticky && "sticky top-0",
        // Background styles
        showBackground && [
          "bg-[var(--bg-secondary)]",
          "border-b border-[var(--border-primary)]",
        ],
        // Shadow on scroll
        showBackground &&
          showShadowOnScroll &&
          isScrolled &&
          "shadow-[var(--shadow-sm)]",
        // Transparent mode
        transparent && !isScrolled && "border-transparent bg-transparent",
        className
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <div
        className={cn("mx-auto px-4 sm:px-6 lg:px-8", maxWidthConfig[maxWidth])}
      >
        <div
          className={cn(
            "flex items-center justify-between",
            heightConfig[height]
          )}
        >
          {/* Logo */}
          {logo && <div className="flex-shrink-0">{logo}</div>}

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            {items.map((item) => (
              <NavLink
                key={item.key}
                item={item}
              />
            ))}
          </div>

          {/* Right Content (Desktop) */}
          {rightContent && (
            <div className="hidden items-center gap-3 md:flex">
              {rightContent}
            </div>
          )}

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <IconButton
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={
                      mobileMenuOpen
                        ? "M6 18L18 6M6 6l12 12"
                        : "M4 6h16M4 12h16M4 18h16"
                    }
                  />
                </svg>
              }
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              variant="ghost"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              label={""}
            />
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-[var(--overlay)] md:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Menu Panel */}
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "absolute top-full right-0 left-0 z-[var(--z-modal)]",
                "border-b border-[var(--border-primary)]",
                "bg-[var(--bg-elevated)]",
                "shadow-[var(--shadow-lg)]",
                "md:hidden"
              )}
            >
              <div className="space-y-1 px-4 py-4">
                {items.map((item, index) => (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <MobileNavLink
                      item={item}
                      onClose={() => setMobileMenuOpen(false)}
                    />
                  </motion.div>
                ))}

                {/* Right content in mobile menu */}
                {rightContent && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: items.length * 0.05 }}
                    className="mt-4 border-t border-[var(--border-primary)] pt-4"
                  >
                    {rightContent}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}

/**
 * Desktop navigation link component
 */
function NavLink({ item }: { item: NavItem }) {
  const Component = item.href ? "a" : "button";

  return (
    <Component
      href={item.href}
      onClick={item.onClick}
      disabled={item.disabled}
      aria-current={item.active ? "page" : undefined}
      className={cn(
        // Base styles
        "flex items-center gap-2 rounded-xl px-4 py-2",
        "text-sm font-medium",
        "transition-all duration-[var(--transition-fast)]",
        // Focus state
        "focus-visible:ring-2 focus-visible:outline-none",
        "focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1",
        "focus-visible:ring-offset-[var(--ring-offset)]",
        // Active state
        item.active && ["bg-[var(--surface-active)]", "text-[var(--primary)]"],
        // Inactive state
        !item.active && [
          "text-[var(--text-secondary)]",
          "hover:bg-[var(--surface-hover)]",
          "hover:text-[var(--text-primary)]",
        ],
        // Disabled state
        item.disabled && "pointer-events-none cursor-not-allowed opacity-50"
      )}
    >
      {item.icon && <span className="h-4 w-4 flex-shrink-0">{item.icon}</span>}
      {item.label}
    </Component>
  );
}

/**
 * Mobile navigation link component
 */
function MobileNavLink({
  item,
  onClose,
}: {
  item: NavItem;
  onClose: () => void;
}) {
  const Component = item.href ? "a" : "button";

  return (
    <Component
      href={item.href}
      onClick={() => {
        item.onClick?.();
        onClose();
      }}
      disabled={item.disabled}
      aria-current={item.active ? "page" : undefined}
      className={cn(
        // Base styles
        "flex w-full items-center gap-3 rounded-xl px-4 py-3",
        "text-left text-sm font-medium",
        "transition-all duration-[var(--transition-fast)]",
        // Focus state
        "focus-visible:ring-2 focus-visible:outline-none",
        "focus-visible:ring-[var(--ring)]",
        // Active state
        item.active && ["bg-[var(--primary)]/10", "text-[var(--primary)]"],
        // Inactive state
        !item.active && [
          "text-[var(--text-secondary)]",
          "hover:bg-[var(--surface-hover)]",
          "hover:text-[var(--text-primary)]",
        ],
        // Disabled state
        item.disabled && "pointer-events-none cursor-not-allowed opacity-50"
      )}
    >
      {item.icon && <span className="h-5 w-5 flex-shrink-0">{item.icon}</span>}
      {item.label}
    </Component>
  );
}
