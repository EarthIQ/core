import { type FormEvent } from "react";
import { PermissionForm } from "./PermissionForm";
import { type PermissionFormState, type PermissionSummary } from "./types";

interface PermissionsTabProps {
  permissions: PermissionSummary[];
  submitting: boolean;
  createForm: PermissionFormState;
  onCreateFormChange: (next: PermissionFormState) => void;
  onCreateSubmit: (e: FormEvent) => void;
  editingId: string | null;
  editForm: PermissionFormState;
  onEditFormChange: (next: PermissionFormState) => void;
  onEditSubmit: (e: FormEvent) => void;
  onEditStart: (permission: PermissionSummary) => void;
  onEditCancel: () => void;
  onDelete: (id: string) => void;
}

export function PermissionsTab({
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
}: PermissionsTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* ── Create form ── */}
      <div>
        <PermissionForm
          title="Create permission"
          form={createForm}
          submitting={submitting}
          submitLabel="Create permission"
          onChange={onCreateFormChange}
          onSubmit={onCreateSubmit}
        />
      </div>

      {/* ── List ── */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary">
            Permissions
          </h2>
          <span className="text-sm text-text-tertiary">
            {permissions.length} total
          </span>
        </div>

        {permissions.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No permissions have been created yet.
          </p>
        ) : (
          <div className="space-y-3">
            {permissions.map((permission) => (
              <PermissionRow
                key={permission.id}
                permission={permission}
                submitting={submitting}
                isEditing={editingId === permission.id}
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

// ── Single permission row ────────────────────────────────────────────────────

interface PermissionRowProps {
  permission: PermissionSummary;
  submitting: boolean;
  isEditing: boolean;
  editForm: PermissionFormState;
  onEditFormChange: (next: PermissionFormState) => void;
  onEditSubmit: (e: FormEvent) => void;
  onEditStart: (permission: PermissionSummary) => void;
  onEditCancel: () => void;
  onDelete: (id: string) => void;
}

function PermissionRow({
  permission,
  submitting,
  isEditing,
  editForm,
  onEditFormChange,
  onEditSubmit,
  onEditStart,
  onEditCancel,
  onDelete,
}: PermissionRowProps) {
  return (
    <div className="rounded-xl border border-border-primary bg-surface-hover p-4">
      <div className="font-semibold text-text-primary">{permission.name}</div>
      <div className="mt-1 text-sm text-text-secondary">
        {permission.description || "No description"}
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          className="text-sm font-medium text-text-secondary hover:text-text-primary"
          onClick={() => onEditStart(permission)}
        >
          Edit
        </button>
        <button
          type="button"
          className="text-sm font-medium text-danger hover:opacity-80"
          onClick={() => onDelete(permission.id)}
        >
          Delete
        </button>
      </div>

      {isEditing && (
        <PermissionForm
          form={editForm}
          submitting={submitting}
          submitLabel="Save permission"
          onChange={onEditFormChange}
          onSubmit={onEditSubmit}
          onCancel={onEditCancel}
        />
      )}
    </div>
  );
}
