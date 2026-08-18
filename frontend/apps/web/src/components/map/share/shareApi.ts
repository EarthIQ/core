import { api } from "@/lib/api";
import type {
  AccessEntry,
  GeneralAccess,
  Role,
  ShareSettings,
  ShareState,
} from "./types";

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
  general: { type: "restricted" | "link"; role: Role };
  settings: { editors_can_share: boolean; viewers_can_download: boolean };
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
  async getShareState(mapId: string): Promise<ShareState> {
    const raw = await api.get<RawShareState>(`/api/maps/${mapId}/share`);
    return adaptState(raw);
  },

  async searchPeople(query: string, mapId?: string): Promise<AccessEntry[]> {
    if (!query.trim()) return [];
    const params = new URLSearchParams({ q: query });
    if (mapId) params.set("map_id", mapId);
    const results = await api.get<RawAccessEntry[]>(`/api/people?${params}`);
    return results.map(adaptEntry);
  },

  async invite(
    mapId: string,
    emails: string[],
    role: Role,
    message: string,
    notify: boolean,
  ): Promise<AccessEntry[]> {
    const created = await api.post<RawAccessEntry[]>(
      `/api/maps/${mapId}/share/invite`,
      { emails, role, message, notify },
    );
    return created.map(adaptEntry);
  },

  async updateRole(mapId: string, entryId: string, role: Role): Promise<void> {
    await api.patch<void>(`/api/maps/${mapId}/share/${entryId}`, { role });
  },

  async removeAccess(mapId: string, entryId: string): Promise<void> {
    await api.delete<void>(`/api/maps/${mapId}/share/${entryId}`);
  },

  async transferOwnership(mapId: string, entryId: string): Promise<void> {
    await api.post<void>(`/api/maps/${mapId}/share/transfer`, {
      entry_id: entryId,
    });
  },

  async updateGeneralAccess(
    mapId: string,
    general: GeneralAccess,
  ): Promise<void> {
    await api.put<void>(`/api/maps/${mapId}/share/general`, {
      type: general.type,
      role: general.role,
    });
  },

  async updateSettings(mapId: string, settings: ShareSettings): Promise<void> {
    await api.put<void>(`/api/maps/${mapId}/share/settings`, {
      editors_can_share: settings.editorsCanShare,
      viewers_can_download: settings.viewersCanDownload,
    });
  },
};
