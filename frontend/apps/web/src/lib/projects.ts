import { api } from "./api";
import type {
  MapItem,
  MapLayerItem,
  GroupAccess,
  PermissionLevel,
  MapCreateInput,
} from "./maps";
import type { Annotation, Bookmark, CommentThread } from "@/lib/mapEditor/types";

export interface ProjectItem {
  id: string;
  title: string;
  description?: string;
  center_lng: number;
  center_lat: number;
  zoom: number;
  basemap: string;
  layers_config: MapLayerItem[];
  annotations: Annotation[];
  bookmarks: Bookmark[];
  comments: CommentThread[];
  owner_id: string;
  owner?: {
    id: string;
    email: string;
    full_name?: string;
  };
  group_access: GroupAccess[];
  user_permission: PermissionLevel;
  created_at: string;
  updated_at: string;
  maps: MapItem[];
}

export interface ProjectCreateInput {
  title: string;
  description?: string;
  center_lng?: number;
  center_lat?: number;
  zoom?: number;
  basemap?: string;
  layers_config?: MapLayerItem[];
  annotations?: Annotation[];
  bookmarks?: Bookmark[];
  comments?: CommentThread[];
  group_access?: GroupAccess[];
}

export interface ProjectUpdateInput {
  title?: string;
  description?: string;
  center_lng?: number;
  center_lat?: number;
  zoom?: number;
  basemap?: string;
  layers_config?: MapLayerItem[];
  annotations?: Annotation[];
  bookmarks?: Bookmark[];
  comments?: CommentThread[];
}

export async function fetchProjects(): Promise<ProjectItem[]> {
  return api.get<ProjectItem[]>("/api/v1/projects");
}

export async function fetchProjectById(
  projectId: string,
): Promise<ProjectItem> {
  return api.get<ProjectItem>(`/api/v1/projects/${projectId}`);
}

export async function createProject(
  input: ProjectCreateInput,
): Promise<ProjectItem> {
  return api.post<ProjectItem>("/api/v1/projects", input);
}

export async function updateProject(
  projectId: string,
  input: ProjectUpdateInput,
): Promise<ProjectItem> {
  return api.put<ProjectItem>(`/api/v1/projects/${projectId}`, input);
}

export async function deleteProject(projectId: string): Promise<void> {
  return api.delete<void>(`/api/v1/projects/${projectId}`);
}

export async function publishMapFromProject(
  projectId: string,
  input: MapCreateInput,
): Promise<MapItem> {
  return api.post<MapItem>(`/api/v1/projects/${projectId}/maps`, input);
}
