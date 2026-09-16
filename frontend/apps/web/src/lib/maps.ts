import { api } from "./api";

export type PermissionLevel = "read" | "write" | "admin";

/** Published content kinds a `maps` row can hold (see backend maps.kind). */
export type MapKind = "map" | "story_map" | "presentation";

export interface MapLayerItem {
  id: string;
  name: string;
  type?: "vector" | "raster";
  visible?: boolean;
  url?: string;
  style?: Record<string, unknown>;
  /** Folder nodes from the layer panel tree have no `type`/`url`. */
  kind?: "layer" | "folder";
  parentId?: string | null;
  order?: number;
  collapsed?: boolean;
  datasetId?: string;
  geometryType?: string;
  source?: string;
}

export interface GroupAccess {
  group_id: string;
  group_name?: string;
  permission: PermissionLevel;
}

export interface MapItem {
  id: string;
  title: string;
  description?: string;
  center_lng: number;
  center_lat: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
  basemap: string;
  layers_config: MapLayerItem[];
  is_public: boolean;
  owner_id: string;
  owner?: {
    id: string;
    email: string;
    full_name?: string;
  };
  group_access: GroupAccess[];
  user_permission: PermissionLevel;
  widgets_config: Record<string, boolean>;
  /** Published content kind (defaults to "map" for historical rows). */
  kind: MapKind;
  /** Rich content payload for story maps / presentations (plain JSON). */
  content?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface MapCreateInput {
  title: string;
  description?: string;
  center_lng?: number;
  center_lat?: number;
  zoom?: number;
  basemap?: string;
  layers_config?: MapLayerItem[];
  is_public?: boolean;
  widgets_config?: Record<string, boolean>;
  group_access?: GroupAccess[];
  /** Scope the published item to a project. */
  project_id?: string;
  /** Content kind (default "map"). */
  kind?: MapKind;
  /** Rich content payload (story map / presentation). */
  content?: Record<string, unknown>;
}

export interface MapUpdateInput {
  title?: string;
  description?: string;
  center_lng?: number;
  center_lat?: number;
  zoom?: number;
  basemap?: string;
  layers_config?: MapLayerItem[];
  is_public?: boolean;
  widgets_config?: Record<string, boolean>;
  /** Replace the story map / presentation payload. */
  content?: Record<string, unknown>;
}

export interface GroupItem {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

/** List published items accessible to the current user. */
export async function fetchMaps(params?: {
  projectId?: string;
  kind?: MapKind;
}): Promise<MapItem[]> {
  const qs = new URLSearchParams();
  if (params?.projectId) qs.set("project_id", params.projectId);
  if (params?.kind) qs.set("kind", params.kind);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return api.get<MapItem[]>(`/api/v1/maps${suffix}`);
}

export async function fetchMapById(mapId: string): Promise<MapItem> {
  return api.get<MapItem>(`/api/v1/maps/${mapId}`);
}

export async function createMap(input: MapCreateInput): Promise<MapItem> {
  return api.post<MapItem>("/api/v1/maps", input);
}

export async function updateMap(
  mapId: string,
  input: MapUpdateInput
): Promise<MapItem> {
  return api.put<MapItem>(`/api/v1/maps/${mapId}`, input);
}

export async function deleteMap(mapId: string): Promise<void> {
  return api.delete<void>(`/api/v1/maps/${mapId}`);
}

export async function shareMap(
  mapId: string,
  shareData: { is_public?: boolean; group_access?: GroupAccess[] }
): Promise<MapItem> {
  return api.post<MapItem>(`/api/v1/maps/${mapId}/share`, shareData);
}

export async function fetchUserGroups(): Promise<GroupItem[]> {
  return api.get<GroupItem[]>("/api/v1/auth/groups");
}

export async function createGroup(
  name: string,
  description?: string
): Promise<GroupItem> {
  return api.post<GroupItem>("/api/v1/auth/groups", { name, description });
}
