import { Checkbox, EmptyState, IconButton, Tooltip } from "@packages/ui";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Clock,
  Database,
  Download,
  Eye,
  Globe2,
  Hash,
  Layers,
  MapPin,
  PackageOpen,
  X,
} from "lucide-react";
import { formatBytes } from "../../lib/datasets";
import RowActions from "./RowActions";
import {
  featureCountLabel,
  formatColor,
  formatLucide,
  isStoredAsset,
  isVectorized,
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
      className={`inline-flex items-center gap-1.5 py-1 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer select-none group ${
        active
          ? "text-primary"
          : "text-text-secondary hover:text-text-primary"
      }`}
    >
      <span>{label}</span>
      <span
        className={`transition-opacity ${
          active ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-60"
        }`}
      >
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp size={13} className="stroke-[2.5]" />
          ) : (
            <ArrowDown size={13} className="stroke-[2.5]" />
          )
        ) : (
          <ArrowUpDown size={12} />
        )}
      </span>
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
    <div className="card overflow-hidden border border-border-primary rounded-xl shadow-xs bg-surface">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-border-secondary bg-surface-hover/50">
              <th className="w-12 px-4 py-3 text-center">
                <div className="flex items-center justify-center">
                  <Checkbox
                    size="sm"
                    checked={allOnPageSelected}
                    onChange={(e) => onToggleSelectAll(e.target.checked)}
                    aria-label="Select all on page"
                  />
                </div>
              </th>
              <th className="px-4 py-3">
                <SortHeader
                  label="Dataset"
                  field="name"
                  sortField={sortField}
                  sortDir={sortDir}
                  onToggleSort={onToggleSort}
                />
              </th>
              <th className="px-4 py-3">
                <SortHeader
                  label="Format"
                  field="format"
                  sortField={sortField}
                  sortDir={sortDir}
                  onToggleSort={onToggleSort}
                />
              </th>
              <th className="px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Type / CRS
                </span>
              </th>
              <th className="px-4 py-3">
                <SortHeader
                  label="Records & Size"
                  field="size"
                  sortField={sortField}
                  sortDir={sortDir}
                  onToggleSort={onToggleSort}
                />
              </th>
              <th className="px-4 py-3">
                <SortHeader
                  label="Updated"
                  field="updated"
                  sortField={sortField}
                  sortDir={sortDir}
                  onToggleSort={onToggleSort}
                />
              </th>
              <th className="w-36 px-4 py-3 text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Actions
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-secondary text-sm">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3.5 text-center">
                    <div className="skeleton h-4 w-4 rounded mx-auto" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="skeleton h-9 w-9 rounded-lg shrink-0" />
                      <div className="flex flex-col gap-1.5 flex-1 max-w-xs">
                        <div className="skeleton h-4 rounded w-3/4" />
                        <div className="skeleton h-3 rounded w-1/2" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="skeleton h-5 rounded-full w-16" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="skeleton h-4 rounded w-20" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1">
                      <div className="skeleton h-4 rounded w-20" />
                      <div className="skeleton h-3 rounded w-14" />
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="skeleton h-4 rounded w-20" />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="skeleton h-7 w-16 rounded ml-auto" />
                  </td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8">
                  <EmptyState
                    size="md"
                    icon={<Database size={28} className="text-primary" />}
                    title={
                      activeFilterCount > 0
                        ? "No matching datasets found"
                        : "Your catalog is empty"
                    }
                    description={
                      activeFilterCount > 0
                        ? "Try adjusting or clearing your search and filters to see more datasets."
                        : "Upload your first geospatial file to start building your catalog."
                    }
                    action={
                      activeFilterCount > 0
                        ? {
                            label: "Clear all filters",
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
                const colors = formatColor(d.format);
                const selected = selectedIds.has(d.id);
                const vectorized = isVectorized(d);
                const stored = isStoredAsset(d);

                return (
                  <tr
                    key={d.id}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (
                        target.closest("button") ||
                        target.closest("input") ||
                        target.closest("a")
                      ) {
                        return;
                      }
                      onInspect(d);
                    }}
                    className={`group transition-colors duration-150 cursor-pointer ${
                      selected
                        ? "bg-primary/[0.08] hover:bg-primary/[0.12]"
                        : "hover:bg-surface-hover/70"
                    } ${d._optimistic ? "opacity-60" : ""}`}
                  >
                    {/* Checkbox */}
                    <td
                      className="px-4 py-3.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center">
                        <Checkbox
                          size="sm"
                          checked={selected}
                          onChange={() => onToggleSelectRow(d.id)}
                          aria-label={`Select ${d.name}`}
                        />
                      </div>
                    </td>

                    {/* Dataset Name, Tags & Meta */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${colors.bg} ${colors.text} ${colors.border}`}
                          title={`${d.format} file`}
                        >
                          <FIcon size={16} />
                        </div>
                        <div className="min-w-0 max-w-sm lg:max-w-md">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onInspect(d);
                              }}
                              className="font-semibold text-text-primary text-sm truncate max-w-[18rem] text-left hover:text-primary transition-colors cursor-pointer"
                              title={d.name}
                            >
                              {d.name}
                            </button>
                            {stored && (
                              <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium px-1.5 py-0.5 rounded-md bg-info/10 text-info border border-info/20">
                                <PackageOpen size={10} />
                                Stored
                              </span>
                            )}
                            {vectorized && (
                              <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium px-1.5 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
                                <Layers size={10} />
                                Tiled
                              </span>
                            )}
                          </div>

                          {d.description && (
                            <p className="text-xs text-text-tertiary truncate max-w-[22rem] mt-0.5">
                              {d.description}
                            </p>
                          )}

                          {d.tags && d.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                              {d.tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="text-[0.65rem] font-medium px-1.5 py-0.2 rounded bg-surface-hover text-text-secondary border border-border-secondary"
                                >
                                  #{t}
                                </span>
                              ))}
                              {d.tags.length > 3 && (
                                <span className="text-[0.65rem] text-text-tertiary">
                                  +{d.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Format Badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}
                      >
                        {d.format}
                      </span>
                    </td>

                    {/* Type & CRS */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-primary">
                          <TIcon size={13} className="text-text-tertiary" />
                          {typeLabel(d.type)}
                        </span>
                        {d.crs ? (
                          <span className="inline-flex items-center gap-1 text-[0.7rem] text-text-tertiary font-mono">
                            <Globe2 size={11} />
                            {d.crs}
                          </span>
                        ) : (
                          <span className="text-[0.7rem] text-text-tertiary">
                            Standard CRS
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Records & Size */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                          <Hash size={12} className="text-text-tertiary" />
                          {featureCountLabel(d)}
                        </span>
                        <span className="text-[0.72rem] text-text-tertiary font-mono">
                          {formatBytes(d.file_size_bytes)}
                        </span>
                      </div>
                    </td>

                    {/* Last Updated */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                        <Clock size={12} className="text-text-tertiary" />
                        <span>{d.updated_at ? d.updated_at.slice(0, 10) : "—"}</span>
                      </div>
                    </td>

                    {/* Quick & Row Actions */}
                    <td
                      className="px-4 py-3.5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center justify-end gap-1">
                        {/* Quick action buttons */}
                        <div className="hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <Tooltip content="Inspect dataset" placement="top">
                            <IconButton
                              icon={<Eye size={14} />}
                              label="Inspect"
                              variant="ghost"
                              size="sm"
                              onClick={() => onInspect(d)}
                              className="text-text-tertiary hover:text-primary hover:bg-surface-hover h-7 w-7"
                            />
                          </Tooltip>

                          {vectorized && (
                            <Tooltip content="MVT Tile URL" placement="top">
                              <IconButton
                                icon={<MapPin size={14} />}
                                label="MVT URL"
                                variant="ghost"
                                size="sm"
                                onClick={() => onOpenTileUrl(d)}
                                className="text-text-tertiary hover:text-accent hover:bg-surface-hover h-7 w-7"
                              />
                            </Tooltip>
                          )}

                          <Tooltip content="Download file" placement="top">
                            <IconButton
                              icon={<Download size={14} />}
                              label="Download"
                              variant="ghost"
                              size="sm"
                              onClick={() => onDownload(d)}
                              className="text-text-tertiary hover:text-primary hover:bg-surface-hover h-7 w-7"
                            />
                          </Tooltip>
                        </div>

                        {/* More dropdown menu */}
                        <RowActions
                          d={d}
                          onInspect={onInspect}
                          onEdit={onEdit}
                          onDownload={onDownload}
                          onOpenTileUrl={onOpenTileUrl}
                          onRequestDelete={onRequestDelete}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Active-filter footer badge */}
      {activeFilterCount > 0 && !loading && items.length > 0 && (
        <div className="flex items-center justify-between border-t border-border-secondary px-4 py-2.5 bg-surface-hover/30 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span>
              Filtered view:{" "}
              <strong className="font-semibold text-text-primary">
                {items.length}
              </strong>{" "}
              dataset{items.length === 1 ? "" : "s"} shown
            </span>
          </div>
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 font-semibold text-error hover:text-error/80 transition-colors cursor-pointer"
          >
            <X size={12} /> Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

