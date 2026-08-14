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

      <div className="form-field">
        <label className="form-label">Component Permissions Matrix (View, Add, Edit, Delete)</label>
        <PermissionMatrix
          permissions={permissions}
          selectedPermissionIds={form.permissions}
          onChange={(nextIds) => onChange({ ...form, permissions: nextIds })}
        />
      </div>

      <div className="form-field">
        <label className="form-label">Members</label>
        <CheckboxList
          options={users.map((u) => ({ id: u.id, label: u.email }))}
          selected={form.user_ids}
          emptyMessage="Create users first to add them to a group."
          onChange={(id) =>
            onChange({
              ...form,
              user_ids: toggleSelection(form.user_ids, id),
            })
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
