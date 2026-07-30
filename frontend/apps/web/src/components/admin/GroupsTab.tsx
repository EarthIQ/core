import { type FormEvent } from "react";
import { GroupForm } from "./GroupForm";
import {
  type GroupFormState,
  type GroupSummary,
  type PermissionSummary,
  type UserSummary,
} from "./types";

interface GroupsTabProps {
  groups: GroupSummary[];
  users: UserSummary[];
  permissions: PermissionSummary[];
  submitting: boolean;
  createForm: GroupFormState;
  onCreateFormChange: (next: GroupFormState) => void;
  onCreateSubmit: (e: FormEvent) => void;
  editingId: string | null;
  editForm: GroupFormState;
  onEditFormChange: (next: GroupFormState) => void;
  onEditSubmit: (e: FormEvent) => void;
  onEditStart: (group: GroupSummary) => void;
  onEditCancel: () => void;
  onDelete: (id: string) => void;
}

export function GroupsTab({
  groups,
  users,
  permissions,
  submitting,
  createForm,
  onCreateFormChange,
  onCreateSubmit,
  editingId,
  editForm,
  onEditFormChange,
  onEditSubmit,
  onEditStart,
  onEditCancel,
  onDelete,
}: GroupsTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* ── Create form ── */}
      <div>
        <GroupForm
          title="Create group"
          form={createForm}
          users={users}
          permissions={permissions}
          submitting={submitting}
          submitLabel="Create group"
          onChange={onCreateFormChange}
          onSubmit={onCreateSubmit}
        />
      </div>

      {/* ── List ── */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary">Groups</h2>
          <span className="text-sm text-text-tertiary">
            {groups.length} total
          </span>
        </div>

        {groups.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No groups have been created yet.
          </p>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <GroupRow
                key={group.id}
                group={group}
                users={users}
                permissions={permissions}
                submitting={submitting}
                isEditing={editingId === group.id}
                editForm={editForm}
                onEditFormChange={onEditFormChange}
                onEditSubmit={onEditSubmit}
                onEditStart={onEditStart}
                onEditCancel={onEditCancel}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Single group row ─────────────────────────────────────────────────────────

interface GroupRowProps {
  group: GroupSummary;
  users: UserSummary[];
  permissions: PermissionSummary[];
  submitting: boolean;
  isEditing: boolean;
  editForm: GroupFormState;
  onEditFormChange: (next: GroupFormState) => void;
  onEditSubmit: (e: FormEvent) => void;
  onEditStart: (group: GroupSummary) => void;
  onEditCancel: () => void;
  onDelete: (id: string) => void;
}

function GroupRow({
  group,
  users,
  permissions,
  submitting,
  isEditing,
  editForm,
  onEditFormChange,
  onEditSubmit,
  onEditStart,
  onEditCancel,
  onDelete,
}: GroupRowProps) {
  return (
    <div className="rounded-xl border border-border-primary bg-surface-hover p-4">
      <div className="font-semibold text-text-primary">{group.name}</div>
      <div className="mt-1 text-sm text-text-secondary">
        {group.description || "No description"}
      </div>
      <div className="mt-1 text-xs text-text-tertiary">
        {group.permissions?.length
          ? `${group.permissions.length} permissions`
          : "No permissions"}{" "}
        · {group.users?.length ? `${group.users.length} members` : "No members"}
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          className="text-sm font-medium text-text-secondary hover:text-text-primary"
          onClick={() => onEditStart(group)}
        >
          Edit
        </button>
        <button
          type="button"
          className="text-sm font-medium text-danger hover:opacity-80"
          onClick={() => onDelete(group.id)}
        >
          Delete
        </button>
      </div>

      {isEditing && (
        <GroupForm
          form={editForm}
          users={users}
          permissions={permissions}
          submitting={submitting}
          submitLabel="Save group"
          onChange={onEditFormChange}
          onSubmit={onEditSubmit}
          onCancel={onEditCancel}
        />
      )}
    </div>
  );
}
