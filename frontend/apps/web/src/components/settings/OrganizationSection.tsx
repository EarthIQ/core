/**
 * Settings - Organization section (core).
 *
 * The user's "organization profile": list of organizations, create, edit the
 * org identity (name, description, industry, website, location, accent),
 * manage members (add by email, change role, remove), set the primary org,
 * leave or delete an organization.
 *
 * All calls go to ``/api/v1/profile/organizations…``.
 */
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { initials, hueFrom } from "@/lib/format";

interface Org {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  industry: string | null;
  website: string | null;
  logo_url: string | null;
  location: string | null;
  accent_color: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  member_count: number;
  my_role: string | null;
  is_primary: boolean;
}

interface Member {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  joined_at: string;
}

const ROLES = ["owner", "admin", "member", "viewer"] as const;

const ROLE_BADGE: Record<string, string> = {
  owner: "badge-primary",
  admin: "badge-info",
  member: "badge-success",
  viewer: "badge-warning",
};

export default function OrganizationSection() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Create-org form.
  const [create, setCreate] = useState({
    name: "",
    description: "",
    industry: "",
  });
  const [creating, setCreating] = useState(false);

  // Edit selected org.
  const [edit, setEdit] = useState({
    name: "",
    description: "",
    industry: "",
    website: "",
    location: "",
    accent_color: "",
  });
  const [saving, setSaving] = useState(false);

  // Add member.
  const [addMemberDraft, setAddMemberDraft] = useState({
    email: "",
    role: "member",
  });
  const [adding, setAdding] = useState(false);

  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    action: () => void;
  } | null>(null);

  const selected = orgs.find((o) => o.id === selectedId) ?? null;
  const canManage =
    Boolean(selected?.my_role) &&
    (selected?.my_role === "owner" ||
      selected?.my_role === "admin" ||
      user?.is_superuser);

  function notify(ok: string | null, err: string | null) {
    setFlash(ok);
    setError(err);
    if (ok) setTimeout(() => setFlash(null), 2500);
  }

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.get<Org[]>("/api/v1/profile/organizations");
      setOrgs(list);
    } catch (e) {
      notify(
        null,
        e instanceof Error ? e.message : "Could not load organizations"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrgs();
  }, [loadOrgs]);

  const loadMembers = useCallback(async (orgId: string) => {
    try {
      const list = await api.get<Member[]>(
        `/api/v1/profile/organizations/${orgId}/members`
      );
      setMembers(list);
    } catch {
      setMembers([]);
    }
  }, []);

  // Load members when an org is selected.
  useEffect(() => {
    if (!selectedId) {
      setMembers([]);
      return;
    }
    const org = orgs.find((o) => o.id === selectedId);
    if (org) {
      setEdit({
        name: org.name,
        description: org.description ?? "",
        industry: org.industry ?? "",
        website: org.website ?? "",
        location: org.location ?? "",
        accent_color: org.accent_color ?? "",
      });
    }
    loadMembers(selectedId);
  }, [selectedId, orgs, loadMembers]);

  // ── Org actions ──────────────────────────────────────────────────────────────

  const createOrg = async () => {
    if (!create.name.trim()) return;
    setCreating(true);
    try {
      const org = await api.post<Org>("/api/v1/profile/organizations", {
        name: create.name.trim(),
        description: create.description.trim() || null,
        industry: create.industry.trim() || null,
      });
      setCreate({ name: "", description: "", industry: "" });
      notify("Organization created", null);
      await loadOrgs();
      setSelectedId(org.id);
    } catch (e) {
      notify(null, e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const updateOrg = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await api.put(`/api/v1/profile/organizations/${selectedId}`, {
        name: edit.name.trim(),
        description: edit.description.trim() || null,
        industry: edit.industry.trim() || null,
        website: edit.website.trim() || null,
        location: edit.location.trim() || null,
        accent_color: edit.accent_color.trim() || null,
      });
      notify("Organization updated", null);
      await loadOrgs();
    } catch (e) {
      notify(null, e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const setPrimary = async (orgId: string) => {
    try {
      await api.post(`/api/v1/profile/organizations/${orgId}/primary`, {});
      notify("Primary organization set", null);
      await loadOrgs();
    } catch (e) {
      notify(null, e instanceof Error ? e.message : "Could not set primary");
    }
  };

  const leaveOrg = (org: Org) => {
    setConfirm({
      title: "Leave organization",
      message: `You will lose access to “${org.name}”. This cannot be undone.`,
      action: async () => {
        try {
          await api.delete(`/api/v1/profile/organizations/${org.id}/me`);
          setSelectedId(null);
          notify("You have left the organization", null);
          await loadOrgs();
        } catch (e) {
          notify(null, e instanceof Error ? e.message : "Could not leave");
        } finally {
          setConfirm(null);
        }
      },
    });
  };

  const deleteOrg = (org: Org) => {
    setConfirm({
      title: "Delete organization",
      message: `“${org.name}” and its membership records will be permanently deleted.`,
      action: async () => {
        try {
          await api.delete(`/api/v1/profile/organizations/${org.id}`);
          setSelectedId(null);
          notify("Organization deleted", null);
          await loadOrgs();
        } catch (e) {
          notify(null, e instanceof Error ? e.message : "Could not delete");
        } finally {
          setConfirm(null);
        }
      },
    });
  };

  // ── Member actions ───────────────────────────────────────────────────────────

  const addMember = async () => {
    if (!selectedId || !addMemberDraft.email.trim()) return;
    setAdding(true);
    try {
      const list = await api.post<Member[]>(
        `/api/v1/profile/organizations/${selectedId}/members`,
        { email: addMemberDraft.email.trim(), role: addMemberDraft.role }
      );
      setMembers(list);
      setAddMemberDraft({ email: "", role: "member" });
      notify("Member added", null);
      await loadOrgs();
    } catch (e) {
      notify(null, e instanceof Error ? e.message : "Could not add member");
    } finally {
      setAdding(false);
    }
  };

  const changeRole = async (memberId: string, role: string) => {
    if (!selectedId) return;
    try {
      const list = await api.put<Member[]>(
        `/api/v1/profile/organizations/${selectedId}/members/${memberId}`,
        { role }
      );
      setMembers(list);
    } catch (e) {
      notify(null, e instanceof Error ? e.message : "Could not change role");
      loadMembers(selectedId);
    }
  };

  const removeMember = (m: Member) => {
    if (!selectedId) return;
    setConfirm({
      title: "Remove member",
      message: `${m.full_name || m.email} will be removed from this organization.`,
      action: async () => {
        try {
          await api.delete(
            `/api/v1/profile/organizations/${selectedId}/members/${m.user_id}`
          );
          const list = await api.get<Member[]>(
            `/api/v1/profile/organizations/${selectedId}/members`
          );
          setMembers(list);
          notify("Member removed", null);
          await loadOrgs();
        } catch (e) {
          notify(
            null,
            e instanceof Error ? e.message : "Could not remove member"
          );
        } finally {
          setConfirm(null);
        }
      },
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="grid gap-6">
      {flash || error ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            flash
              ? "bg-success-subtle border-success/20 text-success"
              : "bg-error-subtle border-error/20 text-error"
          }`}
        >
          {flash ?? error}
        </div>
      ) : null}

      {/* ── Create organization ── */}
      <div className="card flex flex-col gap-4 p-6">
        <div>
          <h3 className="text-text-primary text-sm font-semibold">
            Create an organization
          </h3>
          <p className="text-text-secondary mt-0.5 text-xs">
            A workspace for your team - you become the owner.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="form-field">
            <label className="form-label">Name</label>
            <input
              className="input"
              placeholder="Rhine Basin Initiative"
              value={create.name}
              onChange={(e) =>
                setCreate((c) => ({ ...c, name: e.target.value }))
              }
            />
          </div>
          <div className="form-field">
            <label className="form-label">Industry (optional)</label>
            <input
              className="input"
              placeholder="Water utilities"
              value={create.industry}
              onChange={(e) =>
                setCreate((c) => ({ ...c, industry: e.target.value }))
              }
            />
          </div>
          <div className="form-field sm:col-span-2">
            <label className="form-label">Description (optional)</label>
            <textarea
              className="input min-h-[3.5rem] resize-y"
              placeholder="What is this organization about?"
              value={create.description}
              onChange={(e) =>
                setCreate((c) => ({ ...c, description: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            className="btn btn-primary"
            disabled={!create.name.trim() || creating}
            onClick={createOrg}
          >
            {creating ? "Creating…" : "+ Create organization"}
          </button>
        </div>
      </div>

      {/* ── My organizations ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-text-primary text-sm font-semibold">
            My organizations {orgs.length ? `(${orgs.length})` : ""}
          </h3>
          <button
            className="text-primary cursor-pointer text-xs no-underline"
            onClick={loadOrgs}
          >
            ↻ Refresh
          </button>
        </div>
        {loading ? (
          <div className="card text-text-secondary p-6 text-sm">
            Loading organizations…
          </div>
        ) : orgs.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="mb-2 text-2xl">🏢</div>
            <div className="text-text-primary text-sm font-medium">
              No organizations yet
            </div>
            <div className="text-text-secondary mt-1 text-xs">
              Create one above, or ask an admin to add you by email.
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {orgs.map((org) => (
              <div
                key={org.id}
                className={`card flex cursor-pointer flex-col gap-3 p-4 transition-all ${
                  selectedId === org.id
                    ? "border-primary"
                    : "hover:border-border-hover"
                }`}
                onClick={() => setSelectedId(org.id)}
              >
                <div className="flex items-start gap-3">
                  {org.logo_url ? (
                    <img
                      alt=""
                      className="border-border-primary h-10 w-10 rounded-lg border object-cover"
                      src={org.logo_url}
                    />
                  ) : (
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                      style={{
                        backgroundColor:
                          org.accent_color ||
                          `hsl(${hueFrom(org.name)} 45% 45%)`,
                      }}
                    >
                      {initials(org.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-text-primary flex items-center gap-1.5 truncate text-sm font-semibold">
                      <span className="truncate">{org.name}</span>
                      {org.is_primary ? (
                        <span title="Primary organization">⭐</span>
                      ) : null}
                    </div>
                    {org.my_role ? (
                      <span
                        className={`badge ${ROLE_BADGE[org.my_role] ?? "badge-info"} mt-1`}
                      >
                        {org.my_role}
                      </span>
                    ) : (
                      <span className="text-text-tertiary text-xs">
                        {org.member_count} member
                        {org.member_count === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </div>
                {org.description ? (
                  <p className="text-text-secondary line-clamp-2 text-xs">
                    {org.description}
                  </p>
                ) : null}
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  {org.my_role && !org.is_primary ? (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrimary(org.id);
                      }}
                    >
                      ⭐ Set primary
                    </button>
                  ) : null}
                  {org.my_role ? (
                    <>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          leaveOrg(org);
                        }}
                      >
                        Leave
                      </button>
                      {org.my_role === "owner" || user?.is_superuser ? (
                        <button
                          className="btn btn-ghost btn-sm text-error"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteOrg(org);
                          }}
                        >
                          Delete
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Selected organization details ── */}
      {selected ? (
        <div className="card flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{
                  backgroundColor:
                    edit.accent_color ||
                    `hsl(${hueFrom(selected.name)} 45% 45%)`,
                }}
              >
                {initials(selected.name)}
              </div>
              <div>
                <div className="text-text-primary text-sm font-semibold">
                  {selected.name}
                  {selected.is_primary ? (
                    <span className="ml-1.5">⭐</span>
                  ) : null}
                </div>
                <div className="text-text-tertiary text-xs">
                  {selected.member_count} member
                  {selected.member_count === 1 ? "" : "s"} · your role:{" "}
                  <span className="capitalize">
                    {selected.my_role ?? "guest"}
                  </span>
                </div>
              </div>
            </div>
            {canManage ? (
              <button
                className="btn btn-primary btn-sm"
                disabled={saving}
                onClick={updateOrg}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="form-field">
              <label className="form-label">Name</label>
              <input
                className="input"
                disabled={!canManage}
                value={edit.name}
                onChange={(e) =>
                  setEdit((x) => ({ ...x, name: e.target.value }))
                }
              />
            </div>
            <div className="form-field">
              <label className="form-label">Industry</label>
              <input
                className="input"
                disabled={!canManage}
                value={edit.industry}
                onChange={(e) =>
                  setEdit((x) => ({ ...x, industry: e.target.value }))
                }
              />
            </div>
            <div className="form-field">
              <label className="form-label">Website</label>
              <input
                className="input"
                disabled={!canManage}
                value={edit.website}
                onChange={(e) =>
                  setEdit((x) => ({ ...x, website: e.target.value }))
                }
              />
            </div>
            <div className="form-field">
              <label className="form-label">Location</label>
              <input
                className="input"
                disabled={!canManage}
                value={edit.location}
                onChange={(e) =>
                  setEdit((x) => ({ ...x, location: e.target.value }))
                }
              />
            </div>
            <div className="form-field">
              <label className="form-label">Accent color</label>
              <input
                className="input"
                disabled={!canManage}
                placeholder="#50aad1"
                value={edit.accent_color}
                onChange={(e) =>
                  setEdit((x) => ({ ...x, accent_color: e.target.value }))
                }
              />
            </div>
            <div className="form-field sm:col-span-2">
              <label className="form-label">Description</label>
              <textarea
                className="input min-h-[3.5rem] resize-y"
                disabled={!canManage}
                value={edit.description}
                onChange={(e) =>
                  setEdit((x) => ({ ...x, description: e.target.value }))
                }
              />
            </div>
          </div>
          {!canManage && (
            <p className="text-text-tertiary text-xs">
              You are a viewer - ask an admin or the owner to edit organization
              details.
            </p>
          )}
        </div>
      ) : null}

      {/* ── Members of selected organization ── */}
      {selected ? (
        <div className="card flex flex-col gap-4 p-6">
          <div>
            <h3 className="text-text-primary text-sm font-semibold">
              Members of {selected.name}
            </h3>
            <p className="text-text-secondary mt-0.5 text-xs">
              Manage who can collaborate in this organization.
            </p>
          </div>

          {canManage ? (
            <div className="flex flex-wrap items-end gap-3">
              <div className="form-field min-w-[14rem] flex-1">
                <label className="form-label">Add member by email</label>
                <input
                  className="input"
                  placeholder="teammate@company.com"
                  type="email"
                  value={addMemberDraft.email}
                  onChange={(e) =>
                    setAddMemberDraft((a) => ({ ...a, email: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && addMember()}
                />
              </div>
              <div className="form-field w-32">
                <label className="form-label">Role</label>
                <select
                  className="input"
                  value={addMemberDraft.role}
                  onChange={(e) =>
                    setAddMemberDraft((a) => ({ ...a, role: e.target.value }))
                  }
                >
                  {ROLES.filter((r) => r !== "owner").map((r) => (
                    <option
                      key={r}
                      value={r}
                    >
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary btn-sm"
                disabled={!addMemberDraft.email.trim() || adding}
                onClick={addMember}
              >
                {adding ? "Adding…" : "Add member"}
              </button>
            </div>
          ) : null}

          <div className="grid gap-2">
            {members.map((m) => (
              <div
                key={m.user_id}
                className="border-border-secondary flex items-center gap-3 rounded-xl border p-3"
              >
                {m.avatar_url ? (
                  <img
                    alt=""
                    className="border-border-primary h-8 w-8 rounded-full border object-cover"
                    src={m.avatar_url}
                  />
                ) : (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{
                      backgroundColor: `hsl(${hueFrom(m.email)} 45% 45%)`,
                    }}
                  >
                    {initials(m.full_name || m.email)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-text-primary truncate text-sm font-medium">
                    {m.full_name || m.email}
                  </div>
                  <div className="text-text-tertiary text-xs">
                    {m.email} · joined{" "}
                    {new Date(m.joined_at).toLocaleDateString()}
                  </div>
                </div>
                {canManage && m.user_id !== user?.id ? (
                  <>
                    <select
                      aria-label={`Role for ${m.email}`}
                      className="input w-28"
                      value={m.role}
                      onChange={(e) => changeRole(m.user_id, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option
                          key={r}
                          value={r}
                        >
                          {r}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-ghost btn-icon btn-sm text-text-tertiary hover:text-error"
                      title="Remove member"
                      onClick={() => removeMember(m)}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <span
                    className={`badge ${ROLE_BADGE[m.role] ?? "badge-info"}`}
                  >
                    {m.role}
                  </span>
                )}
              </div>
            ))}
            {members.length === 0 && (
              <div className="text-text-secondary py-4 text-center text-sm">
                No members yet.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Confirm dialog ── */}
      {confirm ? (
        <div
          className="fixed inset-0 z-[900] flex items-center justify-center p-6"
          style={{ background: "var(--overlay)" }}
          onClick={() => setConfirm(null)}
        >
          <div
            aria-modal="true"
            className="card animate-scale-in flex w-full max-w-sm flex-col gap-4 p-6"
            role="alertdialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-text-primary text-sm font-semibold">
              {confirm.title}
            </div>
            <div className="text-text-secondary text-xs">{confirm.message}</div>
            <div className="flex justify-end gap-2">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => confirm.action()}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
