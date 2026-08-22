import { formatBytes } from "../../lib/datasets";
import DatasetActions from "./DatasetActions";
import {
  featureCountLabel,
  formatDate,
  formatIcon,
  isStoredAsset,
  typeIcon,
  typeLabel,
} from "./helpers";
import type { DatasetItem, SortField } from "./types";

interface Props {
  items: DatasetItem[];
  loading: boolean;
  selectedIds: Set<string>;
  allOnPageSelected: boolean;
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSelectRow: (id: string) => void;
  sortField: SortField;
  sortDir: "asc" | "desc";
  onToggleSort: (field: SortField) => void;
  activeFilterCount: number;
  fetchError: string | null;
  onClearFilters: () => void;
  onAddData: () => void;
  onInspect: (ds: DatasetItem) => void;
  onEdit: (ds: DatasetItem) => void;
  onDownload: (ds: DatasetItem) => void;
  onOpenTileUrl: (ds: DatasetItem) => void;
  onRequestDelete: (id: string, name: string) => void;
}

function sortIndicator(
  field: SortField,
  sortField: SortField,
  sortDir: "asc" | "desc",
) {
  if (sortField !== field) return "";
  return sortDir === "asc" ? " ▲" : " ▼";
}

export default function DatasetTable({
  items,
  loading,
  selectedIds,
  allOnPageSelected,
  onToggleSelectAll,
  onToggleSelectRow,
  sortField,
  sortDir,
  onToggleSort,
  activeFilterCount,
  fetchError,
  onClearFilters,
  onAddData,
  onInspect,
  onEdit,
  onDownload,
  onOpenTileUrl,
  onRequestDelete,
}: Props) {
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th className="w-8">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={(e) => onToggleSelectAll(e.target.checked)}
                aria-label="Select all on page"
              />
            </th>
            <th
              className="cursor-pointer select-none"
              onClick={() => onToggleSort("name")}
            >
              Dataset{sortIndicator("name", sortField, sortDir)}
            </th>
            <th
              className="cursor-pointer select-none"
              onClick={() => onToggleSort("format")}
            >
              Format{sortIndicator("format", sortField, sortDir)}
            </th>
            <th
              className="cursor-pointer select-none"
              onClick={() => onToggleSort("size")}
            >
              Size{sortIndicator("size", sortField, sortDir)}
            </th>
            <th
              className="cursor-pointer select-none"
              onClick={() => onToggleSort("updated")}
            >
              Updated{sortIndicator("updated", sortField, sortDir)}
            </th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j}>
                    <div
                      className="skeleton h-3.5 rounded"
                      style={{
                        width: j === 1 ? "60%" : j === 5 ? "80%" : "50%",
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-14">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="text-4xl">🗺️</div>
                  <div className="text-text-secondary text-sm max-w-sm">
                    {fetchError
                      ? "Could not load datasets."
                      : activeFilterCount > 0
                        ? "No datasets match your current filters."
                        : "No datasets yet. Upload your first file — GeoJSON, Shapefile, KML, GeoTIFF, GeoPackage, GeoParquet, or CSV."}
                  </div>
                  {activeFilterCount > 0 ? (
                    <button
                      onClick={onClearFilters}
                      className="btn btn-secondary btn-sm"
                    >
                      Clear Filters
                    </button>
                  ) : (
                    <button
                      onClick={onAddData}
                      className="btn btn-primary btn-sm"
                    >
                      Upload Dataset
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            items.map((d) => (
              <tr
                key={d.id}
                className={`${d._optimistic ? "opacity-60" : ""} ${
                  selectedIds.has(d.id) ? "bg-primary/5" : ""
                }`}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(d.id)}
                    onChange={() => onToggleSelectRow(d.id)}
                    aria-label={`Select ${d.name}`}
                  />
                </td>

                {/* Name + Tags + Description */}
                <td>
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-text-primary text-sm flex items-center gap-1.5">
                      <span>{typeIcon(d.type)}</span>
                      {d.name}
                      {isStoredAsset(d) && (
                        <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-info/10 text-info border border-info/20">
                          Stored
                        </span>
                      )}
                    </span>
                    {d.description && (
                      <span className="text-xs text-text-tertiary line-clamp-1">
                        {d.description}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {d.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[0.65rem] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </td>

                {/* Format + Type badge */}
                <td>
                  <div className="flex flex-col gap-1">
                    <span className="badge badge-primary text-xs font-semibold">
                      {formatIcon(d.format)} {d.format}
                    </span>
                    <span className="text-[0.7rem] text-text-tertiary">
                      {typeLabel(d.type)}
                    </span>
                  </div>
                </td>

                {/* Size + feature count */}
                <td>
                  <div className="text-sm text-text-primary">
                    {featureCountLabel(d)}
                  </div>
                  <div className="text-xs text-text-tertiary">
                    {formatBytes(d.file_size_bytes)}
                  </div>
                </td>

                {/* Updated */}
                <td className="text-sm text-text-tertiary">
                  {formatDate(d.updated_at)}
                </td>

                {/* Actions */}
                <td>
                  <DatasetActions
                    d={d}
                    onInspect={onInspect}
                    onEdit={onEdit}
                    onDownload={onDownload}
                    onOpenTileUrl={onOpenTileUrl}
                    onRequestDelete={onRequestDelete}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
