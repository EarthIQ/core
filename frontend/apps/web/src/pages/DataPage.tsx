import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteDataset,
  formatBytes,
  GeoDatasetOut,
  getVectorTileUrl,
  listDatasets,
  uploadDataset,
} from "../lib/datasets";

// ── Local view model (extends API shape with UI-only fields) ──────────────────
type DatasetItem = GeoDatasetOut & { _optimistic?: boolean };

type UploadStatus = "idle" | "uploading" | "success" | "error";
type SortField = "name" | "format" | "size" | "updated";
type SortDir = "asc" | "desc";
type ViewMode = "table" | "grid";

interface FileEntry {
  file: File;
  status: UploadStatus;
  progress: number;
  error: string | null;
}

interface Toast {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function featureCountLabel(ds: DatasetItem): string {
  if (ds.feature_count === null || ds.feature_count === undefined)
    return ds.type === "raster" ? "Raster Grid" : "—";
  return ds.feature_count.toLocaleString() + " features";
}

function formatDate(iso: string): string {
  return iso ? iso.slice(0, 10) : "—";
}

function detectFormat(fileName: string): GeoDatasetOut["format"] | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "geojson" || ext === "json") return "GeoJSON";
  if (ext === "tif" || ext === "tiff") return "GeoTIFF";
  if (ext === "zip") return "Shapefile";
  if (ext === "csv") return "CSV";
  return null;
}

function formatIcon(format: string): string {
  switch (format) {
    case "GeoJSON":
      return "🧬";
    case "GeoTIFF":
    case "COG":
      return "🛰️";
    case "Shapefile":
      return "🗂️";
    case "CSV":
      return "📑";
    default:
      return "📄";
  }
}

function typeIcon(type: string): string {
  switch (type) {
    case "vector":
      return "🗺️";
    case "raster":
      return "🛰️";
    case "remote-sensing":
      return "🌍";
    case "tabular":
      return "📊";
    default:
      return "📦";
  }
}

let toastSeq = 0;

export default function DataPage() {
  const navigate = useNavigate();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Filtering ───────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // ── Sorting / view / pagination ─────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>("updated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ── Selection ────────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewDataset, setPreviewDataset] = useState<DatasetItem | null>(
    null,
  );
  const [tileUrlDataset, setTileUrlDataset] = useState<DatasetItem | null>(
    null,
  );
  const [confirmDelete, setConfirmDelete] = useState<{
    ids: string[];
    label: string;
  } | null>(null);

  // ── Upload form state ───────────────────────────────────────────────────────
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [format, setFormat] = useState<GeoDatasetOut["format"]>("GeoJSON");
  const [type, setType] = useState<GeoDatasetOut["type"]>("vector");
  const [crs, setCrs] = useState("EPSG:4326 (WGS 84)");
  const [tagsInput, setTagsInput] = useState("");
  const [batchUploading, setBatchUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Tile URL copy state ──────────────────────────────────────────────────────
  const [tileCopied, setTileCopied] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  // ── Toasts ───────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  // ── Fetch datasets ───────────────────────────────────────────────────────────
  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const items = await listDatasets({
        type: typeFilter,
        search: searchQuery,
      });
      setDatasets(items);
    } catch (err: any) {
      setFetchError(err?.message ?? "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(fetchDatasets, 300); // debounce search
    return () => clearTimeout(timer);
  }, [fetchDatasets]);

  // Reset page + selection when filters change
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [searchQuery, typeFilter, selectedTags, pageSize]);

  // Escape key closes modals; lock scroll while any modal open
  const anyModalOpen =
    isAddModalOpen || !!previewDataset || !!tileUrlDataset || !!confirmDelete;

  useEffect(() => {
    if (!anyModalOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAddModalOpen(false);
        setPreviewDataset(null);
        setTileUrlDataset(null);
        setConfirmDelete(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [anyModalOpen]);

  // ── Derived data: tags, sorted/filtered list, pagination ───────────────────
  const allTags = useMemo(() => {
    const s = new Set<string>();
    datasets.forEach((d) => d.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [datasets]);

  const totalStorageBytes = useMemo(
    () => datasets.reduce((sum, d) => sum + (d.file_size_bytes ?? 0), 0),
    [datasets],
  );

  const processedDatasets = useMemo(() => {
    let list = datasets;

    if (selectedTags.size > 0) {
      list = list.filter((d) => d.tags?.some((t) => selectedTags.has(t)));
    }

    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "format":
          cmp = a.format.localeCompare(b.format);
          break;
        case "size":
          cmp = (a.file_size_bytes ?? 0) - (b.file_size_bytes ?? 0);
          break;
        case "updated":
          cmp = (a.updated_at ?? "").localeCompare(b.updated_at ?? "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [datasets, selectedTags, sortField, sortDir]);

  const totalPages = Math.max(
    1,
    Math.ceil(processedDatasets.length / pageSize),
  );
  const clampedPage = Math.min(page, totalPages);
  const pageItems = processedDatasets.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize,
  );

  const activeFilterCount =
    (searchQuery ? 1 : 0) + (typeFilter !== "all" ? 1 : 0) + selectedTags.size;

  function clearFilters() {
    setSearchQuery("");
    setTypeFilter("all");
    setSelectedTags(new Set());
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function sortIndicator(field: SortField) {
    if (sortField !== field) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  // ── Selection helpers ───────────────────────────────────────────────────────
  function toggleSelectRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageItems.forEach((d) => {
        if (checked) next.add(d.id);
        else next.delete(d.id);
      });
      return next;
    });
  }

  const allOnPageSelected =
    pageItems.length > 0 && pageItems.every((d) => selectedIds.has(d.id));

  // ── Delete ───────────────────────────────────────────────────────────────────
  function requestDelete(id: string, name: string) {
    setConfirmDelete({ ids: [id], label: name });
  }

  function requestBulkDelete() {
    setConfirmDelete({
      ids: Array.from(selectedIds),
      label: `${selectedIds.size} dataset${selectedIds.size === 1 ? "" : "s"}`,
    });
  }

  async function performConfirmedDelete() {
    if (!confirmDelete) return;
    const { ids } = confirmDelete;
    setDatasets((prev) => prev.filter((d) => !ids.includes(d.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setConfirmDelete(null);

    try {
      await Promise.all(ids.map((id) => deleteDataset(id)));
      addToast(
        "success",
        ids.length === 1
          ? "Dataset deleted."
          : `${ids.length} datasets deleted.`,
      );
    } catch {
      addToast("error", "Some deletions failed — refreshing list.");
      fetchDatasets();
    }
  }

  // ── File selection (multi) ──────────────────────────────────────────────────
  function handleFilesSelected(list: FileList | File[] | null) {
    if (!list) return;
    const arr = Array.from(list);
    if (arr.length === 0) return;

    setFileEntries((prev) => [
      ...prev,
      ...arr.map((file) => ({
        file,
        status: "idle" as UploadStatus,
        progress: 0,
        error: null,
      })),
    ]);

    // Auto-detect format only when this is the first/only file selection
    if (arr.length === 1 && fileEntries.length === 0) {
      const detected = detectFormat(arr[0].name);
      if (detected) setFormat(detected);
    }
  }

  function removeFileEntry(index: number) {
    setFileEntries((prev) => prev.filter((_, i) => i !== index));
  }

  const handleDropzoneClick = () => fileInputRef.current?.click();

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }
  function handleDragLeave() {
    setIsDragOver(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    handleFilesSelected(e.dataTransfer.files);
  }

  // ── Upload submit (sequential batch) ────────────────────────────────────────
  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (fileEntries.length === 0 || batchUploading) return;

    setBatchUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < fileEntries.length; i++) {
      setFileEntries((prev) =>
        prev.map((entry, idx) =>
          idx === i ? { ...entry, status: "uploading", progress: 0 } : entry,
        ),
      );

      try {
        const entry = fileEntries[i];
        const perFileFormat = detectFormat(entry.file.name) ?? format;

        const newDs = await uploadDataset(
          {
            file: entry.file,
            format: perFileFormat,
            type,
            crs,
            tags: tagsInput,
          },
          (pct) => {
            setFileEntries((prev) =>
              prev.map((e2, idx) =>
                idx === i ? { ...e2, progress: pct } : e2,
              ),
            );
          },
        );

        setDatasets((prev) => [newDs, ...prev]);
        setFileEntries((prev) =>
          prev.map((e2, idx) =>
            idx === i ? { ...e2, status: "success", progress: 100 } : e2,
          ),
        );
        successCount++;
      } catch (err: any) {
        setFileEntries((prev) =>
          prev.map((e2, idx) =>
            idx === i
              ? {
                  ...e2,
                  status: "error",
                  error: err?.message ?? "Upload failed",
                }
              : e2,
          ),
        );
        failCount++;
      }
    }

    setBatchUploading(false);

    if (failCount === 0) {
      addToast(
        "success",
        successCount === 1
          ? "Dataset uploaded and registered."
          : `${successCount} datasets uploaded successfully.`,
      );
      setTimeout(() => {
        setIsAddModalOpen(false);
        resetForm();
      }, 1000);
    } else {
      addToast(
        "error",
        `${successCount} succeeded, ${failCount} failed. Review errors below.`,
      );
    }
  }

  function resetForm() {
    setFileEntries([]);
    setFormat("GeoJSON");
    setType("vector");
    setCrs("EPSG:4326 (WGS 84)");
    setTagsInput("");
    setBatchUploading(false);
  }

  const overallProgress = useMemo(() => {
    if (fileEntries.length === 0) return 0;
    const sum = fileEntries.reduce((acc, e) => acc + e.progress, 0);
    return Math.round(sum / fileEntries.length);
  }, [fileEntries]);

  // ── Copy helpers ─────────────────────────────────────────────────────────────
  function handleCopyTileUrl(ds: DatasetItem) {
    const url = getVectorTileUrl(ds.id);
    navigator.clipboard.writeText(url).then(() => {
      setTileCopied(true);
      addToast("success", "Tile URL copied to clipboard.");
      setTimeout(() => setTileCopied(false), 2000);
    });
  }

  function handleCopyId(id: string) {
    navigator.clipboard.writeText(id).then(() => {
      setIdCopied(true);
      addToast("success", "Dataset ID copied.");
      setTimeout(() => setIdCopied(false), 2000);
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
            Spatial Catalog
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary flex items-center gap-3">
            <span className="text-primary">📊</span> Data Hub &amp; Assets
          </h1>
          <p className="mt-2 text-sm sm:text-base text-text-secondary max-w-2xl">
            Upload, manage, inspect schemas, and perform operations on vector
            shapefiles, raster imagery, and spatial datasets.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn btn-primary btn-md shrink-0 gap-2 bg-gradient-to-br from-primary to-info shadow-primary hover-lift"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Add Data / Upload
        </button>
      </div>

      {/* ── Summary Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            icon: "📦",
            value: loading ? "—" : datasets.length,
            label: "Total Datasets",
            color: "bg-primary/10 text-primary",
          },
          {
            icon: "🗺️",
            value: loading
              ? "—"
              : datasets.filter((d) => d.type === "vector").length,
            label: "Vector Layers",
            color: "bg-accent/10 text-accent",
          },
          {
            icon: "🛰️",
            value: loading
              ? "—"
              : datasets.filter(
                  (d) => d.type === "raster" || d.type === "remote-sensing",
                ).length,
            label: "Satellite / Rasters",
            color: "bg-warning/10 text-warning",
          },
          {
            icon: "📑",
            value: loading
              ? "—"
              : datasets.filter((d) => d.type === "tabular").length,
            label: "Tabular CSVs",
            color: "bg-success/10 text-success",
          },
          {
            icon: "💾",
            value: loading ? "—" : formatBytes(totalStorageBytes),
            label: "Total Storage",
            color: "bg-info/10 text-info",
          },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${s.color}`}
            >
              {s.icon}
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold text-text-primary tabular-nums leading-none truncate">
                {s.value}
              </div>
              <div className="text-xs text-text-tertiary mt-1">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & Filter Bar ────────────────────────────────────────────── */}
      <div className="card px-5 py-3.5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-3 flex-1 min-w-[260px]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-text-tertiary shrink-0"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or tag (e.g. boundaries, sentinel, hydrology)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-text-primary w-full text-sm placeholder:text-text-tertiary"
            />
            {loading && (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-text-tertiary">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input input-sm text-sm"
            >
              <option value="all">All Data Types</option>
              <option value="vector">Vector Shapefiles / GeoJSON</option>
              <option value="remote-sensing">Remote Sensing / Satellite</option>
              <option value="raster">Raster Layers</option>
              <option value="tabular">Tabular CSV</option>
            </select>

            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="input input-sm text-sm"
              title="Sort by"
            >
              <option value="updated">Sort: Recently Updated</option>
              <option value="name">Sort: Name</option>
              <option value="format">Sort: Format</option>
              <option value="size">Sort: File Size</option>
            </select>

            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="btn btn-secondary btn-sm btn-icon"
              title={sortDir === "asc" ? "Ascending" : "Descending"}
            >
              {sortDir === "asc" ? "↑" : "↓"}
            </button>

            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-border-primary overflow-hidden">
              <button
                onClick={() => setViewMode("table")}
                className={`px-2.5 py-1.5 text-sm ${
                  viewMode === "table"
                    ? "bg-primary/10 text-primary"
                    : "text-text-tertiary hover:bg-surface-hover"
                }`}
                title="Table view"
              >
                ☰
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`px-2.5 py-1.5 text-sm ${
                  viewMode === "grid"
                    ? "bg-primary/10 text-primary"
                    : "text-text-tertiary hover:bg-surface-hover"
                }`}
                title="Grid view"
              >
                ▦
              </button>
            </div>

            <button
              onClick={fetchDatasets}
              title="Refresh"
              className="btn btn-secondary btn-sm btn-icon"
              aria-label="Refresh datasets"
            >
              ↻
            </button>
          </div>
        </div>

        {/* Tag chips */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border-secondary">
            <span className="text-xs text-text-tertiary mr-1">Tags:</span>
            {allTags.map((tag) => {
              const active = selectedTags.has(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-[0.7rem] px-2 py-1 rounded-full border transition-colors ${
                    active
                      ? "bg-primary text-text-on-primary border-primary"
                      : "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-text-tertiary underline ml-2 hover:text-error"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Error Banner ───────────────────────────────────────────────────── */}
      {fetchError && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          <span className="alert-content text-sm">{fetchError}</span>
          <button
            onClick={fetchDatasets}
            className="ml-auto text-error underline text-sm bg-transparent border-none cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Bulk Action Bar ──────────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="card px-5 py-3 flex items-center justify-between gap-3 bg-primary/5 border-primary/20 animate-fade-in">
          <div className="text-sm text-text-primary font-medium">
            {selectedIds.size} dataset{selectedIds.size === 1 ? "" : "s"}{" "}
            selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/projects")}
              className="btn btn-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
            >
              + Add to Project
            </button>
            <button
              onClick={requestBulkDelete}
              className="btn btn-xs bg-error/10 text-error border border-error/20 hover:bg-error/20"
            >
              🗑️ Delete Selected
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="btn btn-ghost btn-xs text-text-tertiary"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ── Datasets: Table or Grid ────────────────────────────────────────── */}
      {viewMode === "table" ? (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th className="w-8">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                    aria-label="Select all on page"
                  />
                </th>
                <th
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("name")}
                >
                  Dataset Name{sortIndicator("name")}
                </th>
                <th
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("format")}
                >
                  Format{sortIndicator("format")}
                </th>
                <th>CRS</th>
                <th
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("size")}
                >
                  Features / Size{sortIndicator("size")}
                </th>
                <th
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("updated")}
                >
                  Updated{sortIndicator("updated")}
                </th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}>
                        <div
                          className="skeleton h-3.5 rounded"
                          style={{
                            width: j === 1 ? "60%" : j === 6 ? "80%" : "50%",
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="text-4xl">🗺️</div>
                      <div className="text-text-secondary text-sm max-w-sm">
                        {fetchError
                          ? "Could not load datasets."
                          : activeFilterCount > 0
                            ? "No datasets match your current filters."
                            : "No datasets found. Upload your first GeoJSON to get started."}
                      </div>
                      {activeFilterCount > 0 ? (
                        <button
                          onClick={clearFilters}
                          className="btn btn-secondary btn-sm"
                        >
                          Clear Filters
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsAddModalOpen(true)}
                          className="btn btn-primary btn-sm"
                        >
                          Upload Dataset
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                pageItems.map((d) => (
                  <tr
                    key={d.id}
                    className={`${d._optimistic ? "opacity-60" : ""} ${
                      selectedIds.has(d.id) ? "bg-primary/5" : ""
                    }`}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(d.id)}
                        onChange={() => toggleSelectRow(d.id)}
                        aria-label={`Select ${d.name}`}
                      />
                    </td>

                    {/* Name + Tags */}
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-text-primary text-sm flex items-center gap-1.5">
                          <span>{typeIcon(d.type)}</span>
                          {d.name}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {d.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[0.65rem] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* Format badge */}
                    <td>
                      <span className="badge badge-primary text-xs font-semibold">
                        {formatIcon(d.format)} {d.format}
                      </span>
                    </td>

                    {/* CRS */}
                    <td className="text-sm text-text-secondary font-mono">
                      {d.crs}
                    </td>

                    {/* Features / Size */}
                    <td>
                      <div className="text-sm text-text-primary">
                        {featureCountLabel(d)}
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {formatBytes(d.file_size_bytes)}
                      </div>
                    </td>

                    {/* Updated */}
                    <td className="text-sm text-text-tertiary">
                      {formatDate(d.updated_at)}
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewDataset(d)}
                          title="Inspect Schema / Attributes"
                          className="btn btn-secondary btn-xs"
                        >
                          Inspect
                        </button>

                        {d.type === "vector" && (
                          <button
                            onClick={() => setTileUrlDataset(d)}
                            title="Get MVT Tile URL"
                            className="btn btn-xs bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20"
                          >
                            🗺 Tiles
                          </button>
                        )}

                        <button
                          onClick={() => navigate("/projects")}
                          title="Add to Map Project"
                          className="btn btn-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                        >
                          + Project
                        </button>

                        <button
                          onClick={() => requestDelete(d.id, d.name)}
                          title="Delete dataset"
                          className="btn btn-ghost btn-icon btn-xs text-error hover:bg-error/10"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        // ── Grid view ──────────────────────────────────────────────────────────
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-4 flex flex-col gap-3">
                <div className="skeleton h-4 rounded w-2/3" />
                <div className="skeleton h-3 rounded w-1/2" />
                <div className="skeleton h-3 rounded w-1/3" />
              </div>
            ))
          ) : pageItems.length === 0 ? (
            <div className="col-span-full flex flex-col items-center gap-3 text-center py-14">
              <div className="text-4xl">🗺️</div>
              <div className="text-text-secondary text-sm max-w-sm">
                {activeFilterCount > 0
                  ? "No datasets match your current filters."
                  : "No datasets found. Upload your first GeoJSON to get started."}
              </div>
              <button
                onClick={() =>
                  activeFilterCount > 0
                    ? clearFilters()
                    : setIsAddModalOpen(true)
                }
                className="btn btn-primary btn-sm"
              >
                {activeFilterCount > 0 ? "Clear Filters" : "Upload Dataset"}
              </button>
            </div>
          ) : (
            pageItems.map((d) => (
              <div
                key={d.id}
                className={`card p-4 flex flex-col gap-3 hover-lift transition-shadow ${
                  selectedIds.has(d.id) ? "ring-2 ring-primary/40" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(d.id)}
                      onChange={() => toggleSelectRow(d.id)}
                      aria-label={`Select ${d.name}`}
                    />
                    <span className="text-xl shrink-0">{typeIcon(d.type)}</span>
                    <span className="font-semibold text-text-primary text-sm truncate">
                      {d.name}
                    </span>
                  </div>
                  <button
                    onClick={() => requestDelete(d.id, d.name)}
                    className="btn btn-ghost btn-icon btn-xs text-error hover:bg-error/10 shrink-0"
                    title="Delete dataset"
                  >
                    🗑️
                  </button>
                </div>

                <div className="flex flex-wrap gap-1">
                  {d.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[0.65rem] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                    >
                      #{t}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
                  <div>
                    <span className="text-text-tertiary">Format: </span>
                    {formatIcon(d.format)} {d.format}
                  </div>
                  <div>
                    <span className="text-text-tertiary">CRS: </span>
                    <span className="font-mono">{d.crs}</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary">Size: </span>
                    {formatBytes(d.file_size_bytes)}
                  </div>
                  <div>
                    <span className="text-text-tertiary">Updated: </span>
                    {formatDate(d.updated_at)}
                  </div>
                </div>

                <div className="text-xs text-text-primary font-medium">
                  {featureCountLabel(d)}
                </div>

                <div className="flex items-center gap-1.5 pt-1 border-t border-border-secondary mt-1">
                  <button
                    onClick={() => setPreviewDataset(d)}
                    className="btn btn-secondary btn-xs flex-1"
                  >
                    Inspect
                  </button>
                  {d.type === "vector" && (
                    <button
                      onClick={() => setTileUrlDataset(d)}
                      className="btn btn-xs bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 flex-1"
                    >
                      🗺 Tiles
                    </button>
                  )}
                  <button
                    onClick={() => navigate("/projects")}
                    className="btn btn-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 flex-1"
                  >
                    + Project
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {!loading && processedDatasets.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3 px-1">
          <div className="text-xs text-text-tertiary">
            Showing {(clampedPage - 1) * pageSize + 1}–
            {Math.min(clampedPage * pageSize, processedDatasets.length)} of{" "}
            {processedDatasets.length}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="input input-sm text-xs"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={clampedPage <= 1}
              className="btn btn-secondary btn-xs disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-xs text-text-secondary tabular-nums">
              Page {clampedPage} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={clampedPage >= totalPages}
              className="btn btn-secondary btn-xs disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Upload Modal ───────────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 overlay animate-fade-in"
          onClick={() => {
            if (!batchUploading) {
              setIsAddModalOpen(false);
              resetForm();
            }
          }}
        >
          <div
            className="w-full max-w-lg bg-elevated border border-border-primary rounded-2xl shadow-2xl animate-scale-in overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary shrink-0">
              <h2 className="text-xl font-bold text-text-primary">
                Upload &amp; Add Spatial Dataset
              </h2>
              <button
                onClick={() => {
                  if (!batchUploading) {
                    setIsAddModalOpen(false);
                    resetForm();
                  }
                }}
                className="btn btn-ghost btn-icon btn-sm text-text-tertiary hover:text-text-primary"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form
              onSubmit={handleUploadSubmit}
              className="p-6 flex flex-col gap-4 overflow-y-auto scrollbar-thin"
            >
              {/* Dropzone */}
              <div
                onClick={handleDropzoneClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                  isDragOver
                    ? "border-primary bg-primary/8 scale-[1.01]"
                    : fileEntries.length > 0
                      ? "border-success/60 bg-success/4"
                      : "border-border-hover bg-surface-hover hover:border-primary/50 hover:bg-primary/4"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".geojson,.json,.tif,.tiff,.zip,.csv"
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />

                {fileEntries.length > 0 ? (
                  <>
                    <div className="text-3xl mb-2">✅</div>
                    <div className="font-semibold text-sm text-success">
                      {fileEntries.length} file
                      {fileEntries.length === 1 ? "" : "s"} selected
                    </div>
                    <div className="text-xs text-text-tertiary mt-1">
                      Click or drop more files to add to the batch
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-4xl mb-2">📁</div>
                    <div className="font-semibold text-sm text-text-primary">
                      Click or drag GeoJSON, Shapefile, GeoTIFF, or CSV here
                    </div>
                    <div className="text-xs text-text-tertiary mt-1">
                      Multiple files supported — max 500 MB per file
                    </div>
                  </>
                )}
              </div>

              {/* File list with per-file progress */}
              {fileEntries.length > 0 && (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                  {fileEntries.map((entry, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-1 p-2.5 rounded-lg bg-bg-tertiary border border-border-secondary"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm shrink-0">
                            {entry.status === "success"
                              ? "✅"
                              : entry.status === "error"
                                ? "⚠️"
                                : entry.status === "uploading"
                                  ? "⏳"
                                  : "📄"}
                          </span>
                          <span className="text-xs font-medium text-text-primary truncate">
                            {entry.file.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[0.65rem] text-text-tertiary">
                            {formatBytes(entry.file.size)}
                          </span>
                          {entry.status === "idle" && (
                            <button
                              type="button"
                              onClick={() => removeFileEntry(i)}
                              className="text-text-tertiary hover:text-error text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      {entry.status === "uploading" && (
                        <div className="progress h-1.5">
                          <div
                            className="progress-bar bg-gradient-to-r from-primary to-info"
                            style={{ width: `${entry.progress}%` }}
                          />
                        </div>
                      )}
                      {entry.status === "error" && entry.error && (
                        <div className="text-[0.65rem] text-error">
                          {entry.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Overall Upload Progress */}
              {batchUploading && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs text-text-tertiary">
                    <span>Uploading &amp; ingesting features…</span>
                    <span className="tabular-nums">{overallProgress}%</span>
                  </div>
                  <div className="progress">
                    <div
                      className="progress-bar bg-gradient-to-r from-primary to-info"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Format + Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label">
                    Format (applies to batch)
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="input select"
                  >
                    <option value="GeoJSON">GeoJSON</option>
                    <option value="GeoTIFF">GeoTIFF</option>
                    <option value="Shapefile">Shapefile (.zip)</option>
                    <option value="CSV">CSV / Tabular</option>
                    <option value="COG">Cloud Optimized GeoTIFF</option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label">Category</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="input select"
                  >
                    <option value="vector">Vector Layer</option>
                    <option value="remote-sensing">
                      Remote Sensing / Satellite
                    </option>
                    <option value="raster">Raster Surface</option>
                    <option value="tabular">Tabular Data</option>
                  </select>
                </div>
              </div>

              {/* CRS */}
              <div className="form-field">
                <label className="form-label">
                  Coordinate Reference System (CRS)
                </label>
                <input
                  type="text"
                  value={crs}
                  onChange={(e) => setCrs(e.target.value)}
                  className="input"
                />
              </div>

              {/* Tags */}
              <div className="form-field">
                <label className="form-label">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. hydrology, elevation, 2026"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="input"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  disabled={batchUploading}
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                  className="btn btn-secondary btn-md disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fileEntries.length === 0 || batchUploading}
                  className="btn btn-primary btn-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {batchUploading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-text-on-primary border-t-transparent animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    `Upload & Register${
                      fileEntries.length > 1 ? ` (${fileEntries.length})` : ""
                    }`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Schema Preview Modal ───────────────────────────────────────────── */}
      {previewDataset && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 overlay animate-fade-in"
          onClick={() => setPreviewDataset(null)}
        >
          <div
            className="w-full max-w-xl bg-elevated border border-border-primary rounded-2xl shadow-2xl animate-scale-in overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-border-primary shrink-0">
              <div>
                <h2 className="text-lg font-bold text-text-primary">
                  Dataset Attributes &amp; Schema
                </h2>
                <div className="text-xs text-primary mt-0.5 flex items-center gap-2">
                  {previewDataset.name}
                  <button
                    onClick={() => handleCopyId(previewDataset.id)}
                    className="text-text-tertiary hover:text-primary underline text-[0.65rem]"
                  >
                    {idCopied ? "ID copied ✓" : "copy ID"}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setPreviewDataset(null)}
                className="btn btn-ghost btn-icon btn-sm text-text-tertiary hover:text-text-primary"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Meta row */}
            <div className="px-6 py-3 bg-bg-tertiary border-b border-border-secondary text-xs text-text-secondary flex flex-wrap gap-3 shrink-0">
              <span>
                CRS:{" "}
                <code className="text-primary font-mono">
                  {previewDataset.crs}
                </code>
              </span>
              <span>
                Features: <strong>{featureCountLabel(previewDataset)}</strong>
              </span>
              <span>
                Size:{" "}
                <strong>{formatBytes(previewDataset.file_size_bytes)}</strong>
              </span>
              <span>
                Updated:{" "}
                <strong>{formatDate(previewDataset.updated_at)}</strong>
              </span>
            </div>

            {/* Table body */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {previewDataset.attributes.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-text-tertiary text-sm">
                  No attribute schema available for this dataset.
                </div>
              ) : (
                <table className="table text-sm">
                  <thead>
                    <tr>
                      <th>Attribute Field</th>
                      <th>Data Type</th>
                      <th>Sample Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewDataset.attributes.map((attr) => (
                      <tr key={attr.field}>
                        <td className="font-semibold text-text-primary">
                          {attr.field}
                        </td>
                        <td>
                          <code className="text-xs font-mono text-text-secondary">
                            {attr.type}
                          </code>
                        </td>
                        <td className="text-text-secondary">{attr.sample}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border-primary shrink-0">
              {previewDataset.type === "vector" && (
                <button
                  onClick={() => {
                    setTileUrlDataset(previewDataset);
                    setPreviewDataset(null);
                  }}
                  className="btn btn-secondary btn-md"
                >
                  🗺 View Tile URL
                </button>
              )}
              <button
                onClick={() => setPreviewDataset(null)}
                className="btn btn-primary btn-md"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tile URL Modal ─────────────────────────────────────────────────── */}
      {tileUrlDataset && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 overlay animate-fade-in"
          onClick={() => setTileUrlDataset(null)}
        >
          <div
            className="w-full max-w-lg bg-elevated border border-border-primary rounded-2xl shadow-2xl animate-scale-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-border-primary">
              <div>
                <h2 className="text-lg font-bold text-text-primary">
                  🗺 Vector Tile URL
                </h2>
                <div className="text-xs text-primary mt-0.5">
                  {tileUrlDataset.name}
                </div>
              </div>
              <button
                onClick={() => setTileUrlDataset(null)}
                className="btn btn-ghost btn-icon btn-sm text-text-tertiary hover:text-text-primary"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm text-text-secondary leading-relaxed">
                This dataset is served as Mapbox Vector Tiles (MVT) via PostGIS{" "}
                <code className="text-primary font-mono text-xs">ST_AsMVT</code>
                . Use this URL pattern in MapLibre GL, Mapbox GL, or any
                MVT-compatible client.
              </p>

              {/* Tile URL */}
              <div className="p-3.5 rounded-lg bg-bg-tertiary border border-border-primary font-mono text-sm text-primary break-all leading-relaxed">
                {getVectorTileUrl(tileUrlDataset.id)}
              </div>

              {/* MapLibre example */}
              <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                <div className="text-xs font-semibold text-accent mb-2">
                  MapLibre GL example:
                </div>
                <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap leading-relaxed">
                  {`map.addSource("${tileUrlDataset.id.slice(0, 8)}", {\n  type: "vector",\n  tiles: ["${getVectorTileUrl(tileUrlDataset.id)}"],\n  minzoom: 0, maxzoom: 14\n});`}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setTileUrlDataset(null)}
                  className="btn btn-secondary btn-md"
                >
                  Close
                </button>
                <button
                  onClick={() => handleCopyTileUrl(tileUrlDataset)}
                  className={`btn btn-md transition-all duration-200 ${
                    tileCopied
                      ? "bg-success/10 text-success border border-success/30 hover:bg-success/20"
                      : "bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20"
                  }`}
                >
                  {tileCopied ? "✅ Copied!" : "📋 Copy URL"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ───────────────────────────────────────────── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 overlay animate-fade-in"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm bg-elevated border border-border-primary rounded-2xl shadow-2xl animate-scale-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center text-xl shrink-0">
                  🗑️
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-primary">
                    Delete {confirmDelete.label}?
                  </h2>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="btn btn-secondary btn-md"
                >
                  Cancel
                </button>
                <button
                  onClick={performConfirmedDelete}
                  className="btn btn-md bg-error text-white hover:bg-error/90"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toasts ─────────────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-5 right-5 z-[1100] flex flex-col gap-2 items-end"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismissToast(t.id)}
            className={`cursor-pointer px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-fade-in max-w-xs ${
              t.type === "success"
                ? "bg-success/10 text-success border border-success/30"
                : t.type === "error"
                  ? "bg-error/10 text-error border border-error/30"
                  : "bg-info/10 text-info border border-info/30"
            }`}
          >
            <span>
              {t.type === "success" ? "✅" : t.type === "error" ? "⚠️" : "ℹ️"}
            </span>
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
