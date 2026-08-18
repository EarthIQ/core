import { type FormEvent, useState } from "react";
import { Modal, Pagination } from "@packages/ui";
import { GroupForm } from "./GroupForm";
import {
  type GroupFilterState,
  type GroupFormState,
  type GroupSummary,
  type PermissionSummary,
  type UserSummary,
} from "./types";

// ── Icons ───────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function SortIcon({ active, order }: { active: boolean; order: "asc" | "desc" }) {
  return (
    <svg
      className={`inline-block h-3.5 w-3.5 transition-transform ${
        active ? "text-primary opacity-100" : "opacity-30"
      } ${active && order === "asc" ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

// ── GroupsTab Component ──────────────────────────────────────────────────────

interface GroupsTabProps {
  groups: GroupSummary[];
  total: number;
  totalPages: number;
  users: UserSummary[];
  permissions: PermissionSummary[];
  loading: boolean;
  submitting: boolean;
  filters: GroupFilterState;
  onFilterChange: (filters: Partial<GroupFilterState>) => void;
  // create modal
  createModalOpen: boolean;
  onOpenCreateModal: () => void;
  onCloseCreateModal: () => void;
  createForm: GroupFormState;
  onCreateFormChange: (next: GroupFormState) => void;
  onCreateSubmit: (e: FormEvent) => void;
  // edit modal
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
  total,
  totalPages,
  users,
  permissions,
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
}: GroupsTabProps) {
  const [deleteCandidate, setDeleteCandidate] = useState<GroupSummary | null>(null);

  const handleSort = (field: "name" | "created_at") => {
    if (filters.sort_by === field) {
      onFilterChange({
        sort_order: filters.sort_order === "asc" ? "desc" : "asc",
        page: 1,
      });
    } else {
      onFilterChange({
        sort_by: field,
        sort_order: "asc",
        page: 1,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Top Bar: Search & Actions ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border-primary bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-[240px] flex-1 sm:max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-tertiary">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search groups by name or description…"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            className="w-full rounded-xl border border-border-primary bg-surface-hover/60 py-2 pr-3.5 pl-9 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <button
          type="button"
          onClick={onOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
        >
          <PlusIcon />
          <span>Add Group</span>
        </button>
      </div>

      {/* ── Table Container ── */}
      <div className="overflow-hidden rounded-2xl border border-border-primary bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-primary bg-surface-hover/40 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              <tr>
                <th
                  scope="col"
                  className="cursor-pointer px-6 py-3.5 transition select-none hover:text-text-primary"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Group Name</span>
                    <SortIcon
                      active={filters.sort_by === "name"}
                      order={filters.sort_order}
                    />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Description
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Permissions
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Members
                </th>
                <th
                  scope="col"
                  className="cursor-pointer px-6 py-3.5 transition select-none hover:text-text-primary"
                  onClick={() => handleSort("created_at")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Created Date</span>
                    <SortIcon
                      active={filters.sort_by === "created_at"}
                      order={filters.sort_order}
                    />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-secondary">
                    <div className="inline-flex items-center gap-2">
                      <svg
                        className="h-5 w-5 animate-spin text-primary"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
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
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Loading groups…</span>
                    </div>
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-secondary">
                    <div className="mx-auto max-w-sm space-y-2">
                      <p className="font-medium text-text-primary">No groups found</p>
                      <p className="text-xs text-text-tertiary">
                        {filters.search
                          ? "Try searching for a different group name."
                          : "Get started by creating your first group."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <tr
                    key={group.id}
                    className="group transition-colors hover:bg-surface-hover/50"
                  >
                    {/* Group Name */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-text-primary">{group.name}</div>
                    </td>

                    {/* Description */}
                    <td className="max-w-xs truncate px-6 py-4 text-xs text-text-secondary">
                      {group.description || <span className="text-text-tertiary">—</span>}
                    </td>

                    {/* Permissions Count */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {group.permissions?.length || 0} permissions
                      </span>
                    </td>

                    {/* Members Count */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-surface-hover px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                        {group.users?.length || 0} members
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="px-6 py-4 text-xs text-text-secondary">
                      {new Date(group.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEditStart(group)}
                          title="Edit Group"
                          className="rounded-lg p-1.5 text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(group)}
                          title="Delete Group"
                          className="rounded-lg p-1.5 text-danger transition hover:bg-danger/10"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border-primary px-6 py-3.5 sm:flex-row">
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <span>
              Showing {total === 0 ? 0 : (filters.page - 1) * filters.page_size + 1} to{" "}
              {Math.min(filters.page * filters.page_size, total)} of {total} groups
            </span>
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={filters.page_size}
                onChange={(e) =>
                  onFilterChange({ page_size: Number(e.target.value), page: 1 })
                }
                className="rounded-lg border border-border-primary bg-surface-hover/60 px-2 py-1 text-xs text-text-primary focus:border-primary focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
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

      {/* ── Create Group Modal ── */}
      <Modal
        isOpen={createModalOpen}
        onClose={onCloseCreateModal}
        title="Add New Group"
        description="Define a new role group, select component permissions, and assign members."
        size="lg"
      >
        <GroupForm
          form={createForm}
          users={users}
          permissions={permissions}
          submitting={submitting}
          submitLabel="Create Group"
          onChange={onCreateFormChange}
          onSubmit={onCreateSubmit}
          onCancel={onCloseCreateModal}
        />
      </Modal>

      {/* ── Edit Group Modal ── */}
      <Modal
        isOpen={Boolean(editingId)}
        onClose={onEditCancel}
        title="Edit Group"
        description="Modify group permissions matrix, description, or group members."
        size="lg"
      >
        <GroupForm
          form={editForm}
          users={users}
          permissions={permissions}
          submitting={submitting}
          submitLabel="Save Changes"
          onChange={onEditFormChange}
          onSubmit={onEditSubmit}
          onCancel={onEditCancel}
        />
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        isOpen={Boolean(deleteCandidate)}
        onClose={() => setDeleteCandidate(null)}
        title="Delete Group"
        description="Are you sure you want to permanently delete this group? All assigned users will lose their group association."
        size="md"
      >
        <div className="space-y-4 pt-2">
          {deleteCandidate && (
            <div className="rounded-xl border border-border-primary bg-surface-hover/60 p-3.5">
              <div className="font-semibold text-text-primary">{deleteCandidate.name}</div>
              <div className="text-xs text-text-secondary">
                {deleteCandidate.permissions?.length || 0} permissions •{" "}
                {deleteCandidate.users?.length || 0} members
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              className="rounded-lg border border-border-primary px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
              onClick={() => setDeleteCandidate(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white shadow transition hover:opacity-90 disabled:opacity-50"
              onClick={() => {
                if (deleteCandidate) {
                  onDelete(deleteCandidate.id);
                  setDeleteCandidate(null);
                }
              }}
            >
              {submitting ? "Deleting…" : "Delete Group"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

