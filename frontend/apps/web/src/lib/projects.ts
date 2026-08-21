import { api } from "./api";
import type {
  MapItem,
  MapLayerItem,
  GroupAccess,
  PermissionLevel,
  MapCreateInput,
} from "./maps";
import type { Annotation, Bookmark, CommentItem } from "@/lib/mapEditor/types";

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
  comments: CommentItem[];
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
  comments?: CommentItem[];
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
  comments?: CommentItem[];
}

export async function fetchProjects(): Promise<ProjectItem[]> {
  return api.get<ProjectItem[]>("/api/projects");
}

export async function fetchProjectById(
  projectId: string,
): Promise<ProjectItem> {
  return api.get<ProjectItem>(`/api/projects/${projectId}`);
}

export async function createProject(
  input: ProjectCreateInput,
): Promise<ProjectItem> {
  return api.post<ProjectItem>("/api/projects", input);
}

export async function updateProject(
  projectId: string,
  input: ProjectUpdateInput,
): Promise<ProjectItem> {
  return api.put<ProjectItem>(`/api/projects/${projectId}`, input);
}

export async function deleteProject(projectId: string): Promise<void> {
  return api.delete<void>(`/api/projects/${projectId}`);
}

export async function publishMapFromProject(
  projectId: string,
  input: MapCreateInput,
): Promise<MapItem> {
  return api.post<MapItem>(`/api/projects/${projectId}/maps`, input);
}
