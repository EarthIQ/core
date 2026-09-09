import { type FormEvent } from "react";

import { CheckboxList } from "./CheckboxList";
import { toggleSelection } from "./helpers";
import { PermissionMatrix } from "./PermissionMatrix";
import {
  type GroupFormState,
  type PermissionSummary,
  type UserSummary,
} from "./types";

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

export const GroupForm = ({
  title,
  form,
  users,
  permissions,
  submitting,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}: GroupFormProps) => {
  const content = (
    <form
      className="space-y-4"
      onSubmit={onSubmit}
    >
      <div className="space-y-1.5">
        <label className="text-text-secondary block text-xs font-semibold tracking-wider uppercase">
          Group Name <span className="text-danger">*</span>
        </label>
        <input
          required
          className="input border-border-primary bg-surface text-text-primary focus:border-primary focus:ring-primary w-full rounded-lg border px-3.5 py-2 text-sm focus:ring-1 focus:outline-none"
          placeholder="e.g. Editors, Analysts, Managers"
          type="text"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-text-secondary block text-xs font-semibold tracking-wider uppercase">
          Description
        </label>
        <textarea
          className="input border-border-primary bg-surface text-text-primary focus:border-primary focus:ring-primary min-h-[72px] w-full rounded-lg border px-3.5 py-2 text-sm focus:ring-1 focus:outline-none"
          placeholder="Brief description of the group's purpose and responsibilities..."
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-text-secondary block text-xs font-semibold tracking-wider uppercase">
          Component Permissions Matrix (View, Add, Edit, Delete)
        </label>
        <div className="border-border-primary bg-surface max-h-60 overflow-y-auto rounded-lg border p-1">
          <PermissionMatrix
            permissions={permissions}
            selectedPermissionIds={form.permissions}
            onChange={(nextIds) => onChange({ ...form, permissions: nextIds })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-text-secondary block text-xs font-semibold tracking-wider uppercase">
          Assigned Members
        </label>
        <div className="border-border-primary bg-surface max-h-40 overflow-y-auto rounded-lg border p-3">
          <CheckboxList
            emptyMessage="No users available yet."
            selected={form.user_ids}
            options={users.map((u) => ({
              id: u.id,
              label: u.full_name ? `${u.full_name} (${u.email})` : u.email,
            }))}
            onChange={(id) =>
              onChange({
                ...form,
                user_ids: toggleSelection(form.user_ids, id),
              })
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
