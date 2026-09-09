interface Props {
  label: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteModal({
  label,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div
      className="overlay animate-fade-in fixed inset-0 z-[999] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        aria-modal="true"
        className="bg-elevated border-border-primary animate-scale-in w-full max-w-sm overflow-hidden rounded-2xl border shadow-2xl"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-error/10 text-error flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl">
              🗑️
            </div>
            <div>
              <h2 className="text-text-primary text-base font-bold">
                Delete {label}?
              </h2>
              <p className="text-text-tertiary mt-0.5 text-xs">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              className="btn btn-secondary btn-md"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="btn btn-md bg-error hover:bg-error/90 text-white"
              onClick={onConfirm}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
