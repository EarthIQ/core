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
  PanelRight,
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

  // Preview pane (Explorer-style toggle)
  showPreview: boolean;
  onTogglePreview: () => void;
}

/**
 * Explorer-style two-row ribbon toolbar:
 * Row 1 — navigation (back / forward / up), breadcrumb address bar, search.
 * Row 2 — format filter, sort, view mode toggle, folder / upload actions.
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
    showPreview,
    onTogglePreview,
  } = props;

  const navBtn = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    disabled: boolean
  ) => (
    <button
      aria-label={label}
      className="text-text-secondary hover:bg-surface-hover hover:text-text-primary flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30"
      disabled={disabled}
      title={label}
      type="button"
      onClick={onClick}
    >
      {icon}
    </button>
  );

  return (
    <div className="border-border-primary bg-surface sticky top-0 z-20 border-b shadow-xs">
      {/* ── Row 1: Navigation + Address bar + Search ────────────────────────── */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 lg:px-4">
        {/* Mobile: open the nav drawer */}
        <button
          aria-label="Browse folders"
          className="text-text-secondary hover:bg-surface-hover hover:text-text-primary flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors lg:hidden"
          type="button"
          onClick={onOpenMobileNav}
        >
          <SlidersHorizontal size={16} />
        </button>

        {/* History navigation */}
        <div className="flex shrink-0 items-center gap-0.5">
          {navBtn(<ArrowLeft size={15} />, "Back", onBack, !canBack)}
          {navBtn(<ArrowRight size={15} />, "Forward", onForward, !canForward)}
          {navBtn(<ArrowUp size={15} />, "Up one level", onUp, !canUp)}
        </div>

        {/* Breadcrumb address bar */}
        <nav
          aria-label="Breadcrumb"
          className="border-border-primary bg-surface-hover/40 flex min-w-0 flex-1 scrollbar-none items-center gap-0.5 overflow-x-auto rounded-lg border px-2 py-1 whitespace-nowrap"
        >
          <Folder
            className="text-primary mr-1 shrink-0"
            size={13}
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
                    size={12}
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
        <div className="relative w-full min-w-0 sm:w-48 lg:w-56">
          <Search
            className="text-text-tertiary pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
            size={14}
          />
          <input
            ref={searchInputRef}
            aria-label="Search datasets"
            className="input h-7 text-xs"
            placeholder="Search datasets…"
            style={{ paddingLeft: 28, paddingRight: 32 }}
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
                <X size={12} />
              </button>
            ) : null}
            <kbd className="hidden h-4 min-w-4 items-center justify-center rounded border border-[var(--border-primary)] bg-[var(--surface-hover)] px-1 text-[0.55rem] font-semibold text-[var(--text-tertiary)] select-none sm:flex">
              /
            </kbd>
          </div>
        </div>
      </div>

      {/* ── Row 2: Filters + Sort + View + Actions ─────────────────────────── */}
      <div className="border-border-secondary flex items-center gap-1.5 border-t px-3 py-1 lg:px-4">
        {/* Format filter */}
        <div className="w-36">
          <Select
            options={formatOptions}
            size="sm"
            value={formatFilter}
            onChange={onFormatFilterChange}
          />
        </div>

        {/* Sort */}
        <div className="hidden items-center gap-1 sm:flex">
          <div className="w-32">
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
            className="text-text-secondary hover:bg-surface-hover hover:text-text-primary flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[var(--border-primary)] transition-colors"
            title={sortDir === "asc" ? "Ascending" : "Descending"}
            type="button"
            aria-label={
              sortDir === "asc" ? "Sort ascending" : "Sort descending"
            }
            onClick={onToggleSortDir}
          >
            <ArrowUp
              size={14}
              className={cn(
                "transition-transform",
                sortDir === "desc" && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Separator */}
        <div className="border-border-secondary mx-1 hidden h-5 border-l sm:block" />

        {/* View switcher */}
        <div
          aria-label="View mode"
          className="border-border-primary bg-surface-hover/50 flex shrink-0 items-center rounded-md border p-px"
          role="group"
        >
          <button
            aria-label="Details view"
            title="Details view"
            type="button"
            className={cn(
              "flex h-6 cursor-pointer items-center gap-1.5 rounded px-2 text-xs font-semibold transition-all",
              viewMode === "details"
                ? "bg-surface text-primary shadow-xs"
                : "text-text-tertiary hover:text-text-primary"
            )}
            onClick={() => onViewModeChange("details")}
          >
            <List size={13} />
          </button>
          <button
            aria-label="Grid view"
            title="Grid view"
            type="button"
            className={cn(
              "flex h-6 cursor-pointer items-center gap-1.5 rounded px-2 text-xs font-semibold transition-all",
              viewMode === "grid"
                ? "bg-surface text-primary shadow-xs"
                : "text-text-tertiary hover:text-text-primary"
            )}
            onClick={() => onViewModeChange("grid")}
          >
            <LayoutGrid size={13} />
          </button>
        </div>

        {/* Preview pane toggle (Explorer "Preview" button) */}
        <div className="border-border-secondary mx-1 hidden h-5 border-l sm:block" />
        <button
          aria-label={showPreview ? "Hide preview pane" : "Show preview pane"}
          aria-pressed={showPreview}
          title={showPreview ? "Hide preview pane" : "Show preview pane"}
          type="button"
          className={cn(
            "hidden h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors sm:flex",
            showPreview
              ? "border-primary/40 bg-primary/10 text-primary"
              : "text-text-secondary hover:bg-surface-hover hover:text-text-primary border-[var(--border-primary)]"
          )}
          onClick={onTogglePreview}
        >
          <PanelRight size={14} />
        </button>

        {/* Actions (right-aligned) */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {activeFilterCount > 0 ? (
            <button
              className="text-error hover:bg-error/10 hidden h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-semibold transition-colors sm:flex"
              type="button"
              onClick={onClearFilters}
            >
              <X size={12} /> Clear
            </button>
          ) : null}

          <IconButton
            aria-label="Refresh catalog"
            label="Refresh catalog"
            size="sm"
            variant="outline"
            icon={
              <RefreshCw
                className={loading ? "animate-spin" : ""}
                size={15}
              />
            }
            onClick={onRefresh}
          />

          <button
            className="btn btn-secondary btn-sm hidden gap-1.5 sm:flex"
            type="button"
            onClick={onNewFolder}
          >
            <FolderPlus size={15} />
            New folder
          </button>

          <button
            className="btn btn-primary btn-sm gap-1.5 shadow-sm"
            type="button"
            onClick={onUpload}
          >
            <CloudUpload size={15} />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </div>
    </div>
  );
}
