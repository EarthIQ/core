export type Role = "owner" | "editor" | "commenter" | "viewer";
export type GeneralAccessType = "restricted" | "link";
export type LinkRole = Exclude<Role, "owner">;

export interface AccessEntry {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: Role;
  pending?: boolean;
  isYou?: boolean;
}

export interface GeneralAccess {
  type: GeneralAccessType;
  role: LinkRole;
}

export interface ShareSettings {
  editorsCanShare: boolean;
  viewersCanDownload: boolean;
}

export interface ShareState {
  entries: AccessEntry[];
  general: GeneralAccess;
  settings: ShareSettings;
}

export const ROLE_META: Record<
  Role,
  { label: string; description: string; icon: string }
> = {
  owner: {
    label: "Owner",
    description: "Full control, can delete and transfer ownership",
    icon: "👑",
  },
  editor: {
    label: "Editor",
    description: "Can edit layers, styles and save the map",
    icon: "✏️",
  },
  commenter: {
    label: "Commenter",
    description: "Can comment and annotate, but not edit layers",
    icon: "💬",
  },
  viewer: {
    label: "Viewer",
    description: "Can view the map and its layers only",
    icon: "👁",
  },
};

export const ASSIGNABLE_ROLES: Role[] = ["editor", "commenter", "viewer"];

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
