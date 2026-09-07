import { type FormEvent } from "react";

import { CheckboxList } from "./CheckboxList";
import { toggleSelection } from "./helpers";
import { type GroupSummary, type UserFormState } from "./types";

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

export const UserForm = ({
  title,
  form,
  groups,
  submitting,
  submitLabel,
  passwordRequired = false,
  onChange,
  onSubmit,
  onCancel,
}: UserFormProps) => {
  const content = (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Email address <span className="text-danger">*</span>
        </label>
        <input
          required
          className="input w-full rounded-lg border border-border-primary bg-surface px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="name@example.com"
          type="email"
          value={form.email}
          onChange={(e) => onChange({ ...form, email: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Password {passwordRequired ? <span className="text-danger">*</span> : null}
          </label>
          {!passwordRequired && (
            <span className="text-xs text-text-tertiary">
              Leave blank to keep current
            </span>
          )}
        </div>
        <input
          className="input w-full rounded-lg border border-border-primary bg-surface px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder={passwordRequired ? "••••••••" : "Leave blank to keep unchanged"}
          required={passwordRequired}
          type="password"
          value={form.password}
          onChange={(e) => onChange({ ...form, password: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Full name
        </label>
        <input
          className="input w-full rounded-lg border border-border-primary bg-surface px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="e.g. Jane Doe"
          type="text"
          value={form.full_name}
          onChange={(e) => onChange({ ...form, full_name: e.target.value })}
        />
      </div>

      <div className="rounded-lg border border-border-primary bg-surface-hover/50 p-3">
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-text-primary">
          <input
            checked={form.is_superuser}
            className="mt-0.5 h-4 w-4 rounded border-border-primary text-primary focus:ring-primary"
            type="checkbox"
            onChange={(e) =>
              onChange({ ...form, is_superuser: e.target.checked })
            }
          />
          <div>
            <div className="font-medium">Grant Superuser (Admin) Privileges</div>
            <div className="text-xs text-text-secondary">
              Superusers bypass permission checks and have full administrative control.
            </div>
          </div>
        </label>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Assigned Groups
        </label>
        <div className="max-h-48 overflow-y-auto rounded-lg border border-border-primary bg-surface p-3">
          <CheckboxList
            emptyMessage="No groups available. Create a group first to assign it."
            options={groups.map((g) => ({ id: g.id, label: g.name }))}
            selected={form.groups}
            onChange={(id) =>
              onChange({ ...form, groups: toggleSelection(form.groups, id) })
            }
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-border-primary pt-4">
        {onCancel ? <button
            className="rounded-lg border border-border-primary px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button> : null}
        <button
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow transition hover:opacity-90 disabled:opacity-50"
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
        <h2 className="mb-4 text-xl font-semibold text-text-primary">{title}</h2>
        {content}
      </section>
    );
  }

  return content;
}

