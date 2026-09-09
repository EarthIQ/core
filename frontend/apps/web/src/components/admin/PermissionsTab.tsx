import { Modal, Pagination } from "@packages/ui";
import { type FormEvent, useState } from "react";

import { PermissionForm } from "./PermissionForm";
import {
  type PermissionFilterState,
  type PermissionFormState,
  type PermissionSummary,
} from "./types";

// ── Icons ───────────────────────────────────────────────────────────────────

const SearchIcon = () => {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
};

const PlusIcon = () => {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 4v16m8-8H4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
};

const SortIcon = ({
  active,
  order,
}: {
  active: boolean;
  order: "asc" | "desc";
}) => {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      className={`inline-block h-3.5 w-3.5 transition-transform ${
        active ? "text-primary opacity-100" : "opacity-30"
      } ${active && order === "asc" ? "rotate-180" : ""}`}
    >
      <path
        d="M19 9l-7 7-7-7"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
};

const EditIcon = () => {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  );
};

const TrashIcon = () => {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  );
};

const KeyIcon = () => {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
};

// ── PermissionsTab Component ─────────────────────────────────────────────────

interface PermissionsTabProps {
  permissions: PermissionSummary[];
  total: number;
  totalPages: number;
  loading: boolean;
  submitting: boolean;
  filters: PermissionFilterState;
  onFilterChange: (filters: Partial<PermissionFilterState>) => void;
  // create modal
  createModalOpen: boolean;
  onOpenCreateModal: () => void;
  onCloseCreateModal: () => void;
  createForm: PermissionFormState;
  onCreateFormChange: (next: PermissionFormState) => void;
  onCreateSubmit: (e: FormEvent) => void;
  // edit modal
  editingId: string | null;
  editForm: PermissionFormState;
  onEditFormChange: (next: PermissionFormState) => void;
  onEditSubmit: (e: FormEvent) => void;
  onEditStart: (permission: PermissionSummary) => void;
  onEditCancel: () => void;
  onDelete: (id: string) => void;
}

export const PermissionsTab = ({
  permissions,
  total,
  totalPages,
  loading,
  submitting,
  filters,
  onFilterChange,
  createModalOpen,
  onOpenCreateModal,
  onCloseCreateModal,
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
}: PermissionsTabProps) => {
  const [deleteCandidate, setDeleteCandidate] =
    useState<PermissionSummary | null>(null);

  const handleSort = (field: "name") => {
    onFilterChange({
      sort_by: field,
      sort_order: filters.sort_order === "asc" ? "desc" : "asc",
      page: 1,
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Top Bar: Search & Actions ── */}
      <div className="border-border-primary bg-surface flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-[240px] flex-1 sm:max-w-md">
          <div className="text-text-tertiary pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <SearchIcon />
          </div>
          <input
            className="border-border-primary bg-surface-hover/60 text-text-primary placeholder:text-text-tertiary focus:border-primary focus:bg-surface focus:ring-primary/20 w-full rounded-xl border py-2 pr-3.5 pl-9 text-sm focus:ring-2 focus:outline-none"
            placeholder="Search permissions by key or description…"
            type="text"
            value={filters.search}
            onChange={(e) =>
              onFilterChange({ search: e.target.value, page: 1 })
            }
          />
        </div>

        <button
          className="bg-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
          type="button"
          onClick={onOpenCreateModal}
        >
          <PlusIcon />
          <span>Add Permission</span>
        </button>
      </div>

      {/* ── Table Container ── */}
      <div className="border-border-primary bg-surface overflow-hidden rounded-2xl border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-border-primary bg-surface-hover/40 text-text-secondary border-b text-xs font-semibold tracking-wider uppercase">
              <tr>
                <th
                  className="hover:text-text-primary cursor-pointer px-6 py-3.5 transition select-none"
                  scope="col"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Permission Key</span>
                    <SortIcon
                      active={filters.sort_by === "name"}
                      order={filters.sort_order}
                    />
                  </div>
                </th>
                <th
                  className="px-6 py-3.5"
                  scope="col"
                >
                  Component / Scope
                </th>
                <th
                  className="px-6 py-3.5"
                  scope="col"
                >
                  Description
                </th>
                <th
                  className="px-6 py-3.5 text-right"
                  scope="col"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-border-primary divide-y">
              {loading ? (
                <tr>
                  <td
                    className="text-text-secondary px-6 py-12 text-center"
                    colSpan={4}
                  >
                    <div className="inline-flex items-center gap-2">
                      <svg
                        className="text-primary h-5 w-5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          fill="currentColor"
                        />
                      </svg>
                      <span>Loading permissions…</span>
                    </div>
                  </td>
                </tr>
              ) : permissions.length === 0 ? (
                <tr>
                  <td
                    className="text-text-secondary px-6 py-12 text-center"
                    colSpan={4}
                  >
                    <div className="mx-auto max-w-sm space-y-2">
                      <p className="text-text-primary font-medium">
                        No permissions found
                      </p>
                      <p className="text-text-tertiary text-xs">
                        {filters.search
                          ? "Try searching for a different permission key."
                          : "Get started by adding your first permission."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                permissions.map((permission) => {
                  const parts = permission.name.split(":");
                  const componentName = parts.length > 1 ? parts[0] : "general";
                  const actionName =
                    parts.length > 1
                      ? parts.slice(1).join(":")
                      : permission.name;

                  return (
                    <tr
                      key={permission.id}
                      className="group hover:bg-surface-hover/50 transition-colors"
                    >
                      {/* Permission Key */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="bg-surface-hover text-text-secondary rounded-lg p-1.5">
                            <KeyIcon />
                          </span>
                          <span className="text-text-primary font-mono text-xs font-semibold">
                            {permission.name}
                          </span>
                        </div>
                      </td>

                      {/* Component / Scope Badge */}
                      <td className="px-6 py-4">
                        <span className="border-border-primary bg-surface-hover/80 text-text-primary inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium capitalize">
                          {componentName} &rarr; {actionName}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="text-text-secondary max-w-md truncate px-6 py-4 text-xs">
                        {permission.description || (
                          <span className="text-text-tertiary">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="text-text-secondary hover:bg-surface-hover hover:text-text-primary rounded-lg p-1.5 transition"
                            title="Edit Permission"
                            type="button"
                            onClick={() => onEditStart(permission)}
                          >
                            <EditIcon />
                          </button>
                          <button
                            className="text-danger hover:bg-danger/10 rounded-lg p-1.5 transition"
                            title="Delete Permission"
                            type="button"
                            onClick={() => setDeleteCandidate(permission)}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        <div className="border-border-primary flex flex-col items-center justify-between gap-3 border-t px-6 py-3.5 sm:flex-row">
          <div className="text-text-secondary flex items-center gap-3 text-xs">
            <span>
              Showing{" "}
              {total === 0 ? 0 : (filters.page - 1) * filters.page_size + 1} to{" "}
              {Math.min(filters.page * filters.page_size, total)} of {total}{" "}
              permissions
            </span>
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                className="border-border-primary bg-surface-hover/60 text-text-primary focus:border-primary rounded-lg border px-2 py-1 text-xs focus:outline-none"
                value={filters.page_size}
                onChange={(e) =>
                  onFilterChange({ page_size: Number(e.target.value), page: 1 })
                }
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <Pagination
            currentPage={filters.page}
            totalPages={totalPages}
            onPageChange={(page) => onFilterChange({ page })}
          />
        </div>
      </div>

      {/* ── Create Permission Modal ── */}
      <Modal
        description="Define a granular permission identifier and descriptive purpose."
        isOpen={createModalOpen}
        size="md"
        title="Add New Permission"
        onClose={onCloseCreateModal}
      >
        <PermissionForm
          form={createForm}
          submitLabel="Create Permission"
          submitting={submitting}
          onCancel={onCloseCreateModal}
          onChange={onCreateFormChange}
          onSubmit={onCreateSubmit}
        />
      </Modal>

      {/* ── Edit Permission Modal ── */}
      <Modal
        description="Modify permission identifier or update its description."
        isOpen={Boolean(editingId)}
        size="md"
        title="Edit Permission"
        onClose={onEditCancel}
      >
        <PermissionForm
          form={editForm}
          submitLabel="Save Changes"
          submitting={submitting}
          onCancel={onEditCancel}
          onChange={onEditFormChange}
          onSubmit={onEditSubmit}
        />
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        description="Are you sure you want to permanently delete this permission? Groups using this permission will lose this capability."
        isOpen={Boolean(deleteCandidate)}
        size="md"
        title="Delete Permission"
        onClose={() => setDeleteCandidate(null)}
      >
        <div className="space-y-4 pt-2">
          {deleteCandidate ? (
            <div className="border-border-primary bg-surface-hover/60 rounded-xl border p-3.5">
              <div className="text-text-primary font-mono text-sm font-semibold">
                {deleteCandidate.name}
              </div>
              <div className="text-text-secondary text-xs">
                {deleteCandidate.description || "No description"}
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              className="border-border-primary text-text-secondary hover:bg-surface-hover hover:text-text-primary rounded-lg border px-4 py-2 text-sm font-medium transition"
              type="button"
              onClick={() => setDeleteCandidate(null)}
            >
              Cancel
            </button>
            <button
              className="bg-danger rounded-lg px-4 py-2 text-sm font-medium text-white shadow transition hover:opacity-90 disabled:opacity-50"
              disabled={submitting}
              type="button"
              onClick={() => {
                if (deleteCandidate) {
                  onDelete(deleteCandidate.id);
                  setDeleteCandidate(null);
                }
              }}
            >
              {submitting ? "Deleting…" : "Delete Permission"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
