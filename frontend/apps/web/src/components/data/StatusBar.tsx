import {
  ChevronLeft,
  ChevronRight,
  Database,
  HardDrive,
  X,
} from "lucide-react";

import { formatBytes } from "@/lib/datasets";

interface Props {
  itemCount: number;
  folderCount: number;
  selectedCount: number;
  totalBytes: number;
  activeFilterCount: number;
  onClearFilters: () => void;
  loading?: boolean;

  // Inline pagination (optional — if absent the center section only shows
  // selection / filter pills like before)
  page?: number;
  pageSize?: number;
  totalPages?: number;
  totalItems?: number;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  onPageSizeChange?: (size: number) => void;
}

/**
 * Explorer-style status bar pinned along the bottom of the catalog:
 * item / folder counts, the current selection, any active filters, and the
 * total storage in use.  Now also embeds compact inline pagination controls.
 */
export default function StatusBar({
  itemCount,
  folderCount,
  selectedCount,
  totalBytes,
  activeFilterCount,
  onClearFilters,
  loading,
  page,
  pageSize,
  totalPages,
  totalItems,
  onPrevPage,
  onNextPage,
  onPageSizeChange,
}: Props) {
  const hasPagination =
    page !== undefined &&
    totalPages !== undefined &&
    totalPages > 0 &&
    totalItems !== undefined &&
    totalItems > 0 &&
    !loading;

  return (
    <div className="border-border-secondary bg-surface text-text-tertiary flex h-9 shrink-0 items-center justify-between gap-4 border-t px-4 text-[0.72rem]">
      {/* ── Left: item / folder counts ─────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {loading ? (
          <span className="flex items-center gap-1.5">
            <span className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
            <span>Loading…</span>
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <Database
                className="shrink-0"
                size={13}
              />
              <span className="text-text-secondary font-medium tabular-nums">
                {itemCount}
              </span>
              dataset{itemCount === 1 ? "" : "s"}
            </span>
            {folderCount > 0 ? (
              <span className="text-text-secondary hidden items-center gap-1.5 sm:flex">
                <span>·</span>
                <span className="font-medium tabular-nums">{folderCount}</span>
                folder{folderCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </>
        )}
      </div>

      {/* ── Center: selection pill + filter pill + pagination ───────────────── */}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
        {selectedCount > 0 ? (
          <span className="bg-primary/10 text-primary flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold">
            {selectedCount} selected
          </span>
        ) : null}

        {activeFilterCount > 0 ? (
          <button
            className="bg-surface-hover hover:bg-surface-active flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium transition-colors"
            type="button"
            onClick={onClearFilters}
          >
            <span>
              {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}{" "}
              active
            </span>
            <X
              className="text-error"
              size={12}
            />
          </button>
        ) : null}

        {/* Inline pagination */}
        {hasPagination ? (
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-text-tertiary hidden text-[0.68rem] lg:inline">
              Showing{" "}
              <span className="text-text-secondary font-medium tabular-nums">
                {((page ?? 1) - 1) * (pageSize ?? 25) + 1}
              </span>
              –
              <span className="text-text-secondary font-medium tabular-nums">
                {Math.min((page ?? 1) * (pageSize ?? 25), totalItems ?? 0)}
              </span>{" "}
              of{" "}
              <span className="text-text-secondary font-medium tabular-nums">
                {totalItems}
              </span>
            </span>
            <select
              className="border-border-primary bg-surface text-text-primary focus:border-primary h-6 cursor-pointer rounded-md border px-1.5 text-[0.68rem] font-medium transition-colors focus:outline-none"
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            >
              <option value={25}>25 / pg</option>
              <option value={50}>50 / pg</option>
              <option value={100}>100 / pg</option>
            </select>
            <div className="border-border-primary flex items-center gap-0.5 rounded-md border p-px">
              <button
                aria-label="Previous page"
                className="text-text-secondary hover:bg-surface-hover hover:text-text-primary flex h-5 w-5 cursor-pointer items-center justify-center rounded transition-colors disabled:pointer-events-none disabled:opacity-30"
                disabled={(page ?? 1) <= 1}
                type="button"
                onClick={onPrevPage}
              >
                <ChevronLeft size={13} />
              </button>
              <span className="text-text-primary px-1.5 text-[0.68rem] font-semibold tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                aria-label="Next page"
                className="text-text-secondary hover:bg-surface-hover hover:text-text-primary flex h-5 w-5 cursor-pointer items-center justify-center rounded transition-colors disabled:pointer-events-none disabled:opacity-30"
                disabled={(page ?? 1) >= (totalPages ?? 1)}
                type="button"
                onClick={onNextPage}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Right: storage ─────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-1.5">
        <HardDrive
          className="shrink-0"
          size={13}
        />
        <span className="font-medium tabular-nums">
          {formatBytes(totalBytes)}
        </span>
        <span className="hidden sm:inline">in use</span>
      </div>
    </div>
  );
}
