import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  loading: boolean;
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onPageSizeChange: (size: number) => void;
}

export default function Pagination({
  loading,
  totalItems,
  page,
  pageSize,
  totalPages,
  onPrev,
  onNext,
  onPageSizeChange,
}: Props) {
  if (loading || totalItems === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 py-2 px-1 text-xs">
      <div className="text-text-tertiary">
        Showing <span className="font-semibold text-text-primary">{start}</span>–
        <span className="font-semibold text-text-primary">{end}</span> of{" "}
        <span className="font-semibold text-text-primary">{totalItems}</span> datasets
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-text-secondary">
          <span>Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 rounded-lg border border-border-primary bg-surface px-2 text-xs font-medium text-text-primary focus:outline-none focus:border-primary cursor-pointer transition-colors"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 border border-border-primary rounded-lg p-0.5 bg-surface">
          <button
            type="button"
            onClick={onPrev}
            disabled={page <= 1}
            aria-label="Previous page"
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronLeft size={15} />
          </button>

          <span className="px-2 text-xs font-semibold text-text-primary tabular-nums">
            {page} / {totalPages}
          </span>

          <button
            type="button"
            onClick={onNext}
            disabled={page >= totalPages}
            aria-label="Next page"
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

