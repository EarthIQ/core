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
          onClick={onAddToProject}
          className="btn btn-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
        >
          + Add to Project
        </button>
        <button
          onClick={onDelete}
          className="btn btn-xs bg-error/10 text-error border border-error/20 hover:bg-error/20"
        >
          🗑️ Delete
        </button>
        <button
          onClick={onClear}
          className="btn btn-ghost btn-xs text-text-tertiary"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
