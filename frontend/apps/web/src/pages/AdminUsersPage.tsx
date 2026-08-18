import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@packages/ui";
import { AlertBanner } from "@/components/admin/AlertBanner";
import { SummaryCards } from "@/components/admin/SummaryCards";
import { UsersTab } from "@/components/admin/UsersTab";
import { GroupsTab } from "@/components/admin/GroupsTab";
import { PermissionsTab } from "@/components/admin/PermissionsTab";
import {
  type GroupFilterState,
  type GroupFormState,
  type GroupSummary,
  type PaginatedResponse,
  type PermissionFilterState,
  type PermissionFormState,
  type PermissionSummary,
  type UserFilterState,
  type UserFormState,
  type UserSummary,
  defaultGroupFilterState,
  defaultPermissionFilterState,
  defaultUserFilterState,
  emptyGroupForm,
  emptyPermissionForm,
  emptyUserForm,
} from "@/components/admin/types";

// ── Icons (inline SVG to avoid extra deps) ───────────────────────────────────

function UsersIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function GroupsIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function PermissionsIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user } = useAuth();

  // ── Users Data ────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [allUsers, setAllUsers] = useState<UserSummary[]>([]); // For group member pickers
  const [userTotal, setUserTotal] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userFilters, setUserFilters] = useState<UserFilterState>(defaultUserFilterState);
  const [usersLoading, setUsersLoading] = useState(true);

  // ── Groups Data ───────────────────────────────────────────────────────────
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [allGroups, setAllGroups] = useState<GroupSummary[]>([]); // For user group pickers
  const [groupTotal, setGroupTotal] = useState(0);
  const [groupTotalPages, setGroupTotalPages] = useState(1);
  const [groupFilters, setGroupFilters] = useState<GroupFilterState>(defaultGroupFilterState);
  const [groupsLoading, setGroupsLoading] = useState(true);

  // ── Permissions Data ──────────────────────────────────────────────────────
  const [permissions, setPermissions] = useState<PermissionSummary[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionSummary[]>([]); // For permission matrix
  const [permissionTotal, setPermissionTotal] = useState(0);
  const [permissionTotalPages, setPermissionTotalPages] = useState(1);
  const [permissionFilters, setPermissionFilters] = useState<PermissionFilterState>(defaultPermissionFilterState);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // ── General Status ────────────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Create modals & forms ────────────────────────────────────────────────
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm);

  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [groupForm, setGroupForm] = useState<GroupFormState>(emptyGroupForm);

  const [createPermissionModalOpen, setCreatePermissionModalOpen] = useState(false);
  const [permissionForm, setPermissionForm] = useState<PermissionFormState>(emptyPermissionForm);

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState<UserFormState>(emptyUserForm);

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupForm, setEditGroupForm] = useState<GroupFormState>(emptyGroupForm);

  const [editingPermissionId, setEditingPermissionId] = useState<string | null>(null);
  const [editPermissionForm, setEditPermissionForm] = useState<PermissionFormState>(emptyPermissionForm);

  const isAdmin = Boolean(user?.is_superuser);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function notify(message: string) {
    setNotice(message);
    setError(null);
  }

  function fail(err: unknown, fallback: string) {
    setError(err instanceof ApiError ? err.message : fallback);
    setNotice(null);
  }

  // ── Load Users ────────────────────────────────────────────────────────────

  const loadUsers = useCallback(
    async (filters: UserFilterState) => {
      setUsersLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.search) params.set("search", filters.search);
        if (filters.is_superuser !== "all") params.set("is_superuser", filters.is_superuser);
        if (filters.group_id !== "all") params.set("group_id", filters.group_id);
        params.set("sort_by", filters.sort_by);
        params.set("sort_order", filters.sort_order);
        params.set("page", String(filters.page));
        params.set("page_size", String(filters.page_size));

        const res = await api.get<PaginatedResponse<UserSummary>>(
          `/api/auth/users?${params.toString()}`,
        );
        setUsers(res.items);
        setUserTotal(res.total);
        setUserTotalPages(res.total_pages);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Unable to load users");
      } finally {
        setUsersLoading(false);
      }
    },
    [],
  );

  // ── Load Groups ───────────────────────────────────────────────────────────

  const loadGroups = useCallback(
    async (filters: GroupFilterState) => {
      setGroupsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.search) params.set("search", filters.search);
        params.set("sort_by", filters.sort_by);
        params.set("sort_order", filters.sort_order);
        params.set("page", String(filters.page));
        params.set("page_size", String(filters.page_size));

        const res = await api.get<PaginatedResponse<GroupSummary>>(
          `/api/auth/groups?${params.toString()}`,
        );
        setGroups(res.items);
        setGroupTotal(res.total);
        setGroupTotalPages(res.total_pages);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Unable to load groups");
      } finally {
        setGroupsLoading(false);
      }
    },
    [],
  );

  // ── Load Permissions ──────────────────────────────────────────────────────

  const loadPermissions = useCallback(
    async (filters: PermissionFilterState) => {
      setPermissionsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.search) params.set("search", filters.search);
        params.set("sort_by", filters.sort_by);
        params.set("sort_order", filters.sort_order);
        params.set("page", String(filters.page));
        params.set("page_size", String(filters.page_size));

        const res = await api.get<PaginatedResponse<PermissionSummary>>(
          `/api/auth/permissions?${params.toString()}`,
        );
        setPermissions(res.items);
        setPermissionTotal(res.total);
        setPermissionTotalPages(res.total_pages);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Unable to load permissions");
      } finally {
        setPermissionsLoading(false);
      }
    },
    [],
  );

  // ── Load Raw Metadata (all groups, all permissions, all users for form pickers) ──

  const loadMetadata = useCallback(async () => {
    try {
      const [groupsRes, permsRes, usersRes] = await Promise.all([
        api.get<GroupSummary[]>("/api/auth/groups"),
        api.get<PermissionSummary[]>("/api/auth/permissions"),
        api.get<PaginatedResponse<UserSummary>>("/api/auth/users?page_size=100"),
      ]);
      setAllGroups(Array.isArray(groupsRes) ? groupsRes : (groupsRes as PaginatedResponse<GroupSummary>).items);
      setAllPermissions(Array.isArray(permsRes) ? permsRes : (permsRes as PaginatedResponse<PermissionSummary>).items);
      setAllUsers(usersRes.items || []);
    } catch {
      // Non-critical background metadata fetch
    }
  }, []);

  // Debounced load triggers
  useEffect(() => {
    if (!isAdmin) return;
    const timer = setTimeout(() => {
      void loadUsers(userFilters);
    }, 200);
    return () => clearTimeout(timer);
  }, [isAdmin, userFilters, loadUsers]);

  useEffect(() => {
    if (!isAdmin) return;
    const timer = setTimeout(() => {
      void loadGroups(groupFilters);
    }, 200);
    return () => clearTimeout(timer);
  }, [isAdmin, groupFilters, loadGroups]);

  useEffect(() => {
    if (!isAdmin) return;
    const timer = setTimeout(() => {
      void loadPermissions(permissionFilters);
    }, 200);
    return () => clearTimeout(timer);
  }, [isAdmin, permissionFilters, loadPermissions]);

  useEffect(() => {
    if (isAdmin) {
      void loadMetadata();
    }
  }, [isAdmin, loadMetadata]);

  const summaryCards = useMemo(
    () => [
      { label: "Users", value: userTotal },
      { label: "Groups", value: groupTotal },
      { label: "Permissions", value: permissionTotal },
    ],
    [userTotal, groupTotal, permissionTotal],
  );

  // ── User handlers ─────────────────────────────────────────────────────────

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const created = await api.post<UserSummary>("/api/auth/users", {
        email: userForm.email,
        password: userForm.password,
        full_name: userForm.full_name || undefined,
        is_superuser: userForm.is_superuser,
        groups: userForm.groups,
      });
      setUserForm(emptyUserForm);
      setCreateUserModalOpen(false);
      notify(`Created user ${created.email}`);
      void loadUsers(userFilters);
      void loadMetadata();
    } catch (err) {
      fail(err, "Unable to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditingUser = (userItem: UserSummary) => {
    setEditingUserId(userItem.id);
    setEditUserForm({
      email: userItem.email,
      password: "",
      full_name: userItem.full_name ?? "",
      is_superuser: userItem.is_superuser,
      groups: userItem.groups?.map((g) => g.id) ?? [],
    });
  };

  const saveUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingUserId) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        email: editUserForm.email,
        full_name: editUserForm.full_name || undefined,
        is_superuser: editUserForm.is_superuser,
        groups: editUserForm.groups,
      };
      if (editUserForm.password) payload.password = editUserForm.password;

      const updated = await api.put<UserSummary>(
        `/api/auth/users/${editingUserId}`,
        payload,
      );
      setEditingUserId(null);
      setEditUserForm(emptyUserForm);
      notify(`Updated user ${updated.email}`);
      void loadUsers(userFilters);
      void loadMetadata();
    } catch (err) {
      fail(err, "Unable to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteUser = async (userId: string) => {
    setSubmitting(true);
    try {
      await api.delete(`/api/auth/users/${userId}`);
      notify("User deleted successfully");
      void loadUsers(userFilters);
      void loadMetadata();
    } catch (err) {
      fail(err, "Unable to delete user");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Group handlers ────────────────────────────────────────────────────────

  const createGroup = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const created = await api.post<GroupSummary>("/api/auth/groups", {
        name: groupForm.name,
        description: groupForm.description || undefined,
        permissions: groupForm.permissions,
        user_ids: groupForm.user_ids,
      });
      setGroupForm(emptyGroupForm);
      setCreateGroupModalOpen(false);
      notify(`Created group ${created.name}`);
      void loadGroups(groupFilters);
      void loadMetadata();
    } catch (err) {
      fail(err, "Unable to create group");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditingGroup = (groupItem: GroupSummary) => {
    setEditingGroupId(groupItem.id);
    setEditGroupForm({
      name: groupItem.name,
      description: groupItem.description ?? "",
      permissions: groupItem.permissions?.map((p) => p.id) ?? [],
      user_ids: groupItem.users?.map((u) => u.id) ?? [],
    });
  };

  const saveGroup = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingGroupId) return;
    setSubmitting(true);
    try {
      const updated = await api.put<GroupSummary>(
        `/api/auth/groups/${editingGroupId}`,
        {
          name: editGroupForm.name,
          description: editGroupForm.description || undefined,
          permissions: editGroupForm.permissions,
          user_ids: editGroupForm.user_ids,
        },
      );
      setEditingGroupId(null);
      setEditGroupForm(emptyGroupForm);
      notify(`Updated group ${updated.name}`);
      void loadGroups(groupFilters);
      void loadMetadata();
    } catch (err) {
      fail(err, "Unable to update group");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteGroup = async (groupId: string) => {
    setSubmitting(true);
    try {
      await api.delete(`/api/auth/groups/${groupId}`);
      notify("Group deleted successfully");
      void loadGroups(groupFilters);
      void loadMetadata();
    } catch (err) {
      fail(err, "Unable to delete group");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Permission handlers ───────────────────────────────────────────────────

  const createPermission = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const created = await api.post<PermissionSummary>(
        "/api/auth/permissions",
        {
          name: permissionForm.name,
          description: permissionForm.description || undefined,
        },
      );
      setPermissionForm(emptyPermissionForm);
      setCreatePermissionModalOpen(false);
      notify(`Created permission ${created.name}`);
      void loadPermissions(permissionFilters);
      void loadMetadata();
    } catch (err) {
      fail(err, "Unable to create permission");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditingPermission = (permissionItem: PermissionSummary) => {
    setEditingPermissionId(permissionItem.id);
    setEditPermissionForm({
      name: permissionItem.name,
      description: permissionItem.description ?? "",
    });
  };

  const savePermission = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingPermissionId) return;
    setSubmitting(true);
    try {
      const updated = await api.put<PermissionSummary>(
        `/api/auth/permissions/${editingPermissionId}`,
        {
          name: editPermissionForm.name,
          description: editPermissionForm.description || undefined,
        },
      );
      setEditingPermissionId(null);
      setEditPermissionForm(emptyPermissionForm);
      notify(`Updated permission ${updated.name}`);
      void loadPermissions(permissionFilters);
      void loadMetadata();
    } catch (err) {
      fail(err, "Unable to update permission");
    } finally {
      setSubmitting(false);
    }
  };

  const deletePermission = async (permissionId: string) => {
    setSubmitting(true);
    try {
      await api.delete(`/api/auth/permissions/${permissionId}`);
      notify("Permission deleted successfully");
      void loadPermissions(permissionFilters);
      void loadMetadata();
    } catch (err) {
      fail(err, "Unable to delete permission");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Guard ─────────────────────────────────────────────────────────────────

  if (!isAdmin) {
    return (
      <div className="max-w-4xl space-y-4">
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-text-primary">
            Administrative access required
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Only superusers can manage users, groups, and permissions from this
            dashboard.
          </p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">
          User management
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Create and govern users, groups, and permissions from a single
          workspace.
        </p>
      </div>

      {/* Alerts */}
      {error && <AlertBanner type="error" message={error} />}
      {notice && <AlertBanner type="success" message={notice} />}

      {/* Summary */}
      <SummaryCards cards={summaryCards} />

      {/* Tabs */}
      <Tabs defaultValue="users" variant="underline">
        <TabsList>
          <TabsTrigger value="users" icon={<UsersIcon />}>
            Users
            <span className="ml-1.5 rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-tertiary">
              {userTotal}
            </span>
          </TabsTrigger>

          <TabsTrigger value="groups" icon={<GroupsIcon />}>
            Groups
            <span className="ml-1.5 rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-tertiary">
              {groupTotal}
            </span>
          </TabsTrigger>

          <TabsTrigger value="permissions" icon={<PermissionsIcon />}>
            Permissions
            <span className="ml-1.5 rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-tertiary">
              {permissionTotal}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab
            users={users}
            total={userTotal}
            totalPages={userTotalPages}
            groups={allGroups}
            loading={usersLoading}
            submitting={submitting}
            filters={userFilters}
            onFilterChange={(next) =>
              setUserFilters((prev) => ({ ...prev, ...next }))
            }
            createModalOpen={createUserModalOpen}
            onOpenCreateModal={() => {
              setUserForm(emptyUserForm);
              setCreateUserModalOpen(true);
            }}
            onCloseCreateModal={() => {
              setCreateUserModalOpen(false);
              setUserForm(emptyUserForm);
            }}
            createForm={userForm}
            onCreateFormChange={setUserForm}
            onCreateSubmit={createUser}
            editingId={editingUserId}
            editForm={editUserForm}
            onEditFormChange={setEditUserForm}
            onEditSubmit={saveUser}
            onEditStart={startEditingUser}
            onEditCancel={() => {
              setEditingUserId(null);
              setEditUserForm(emptyUserForm);
            }}
            onDelete={deleteUser}
          />
        </TabsContent>

        <TabsContent value="groups">
          <GroupsTab
            groups={groups}
            total={groupTotal}
            totalPages={groupTotalPages}
            users={allUsers}
            permissions={allPermissions}
            loading={groupsLoading}
            submitting={submitting}
            filters={groupFilters}
            onFilterChange={(next) =>
              setGroupFilters((prev) => ({ ...prev, ...next }))
            }
            createModalOpen={createGroupModalOpen}
            onOpenCreateModal={() => {
              setGroupForm(emptyGroupForm);
              setCreateGroupModalOpen(true);
            }}
            onCloseCreateModal={() => {
              setCreateGroupModalOpen(false);
              setGroupForm(emptyGroupForm);
            }}
            createForm={groupForm}
            onCreateFormChange={setGroupForm}
            onCreateSubmit={createGroup}
            editingId={editingGroupId}
            editForm={editGroupForm}
            onEditFormChange={setEditGroupForm}
            onEditSubmit={saveGroup}
            onEditStart={startEditingGroup}
            onEditCancel={() => {
              setEditingGroupId(null);
              setEditGroupForm(emptyGroupForm);
            }}
            onDelete={deleteGroup}
          />
        </TabsContent>

        <TabsContent value="permissions">
          <PermissionsTab
            permissions={permissions}
            total={permissionTotal}
            totalPages={permissionTotalPages}
            loading={permissionsLoading}
            submitting={submitting}
            filters={permissionFilters}
            onFilterChange={(next) =>
              setPermissionFilters((prev) => ({ ...prev, ...next }))
            }
            createModalOpen={createPermissionModalOpen}
            onOpenCreateModal={() => {
              setPermissionForm(emptyPermissionForm);
              setCreatePermissionModalOpen(true);
            }}
            onCloseCreateModal={() => {
              setCreatePermissionModalOpen(false);
              setPermissionForm(emptyPermissionForm);
            }}
            createForm={permissionForm}
            onCreateFormChange={setPermissionForm}
            onCreateSubmit={createPermission}
            editingId={editingPermissionId}
            editForm={editPermissionForm}
            onEditFormChange={setEditPermissionForm}
            onEditSubmit={savePermission}
            onEditStart={startEditingPermission}
            onEditCancel={() => {
              setEditingPermissionId(null);
              setEditPermissionForm(emptyPermissionForm);
            }}
            onDelete={deletePermission}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

