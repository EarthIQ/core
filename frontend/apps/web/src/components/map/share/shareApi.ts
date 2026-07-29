import type {
  AccessEntry,
  GeneralAccess,
  Role,
  ShareSettings,
  ShareState,
} from "./types";

const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms));

/* ── MOCK DB (remove when wiring real API) ─────────────────────────────── */
let MOCK_STATE: ShareState = {
  entries: [
    {
      id: "u_1",
      email: "you@earthiq.io",
      name: "You",
      role: "owner",
      isYou: true,
    },
    {
      id: "u_2",
      email: "maya.rivera@earthiq.io",
      name: "Maya Rivera",
      role: "editor",
    },
    {
      id: "u_3",
      email: "j.okafor@hydro.gov",
      name: "Jide Okafor",
      role: "commenter",
    },
    {
      id: "u_4",
      email: "field.team@partner.org",
      role: "viewer",
      pending: true,
    },
  ],
  general: { type: "restricted", role: "viewer" },
  settings: { editorsCanShare: true, viewersCanDownload: true },
};

const MOCK_DIRECTORY: AccessEntry[] = [
  { id: "d_1", email: "sara.lin@earthiq.io", name: "Sara Lin", role: "viewer" },
  {
    id: "d_2",
    email: "tom.bak@earthiq.io",
    name: "Tom Bakker",
    role: "viewer",
  },
  { id: "d_3", email: "gis.team@earthiq.io", name: "GIS Team", role: "viewer" },
  {
    id: "d_4",
    email: "remote.sensing@earthiq.io",
    name: "RS Group",
    role: "viewer",
  },
];

/* ── Public API surface ─────────────────────────────────────────────────── */
export const shareApi = {
  async getShareState(_mapId: string): Promise<ShareState> {
    await delay(500);
    // return fetch(`/api/maps/${_mapId}/share`).then(r => r.json());
    return structuredClone(MOCK_STATE);
  },

  async searchPeople(query: string): Promise<AccessEntry[]> {
    await delay(180);
    // return fetch(`/api/people?q=${query}`).then(r => r.json());
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return MOCK_DIRECTORY.filter(
      (p) =>
        p.email.toLowerCase().includes(q) ||
        (p.name ?? "").toLowerCase().includes(q),
    );
  },

  async invite(
    _mapId: string,
    emails: string[],
    role: Role,
    _message: string,
    _notify: boolean,
  ): Promise<AccessEntry[]> {
    await delay();
    // POST /api/maps/:id/share/invite
    const created: AccessEntry[] = emails.map((email, i) => ({
      id: `inv_${Date.now()}_${i}`,
      email,
      role,
      pending: true,
    }));
    MOCK_STATE.entries = [...MOCK_STATE.entries, ...created];
    return created;
  },

  async updateRole(_mapId: string, entryId: string, role: Role): Promise<void> {
    await delay(300);
    // PATCH /api/maps/:id/share/:entryId
    MOCK_STATE.entries = MOCK_STATE.entries.map((e) =>
      e.id === entryId ? { ...e, role } : e,
    );
  },

  async removeAccess(_mapId: string, entryId: string): Promise<void> {
    await delay(300);
    // DELETE /api/maps/:id/share/:entryId
    MOCK_STATE.entries = MOCK_STATE.entries.filter((e) => e.id !== entryId);
  },

  async transferOwnership(_mapId: string, entryId: string): Promise<void> {
    await delay(600);
    // POST /api/maps/:id/share/transfer
    MOCK_STATE.entries = MOCK_STATE.entries.map((e) => ({
      ...e,
      role: e.id === entryId ? "owner" : e.role === "owner" ? "editor" : e.role,
    }));
  },

  async updateGeneralAccess(
    _mapId: string,
    general: GeneralAccess,
  ): Promise<void> {
    await delay(300);
    // PUT /api/maps/:id/share/general
    MOCK_STATE.general = general;
  },

  async updateSettings(_mapId: string, settings: ShareSettings): Promise<void> {
    await delay(250);
    // PUT /api/maps/:id/share/settings
    MOCK_STATE.settings = settings;
  },
};
