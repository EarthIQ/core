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
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 overlay animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-elevated border border-border-primary rounded-2xl shadow-2xl animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center text-xl shrink-0">
              🗑️
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">
                Delete {label}?
              </h2>
              <p className="text-xs text-text-tertiary mt-0.5">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={onCancel} className="btn btn-secondary btn-md">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="btn btn-md bg-error text-white hover:bg-error/90"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
