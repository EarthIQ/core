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

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UserFilterState {
  search: string;
  is_superuser: string; // 'all' | 'true' | 'false'
  group_id: string; // 'all' | <id>
  sort_by: "created_at" | "email" | "full_name";
  sort_order: "asc" | "desc";
  page: number;
  page_size: number;
}

export const defaultUserFilterState: UserFilterState = {
  search: "",
  is_superuser: "all",
  group_id: "all",
  sort_by: "created_at",
  sort_order: "desc",
  page: 1,
  page_size: 10,
};

export interface GroupFilterState {

  search: string;
  sort_by: "name" | "created_at";
  sort_order: "asc" | "desc";
  page: number;
  page_size: number;
}

export const defaultGroupFilterState: GroupFilterState = {
  search: "",
  sort_by: "name",
  sort_order: "asc",
  page: 1,
  page_size: 10,
};

export interface PermissionFilterState {
  search: string;
  sort_by: "name";
  sort_order: "asc" | "desc";
  page: number;
  page_size: number;
}

export const defaultPermissionFilterState: PermissionFilterState = {
  search: "",
  sort_by: "name",
  sort_order: "asc",
  page: 1,
  page_size: 10,
};


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
