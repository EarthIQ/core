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

import { formatBytes } from "@/lib/datasets";

import {
  featureCountLabel,
  formatColor,
  formatLucide,
  isStoredAsset,
  isVectorized,
  typeLabel,
  typeLucide,
} from "./helpers";
import RowActions from "./RowActions";

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
  onMove?: (ds: DatasetItem) => void;
}

const SortHeader = ({
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
}) => {
  const active = sortField === field;
  return (
    <button
      type="button"
      className={`group inline-flex cursor-pointer items-center gap-1.5 py-1 text-xs font-semibold tracking-wider uppercase transition-colors select-none ${
        active ? "text-primary" : "text-text-secondary hover:text-text-primary"
      }`}
      onClick={() => onToggleSort(field)}
    >
      <span>{label}</span>
      <span
        className={`transition-opacity ${
          active
            ? "text-primary opacity-100"
            : "opacity-0 group-hover:opacity-60"
        }`}
      >
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp
              className="stroke-[2.5]"
              size={13}
            />
          ) : (
            <ArrowDown
              className="stroke-[2.5]"
              size={13}
            />
          )
        ) : (
          <ArrowUpDown size={12} />
        )}
      </span>
    </button>
  );
};

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
  onMove,
}: Props) {
  return (
    <div className="card border-border-primary bg-surface overflow-hidden rounded-xl border shadow-xs">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-border-secondary bg-surface-hover/50 border-b">
              <th className="w-12 px-4 py-3 text-center">
                <div className="flex items-center justify-center">
                  <Checkbox
                    aria-label="Select all on page"
                    checked={allOnPageSelected}
                    size="sm"
                    onChange={(e) => onToggleSelectAll(e.target.checked)}
                  />
                </div>
              </th>
              <th className="px-4 py-3">
                <SortHeader
                  field="name"
                  label="Dataset"
                  sortDir={sortDir}
                  sortField={sortField}
                  onToggleSort={onToggleSort}
                />
              </th>
              <th className="px-4 py-3">
                <SortHeader
                  field="format"
                  label="Format"
                  sortDir={sortDir}
                  sortField={sortField}
                  onToggleSort={onToggleSort}
                />
              </th>
              <th className="px-4 py-3">
                <span className="text-text-secondary text-xs font-semibold tracking-wider uppercase">
                  Type / CRS
                </span>
              </th>
              <th className="px-4 py-3">
                <SortHeader
                  field="size"
                  label="Records & Size"
                  sortDir={sortDir}
                  sortField={sortField}
                  onToggleSort={onToggleSort}
                />
              </th>
              <th className="px-4 py-3">
                <SortHeader
                  field="updated"
                  label="Updated"
                  sortDir={sortDir}
                  sortField={sortField}
                  onToggleSort={onToggleSort}
                />
              </th>
              <th className="w-36 px-4 py-3 text-right">
                <span className="text-text-secondary text-xs font-semibold tracking-wider uppercase">
                  Actions
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-border-secondary divide-y text-sm">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr
                  key={i}
                  className="animate-pulse"
                >
                  <td className="px-4 py-3.5 text-center">
                    <div className="skeleton mx-auto h-4 w-4 rounded" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="skeleton h-9 w-9 shrink-0 rounded-lg" />
                      <div className="flex max-w-xs flex-1 flex-col gap-1.5">
                        <div className="skeleton h-4 w-3/4 rounded" />
                        <div className="skeleton h-3 w-1/2 rounded" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="skeleton h-5 w-16 rounded-full" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="skeleton h-4 w-20 rounded" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1">
                      <div className="skeleton h-4 w-20 rounded" />
                      <div className="skeleton h-3 w-14 rounded" />
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="skeleton h-4 w-20 rounded" />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="skeleton ml-auto h-7 w-16 rounded" />
                  </td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td
                  className="p-8"
                  colSpan={7}
                >
                  <EmptyState
                    icon={
                      <Database
                        className="text-primary"
                        size={28}
                      />
                    }
                    size="md"
                    action={
                      activeFilterCount > 0
                        ? {
                            label: "Clear all filters",
                            onClick: onClearFilters,
                          }
                        : { label: "Upload dataset", onClick: onAddData }
                    }
                    description={
                      activeFilterCount > 0
                        ? "Try adjusting or clearing your search and filters to see more datasets."
                        : "Upload your first geospatial file to start building your catalog."
                    }
                    title={
                      activeFilterCount > 0
                        ? "No matching datasets found"
                        : "Your catalog is empty"
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
                    className={`group cursor-pointer transition-colors duration-150 ${
                      selected
                        ? "bg-primary/[0.08] hover:bg-primary/[0.12]"
                        : "hover:bg-surface-hover/70"
                    } ${d._optimistic ? "opacity-60" : ""}`}
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
                  >
                    {/* Checkbox */}
                    <td
                      className="px-4 py-3.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center">
                        <Checkbox
                          aria-label={`Select ${d.name}`}
                          checked={selected}
                          size="sm"
                          onChange={() => onToggleSelectRow(d.id)}
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
                        <div className="max-w-sm min-w-0 lg:max-w-md">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              className="text-text-primary hover:text-primary max-w-[18rem] cursor-pointer truncate text-left text-sm font-semibold transition-colors"
                              title={d.name}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onInspect(d);
                              }}
                            >
                              {d.name}
                            </button>
                            {stored ? (
                              <span className="bg-info/10 text-info border-info/20 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.65rem] font-medium">
                                <PackageOpen size={10} />
                                Stored
                              </span>
                            ) : null}
                            {vectorized ? (
                              <span className="bg-accent/10 text-accent border-accent/20 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.65rem] font-medium">
                                <Layers size={10} />
                                Tiled
                              </span>
                            ) : null}
                          </div>

                          {d.description ? (
                            <p className="text-text-tertiary mt-0.5 max-w-[22rem] truncate text-xs">
                              {d.description}
                            </p>
                          ) : null}

                          {d.tags && d.tags.length > 0 ? (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                              {d.tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="py-0.2 bg-surface-hover text-text-secondary border-border-secondary rounded border px-1.5 text-[0.65rem] font-medium"
                                >
                                  #{t}
                                </span>
                              ))}
                              {d.tags.length > 3 && (
                                <span className="text-text-tertiary text-[0.65rem]">
                                  +{d.tags.length - 3}
                                </span>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* Format Badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border}`}
                      >
                        {d.format}
                      </span>
                    </td>

                    {/* Type & CRS */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="text-text-primary inline-flex items-center gap-1.5 text-xs font-medium">
                          <TIcon
                            className="text-text-tertiary"
                            size={13}
                          />
                          {typeLabel(d.type)}
                        </span>
                        {d.crs ? (
                          <span className="text-text-tertiary inline-flex items-center gap-1 font-mono text-[0.7rem]">
                            <Globe2 size={11} />
                            {d.crs}
                          </span>
                        ) : (
                          <span className="text-text-tertiary text-[0.7rem]">
                            Standard CRS
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Records & Size */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-text-primary inline-flex items-center gap-1.5 text-xs font-semibold">
                          <Hash
                            className="text-text-tertiary"
                            size={12}
                          />
                          {featureCountLabel(d)}
                        </span>
                        <span className="text-text-tertiary font-mono text-[0.72rem]">
                          {formatBytes(d.file_size_bytes)}
                        </span>
                      </div>
                    </td>

                    {/* Last Updated */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="text-text-secondary inline-flex items-center gap-1.5 text-xs">
                        <Clock
                          className="text-text-tertiary"
                          size={12}
                        />
                        <span>
                          {d.updated_at ? d.updated_at.slice(0, 10) : "-"}
                        </span>
                      </div>
                    </td>

                    {/* Quick & Row Actions */}
                    <td
                      className="px-4 py-3.5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center justify-end gap-1">
                        {/* Quick action buttons */}
                        <div className="hidden items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 sm:flex">
                          <Tooltip
                            content="Inspect dataset"
                            placement="top"
                          >
                            <IconButton
                              className="text-text-tertiary hover:text-primary hover:bg-surface-hover h-7 w-7"
                              icon={<Eye size={14} />}
                              label="Inspect"
                              size="sm"
                              variant="ghost"
                              onClick={() => onInspect(d)}
                            />
                          </Tooltip>

                          {vectorized ? (
                            <Tooltip
                              content="MVT Tile URL"
                              placement="top"
                            >
                              <IconButton
                                className="text-text-tertiary hover:text-accent hover:bg-surface-hover h-7 w-7"
                                icon={<MapPin size={14} />}
                                label="MVT URL"
                                size="sm"
                                variant="ghost"
                                onClick={() => onOpenTileUrl(d)}
                              />
                            </Tooltip>
                          ) : null}

                          <Tooltip
                            content="Download file"
                            placement="top"
                          >
                            <IconButton
                              className="text-text-tertiary hover:text-primary hover:bg-surface-hover h-7 w-7"
                              icon={<Download size={14} />}
                              label="Download"
                              size="sm"
                              variant="ghost"
                              onClick={() => onDownload(d)}
                            />
                          </Tooltip>
                        </div>

                        {/* More dropdown menu */}
                        <RowActions
                          d={d}
                          onDownload={onDownload}
                          onEdit={onEdit}
                          onInspect={onInspect}
                          onMove={onMove}
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
        <div className="border-border-secondary bg-surface-hover/30 text-text-secondary flex items-center justify-between border-t px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="bg-primary flex h-2 w-2 animate-pulse rounded-full" />
            <span>
              Filtered view:{" "}
              <strong className="text-text-primary font-semibold">
                {items.length}
              </strong>{" "}
              dataset{items.length === 1 ? "" : "s"} shown
            </span>
          </div>
          <button
            className="text-error hover:text-error/80 inline-flex cursor-pointer items-center gap-1 font-semibold transition-colors"
            type="button"
            onClick={onClearFilters}
          >
            <X size={12} /> Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
