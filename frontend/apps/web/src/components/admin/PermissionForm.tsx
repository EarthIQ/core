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

export const PermissionForm = ({
  title,
  form,
  submitting,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}: PermissionFormProps) => {
  const content = (
    <form
      className="space-y-4"
      onSubmit={onSubmit}
    >
      <div className="space-y-1.5">
        <label className="text-text-secondary block text-xs font-semibold tracking-wider uppercase">
          Permission Key <span className="text-danger">*</span>
        </label>
        <input
          required
          className="input border-border-primary bg-surface text-text-primary focus:border-primary focus:ring-primary w-full rounded-lg border px-3.5 py-2 text-sm focus:ring-1 focus:outline-none"
          placeholder="e.g. analytics:view, users:delete"
          type="text"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
        <p className="text-text-tertiary text-xs">
          Best practice: Use <code>component:action</code> format (e.g.{" "}
          <code>dashboard:view</code>)
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-text-secondary block text-xs font-semibold tracking-wider uppercase">
          Description
        </label>
        <textarea
          className="input border-border-primary bg-surface text-text-primary focus:border-primary focus:ring-primary min-h-[72px] w-full rounded-lg border px-3.5 py-2 text-sm focus:ring-1 focus:outline-none"
          placeholder="Describe what access this permission grants..."
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
        />
      </div>

      <div className="border-border-primary mt-6 flex items-center justify-end gap-3 border-t pt-4">
        {onCancel ? (
          <button
            className="border-border-primary text-text-secondary hover:bg-surface-hover hover:text-text-primary rounded-lg border px-4 py-2 text-sm font-medium transition"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        ) : null}
        <button
          className="bg-primary rounded-lg px-4 py-2 text-sm font-medium text-white shadow transition hover:opacity-90 disabled:opacity-50"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );

  if (title) {
    return (
      <section className="card p-6">
        <h2 className="text-text-primary mb-4 text-xl font-semibold">
          {title}
        </h2>
        {content}
      </section>
    );
  }

  return content;
};
