import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { cn } from "../../../utils/cn";
import { useKeyboard, useEscapeKey } from "../../../hooks/useKeyboard";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string[];
  group?: string;
  onSelect: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: CommandItem[];
  placeholder?: string;
  emptyMessage?: string;
  recentItems?: string[];
  maxResults?: number;
}

export function CommandPalette({
  isOpen,
  onClose,
  items,
  placeholder = "Type a command or search...",
  emptyMessage = "No results found",
  recentItems = [],
  maxResults = 10,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEscapeKey(onClose, isOpen);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Filter and group items
  const filteredItems = useMemo(() => {
    let results = items;

    if (query) {
      const lowerQuery = query.toLowerCase();
      results = items.filter((item) => {
        const searchText = [
          item.label,
          item.description,
          ...(item.keywords || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchText.includes(lowerQuery);
      });
    }

    // Sort by recent usage if no query
    if (!query && recentItems.length > 0) {
      results = [...results].sort((a, b) => {
        const aIndex = recentItems.indexOf(a.id);
        const bIndex = recentItems.indexOf(b.id);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }

    return results.slice(0, maxResults);
  }, [items, query, recentItems, maxResults]);

  // Group items
  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};

    filteredItems.forEach((item) => {
      const group = item.group || "Commands";
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    });

    return groups;
  }, [filteredItems]);

  // Keyboard navigation
  useKeyboard({
    key: "ArrowDown",
    handler: () => {
      setActiveIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
    },
    enabled: isOpen,
    preventDefault: true,
  });

  useKeyboard({
    key: "ArrowUp",
    handler: () => {
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    },
    enabled: isOpen,
    preventDefault: true,
  });

  useKeyboard({
    key: "Enter",
    handler: () => {
      if (filteredItems[activeIndex]) {
        filteredItems[activeIndex].onSelect();
        onClose();
      }
    },
    enabled: isOpen,
  });

  // Scroll active item into view
  useEffect(() => {
    const activeElement = listRef.current?.querySelector(
      `[data-index="${activeIndex}"]`
    );
    activeElement?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 flex items-start justify-center pt-[15vh]"
          style={{ zIndex: "var(--z-modal)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="command-palette-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="overlay absolute inset-0"
            aria-hidden="true"
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="card-elevated relative w-full max-w-xl overflow-hidden"
            style={{
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-2xl)",
            }}
          >
            {/* Search Input */}
            <div className="border-base flex items-center gap-3 border-b px-4">
              <Search
                size={20}
                className="text-subtle flex-shrink-0"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder={placeholder}
                className="placeholder:text-subtle flex-1 bg-transparent py-4 text-base focus:outline-none"
                id="command-palette-title"
              />
              <kbd
                className="text-subtle hidden rounded px-2 py-1 text-xs sm:inline-flex"
                style={{ backgroundColor: "var(--bg-tertiary)" }}
              >
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              className="chart-scrollbar max-h-80 overflow-y-auto py-2"
            >
              {filteredItems.length === 0 ? (
                <div className="text-muted px-4 py-8 text-center">
                  {emptyMessage}
                </div>
              ) : (
                Object.entries(groupedItems).map(([group, groupItems]) => (
                  <div key={group}>
                    <div className="text-subtle px-4 py-2 text-xs font-medium tracking-wider uppercase">
                      {group}
                    </div>
                    {groupItems.map((item) => {
                      const globalIndex = filteredItems.findIndex(
                        (i) => i.id === item.id
                      );
                      const isActive = globalIndex === activeIndex;

                      return (
                        <button
                          key={item.id}
                          data-index={globalIndex}
                          onClick={() => {
                            item.onSelect();
                            onClose();
                          }}
                          onMouseEnter={() => setActiveIndex(globalIndex)}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                            isActive
                              ? "bg-surface-hover"
                              : "hover:bg-surface-hover"
                          )}
                          style={
                            isActive
                              ? {
                                  backgroundColor: "var(--surface-active)",
                                }
                              : undefined
                          }
                          role="option"
                          aria-selected={isActive}
                        >
                          {item.icon && (
                            <span className="text-muted h-5 w-5 flex-shrink-0">
                              {item.icon}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base text-sm font-medium">
                              {item.label}
                            </p>
                            {item.description && (
                              <p className="text-muted truncate text-xs">
                                {item.description}
                              </p>
                            )}
                          </div>
                          {item.shortcut && (
                            <div className="flex flex-shrink-0 items-center gap-1">
                              {item.shortcut.map((key, i) => (
                                <kbd
                                  key={i}
                                  className="text-subtle rounded px-1.5 py-0.5 text-xs"
                                  style={{
                                    backgroundColor: "var(--bg-tertiary)",
                                  }}
                                >
                                  {key}
                                </kbd>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-base text-subtle flex items-center gap-4 border-t px-4 py-2 text-xs">
              <span className="flex items-center gap-1">
                <kbd
                  className="rounded px-1.5 py-0.5"
                  style={{ backgroundColor: "var(--bg-tertiary)" }}
                >
                  ↑↓
                </kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd
                  className="rounded px-1.5 py-0.5"
                  style={{ backgroundColor: "var(--bg-tertiary)" }}
                >
                  ↵
                </kbd>
                <span>Select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd
                  className="rounded px-1.5 py-0.5"
                  style={{ backgroundColor: "var(--bg-tertiary)" }}
                >
                  ESC
                </kbd>
                <span>Close</span>
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// Hook to trigger command palette with keyboard shortcut
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useKeyboard({
    key: "k",
    handler: (e) => {
      if (e.metaKey || e.ctrlKey) {
        setIsOpen(true);
      }
    },
    preventDefault: true,
  });

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
}
