import { cn, IconButton, Select } from "@packages/ui";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  CloudUpload,
  Folder,
  FolderPlus,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { type SortDir, type SortField, type ViewMode } from "./types";

interface Crumb {
  id: string | null;
  name: string;
}

interface Props {
  // History navigation
  canBack: boolean;
  canForward: boolean;
  canUp: boolean;
  onBack: () => void;
  onForward: () => void;
  onUp: () => void;

  // Breadcrumb "address bar"
  breadcrumb: Crumb[];
  onNavigateCrumb: (folderId: string | null) => void;

  // Search
  searchQuery: string;
  onSearchChange: (v: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;

  // Filters / sort / view
  formatOptions: { value: string; label: string }[];
  formatFilter: string;
  onFormatFilterChange: (v: string) => void;
  sortField: SortField;
  onSortFieldChange: (v: SortField) => void;
  sortDir: SortDir;
  onToggleSortDir: () => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  activeFilterCount: number;
  onClearFilters: () => void;

  // Actions
  onNewFolder: () => void;
  onUpload: () => void;
  onRefresh: () => void;
  loading?: boolean;
  onOpenMobileNav: () => void;
}

/**
 * Explorer-style command bar: back / forward / up, a clickable breadcrumb
 * address bar, search (with a "/" shortcut hint), and the view / sort /
 * format / folder / upload controls.
 */
export default function ExplorerToolbar(props: Props) {
  const {
    canBack,
    canForward,
    canUp,
    onBack,
    onForward,
    onUp,
    breadcrumb,
    onNavigateCrumb,
    searchQuery,
    onSearchChange,
    searchInputRef,
    formatOptions,
    formatFilter,
    onFormatFilterChange,
    sortField,
    onSortFieldChange,
    sortDir,
    onToggleSortDir,
    viewMode,
    onViewModeChange,
    activeFilterCount,
    onClearFilters,
    onNewFolder,
    onUpload,
    onRefresh,
    loading,
    onOpenMobileNav,
  } = props;

  const navBtn = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    disabled: boolean
  ) => (
    <button
      aria-label={label}
      className="text-text-secondary hover:bg-surface-hover hover:text-text-primary flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-30"
      disabled={disabled}
      title={label}
      type="button"
      onClick={onClick}
    >
      {icon}
    </button>
  );

  return (
    <div className="border-border-primary bg-surface sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b px-4 py-2.5 shadow-xs lg:px-6">
      {/* Mobile: open the nav drawer */}
      <button
        aria-label="Browse folders"
        className="text-text-secondary hover:bg-surface-hover hover:text-text-primary flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors lg:hidden"
        type="button"
        onClick={onOpenMobileNav}
      >
        <SlidersHorizontal size={17} />
      </button>

      {/* History navigation */}
      <div className="flex shrink-0 items-center gap-0.5 rounded-lg">
        {navBtn(<ArrowLeft size={16} />, "Back", onBack, !canBack)}
        {navBtn(<ArrowRight size={16} />, "Forward", onForward, !canForward)}
        {navBtn(<ArrowUp size={16} />, "Up one level", onUp, !canUp)}
      </div>

      {/* Breadcrumb address bar */}
      <nav
        aria-label="Breadcrumb"
        className="border-border-primary bg-surface-hover/40 flex min-w-0 flex-1 scrollbar-none items-center gap-0.5 overflow-x-auto rounded-lg border px-2 py-1.5 whitespace-nowrap"
      >
        <Folder
          className="text-primary mr-1 shrink-0"
          size={14}
        />
        {breadcrumb.map((crumb, i) => {
          const last = i === breadcrumb.length - 1;
          return (
            <span
              key={crumb.id ?? `root-${i}`}
              className="flex shrink-0 items-center gap-0.5"
            >
              {i > 0 ? (
                <ChevronRight
                  className="text-text-tertiary shrink-0"
                  size={13}
                />
              ) : null}
              {last ? (
                <span
                  aria-current="page"
                  className="text-text-primary px-1.5 text-xs font-semibold"
                >
                  {crumb.name}
                </span>
              ) : (
                <button
                  className="text-text-secondary hover:bg-surface-hover hover:text-text-primary cursor-pointer rounded px-1.5 py-0.5 text-xs transition-colors"
                  type="button"
                  onClick={() => onNavigateCrumb(crumb.id)}
                >
                  {crumb.name}
                </button>
              )}
            </span>
          );
        })}
      </nav>
      {/* Search */}
      <div className="relative w-full min-w-0 sm:w-52 lg:w-64">
        <Search
          className="text-text-tertiary pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
          size={15}
        />
        <input
          ref={searchInputRef}
          aria-label="Search datasets"
          className="input h-8 pl-8 text-xs"
          placeholder="Search datasets…"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1">
          {searchQuery ? (
            <button
              aria-label="Clear search"
              className="text-text-tertiary hover:text-text-primary cursor-pointer rounded p-0.5"
              type="button"
              onClick={() => {
                onSearchChange("");
                searchInputRef.current?.focus();
              }}
            >
              <X size={13} />
            </button>
          ) : null}
          <kbd className="hidden h-5 min-w-5 items-center justify-center rounded border border-[var(--border-primary)] bg-[var(--surface-hover)] px-1.5 text-[0.6rem] font-semibold text-[var(--text-tertiary)] select-none sm:flex">
            /
          </kbd>
        </div>
      </div>

      {/* Format filter */}
      <div className="hidden w-40 md:block">
        <Select
          options={formatOptions}
          size="sm"
          value={formatFilter}
          onChange={onFormatFilterChange}
        />
      </div>

      {/* Sort */}
      <div className="hidden items-center gap-1.5 lg:flex">
        <div className="w-36">
          <Select
            size="sm"
            value={sortField}
            options={[
              { value: "updated", label: "Last modified" },
              { value: "name", label: "Name" },
              { value: "format", label: "Format" },
              { value: "size", label: "Size" },
            ]}
            onChange={(v) => onSortFieldChange(v as SortField)}
          />
        </div>
        <button
          aria-label={sortDir === "asc" ? "Sort ascending" : "Sort descending"}
          className="text-text-secondary hover:bg-surface-hover hover:text-text-primary flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--border-primary)] transition-colors"
          title={sortDir === "asc" ? "Ascending" : "Descending"}
          type="button"
          onClick={onToggleSortDir}
        >
          <ArrowUp
            size={15}
            className={cn(
              "transition-transform",
              sortDir === "desc" && "rotate-180"
            )}
          />
        </button>
      </div>
      {/* View switcher */}
      <div
        aria-label="View mode"
        className="border-border-primary bg-surface-hover/50 flex shrink-0 items-center rounded-lg border p-0.5"
        role="group"
      >
        <button
          aria-label="Details view"
          title="Details view"
          type="button"
          className={cn(
            "flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-all",
            viewMode === "details"
              ? "bg-surface text-primary shadow-xs"
              : "text-text-tertiary hover:text-text-primary"
          )}
          onClick={() => onViewModeChange("details")}
        >
          <List size={14} />
        </button>
        <button
          aria-label="Grid view"
          title="Grid view"
          type="button"
          className={cn(
            "flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-all",
            viewMode === "grid"
              ? "bg-surface text-primary shadow-xs"
              : "text-text-tertiary hover:text-text-primary"
          )}
          onClick={() => onViewModeChange("grid")}
        >
          <LayoutGrid size={14} />
        </button>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {activeFilterCount > 0 ? (
          <button
            className="text-error hover:bg-error/10 hidden h-8 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs font-semibold transition-colors sm:flex"
            type="button"
            onClick={onClearFilters}
          >
            <X size={13} /> Clear
          </button>
        ) : null}

        <IconButton
          aria-label="Refresh catalog"
          label="Refresh catalog"
          size="md"
          variant="outline"
          icon={
            <RefreshCw
              className={loading ? "animate-spin" : ""}
              size={16}
            />
          }
          onClick={onRefresh}
        />

        <button
          className="btn btn-secondary btn-md hidden gap-2 sm:flex"
          type="button"
          onClick={onNewFolder}
        >
          <FolderPlus size={16} />
          New folder
        </button>

        <button
          className="btn btn-primary btn-md gap-2 shadow-sm"
          type="button"
          onClick={onUpload}
        >
          <CloudUpload size={16} />
          <span className="hidden sm:inline">Upload</span>
        </button>
      </div>
    </div>
  );
}
