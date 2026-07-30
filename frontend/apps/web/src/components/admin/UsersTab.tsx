import { type FormEvent } from "react";
import { UserForm } from "./UserForm";
import {
  type GroupSummary,
  type UserFormState,
  type UserSummary,
  emptyUserForm,
} from "./types";

interface UsersTabProps {
  users: UserSummary[];
  groups: GroupSummary[];
  loading: boolean;
  submitting: boolean;
  // create
  createForm: UserFormState;
  onCreateFormChange: (next: UserFormState) => void;
  onCreateSubmit: (e: FormEvent) => void;
  // edit
  editingId: string | null;
  editForm: UserFormState;
  onEditFormChange: (next: UserFormState) => void;
  onEditSubmit: (e: FormEvent) => void;
  onEditStart: (user: UserSummary) => void;
  onEditCancel: () => void;
  onDelete: (id: string) => void;
}

export function UsersTab({
  users,
  groups,
  loading,
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
}: UsersTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* ── Create form ── */}
      <div>
        <UserForm
          title="Create user"
          form={createForm}
          groups={groups}
          submitting={submitting}
          submitLabel="Create user"
          passwordRequired
          onChange={onCreateFormChange}
          onSubmit={onCreateSubmit}
        />
      </div>

      {/* ── List ── */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary">Users</h2>
          <span className="text-sm text-text-tertiary">
            {users.length} total
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-text-secondary">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No users have been created yet.
          </p>
        ) : (
          <div className="space-y-3">
            {users.map((userItem) => (
              <UserRow
                key={userItem.id}
                userItem={userItem}
                groups={groups}
                submitting={submitting}
                isEditing={editingId === userItem.id}
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

// ── Single user row ─────────────────────────────────────────────────────────

interface UserRowProps {
  userItem: UserSummary;
  groups: GroupSummary[];
  submitting: boolean;
  isEditing: boolean;
  editForm: UserFormState;
  onEditFormChange: (next: UserFormState) => void;
  onEditSubmit: (e: FormEvent) => void;
  onEditStart: (user: UserSummary) => void;
  onEditCancel: () => void;
  onDelete: (id: string) => void;
}

function UserRow({
  userItem,
  groups,
  submitting,
  isEditing,
  editForm,
  onEditFormChange,
  onEditSubmit,
  onEditStart,
  onEditCancel,
  onDelete,
}: UserRowProps) {
  return (
    <div className="rounded-xl border border-border-primary bg-surface-hover p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-text-primary">
            {userItem.email}
          </div>
          <div className="text-sm text-text-secondary">
            {userItem.full_name || "No display name set"}
          </div>
        </div>
        <div className="shrink-0 text-right text-xs text-text-tertiary">
          <div>{userItem.is_superuser ? "Superuser" : "User"}</div>
          <div>
            {userItem.groups?.length
              ? `${userItem.groups.length} groups`
              : "No groups"}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          className="text-sm font-medium text-text-secondary hover:text-text-primary"
          onClick={() => onEditStart(userItem)}
        >
          Edit
        </button>
        <button
          type="button"
          className="text-sm font-medium text-danger hover:opacity-80"
          onClick={() => onDelete(userItem.id)}
        >
          Delete
        </button>
      </div>

      {/* Inline edit form */}
      {isEditing && (
        <UserForm
          form={editForm}
          groups={groups}
          submitting={submitting}
          submitLabel="Save user"
          onChange={onEditFormChange}
          onSubmit={onEditSubmit}
          onCancel={onEditCancel}
        />
      )}
    </div>
  );
}
