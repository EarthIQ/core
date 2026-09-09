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
    <form
      className="space-y-4"
      onSubmit={onSubmit}
    >
      <div className="space-y-1.5">
        <label className="text-text-secondary block text-xs font-semibold tracking-wider uppercase">
          Email address <span className="text-danger">*</span>
        </label>
        <input
          required
          className="input border-border-primary bg-surface text-text-primary focus:border-primary focus:ring-primary w-full rounded-lg border px-3.5 py-2 text-sm focus:ring-1 focus:outline-none"
          placeholder="name@example.com"
          type="email"
          value={form.email}
          onChange={(e) => onChange({ ...form, email: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-text-secondary block text-xs font-semibold tracking-wider uppercase">
            Password{" "}
            {passwordRequired ? <span className="text-danger">*</span> : null}
          </label>
          {!passwordRequired && (
            <span className="text-text-tertiary text-xs">
              Leave blank to keep current
            </span>
          )}
        </div>
        <input
          className="input border-border-primary bg-surface text-text-primary focus:border-primary focus:ring-primary w-full rounded-lg border px-3.5 py-2 text-sm focus:ring-1 focus:outline-none"
          placeholder={
            passwordRequired ? "••••••••" : "Leave blank to keep unchanged"
          }
          required={passwordRequired}
          type="password"
          value={form.password}
          onChange={(e) => onChange({ ...form, password: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-text-secondary block text-xs font-semibold tracking-wider uppercase">
          Full name
        </label>
        <input
          className="input border-border-primary bg-surface text-text-primary focus:border-primary focus:ring-primary w-full rounded-lg border px-3.5 py-2 text-sm focus:ring-1 focus:outline-none"
          placeholder="e.g. Jane Doe"
          type="text"
          value={form.full_name}
          onChange={(e) => onChange({ ...form, full_name: e.target.value })}
        />
      </div>

      <div className="border-border-primary bg-surface-hover/50 rounded-lg border p-3">
        <label className="text-text-primary flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            checked={form.is_superuser}
            className="border-border-primary text-primary focus:ring-primary mt-0.5 h-4 w-4 rounded"
            type="checkbox"
            onChange={(e) =>
              onChange({ ...form, is_superuser: e.target.checked })
            }
          />
          <div>
            <div className="font-medium">
              Grant Superuser (Admin) Privileges
            </div>
            <div className="text-text-secondary text-xs">
              Superusers bypass permission checks and have full administrative
              control.
            </div>
          </div>
        </label>
      </div>

      <div className="space-y-1.5">
        <label className="text-text-secondary block text-xs font-semibold tracking-wider uppercase">
          Assigned Groups
        </label>
        <div className="border-border-primary bg-surface max-h-48 overflow-y-auto rounded-lg border p-3">
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
