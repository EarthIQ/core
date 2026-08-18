import { type FormEvent } from "react";
import { type PermissionFormState } from "./types";

interface PermissionFormProps {
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
  const content = (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Permission Key <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. analytics:view, users:delete"
          className="input w-full rounded-lg border border-border-primary bg-surface px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          required
        />
        <p className="text-xs text-text-tertiary">
          Best practice: Use <code>component:action</code> format (e.g. <code>dashboard:view</code>)
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Description
        </label>
        <textarea
          placeholder="Describe what access this permission grants..."
          className="input min-h-[72px] w-full rounded-lg border border-border-primary bg-surface px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
        />
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-border-primary pt-4">
        {onCancel && (
          <button
            type="button"
            className="rounded-lg border border-border-primary px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow transition hover:opacity-90 disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );

  if (title) {
    return (
      <section className="card p-6">
        <h2 className="mb-4 text-xl font-semibold text-text-primary">{title}</h2>
        {content}
      </section>
    );
  }

  return content;
}

