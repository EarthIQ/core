import { type FormEvent } from "react";
import { CheckboxList } from "./CheckboxList";
import { PermissionMatrix } from "./PermissionMatrix";
import {
  type GroupFormState,
  type PermissionSummary,
  type UserSummary,
} from "./types";
import { toggleSelection } from "./helpers";

interface GroupFormProps {
  title?: string;
  form: GroupFormState;
  users: UserSummary[];
  permissions: PermissionSummary[];
  submitting: boolean;
  submitLabel: string;
  onChange: (next: GroupFormState) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel?: () => void;
}

export function GroupForm({
  title,
  form,
  users,
  permissions,
  submitting,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}: GroupFormProps) {
  const content = (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Group Name <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Editors, Analysts, Managers"
          className="input w-full rounded-lg border border-border-primary bg-surface px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Description
        </label>
        <textarea
          placeholder="Brief description of the group's purpose and responsibilities..."
          className="input min-h-[72px] w-full rounded-lg border border-border-primary bg-surface px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Component Permissions Matrix (View, Add, Edit, Delete)
        </label>
        <div className="max-h-60 overflow-y-auto rounded-lg border border-border-primary bg-surface p-1">
          <PermissionMatrix
            permissions={permissions}
            selectedPermissionIds={form.permissions}
            onChange={(nextIds) => onChange({ ...form, permissions: nextIds })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Assigned Members
        </label>
        <div className="max-h-40 overflow-y-auto rounded-lg border border-border-primary bg-surface p-3">
          <CheckboxList
            options={users.map((u) => ({
              id: u.id,
              label: u.full_name ? `${u.full_name} (${u.email})` : u.email,
            }))}
            selected={form.user_ids}
            emptyMessage="No users available yet."
            onChange={(id) =>
              onChange({
                ...form,
                user_ids: toggleSelection(form.user_ids, id),
              })
            }
          />
        </div>
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

