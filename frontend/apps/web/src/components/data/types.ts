import type {
  DatasetFormat,
  DatasetPreview,
  DatasetType,
  GeoDatasetOut,
} from "../../lib/datasets";

// Re-export so components can pull everything from a single place.
export type { DatasetFormat, DatasetPreview, DatasetType, GeoDatasetOut };

/** Local view model (extends API shape with UI-only fields). */
export type DatasetItem = GeoDatasetOut & { _optimistic?: boolean };

export type UploadStatus = "idle" | "uploading" | "success" | "error";
export type SortField = "name" | "format" | "size" | "updated";
export type SortDir = "asc" | "desc";
export type ViewMode = "table" | "grid";

export interface FileEntry {
  file: File;
  status: UploadStatus;
  progress: number;
  error: string | null;
}

export interface Toast {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

export interface ToastActions {
  addToast: (type: Toast["type"], message: string) => void;
  dismissToast: (id: number) => void;
}
