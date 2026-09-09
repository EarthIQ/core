import { Modal, Pagination } from "@packages/ui";
import { type FormEvent, useState } from "react";

import {
  type GroupSummary,
  type UserFilterState,
  type UserFormState,
  type UserSummary,
} from "./types";
import { UserForm } from "./UserForm";

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

// ── UsersTab Component ───────────────────────────────────────────────────────

interface UsersTabProps {
  users: UserSummary[];
  total: number;
  totalPages: number;
  groups: GroupSummary[];
  loading: boolean;
  submitting: boolean;
  filters: UserFilterState;
  onFilterChange: (filters: Partial<UserFilterState>) => void;
  // create modal
  createModalOpen: boolean;
  onOpenCreateModal: () => void;
  onCloseCreateModal: () => void;
  createForm: UserFormState;
  onCreateFormChange: (next: UserFormState) => void;
  onCreateSubmit: (e: FormEvent) => void;
  // edit modal
  editingId: string | null;
  editForm: UserFormState;
  onEditFormChange: (next: UserFormState) => void;
  onEditSubmit: (e: FormEvent) => void;
  onEditStart: (user: UserSummary) => void;
  onEditCancel: () => void;
  onDelete: (id: string) => void;
}

export const UsersTab = ({
  users,
  total,
  totalPages,
  groups,
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
}: UsersTabProps) => {
  const [deleteCandidate, setDeleteCandidate] = useState<UserSummary | null>(
    null
  );

  const handleSort = (field: "created_at" | "email" | "full_name") => {
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

  const getInitials = (user: UserSummary) => {
    if (user.full_name) {
      const parts = user.full_name.trim().split(/\s+/);
      if (parts.length >= 2)
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* ── Top Bar: Search, Filters & Actions ── */}
      <div className="border-border-primary bg-surface flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Search & Filter Controls */}
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
            <div className="text-text-tertiary pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <SearchIcon />
            </div>
            <input
              className="border-border-primary bg-surface-hover/60 text-text-primary placeholder:text-text-tertiary focus:border-primary focus:bg-surface focus:ring-primary/20 w-full rounded-xl border py-2 pr-3.5 pl-9 text-sm focus:ring-2 focus:outline-none"
              placeholder="Search by name or email…"
              type="text"
              value={filters.search}
              onChange={(e) =>
                onFilterChange({ search: e.target.value, page: 1 })
              }
            />
          </div>

          {/* Role Filter */}
          <select
            className="border-border-primary bg-surface-hover/60 text-text-primary focus:border-primary focus:bg-surface focus:ring-primary/20 rounded-xl border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            value={filters.is_superuser}
            onChange={(e) =>
              onFilterChange({ is_superuser: e.target.value, page: 1 })
            }
          >
            <option value="all">All Roles</option>
            <option value="true">Superusers Only</option>
            <option value="false">Standard Users</option>
          </select>

          {/* Group Filter */}
          <select
            className="border-border-primary bg-surface-hover/60 text-text-primary focus:border-primary focus:bg-surface focus:ring-primary/20 rounded-xl border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            value={filters.group_id}
            onChange={(e) =>
              onFilterChange({ group_id: e.target.value, page: 1 })
            }
          >
            <option value="all">All Groups</option>
            {groups.map((g) => (
              <option
                key={g.id}
                value={g.id}
              >
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Create Button */}
        <button
          className="bg-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
          type="button"
          onClick={onOpenCreateModal}
        >
          <PlusIcon />
          <span>Add User</span>
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
                  onClick={() => handleSort("full_name")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>User</span>
                    <SortIcon
                      active={filters.sort_by === "full_name"}
                      order={filters.sort_order}
                    />
                  </div>
                </th>
                <th
                  className="hover:text-text-primary cursor-pointer px-6 py-3.5 transition select-none"
                  scope="col"
                  onClick={() => handleSort("email")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Email</span>
                    <SortIcon
                      active={filters.sort_by === "email"}
                      order={filters.sort_order}
                    />
                  </div>
                </th>
                <th
                  className="px-6 py-3.5"
                  scope="col"
                >
                  Role
                </th>
                <th
                  className="px-6 py-3.5"
                  scope="col"
                >
                  Groups
                </th>
                <th
                  className="hover:text-text-primary cursor-pointer px-6 py-3.5 transition select-none"
                  scope="col"
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
                    colSpan={6}
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
                      <span>Loading users…</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    className="text-text-secondary px-6 py-12 text-center"
                    colSpan={6}
                  >
                    <div className="mx-auto max-w-sm space-y-2">
                      <p className="text-text-primary font-medium">
                        No users found
                      </p>
                      <p className="text-text-tertiary text-xs">
                        {filters.search ||
                        filters.is_superuser !== "all" ||
                        filters.group_id !== "all"
                          ? "Try adjusting your search terms or filters."
                          : "Get started by adding your first user."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((userItem) => (
                  <tr
                    key={userItem.id}
                    className="group hover:bg-surface-hover/50 transition-colors"
                  >
                    {/* User Profile */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold">
                          {getInitials(userItem)}
                        </div>
                        <div>
                          <div className="text-text-primary font-medium">
                            {userItem.full_name || "-"}
                          </div>
                          <div className="text-text-tertiary text-xs sm:hidden">
                            {userItem.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="text-text-secondary px-6 py-4 font-mono text-xs">
                      {userItem.email}
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      {userItem.is_superuser ? (
                        <span className="bg-primary/15 text-primary inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
                          Superuser
                        </span>
                      ) : (
                        <span className="bg-surface-hover text-text-secondary inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                          Standard
                        </span>
                      )}
                    </td>

                    {/* Groups */}
                    <td className="px-6 py-4">
                      {userItem.groups && userItem.groups.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {userItem.groups.map((grp) => (
                            <span
                              key={grp.id}
                              className="border-border-primary bg-surface text-text-primary inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium"
                            >
                              {grp.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-text-tertiary text-xs">
                          No groups
                        </span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="text-text-secondary px-6 py-4 text-xs">
                      {new Date(userItem.created_at).toLocaleDateString(
                        undefined,
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="text-text-secondary hover:bg-surface-hover hover:text-text-primary rounded-lg p-1.5 transition"
                          title="Edit User"
                          type="button"
                          onClick={() => onEditStart(userItem)}
                        >
                          <EditIcon />
                        </button>
                        <button
                          className="text-danger hover:bg-danger/10 rounded-lg p-1.5 transition"
                          title="Delete User"
                          type="button"
                          onClick={() => setDeleteCandidate(userItem)}
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
        <div className="border-border-primary flex flex-col items-center justify-between gap-3 border-t px-6 py-3.5 sm:flex-row">
          <div className="text-text-secondary flex items-center gap-3 text-xs">
            <span>
              Showing{" "}
              {total === 0 ? 0 : (filters.page - 1) * filters.page_size + 1} to{" "}
              {Math.min(filters.page * filters.page_size, total)} of {total}{" "}
              users
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

      {/* ── Create User Modal ── */}
      <Modal
        description="Create a new user profile and assign permissions and groups."
        isOpen={createModalOpen}
        size="lg"
        title="Add New User"
        onClose={onCloseCreateModal}
      >
        <UserForm
          passwordRequired
          form={createForm}
          groups={groups}
          submitLabel="Create User"
          submitting={submitting}
          onCancel={onCloseCreateModal}
          onChange={onCreateFormChange}
          onSubmit={onCreateSubmit}
        />
      </Modal>

      {/* ── Edit User Modal ── */}
      <Modal
        description="Update user credentials, roles, and group memberships."
        isOpen={Boolean(editingId)}
        size="lg"
        title="Edit User"
        onClose={onEditCancel}
      >
        <UserForm
          form={editForm}
          groups={groups}
          passwordRequired={false}
          submitLabel="Save Changes"
          submitting={submitting}
          onCancel={onEditCancel}
          onChange={onEditFormChange}
          onSubmit={onEditSubmit}
        />
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        description="Are you sure you want to permanently delete this user? This action cannot be undone."
        isOpen={Boolean(deleteCandidate)}
        size="md"
        title="Delete User"
        onClose={() => setDeleteCandidate(null)}
      >
        <div className="space-y-4 pt-2">
          {deleteCandidate ? (
            <div className="border-border-primary bg-surface-hover/60 rounded-xl border p-3.5">
              <div className="text-text-primary font-semibold">
                {deleteCandidate.email}
              </div>
              <div className="text-text-secondary text-xs">
                {deleteCandidate.full_name || "No display name"} •{" "}
                {deleteCandidate.is_superuser ? "Superuser" : "Standard User"}
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
              {submitting ? "Deleting…" : "Delete User"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
