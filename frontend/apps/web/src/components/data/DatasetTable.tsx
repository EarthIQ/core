import { Badge, Checkbox, EmptyState } from "@packages/ui";
import {
  ArrowDown,
  ArrowUp,
  Database,
  Hash,
  Layers,
  PackageOpen,
  X,
} from "lucide-react";
import { formatBytes } from "../../lib/datasets";
import RowActions from "./RowActions";
import {
  featureCountLabel,
  formatLucide,
  isStoredAsset,
  typeLabel,
  typeLucide,
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
  onClearFilters: () => void;
  onAddData: () => void;
  onInspect: (ds: DatasetItem) => void;
  onEdit: (ds: DatasetItem) => void;
  onDownload: (ds: DatasetItem) => void;
  onOpenTileUrl: (ds: DatasetItem) => void;
  onRequestDelete: (id: string, name: string) => void;
}

function SortHeader({
  label,
  field,
  sortField,
  sortDir,
  onToggleSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: "asc" | "desc";
  onToggleSort: (f: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <button
      type="button"
      onClick={() => onToggleSort(field)}
      className={
        "inline-flex items-center gap-1 cursor-pointer " +
        (active ? "text-primary" : "hover:text-text-primary")
      }
    >
      {label}
      {active &&
        (sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
    </button>
  );
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
  onClearFilters,
  onAddData,
  onInspect,
  onEdit,
  onDownload,
  onOpenTileUrl,
  onRequestDelete,
}: Props) {
  return (
    <div className="card overflow-hidden">
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th className="w-10">
                <Checkbox
                  size="sm"
                  checked={allOnPageSelected}
                  onChange={(e) => onToggleSelectAll(e.target.checked)}
                  aria-label="Select all on page"
                />
              </th>
              <th>
                <SortHeader
                  label="Dataset"
                  field="name"
                  sortField={sortField}
                  sortDir={sortDir}
                  onToggleSort={onToggleSort}
                />
              </th>
              <th>
                <SortHeader
                  label="Format"
                  field="format"
                  sortField={sortField}
                  sortDir={sortDir}
                  onToggleSort={onToggleSort}
                />
              </th>
              <th>
                <SortHeader
                  label="Size"
                  field="size"
                  sortField={sortField}
                  sortDir={sortDir}
                  onToggleSort={onToggleSort}
                />
              </th>
              <th>
                <SortHeader
                  label="Updated"
                  field="updated"
                  sortField={sortField}
                  sortDir={sortDir}
                  onToggleSort={onToggleSort}
                />
              </th>
              <th className="w-12">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td>
                    <div className="skeleton h-4 w-4 rounded" />
                  </td>
                  <td>
                    <div className="skeleton h-4 rounded w-2/3" />
                  </td>
                  <td>
                    <div className="skeleton h-4 rounded w-1/2" />
                  </td>
                  <td>
                    <div className="skeleton h-4 rounded w-1/3" />
                  </td>
                  <td>
                    <div className="skeleton h-4 rounded w-1/3" />
                  </td>
                  <td />
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    size="md"
                    icon={<Database size={26} />}
                    title={
                      activeFilterCount > 0
                        ? "No matching datasets"
                        : "Your catalog is empty"
                    }
                    description={
                      activeFilterCount > 0
                        ? "No datasets match the current folder, filters or search."
                        : "Upload your first geospatial file to start building your catalog."
                    }
                    action={
                      activeFilterCount > 0
                        ? {
                            label: "Clear filters",
                            onClick: onClearFilters,
                          }
                        : { label: "Upload dataset", onClick: onAddData }
                    }
                  />
                </td>
              </tr>
            ) : (
              items.map((d) => {
                const FIcon = formatLucide(d.format);
                const TIcon = typeLucide(d.type);
                const selected = selectedIds.has(d.id);
                return (
                  <tr
                    key={d.id}
                    className={
                      (d._optimistic ? "opacity-60 " : "") +
                      (selected ? "bg-primary/5" : "")
                    }
                  >
                    <td>
                      <Checkbox
                        size="sm"
                        checked={selected}
                        onChange={() => onToggleSelectRow(d.id)}
                        aria-label={`Select ${d.name}`}
                      />
                    </td>

                    {/* Name + description + tags */}
                    <td>
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <FIcon size={15} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-text-primary text-sm truncate max-w-[16rem]">
                              {d.name}
                            </span>
                            {isStoredAsset(d) && (
                              <Badge
                                size="xs"
                                variant="info"
                                leftIcon={<PackageOpen size={10} />}
                              >
                                Stored
                              </Badge>
                            )}
                          </div>
                          {d.description && (
                            <div className="text-xs text-text-tertiary truncate max-w-[22rem]">
                              {d.description}
                            </div>
                          )}
                          {d.tags && d.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {d.tags.slice(0, 3).map((t) => (
                                <Badge key={t} size="xs" variant="primary">
                                  #{t}
                                </Badge>
                              ))}
                              {d.tags.length > 3 && (
                                <span className="text-[0.65rem] text-text-tertiary self-center">
                                  +{d.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Format + type */}
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-text-primary whitespace-nowrap">
                          {d.format}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[0.7rem] text-text-tertiary">
                          <TIcon size={11} />
                          {typeLabel(d.type)}
                        </span>
                      </div>
                    </td>

                    {/* Features + size */}
                    <td>
                      <div className="flex flex-col gap-0.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-sm text-text-primary">
                          <Hash size={12} className="text-text-tertiary" />
                          {featureCountLabel(d)}
                        </span>
                        <span className="text-xs text-text-tertiary">
                          {formatBytes(d.file_size_bytes)}
                        </span>
                      </div>
                    </td>

                    {/* Updated */}
                    <td className="text-sm text-text-tertiary whitespace-nowrap">
                      {d.updated_at ? d.updated_at.slice(0, 10) : "—"}
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      <RowActions
                        d={d}
                        onInspect={onInspect}
                        onEdit={onEdit}
                        onDownload={onDownload}
                        onOpenTileUrl={onOpenTileUrl}
                        onRequestDelete={onRequestDelete}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Active-filter footer with an escape hatch */}
      {activeFilterCount > 0 && !loading && items.length > 0 && (
        <div className="flex items-center gap-2 border-t border-border-secondary px-4 py-2 text-xs text-text-tertiary">
          <Layers size={12} />
          {activeFilterCount} active filter{activeFilterCount > 1 ? "s" : ""}
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 text-error hover:underline cursor-pointer"
          >
            <X size={11} /> Clear all
          </button>
        </div>
      )}
    </div>
  );
}
