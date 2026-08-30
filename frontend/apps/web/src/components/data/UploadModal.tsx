import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Input,
  Modal,
  ModalFooter,
  Progress,
  Select,
  Textarea,
  cn,
} from "@packages/ui";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  CloudUpload,
  FileText,
  X,
} from "lucide-react";
import {
  formatBytes,
  uploadDataset,
  type DatasetFormat,
  type DatasetType,
  type GeoDatasetOut,
} from "../../lib/datasets";
import { FORMATS, INGESTED_FORMATS, STORED_FORMATS, TYPES } from "./constants";
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
  const [showFormats, setShowFormats] = useState(false);
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
    setShowFormats(false);
  }

  // Reset form when modal opens fresh (e.g., after closing with files queued)
  useEffect(() => {
    if (!open) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    <Modal
      isOpen
      onClose={() => {
        if (!batchUploading) {
          onClose();
          resetForm();
        }
      }}
      closeOnOverlayClick={!batchUploading}
      title="Upload Spatial Dataset"
      description="GeoJSON · Shapefile · KML · GeoRSS · GeoTIFF · GeoPackage · GeoParquet · CSV"
      size="lg"
    >
      <form
        onSubmit={handleUploadSubmit}
        className="flex flex-col gap-4 max-h-[calc(90vh-14rem)] overflow-y-auto scrollbar-thin pr-1"
      >
        {/* Dropzone */}
        <div
          onClick={handleDropzoneClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200",
            isDragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : fileEntries.length > 0
                ? "border-success/60 bg-success/5"
                : "border-border-hover bg-surface-hover hover:border-primary/50 hover:bg-primary/5",
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".geojson,.json,.zip,.shp,.kml,.kmz,.xml,.tif,.tiff,.gpkg,.parquet,.csv,.tsv,.txt"
            className="hidden"
            onChange={(e) => {
              handleFilesSelected(e.target.files);
              e.target.value = "";
            }}
          />
          {fileEntries.length > 0 ? (
            <div className="flex flex-col items-center gap-1">
              <Check size={22} className="text-success" />
              <div className="font-semibold text-sm text-success">
                {fileEntries.length} file
                {fileEntries.length === 1 ? "" : "s"} selected
              </div>
              <div className="text-xs text-text-tertiary">
                Click or drop more files to add to the batch
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <CloudUpload size={26} className="text-text-tertiary" />
              <div className="font-semibold text-sm text-text-primary">
                Drag & drop geospatial files
              </div>
              <div className="text-xs text-text-tertiary">
                or <span className="text-primary">browse</span> from your
                device
              </div>
            </div>
          )}
        </div>

        {/* File list */}
        {fileEntries.length > 0 && (
          <div className="flex flex-col gap-2">
            {fileEntries.map((entry, i) => (
              <div
                key={`${entry.file.name}-${i}`}
                className="rounded-lg border border-border-secondary bg-surface-hover/40 p-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={15} className="shrink-0 text-text-tertiary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-text-primary">
                        {entry.file.name}
                      </span>
                      <span className="shrink-0 text-[0.65rem] text-text-tertiary">
                        {formatBytes(entry.file.size)}
                      </span>
                    </div>
                    {entry.status === "uploading" && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress value={entry.progress} size="sm" />
                        <span className="shrink-0 text-[0.65rem] tabular-nums text-text-tertiary">
                          {entry.progress}%
                        </span>
                      </div>
                    )}
                    {entry.status === "success" && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[0.7rem] text-success">
                        <Check size={11} /> Uploaded
                      </div>
                    )}
                    {entry.status === "error" && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[0.7rem] text-error">
                        <AlertTriangle size={11} /> {entry.error}
                      </div>
                    )}
                  </div>
                  {!batchUploading && (
                    <button
                      type="button"
                      onClick={() => removeFileEntry(i)}
                      aria-label={`Remove ${entry.file.name}`}
                      className="shrink-0 rounded-md p-1 text-text-tertiary hover:bg-error/10 hover:text-error cursor-pointer transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Format + category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Format"
            value={format}
            onChange={(v) => {
              setFormat(v as DatasetFormat);
              const suggested = SUGGESTED_TYPE[v as DatasetFormat];
              if (suggested) setType(suggested);
            }}
            size="sm"
            options={FORMATS.map((f) => ({ value: f.value, label: f.label }))}
          />
          <Select
            label="Category"
            value={type}
            onChange={(v) => setType(v as DatasetType)}
            size="sm"
            options={TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
        </div>

        {/* CRS */}
        <Input
          label="Coordinate Reference System (CRS)"
          value={crs}
          onChange={(e) => setCrs(e.target.value)}
          inputSize="sm"
        />

        {/* Tags */}
        <Input
          label="Tags (comma-separated)"
          placeholder="e.g. hydrology, elevation, 2026"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          description="Tags become folders in the Data library sidebar."
          inputSize="sm"
        />

        {/* Description */}
        <Textarea
          label="Description"
          placeholder="What is this dataset? Where does it come from?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          inputSize="sm"
          autoResize
        />

        {/* Source */}
        <Input
          label="Source / Provenance"
          placeholder="e.g. Copernicus, USGS, internal GIS team"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          inputSize="sm"
        />

        {/* Supported formats reference */}
        <div className="rounded-lg border border-border-secondary">
          <button
            type="button"
            onClick={() => setShowFormats((v) => !v)}
            aria-expanded={showFormats}
            className="flex w-full items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-surface-hover transition-colors"
          >
            <span className="text-xs font-semibold text-text-secondary">
              Supported formats & how they're handled
            </span>
            {showFormats ? (
              <ChevronDown size={14} className="text-text-tertiary" />
            ) : (
              <ChevronRight size={14} className="text-text-tertiary" />
            )}
          </button>
          {showFormats && (
            <div className="border-t border-border-secondary p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FORMATS.map((f) => (
                  <div
                    key={f.value}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5"
                  >
                    <FileText size={13} className="shrink-0 text-text-tertiary" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-text-primary">
                        {f.value}
                      </div>
                      <code className="text-[0.62rem] text-text-tertiary">
                        {f.extensions}
                      </code>
                    </div>
                    {INGESTED_FORMATS.has(f.value) ? (
                      <Badge size="xs" variant="success">
                        Ingested
                      </Badge>
                    ) : STORED_FORMATS.has(f.value) ? (
                      <Badge size="xs" variant="info">
                        Stored
                      </Badge>
                    ) : (
                      <Badge size="xs" variant="warning">
                        Conditional
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[0.68rem] text-text-tertiary">
                Ingested layers are served as Mapbox Vector Tiles (MVT) and can
                be queried directly. Stored assets are kept on disk and
                available for download.
              </p>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button
            variant="ghost"
            disabled={batchUploading}
            onClick={() => {
              onClose();
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={fileEntries.length === 0}
            loading={batchUploading}
            loadingText="Uploading…"
            leftIcon={<CloudUpload size={16} />}
          >
            Upload & Register
            {fileEntries.length > 1 ? ` (${fileEntries.length})` : ""}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
