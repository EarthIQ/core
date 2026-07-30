import { type FormEvent } from "react";
import { type PermissionFormState } from "./types";

interface PermissionFormProps {
  // When title is provided this renders as a create card;
  // omit title to render just the form fields (edit mode).
  title?: string;
  form: PermissionFormState;
  submitting: boolean;
  submitLabel: string;
  onChange: (next: PermissionFormState) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel?: () => void;
}

export function PermissionForm({
  title,
  form,
  submitting,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}: PermissionFormProps) {
  const fields = (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="form-field">
        <label className="form-label">Name</label>
        <input
          className="input"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="form-field">
        <label className="form-label">Description</label>
        <textarea
          className="input min-h-[80px]"
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );

  if (title) {
    return (
      <section className="card p-6">
        <h2 className="mb-4 text-xl font-semibold text-text-primary">
          {title}
        </h2>
        {fields}
      </section>
    );
  }

  return (
    <div className="mt-4 border-t border-border-primary pt-4">{fields}</div>
  );
}
