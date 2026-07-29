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

export interface GeoDatasetOut {
  id: string;
  name: string;
  format: string;
  type: "vector" | "raster" | "tabular" | "remote-sensing";
  crs: string;
  tags: string[];
  feature_count: number | null;
  file_size_bytes: number;
  storage_key: string | null;
  attributes: AttributeField[];
  created_at: string;
  updated_at: string;
}

export interface GeoDatasetListResponse {
  items: GeoDatasetOut[];
  total: number;
}

export interface UploadDatasetParams {
  file: File;
  format?: string;
  type?: string;
  crs?: string;
  tags?: string;
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

/** List all datasets, optionally filtered by type or search query. */
export async function listDatasets(params?: {
  type?: string;
  search?: string;
}): Promise<GeoDatasetOut[]> {
  const qs = new URLSearchParams();
  if (params?.type && params.type !== "all") qs.set("type", params.type);
  if (params?.search) qs.set("search", params.search);

  const res = await fetch(
    `${API_BASE}/api/data/datasets${qs.size ? `?${qs}` : ""}`,
    { headers: authHeaders() }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `HTTP ${res.status}`);
  }
  const data: GeoDatasetListResponse = await res.json();
  return data.items;
}

/** Upload a GeoJSON file with metadata. Reports progress via onProgress callback. */
export async function uploadDataset(
  params: UploadDatasetParams,
  onProgress?: (pct: number) => void
): Promise<GeoDatasetOut> {
  const form = new FormData();
  form.append("file", params.file);
  form.append("format", params.format ?? "GeoJSON");
  form.append("type", params.type ?? "vector");
  form.append("crs", params.crs ?? "EPSG:4326 (WGS 84)");
  form.append("tags", params.tags ?? "");

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
        } catch { /* ignore */ }
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
