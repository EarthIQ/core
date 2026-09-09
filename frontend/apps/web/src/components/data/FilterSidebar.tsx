import { FORMATS, TYPES } from "./constants";

import type { SortDir, SortField, ViewMode } from "./types";

interface Props {
  // Filters
  searchQuery: string;
  onSearchChange: (v: string) => void;
  typeFilter: string;
  onTypeFilterChange: (v: string) => void;
  formatFilter: string;
  onFormatFilterChange: (v: string) => void;
  activeFilterCount: number;
  onClearFilters: () => void;

  // Tags
  allTags: string[];
  selectedTags: Set<string>;
  onToggleTag: (tag: string) => void;

  // Sort / view
  sortField: SortField;
  onSortFieldChange: (v: SortField) => void;
  sortDir: SortDir;
  onToggleSortDir: () => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;

  onRefresh: () => void;
}

export default function FilterSidebar(props: Props) {
  const {
    searchQuery,
    onSearchChange,
    typeFilter,
    onTypeFilterChange,
    formatFilter,
    onFormatFilterChange,
    activeFilterCount,
    onClearFilters,
    allTags,
    selectedTags,
    onToggleTag,
    sortField,
    onSortFieldChange,
    sortDir,
    onToggleSortDir,
    viewMode,
    onViewModeChange,
    onRefresh,
  } = props;

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-4 lg:w-56">
      {/* Search */}
      <div className="card flex flex-col gap-3 p-3">
        <div className="relative">
          <svg
            className="text-text-tertiary absolute top-1/2 left-3 -translate-y-1/2"
            fill="none"
            height="16"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="16"
          >
            <circle
              cx="11"
              cy="11"
              r="8"
            />
            <line
              x1="21"
              x2="16.65"
              y1="21"
              y2="16.65"
            />
          </svg>
          <input
            className="input input-sm pl-9"
            placeholder="Search datasets…"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Type</label>
          <select
            className="input input-sm"
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
          >
            <option value="all">All Types</option>
            {TYPES.map((t) => (
              <option
                key={t.value}
                value={t.value}
              >
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="form-label">Format</label>
          <select
            className="input input-sm"
            value={formatFilter}
            onChange={(e) => onFormatFilterChange(e.target.value)}
          >
            <option value="all">All Formats</option>
            {FORMATS.map((f) => (
              <option
                key={f.value}
                value={f.value}
              >
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {activeFilterCount > 0 && (
          <button
            className="btn btn-ghost btn-xs text-error justify-self-start"
            onClick={onClearFilters}
          >
            ✕ Clear all filters
          </button>
        )}
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="card p-3">
          <div className="text-text-tertiary mb-2 text-xs font-semibold tracking-wide uppercase">
            Tags
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => {
              const active = selectedTags.has(tag);
              return (
                <button
                  key={tag}
                  className={`rounded-full border px-2 py-1 text-[0.7rem] transition-colors ${
                    active
                      ? "bg-primary text-text-on-primary border-primary"
                      : "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                  }`}
                  onClick={() => onToggleTag(tag)}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sort + view controls */}
      <div className="card flex flex-col gap-3 p-3">
        <div className="form-field">
          <label className="form-label">Sort by</label>
          <div className="flex gap-1.5">
            <select
              className="input input-sm flex-1"
              value={sortField}
              onChange={(e) => onSortFieldChange(e.target.value as SortField)}
            >
              <option value="updated">Recently Updated</option>
              <option value="name">Name</option>
              <option value="format">Format</option>
              <option value="size">File Size</option>
            </select>
            <button
              className="btn btn-secondary btn-sm btn-icon"
              title={sortDir === "asc" ? "Ascending" : "Descending"}
              onClick={onToggleSortDir}
            >
              {sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">View</label>
          <div className="border-border-primary flex items-center overflow-hidden rounded-lg border">
            <button
              title="Table view"
              className={`flex-1 px-2 py-1.5 text-sm ${
                viewMode === "table"
                  ? "bg-primary/10 text-primary"
                  : "text-text-tertiary hover:bg-surface-hover"
              }`}
              onClick={() => onViewModeChange("table")}
            >
              ☰ Table
            </button>
            <button
              title="Grid view"
              className={`flex-1 px-2 py-1.5 text-sm ${
                viewMode === "grid"
                  ? "bg-primary/10 text-primary"
                  : "text-text-tertiary hover:bg-surface-hover"
              }`}
              onClick={() => onViewModeChange("grid")}
            >
              ▦ Grid
            </button>
          </div>
        </div>

        <button
          className="btn btn-secondary btn-sm w-full"
          title="Refresh"
          onClick={onRefresh}
        >
          ↻ Refresh
        </button>
      </div>
    </aside>
  );
}
