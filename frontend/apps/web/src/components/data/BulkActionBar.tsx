interface Props {
  count: number;
  onAddToProject: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export default function BulkActionBar({
  count,
  onAddToProject,
  onDelete,
  onClear,
}: Props) {
  if (count === 0) return null;
  return (
    <div className="card px-4 py-2.5 flex items-center justify-between gap-3 bg-primary/5 border-primary/20 animate-fade-in">
      <div className="text-sm text-text-primary font-medium">
        {count} selected
      </div>
      <div className="flex items-center gap-2">
        <button
          className="btn btn-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
          onClick={onAddToProject}
        >
          + Add to Project
        </button>
        <button
          className="btn btn-xs bg-error/10 text-error border border-error/20 hover:bg-error/20"
          onClick={onDelete}
        >
          🗑️ Delete
        </button>
        <button
          className="btn btn-ghost btn-xs text-text-tertiary"
          onClick={onClear}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
