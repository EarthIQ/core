import { type FormEvent } from "react";
import { CheckboxList } from "./CheckboxList";
import { type GroupSummary, type UserFormState } from "./types";
import { toggleSelection } from "./helpers";

interface UserFormProps {
  title?: string;
  form: UserFormState;
  groups: GroupSummary[];
  submitting: boolean;
  submitLabel: string;
  passwordRequired?: boolean;
  onChange: (next: UserFormState) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel?: () => void;
}

export function UserForm({
  title,
  form,
  groups,
  submitting,
  submitLabel,
  passwordRequired = false,
  onChange,
  onSubmit,
  onCancel,
}: UserFormProps) {
  const fields = (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="form-field">
        <label className="form-label">Email</label>
        <input
          type="email"
          className="input"
          value={form.email}
          onChange={(e) => onChange({ ...form, email: e.target.value })}
          required
        />
      </div>

      <div className="form-field">
        <label className="form-label">
          Password
          {!passwordRequired && (
            <span className="ml-1 text-xs text-text-tertiary">
              (leave blank to keep current)
            </span>
          )}
        </label>
        <input
          type="password"
          className="input"
          value={form.password}
          onChange={(e) => onChange({ ...form, password: e.target.value })}
          required={passwordRequired}
        />
      </div>

      <div className="form-field">
        <label className="form-label">Full name</label>
        <input
          className="input"
          value={form.full_name}
          onChange={(e) => onChange({ ...form, full_name: e.target.value })}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={form.is_superuser}
          onChange={(e) =>
            onChange({ ...form, is_superuser: e.target.checked })
          }
        />
        Grant superuser access
      </label>

      <div className="form-field">
        <label className="form-label">Groups</label>
        <CheckboxList
          options={groups.map((g) => ({ id: g.id, label: g.name }))}
          selected={form.groups}
          emptyMessage="Create a group first to assign it here."
          onChange={(id) =>
            onChange({ ...form, groups: toggleSelection(form.groups, id) })
          }
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
