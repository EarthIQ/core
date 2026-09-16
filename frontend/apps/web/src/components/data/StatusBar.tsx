import { Database, HardDrive, X } from "lucide-react";

import { formatBytes } from "@/lib/datasets";

interface Props {
  itemCount: number;
  folderCount: number;
  selectedCount: number;
  totalBytes: number;
  activeFilterCount: number;
  onClearFilters: () => void;
  loading?: boolean;
}

/**
 * Explorer-style status bar pinned along the bottom of the catalog:
 * item / folder counts, the current selection, any active filters, and the
 * total storage in use.
 */
export default function StatusBar({
  itemCount,
  folderCount,
  selectedCount,
  totalBytes,
  activeFilterCount,
  onClearFilters,
  loading,
}: Props) {
  return (
    <div className="border-border-secondary bg-surface text-text-tertiary flex h-9 shrink-0 items-center justify-between gap-4 border-t px-4 text-[0.72rem]">
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
      </div>

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
