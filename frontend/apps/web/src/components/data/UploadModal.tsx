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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  formatBytes,
  uploadDataset,
  type DatasetFormat,
  type DatasetType,
  type DataFolder,
  type GeoDatasetOut,
} from "@/lib/datasets";

import { FORMATS, INGESTED_FORMATS, STORED_FORMATS, TYPES } from "./constants";
import { detectFormat } from "./helpers";

import type { FileEntry } from "./types";

interface Props {
  open: boolean;
  addToast: (type: "success" | "error" | "info", message: string) => void;
  onClose: () => void;
  onUploaded: (newDs: GeoDatasetOut) => void;
  /** All catalog folders (flat; nested via parent_id) for the destination picker. */
  folders?: DataFolder[];
  /** Folder to pre-select (null/"root" = ungrouped). */
  defaultFolderId?: string | null;
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
  folders = [],
  defaultFolderId = null,
}: Props) {
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [format, setFormat] = useState<DatasetFormat>("GeoJSON");
  const [type, setType] = useState<DatasetType>("vector");
  const [crs, setCrs] = useState("EPSG:4326 (WGS 84)");
  const [tagsInput, setTagsInput] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [folderId, setFolderId] = useState("");
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
    setFolderId("");
    setBatchUploading(false);
    setShowFormats(false);
  }

  // Reset form when modal opens fresh (e.g., after closing with files queued)
  useEffect(() => {
    if (!open) resetForm();
    else setFolderId(defaultFolderId === "root" ? "" : (defaultFolderId ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Destination options: ungrouped + nested (indented) folder list.
  const folderOptions = useMemo(() => {
    const withDepth = folders.map((f) => {
      const byId = new Map(folders.map((x) => [x.id, x]));
      let depth = 0;
      let cursor: DataFolder | undefined = f;
      while (cursor?.parent_id && byId.has(cursor.parent_id) && depth < 20) {
        cursor = byId.get(cursor.parent_id);
        depth += 1;
      }
      return { ...f, depth };
    });
    withDepth.sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name));
    return [
      { value: "", label: "Ungrouped (All Data)" },
      ...withDepth.map((f) => ({
        value: f.id,
        label: `${"  ".repeat(f.depth)}${f.depth > 0 ? "└ " : ""}${f.name}`,
      })),
    ];
  }, [folders]);

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
    []
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
          idx === i ? { ...entry, status: "uploading", progress: 0 } : entry
        )
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
            folderId: folderId || null,
          },
          (pct) => {
            setFileEntries((prev) =>
              prev.map((e2, idx) => (idx === i ? { ...e2, progress: pct } : e2))
            );
          }
        );

        onUploaded(newDs);
        setFileEntries((prev) =>
          prev.map((e2, idx) =>
            idx === i ? { ...e2, status: "success", progress: 100 } : e2
          )
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
              : e2
          )
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
          : `${successCount} datasets uploaded successfully.`
      );
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1000);
    } else {
      addToast(
        "error",
        `${successCount} succeeded, ${failCount} failed. Review errors below.`
      );
    }
  }

  if (!open) return null;

  return (
    <Modal
      isOpen
      closeOnOverlayClick={!batchUploading}
      description="GeoJSON · Shapefile · KML · GeoRSS · GeoTIFF · GeoPackage · GeoParquet · CSV"
      size="lg"
      title="Upload Spatial Dataset"
      onClose={() => {
        if (!batchUploading) {
          onClose();
          resetForm();
        }
      }}
    >
      <form
        className="flex max-h-[calc(90vh-14rem)] scrollbar-thin flex-col gap-4 overflow-y-auto pr-1"
        onSubmit={handleUploadSubmit}
      >
        {/* Dropzone */}
        <div
          className={cn(
            "cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200",
            isDragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : fileEntries.length > 0
                ? "border-success/60 bg-success/5"
                : "border-border-hover bg-surface-hover hover:border-primary/50 hover:bg-primary/5"
          )}
          onClick={handleDropzoneClick}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            multiple
            accept=".geojson,.json,.zip,.shp,.kml,.kmz,.xml,.tif,.tiff,.gpkg,.parquet,.csv,.tsv,.txt"
            className="hidden"
            type="file"
            onChange={(e) => {
              handleFilesSelected(e.target.files);
              e.target.value = "";
            }}
          />
          {fileEntries.length > 0 ? (
            <div className="flex flex-col items-center gap-1">
              <Check
                className="text-success"
                size={22}
              />
              <div className="text-success text-sm font-semibold">
                {fileEntries.length} file
                {fileEntries.length === 1 ? "" : "s"} selected
              </div>
              <div className="text-text-tertiary text-xs">
                Click or drop more files to add to the batch
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <CloudUpload
                className="text-text-tertiary"
                size={26}
              />
              <div className="text-text-primary text-sm font-semibold">
                Drag & drop geospatial files
              </div>
              <div className="text-text-tertiary text-xs">
                or <span className="text-primary">browse</span> from your device
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
                className="border-border-secondary bg-surface-hover/40 rounded-lg border p-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <FileText
                    className="text-text-tertiary shrink-0"
                    size={15}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-text-primary truncate text-xs font-medium">
                        {entry.file.name}
                      </span>
                      <span className="text-text-tertiary shrink-0 text-[0.65rem]">
                        {formatBytes(entry.file.size)}
                      </span>
                    </div>
                    {entry.status === "uploading" && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress
                          size="sm"
                          value={entry.progress}
                        />
                        <span className="text-text-tertiary shrink-0 text-[0.65rem] tabular-nums">
                          {entry.progress}%
                        </span>
                      </div>
                    )}
                    {entry.status === "success" && (
                      <div className="text-success mt-1 inline-flex items-center gap-1 text-[0.7rem]">
                        <Check size={11} /> Uploaded
                      </div>
                    )}
                    {entry.status === "error" && (
                      <div className="text-error mt-1 inline-flex items-center gap-1 text-[0.7rem]">
                        <AlertTriangle size={11} /> {entry.error}
                      </div>
                    )}
                  </div>
                  {!batchUploading && (
                    <button
                      aria-label={`Remove ${entry.file.name}`}
                      className="text-text-tertiary hover:bg-error/10 hover:text-error shrink-0 cursor-pointer rounded-md p-1 transition-colors"
                      type="button"
                      onClick={() => removeFileEntry(i)}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Format"
            options={FORMATS.map((f) => ({ value: f.value, label: f.label }))}
            size="sm"
            value={format}
            onChange={(v) => {
              setFormat(v as DatasetFormat);
              const suggested = SUGGESTED_TYPE[v as DatasetFormat];
              if (suggested) setType(suggested);
            }}
          />
          <Select
            label="Category"
            options={TYPES.map((t) => ({ value: t.value, label: t.label }))}
            size="sm"
            value={type}
            onChange={(v) => setType(v as DatasetType)}
          />
        </div>

        {/* Destination folder */}
        <Select
          label="Save to folder"
          options={folderOptions}
          size="sm"
          value={folderId}
          onChange={(v) => setFolderId(v)}
        />

        {/* CRS */}
        <Input
          inputSize="sm"
          label="Coordinate Reference System (CRS)"
          value={crs}
          onChange={(e) => setCrs(e.target.value)}
        />

        {/* Tags */}
        <Input
          description="Tags are free-form labels that help you find and filter datasets."
          inputSize="sm"
          label="Tags (comma-separated)"
          placeholder="e.g. hydrology, elevation, 2026"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
        />

        {/* Description */}
        <Textarea
          autoResize
          inputSize="sm"
          label="Description"
          placeholder="What is this dataset? Where does it come from?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Source */}
        <Input
          inputSize="sm"
          label="Source / Provenance"
          placeholder="e.g. Copernicus, USGS, internal GIS team"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />

        {/* Supported formats reference */}
        <div className="border-border-secondary rounded-lg border">
          <button
            aria-expanded={showFormats}
            className="hover:bg-surface-hover flex w-full cursor-pointer items-center justify-between px-3 py-2.5 transition-colors"
            type="button"
            onClick={() => setShowFormats((v) => !v)}
          >
            <span className="text-text-secondary text-xs font-semibold">
              Supported formats & how they're handled
            </span>
            {showFormats ? (
              <ChevronDown
                className="text-text-tertiary"
                size={14}
              />
            ) : (
              <ChevronRight
                className="text-text-tertiary"
                size={14}
              />
            )}
          </button>
          {showFormats ? (
            <div className="border-border-secondary border-t p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {FORMATS.map((f) => (
                  <div
                    key={f.value}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5"
                  >
                    <FileText
                      className="text-text-tertiary shrink-0"
                      size={13}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-text-primary text-xs font-medium">
                        {f.value}
                      </div>
                      <code className="text-text-tertiary text-[0.62rem]">
                        {f.extensions}
                      </code>
                    </div>
                    {INGESTED_FORMATS.has(f.value) ? (
                      <Badge
                        size="xs"
                        variant="success"
                      >
                        Ingested
                      </Badge>
                    ) : STORED_FORMATS.has(f.value) ? (
                      <Badge
                        size="xs"
                        variant="info"
                      >
                        Stored
                      </Badge>
                    ) : (
                      <Badge
                        size="xs"
                        variant="warning"
                      >
                        Conditional
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-text-tertiary mt-2 text-[0.68rem]">
                Ingested layers are served as Mapbox Vector Tiles (MVT) and can
                be queried directly. Stored assets are kept on disk and
                available for download.
              </p>
            </div>
          ) : null}
        </div>

        <ModalFooter>
          <Button
            disabled={batchUploading}
            variant="ghost"
            onClick={() => {
              onClose();
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={fileEntries.length === 0}
            leftIcon={<CloudUpload size={16} />}
            loading={batchUploading}
            loadingText="Uploading…"
            type="submit"
          >
            Upload & Register
            {fileEntries.length > 1 ? ` (${fileEntries.length})` : ""}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
