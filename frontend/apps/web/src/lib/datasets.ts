/**
 * datasets.ts
 * -----------
 * Typed API helpers for the GeoDataset catalog endpoints.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export interface AttributeField {
  field: string;
  type: string;
  sample: string;
}

/** Semantic category of a dataset. */
export type DatasetType =
  | "vector"
  | "raster"
  | "tabular"
  | "remote-sensing"
  | "points";

/** File/container format of an uploaded dataset. */
export type DatasetFormat =
  | "GeoJSON"
  | "Shapefile"
  | "KML"
  | "GeoRSS"
  | "GeoTIFF"
  | "COG"
  | "GeoPackage"
  | "GeoParquet"
  | "CSV";

export interface GeoDatasetOut {
  id: string;
  name: string;
  format: DatasetFormat;
  type: DatasetType;
  crs: string;
  tags: string[];
  feature_count: number | null;
  file_size_bytes: number;
  storage_key: string | null;
  attributes: AttributeField[];
  description: string | null;
  source: string | null;
  /** Free-form, format-specific metadata (e.g. coordinate columns, ingested flag). */
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GeoDatasetListResponse {
  items: GeoDatasetOut[];
  total: number;
}

export interface DatasetVocabulary {
  formats: DatasetFormat[];
  types: DatasetType[];
  default_type_for_format: Record<string, DatasetType>;
}

export interface PreviewRow {
  values: Record<string, unknown>;
}

export interface DatasetPreview {
  dataset_id: string;
  name: string;
  format: DatasetFormat;
  type: DatasetType;
  ingested: boolean;
  row_count: number | null;
  columns: AttributeField[];
  rows: PreviewRow[];
  asset_meta: Record<string, unknown>;
}

/** Geometry-type profile of a dataset (point / line / polygon mix). */
export interface GeometrySummary {
  dataset_id: string;
  kind: "vector" | "raster" | string;
  dominant: "point" | "line" | "polygon" | null;
  counts: Record<string, number>;
  total: number;
}

export interface UploadDatasetParams {
  file: File;
  format?: DatasetFormat | string;
  type?: DatasetType | string;
  crs?: string;
  tags?: string;
  description?: string;
  source?: string;
}

export interface UpdateDatasetParams {
  name?: string;
  description?: string | null;
  source?: string | null;
  tags?: string[];
  crs?: string;
  meta?: Record<string, unknown>;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("eq_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Format bytes to a human-readable string. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

/** Returns the MVT tile URL pattern for use with map libraries. */
export function getVectorTileUrl(datasetId: string): string {
  return `${API_BASE}/api/data/tiles/${datasetId}/{z}/{x}/{y}.mvt`;
}

/** Returns a direct download URL for the original uploaded file. */
export function getDownloadUrl(datasetId: string): string {
  return `${API_BASE}/api/data/datasets/${datasetId}/download`;
}

function downloadToken(): string | null {
  return localStorage.getItem("eq_token");
}

/**
 * Trigger a browser download of a dataset's original file.
 * Uses a fetch + blob so the auth token is always sent.
 */
export async function downloadDataset(
  datasetId: string,
  filename: string,
): Promise<void> {
  const token = downloadToken();
  const res = await fetch(getDownloadUrl(datasetId), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** List all datasets, optionally filtered by type/format or search query. */
export async function listDatasets(params?: {
  type?: string;
  format?: string;
  search?: string;
}): Promise<GeoDatasetOut[]> {
  const qs = new URLSearchParams();
  if (params?.type && params.type !== "all") qs.set("type", params.type);
  if (params?.format && params.format !== "all")
    qs.set("format", params.format);
  if (params?.search) qs.set("search", params.search);

  const res = await fetch(
    `${API_BASE}/api/data/datasets${qs.size ? `?${qs}` : ""}`,
    { headers: authHeaders() },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `HTTP ${res.status}`);
  }
  const data: GeoDatasetListResponse = await res.json();
  return data.items;
}

/** Fetch the supported format/type vocabulary (for driving UI dropdowns). */
export async function getDatasetVocabulary(): Promise<DatasetVocabulary> {
  const res = await fetch(`${API_BASE}/api/data/datasets/meta`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as DatasetVocabulary;
}

/** Fetch a single dataset by ID. */
export async function getDataset(datasetId: string): Promise<GeoDatasetOut> {
  const res = await fetch(`${API_BASE}/api/data/datasets/${datasetId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as GeoDatasetOut;
}

/** Update a dataset's metadata. */
export async function updateDataset(
  datasetId: string,
  payload: UpdateDatasetParams,
): Promise<GeoDatasetOut> {
  const res = await fetch(`${API_BASE}/api/data/datasets/${datasetId}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as GeoDatasetOut;
}

/** Fetch a bounded preview (schema + sample rows) for a dataset. */
export async function previewDataset(
  datasetId: string,
  maxRows = 20,
): Promise<DatasetPreview> {
  const res = await fetch(
    `${API_BASE}/api/data/datasets/${datasetId}/preview?max_rows=${maxRows}`,
    { headers: authHeaders() },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as DatasetPreview;
}

/** Fetch the geometry-type profile (dominant point/line/polygon) for one dataset. */
export async function getGeometrySummary(
  datasetId: string,
): Promise<GeometrySummary> {
  const res = await fetch(
    `${API_BASE}/api/data/datasets/${encodeURIComponent(datasetId)}/geometry`,
    { headers: authHeaders() },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as GeometrySummary;
}

/**
 * Batch-fetch geometry profiles for several datasets.
 * Unknown ids are omitted by the server; failures reject the promise
 * (callers should treat the profile as optional and fall back to `{}`).
 */
export async function getGeometrySummaries(
  datasetIds: string[],
): Promise<Record<string, GeometrySummary>> {
  if (datasetIds.length === 0) return {};
  const res = await fetch(
    `${API_BASE}/api/data/datasets/geometry?ids=${encodeURIComponent(
      datasetIds.slice(0, 100).join(","),
    )}`,
    { headers: authHeaders() },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { items: Record<string, GeometrySummary> };
  return data.items ?? {};
}

/** Upload a dataset file with metadata. Reports progress via onProgress callback. */
export async function uploadDataset(
  params: UploadDatasetParams,
  onProgress?: (pct: number) => void,
): Promise<GeoDatasetOut> {
  const form = new FormData();
  form.append("file", params.file);
  form.append("format", params.format ?? "GeoJSON");
  form.append("type", params.type ?? "vector");
  form.append("crs", params.crs ?? "EPSG:4326 (WGS 84)");
  form.append("tags", params.tags ?? "");
  form.append("description", params.description ?? "");
  form.append("source", params.source ?? "");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/data/datasets/upload`);

    const token = localStorage.getItem("eq_token");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as GeoDatasetOut);
        } catch {
          reject(new Error("Invalid server response"));
        }
      } else {
        let detail = `HTTP ${xhr.status}`;
        try {
          detail = JSON.parse(xhr.responseText)?.detail ?? detail;
        } catch {
          /* ignore */
        }
        reject(new Error(detail));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed (network error)"));
    xhr.onabort = () => reject(new Error("Upload aborted"));

    xhr.send(form);
  });
}

/** Delete a dataset by ID. */
export async function deleteDataset(datasetId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/data/datasets/${datasetId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `HTTP ${res.status}`);
  }
}
