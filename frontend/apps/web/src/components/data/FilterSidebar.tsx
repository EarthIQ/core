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
    <aside className="w-full lg:w-56 shrink-0 flex flex-col gap-4 lg:sticky lg:top-4">
      {/* Search */}
      <div className="card p-3 flex flex-col gap-3">
        <div className="relative">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search datasets…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input input-sm pl-9"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="input input-sm"
          >
            <option value="all">All Types</option>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="form-label">Format</label>
          <select
            value={formatFilter}
            onChange={(e) => onFormatFilterChange(e.target.value)}
            className="input input-sm"
          >
            <option value="all">All Formats</option>
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {activeFilterCount > 0 && (
          <button
            onClick={onClearFilters}
            className="btn btn-ghost btn-xs text-error justify-self-start"
          >
            ✕ Clear all filters
          </button>
        )}
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="card p-3">
          <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">
            Tags
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => {
              const active = selectedTags.has(tag);
              return (
                <button
                  key={tag}
                  onClick={() => onToggleTag(tag)}
                  className={`text-[0.7rem] px-2 py-1 rounded-full border transition-colors ${
                    active
                      ? "bg-primary text-text-on-primary border-primary"
                      : "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sort + view controls */}
      <div className="card p-3 flex flex-col gap-3">
        <div className="form-field">
          <label className="form-label">Sort by</label>
          <div className="flex gap-1.5">
            <select
              value={sortField}
              onChange={(e) => onSortFieldChange(e.target.value as SortField)}
              className="input input-sm flex-1"
            >
              <option value="updated">Recently Updated</option>
              <option value="name">Name</option>
              <option value="format">Format</option>
              <option value="size">File Size</option>
            </select>
            <button
              onClick={onToggleSortDir}
              className="btn btn-secondary btn-sm btn-icon"
              title={sortDir === "asc" ? "Ascending" : "Descending"}
            >
              {sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">View</label>
          <div className="flex items-center rounded-lg border border-border-primary overflow-hidden">
            <button
              onClick={() => onViewModeChange("table")}
              className={`flex-1 px-2 py-1.5 text-sm ${
                viewMode === "table"
                  ? "bg-primary/10 text-primary"
                  : "text-text-tertiary hover:bg-surface-hover"
              }`}
              title="Table view"
            >
              ☰ Table
            </button>
            <button
              onClick={() => onViewModeChange("grid")}
              className={`flex-1 px-2 py-1.5 text-sm ${
                viewMode === "grid"
                  ? "bg-primary/10 text-primary"
                  : "text-text-tertiary hover:bg-surface-hover"
              }`}
              title="Grid view"
            >
              ▦ Grid
            </button>
          </div>
        </div>

        <button
          onClick={onRefresh}
          title="Refresh"
          className="btn btn-secondary btn-sm w-full"
        >
          ↻ Refresh
        </button>
      </div>
    </aside>
  );
}
