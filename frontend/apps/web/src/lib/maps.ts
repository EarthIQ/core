import { api } from "./api";

export type PermissionLevel = "read" | "write" | "admin";

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
}

export interface GroupItem {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export async function fetchMaps(): Promise<MapItem[]> {
  return api.get<MapItem[]>("/api/maps");
}

export async function fetchMapById(mapId: string): Promise<MapItem> {
  return api.get<MapItem>(`/api/maps/${mapId}`);
}

export async function createMap(input: MapCreateInput): Promise<MapItem> {
  return api.post<MapItem>("/api/maps", input);
}

export async function updateMap(
  mapId: string,
  input: MapUpdateInput,
): Promise<MapItem> {
  return api.put<MapItem>(`/api/maps/${mapId}`, input);
}

export async function deleteMap(mapId: string): Promise<void> {
  return api.delete<void>(`/api/maps/${mapId}`);
}

export async function shareMap(
  mapId: string,
  shareData: { is_public?: boolean; group_access?: GroupAccess[] },
): Promise<MapItem> {
  return api.post<MapItem>(`/api/maps/${mapId}/share`, shareData);
}

export async function fetchUserGroups(): Promise<GroupItem[]> {
  return api.get<GroupItem[]>("/api/auth/groups");
}

export async function createGroup(
  name: string,
  description?: string,
): Promise<GroupItem> {
  return api.post<GroupItem>("/api/auth/groups", { name, description });
}
