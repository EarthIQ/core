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
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 px-1">
      <div className="text-xs text-text-tertiary">
        Showing {(page - 1) * pageSize + 1}–
        {Math.min(page * pageSize, totalItems)} of {totalItems}
      </div>
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="input input-sm text-xs"
        >
          <option value={10}>10 / page</option>
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
        </select>
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className="btn btn-secondary btn-xs disabled:opacity-40"
        >
          ← Prev
        </button>
        <span className="text-xs text-text-secondary tabular-nums">
          Page {page} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className="btn btn-secondary btn-xs disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
