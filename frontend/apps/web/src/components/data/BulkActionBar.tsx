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
    <div className="animate-fade-in border-border-primary bg-surface fixed bottom-12 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4 rounded-full border px-5 py-2 shadow-lg backdrop-blur-sm">
      <div className="text-text-primary text-sm font-medium">
        {count} selected
      </div>
      <div className="flex items-center gap-2">
        <button
          className="btn btn-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 border"
          onClick={onAddToProject}
        >
          + Add to Project
        </button>
        <button
          className="btn btn-xs bg-error/10 text-error border-error/20 hover:bg-error/20 border"
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
