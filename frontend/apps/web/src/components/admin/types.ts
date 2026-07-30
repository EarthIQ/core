export interface PermissionSummary {
  id: string;
  name: string;
  description?: string | null;
}

export interface UserSummary {
  id: string;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  groups?: GroupSummary[];
}

export interface GroupSummary {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
  permissions?: PermissionSummary[];
  users?: UserSummary[];
}

export interface UserFormState {
  email: string;
  password: string;
  full_name: string;
  is_superuser: boolean;
  groups: string[];
}

export interface GroupFormState {
  name: string;
  description: string;
  permissions: string[];
  user_ids: string[];
}

export interface PermissionFormState {
  name: string;
  description: string;
}

export const emptyUserForm: UserFormState = {
  email: "",
  password: "",
  full_name: "",
  is_superuser: false,
  groups: [],
};

export const emptyGroupForm: GroupFormState = {
  name: "",
  description: "",
  permissions: [],
  user_ids: [],
};

export const emptyPermissionForm: PermissionFormState = {
  name: "",
  description: "",
};
