import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@packages/ui";
import { AlertBanner } from "@/components/admin/AlertBanner";
import { SummaryCards } from "@/components/admin/SummaryCards";
import { UsersTab } from "@/components/admin/UsersTab";
import { GroupsTab } from "@/components/admin/GroupsTab";
import { PermissionsTab } from "@/components/admin/PermissionsTab";
import {
  type GroupFormState,
  type GroupSummary,
  type PermissionFormState,
  type PermissionSummary,
  type UserFormState,
  type UserSummary,
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

  // ── Data ──────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [permissions, setPermissions] = useState<PermissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Create forms ─────────────────────────────────────────────────────────
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm);
  const [groupForm, setGroupForm] = useState<GroupFormState>(emptyGroupForm);
  const [permissionForm, setPermissionForm] =
    useState<PermissionFormState>(emptyPermissionForm);

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] =
    useState<UserFormState>(emptyUserForm);

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupForm, setEditGroupForm] =
    useState<GroupFormState>(emptyGroupForm);

  const [editingPermissionId, setEditingPermissionId] = useState<string | null>(
    null,
  );
  const [editPermissionForm, setEditPermissionForm] =
    useState<PermissionFormState>(emptyPermissionForm);

  const isAdmin = Boolean(user?.is_superuser);

  // ── Load data ─────────────────────────────────────────────────────────────

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, groupsRes, permissionsRes] = await Promise.all([
        api.get<UserSummary[]>("/api/auth/users"),
        api.get<GroupSummary[]>("/api/auth/groups"),
        api.get<PermissionSummary[]>("/api/auth/permissions"),
      ]);
      setUsers(usersRes);
      setGroups(groupsRes);
      setPermissions(permissionsRes);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to load admin data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    void loadData();
  }, [isAdmin]);

  const summaryCards = useMemo(
    () => [
      { label: "Users", value: users.length },
      { label: "Groups", value: groups.length },
      { label: "Permissions", value: permissions.length },
    ],
    [users.length, groups.length, permissions.length],
  );

  // ── Helpers ───────────────────────────────────────────────────────────────

  function notify(message: string) {
    setNotice(message);
    setError(null);
  }

  function fail(err: unknown, fallback: string) {
    setError(err instanceof ApiError ? err.message : fallback);
    setNotice(null);
  }

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
      setUsers((prev) => [created, ...prev]);
      setUserForm(emptyUserForm);
      notify(`Created user ${created.email}`);
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
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingUserId(null);
      setEditUserForm(emptyUserForm);
      notify(`Updated user ${updated.email}`);
    } catch (err) {
      fail(err, "Unable to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteUser = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target || !window.confirm(`Delete ${target.email}?`)) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/auth/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      notify(`Deleted user ${target.email}`);
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
      setGroups((prev) => [created, ...prev]);
      setGroupForm(emptyGroupForm);
      notify(`Created group ${created.name}`);
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
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setEditingGroupId(null);
      setEditGroupForm(emptyGroupForm);
      notify(`Updated group ${updated.name}`);
    } catch (err) {
      fail(err, "Unable to update group");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteGroup = async (groupId: string) => {
    const target = groups.find((g) => g.id === groupId);
    if (!target || !window.confirm(`Delete ${target.name}?`)) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/auth/groups/${groupId}`);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      notify(`Deleted group ${target.name}`);
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
      setPermissions((prev) => [created, ...prev]);
      setPermissionForm(emptyPermissionForm);
      notify(`Created permission ${created.name}`);
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
      setPermissions((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
      setEditingPermissionId(null);
      setEditPermissionForm(emptyPermissionForm);
      notify(`Updated permission ${updated.name}`);
    } catch (err) {
      fail(err, "Unable to update permission");
    } finally {
      setSubmitting(false);
    }
  };

  const deletePermission = async (permissionId: string) => {
    const target = permissions.find((p) => p.id === permissionId);
    if (!target || !window.confirm(`Delete ${target.name}?`)) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/auth/permissions/${permissionId}`);
      setPermissions((prev) => prev.filter((p) => p.id !== permissionId));
      notify(`Deleted permission ${target.name}`);
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
              {users.length}
            </span>
          </TabsTrigger>

          <TabsTrigger value="groups" icon={<GroupsIcon />}>
            Groups
            <span className="ml-1.5 rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-tertiary">
              {groups.length}
            </span>
          </TabsTrigger>

          <TabsTrigger value="permissions" icon={<PermissionsIcon />}>
            Permissions
            <span className="ml-1.5 rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-tertiary">
              {permissions.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab
            users={users}
            groups={groups}
            loading={loading}
            submitting={submitting}
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
            users={users}
            permissions={permissions}
            submitting={submitting}
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
            submitting={submitting}
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
