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
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-2 text-xs">
      <div className="text-text-tertiary">
        Showing <span className="text-text-primary font-semibold">{start}</span>
        –<span className="text-text-primary font-semibold">{end}</span> of{" "}
        <span className="text-text-primary font-semibold">{totalItems}</span>{" "}
        datasets
      </div>

      <div className="flex items-center gap-3">
        <div className="text-text-secondary flex items-center gap-1.5">
          <span>Rows:</span>
          <select
            className="border-border-primary bg-surface text-text-primary focus:border-primary h-8 cursor-pointer rounded-lg border px-2 text-xs font-medium transition-colors focus:outline-none"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>

        <div className="border-border-primary bg-surface flex items-center gap-1.5 rounded-lg border p-0.5">
          <button
            aria-label="Previous page"
            className="text-text-secondary hover:bg-surface-hover hover:text-text-primary flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30"
            disabled={page <= 1}
            type="button"
            onClick={onPrev}
          >
            <ChevronLeft size={15} />
          </button>

          <span className="text-text-primary px-2 text-xs font-semibold tabular-nums">
            {page} / {totalPages}
          </span>

          <button
            aria-label="Next page"
            className="text-text-secondary hover:bg-surface-hover hover:text-text-primary flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30"
            disabled={page >= totalPages}
            type="button"
            onClick={onNext}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
