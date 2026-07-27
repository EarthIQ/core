// src/components/controls/LayerPanel/SearchBar.tsx

import React, { useRef, useEffect } from "react";
import { Search, Eye, EyeOff, X } from "lucide-react";
import type { FilterMode } from "./types";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  resultCount: number;
  totalCount: number;
  showFilters?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  filterMode,
  onFilterModeChange,
  resultCount,
  totalCount,
  showFilters = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f" && inputRef.current) {
        e.preventDefault();
        inputRef.current.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const hasActiveFilters = searchQuery.trim() || filterMode !== "all";

  return (
    <div className="space-y-1.5 border-b border-[var(--border-secondary)] px-3 py-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          {/* <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" /> */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Search layers..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search layers"
            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] transition-all placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-focus-border)] focus:ring-2 focus:ring-[var(--primary)]/20 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {showFilters && (
          <div className="flex items-center rounded-lg bg-[var(--bg-tertiary)] p-0.5">
            <button
              onClick={() =>
                onFilterModeChange(filterMode === "visible" ? "all" : "visible")
              }
              aria-pressed={filterMode === "visible"}
              className={`rounded-md p-1.5 transition-colors ${
                filterMode === "visible"
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              }`}
              aria-label="Show visible only"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() =>
                onFilterModeChange(filterMode === "hidden" ? "all" : "hidden")
              }
              aria-pressed={filterMode === "hidden"}
              className={`rounded-md p-1.5 transition-colors ${
                filterMode === "hidden"
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              }`}
              aria-label="Show hidden only"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-tertiary)]">
            Showing {resultCount} of {totalCount}
          </span>
          <button
            onClick={() => {
              onSearchChange("");
              onFilterModeChange("all");
            }}
            className="text-[11px] font-medium text-[var(--primary)] hover:underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};
