import { api } from "@/lib/api";
import type {
  AccessEntry,
  GeneralAccess,
  Role,
  ShareSettings,
  ShareState,
} from "./types";

/** The kind of shareable entity the share dialog operates on. */
export type ShareEntityType = "map" | "project";

function entityBase(entityType: ShareEntityType): string {
  return entityType === "map" ? "maps" : "projects";
}

// ── Snake-case → camelCase adapters ──────────────────────────────────────────
// The backend returns snake_case field names; the frontend types use camelCase.

interface RawAccessEntry {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: Role;
  pending?: boolean;
  is_you?: boolean;
}

interface RawShareState {
  entries: RawAccessEntry[];
  general: GeneralAccess;
  settings: { editors_can_share: boolean; viewers_can_download: boolean };
}

interface RawInviteAccept extends RawAccessEntry {
  entity_type: ShareEntityType;
  entity_id: string;
  title: string;
}

/** Invite-accept result — includes the entity so the UI can navigate to it. */
export interface InviteAcceptResult extends AccessEntry {
  entityType: ShareEntityType;
  entityId: string;
  title: string;
}

/** Access-request state (requester view and owner approval view). */
export interface AccessRequestInfo {
  id: string;
  entityType: ShareEntityType;
  entityId: string;
  title: string;
  requesterName?: string;
  requesterEmail: string;
  message: string;
  requestedRole: Role;
  status: "pending" | "granted" | "denied";
  grantedRole?: Role;
  createdAt: string;
}

interface RawAccessRequest {
  id: string;
  entity_type: ShareEntityType;
  entity_id: string;
  title: string;
  requester_name?: string;
  requester_email: string;
  message: string;
  requested_role: Role;
  status: "pending" | "granted" | "denied";
  granted_role?: Role;
  created_at: string;
}

function adaptRequest(raw: RawAccessRequest): AccessRequestInfo {
  return {
    id: raw.id,
    entityType: raw.entity_type,
    entityId: raw.entity_id,
    title: raw.title,
    requesterName: raw.requester_name,
    requesterEmail: raw.requester_email,
    message: raw.message,
    requestedRole: raw.requested_role,
    status: raw.status,
    grantedRole: raw.granted_role,
    createdAt: raw.created_at,
  };
}

function adaptEntry(raw: RawAccessEntry): AccessEntry {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name,
    avatarUrl: raw.avatar_url,
    role: raw.role,
    pending: raw.pending,
    isYou: raw.is_you,
  };
}

function adaptState(raw: RawShareState): ShareState {
  return {
    entries: raw.entries.map(adaptEntry),
    general: raw.general,
    settings: {
      editorsCanShare: raw.settings.editors_can_share,
      viewersCanDownload: raw.settings.viewers_can_download,
    },
  };
}

// ── Public API surface ────────────────────────────────────────────────────────
export const shareApi = {
  async getShareState(entityType: ShareEntityType, entityId: string): Promise<ShareState> {
    const raw = await api.get<RawShareState>(
      `/api/${entityBase(entityType)}/${entityId}/share`,
    );
    return adaptState(raw);
  },

  async searchPeople(query: string, entityId?: string): Promise<AccessEntry[]> {
    if (!query.trim()) return [];
    const params = new URLSearchParams({ q: query });
    if (entityId) params.set("entity_id", entityId);
    const results = await api.get<RawAccessEntry[]>(`/api/people?${params}`);
    return results.map(adaptEntry);
  },

  async invite(
    entityType: ShareEntityType,
    entityId: string,
    emails: string[],
    role: Role,
    message: string,
    notify: boolean,
  ): Promise<AccessEntry[]> {
    const created = await api.post<RawAccessEntry[]>(
      `/api/${entityBase(entityType)}/${entityId}/share/invite`,
      { emails, role, message, notify },
    );
    return created.map(adaptEntry);
  },

  async updateRole(
    entityType: ShareEntityType,
    entityId: string,
    entryId: string,
    role: Role,
  ): Promise<void> {
    await api.patch<void>(`/api/${entityBase(entityType)}/${entityId}/share/${entryId}`, {
      role,
    });
  },

  async removeAccess(
    entityType: ShareEntityType,
    entityId: string,
    entryId: string,
  ): Promise<void> {
    await api.delete<void>(`/api/${entityBase(entityType)}/${entityId}/share/${entryId}`);
  },

  async transferOwnership(
    entityType: ShareEntityType,
    entityId: string,
    entryId: string,
  ): Promise<void> {
    await api.post<void>(`/api/${entityBase(entityType)}/${entityId}/share/transfer`, {
      entry_id: entryId,
    });
  },

  async updateGeneralAccess(
    entityType: ShareEntityType,
    entityId: string,
    general: GeneralAccess,
  ): Promise<void> {
    await api.put<void>(`/api/${entityBase(entityType)}/${entityId}/share/general`, {
      type: general.type,
      role: general.role,
    });
  },

  async updateSettings(
    entityType: ShareEntityType,
    entityId: string,
    settings: ShareSettings,
  ): Promise<void> {
    await api.put<void>(`/api/${entityBase(entityType)}/${entityId}/share/settings`, {
      editors_can_share: settings.editorsCanShare,
      viewers_can_download: settings.viewersCanDownload,
    });
  },

  /** Accept an invitation (map or project) using the one-time token from the email. */
  async acceptInvite(token: string): Promise<InviteAcceptResult> {
    const raw = await api.get<RawInviteAccept>(
      `/api/invite/accept?token=${encodeURIComponent(token)}`,
    );
    return {
      ...adaptEntry(raw),
      entityType: raw.entity_type,
      entityId: raw.entity_id,
      title: raw.title,
    };
  },

  // ── Access requests (Google-Docs style) ────────────────────────────────────

  /** Request access to a map/project the user cannot open; owner is notified by email. */
  async requestAccess(
    entityType: ShareEntityType,
    entityId: string,
    message: string,
    requestedRole: Role = "viewer",
  ): Promise<AccessRequestInfo> {
    const raw = await api.post<RawAccessRequest>(
      `/api/${entityBase(entityType)}/${entityId}/share/request`,
      { message, requested_role: requestedRole },
    );
    return adaptRequest(raw);
  },

  /** Fetch a request via the owner's approval token (owner only). */
  async getAccessRequest(token: string): Promise<AccessRequestInfo> {
    const raw = await api.get<RawAccessRequest>(
      `/api/access/request?token=${encodeURIComponent(token)}`,
    );
    return adaptRequest(raw);
  },

  /** Grant the requested access with a chosen role (owner only). */
  async grantAccess(token: string, role: Role): Promise<AccessRequestInfo> {
    const raw = await api.post<RawAccessRequest>(
      `/api/access/request/grant?token=${encodeURIComponent(token)}`,
      { role },
    );
    return adaptRequest(raw);
  },

  /** Decline an access request (owner only). */
  async denyAccess(token: string): Promise<AccessRequestInfo> {
    const raw = await api.post<RawAccessRequest>(
      `/api/access/request/deny?token=${encodeURIComponent(token)}`,
    );
    return adaptRequest(raw);
  },
};
