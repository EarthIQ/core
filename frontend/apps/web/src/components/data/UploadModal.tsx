import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  formatBytes,
  uploadDataset,
  type DatasetFormat,
  type DatasetType,
  type GeoDatasetOut,
} from "../../lib/datasets";
import { FORMATS, TYPES } from "./constants";
import { detectFormat } from "./helpers";
import type { FileEntry } from "./types";

interface Props {
  open: boolean;
  addToast: (type: "success" | "error" | "info", message: string) => void;
  onClose: () => void;
  onUploaded: (newDs: GeoDatasetOut) => void;
}

const SUGGESTED_TYPE: Record<DatasetFormat, DatasetType> = {
  GeoJSON: "vector",
  Shapefile: "vector",
  KML: "points",
  GeoRSS: "points",
  GeoPackage: "vector",
  GeoParquet: "vector",
  GeoTIFF: "raster",
  COG: "remote-sensing",
  CSV: "tabular",
};

export default function UploadModal({
  open,
  addToast,
  onClose,
  onUploaded,
}: Props) {
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [format, setFormat] = useState<DatasetFormat>("GeoJSON");
  const [type, setType] = useState<DatasetType>("vector");
  const [crs, setCrs] = useState("EPSG:4326 (WGS 84)");
  const [tagsInput, setTagsInput] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [batchUploading, setBatchUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setFileEntries([]);
    setFormat("GeoJSON");
    setType("vector");
    setCrs("EPSG:4326 (WGS 84)");
    setTagsInput("");
    setDescription("");
    setSource("");
    setBatchUploading(false);
  }

  // Reset form when modal opens fresh (e.g., after closing with files queued)
  useEffect(() => {
    if (!open) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const overallProgress = useMemo(() => {
    if (fileEntries.length === 0) return 0;
    const sum = fileEntries.reduce((acc, e) => acc + e.progress, 0);
    return Math.round(sum / fileEntries.length);
  }, [fileEntries]);

  function handleFilesSelected(list: FileList | File[] | null) {
    if (!list) return;
    const arr = Array.from(list);
    if (arr.length === 0) return;

    setFileEntries((prev) => [
      ...prev,
      ...arr.map((file) => ({
        file,
        status: "idle" as const,
        progress: 0,
        error: null,
      })),
    ]);

    if (arr.length === 1 && fileEntries.length === 0) {
      const detected = detectFormat(arr[0].name);
      if (detected) {
        setFormat(detected);
        setType(SUGGESTED_TYPE[detected] ?? "vector");
      }
    }
  }

  function removeFileEntry(index: number) {
    setFileEntries((prev) => prev.filter((_, i) => i !== index));
  }

  const handleDropzoneClick = useCallback(
    () => fileInputRef.current?.click(),
    [],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFilesSelected(e.dataTransfer.files);
  };

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
            description: description || undefined,
            source: source || undefined,
          },
          (pct) => {
            setFileEntries((prev) =>
              prev.map((e2, idx) =>
                idx === i ? { ...e2, progress: pct } : e2,
              ),
            );
          },
        );

        onUploaded(newDs);
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
        onClose();
        resetForm();
      }, 1000);
    } else {
      addToast(
        "error",
        `${successCount} succeeded, ${failCount} failed. Review errors below.`,
      );
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 overlay animate-fade-in"
      onClick={() => {
        if (!batchUploading) {
          onClose();
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary shrink-0">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              Upload Spatial Dataset
            </h2>
            <p className="text-xs text-text-tertiary mt-0.5">
              GeoJSON · Shapefile · KML · GeoRSS · GeoTIFF · GeoPackage ·
              GeoParquet · CSV
            </p>
          </div>
          <button
            onClick={() => {
              if (!batchUploading) {
                onClose();
                resetForm();
              }
            }}
            className="btn btn-ghost btn-icon btn-sm text-text-tertiary hover:text-text-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

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
              accept=".geojson,.json,.zip,.shp,.kml,.kmz,.xml,.tif,.tiff,.gpkg,.parquet,.csv,.tsv,.txt"
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
                  Click or drag your file here
                </div>
                <div className="text-xs text-text-tertiary mt-1">
                  Any supported geospatial format · max 500 MB
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
                <span>Uploading & processing…</span>
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
              <label className="form-label">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as DatasetFormat)}
                className="input select"
              >
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Category</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DatasetType)}
                className="input select"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
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

          {/* Description */}
          <div className="form-field">
            <label className="form-label">
              Description{" "}
              <span className="text-text-tertiary text-xs">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input resize-none"
              rows={2}
              placeholder="What is this dataset? Where does it come from?"
            />
          </div>

          {/* Source */}
          <div className="form-field">
            <label className="form-label">
              Source / Provenance{" "}
              <span className="text-text-tertiary text-xs">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Copernicus, USGS, internal GIS team"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="input"
            />
          </div>

          <div className="flex gap-3 justify-end mt-2">
            <button
              type="button"
              disabled={batchUploading}
              onClick={() => {
                onClose();
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
  );
}
