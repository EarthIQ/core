import { Badge, Button, cn } from "@packages/ui";
import {
  Box,
  Clock,
  Copy,
  Database,
  Download,
  Eye,
  Folder,
  FolderPlus,
  Globe,
  HardDrive,
  Layers,
  MapPin,
  PackageOpen,
  Pencil,
  Route,
  Shapes,
  Table2,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  formatBytes,
  getGeometrySummary,
  previewDataset,
  type DataFolder,
  type DatasetPreview,
  type GeometrySummary,
} from "@/lib/datasets";

import {
  featureCountLabel,
  formatColor,
  formatLucide,
  isStoredAsset,
  isVectorized,
  typeLabel,
} from "./helpers";

import type { DatasetItem } from "./types";

interface Props {
  dataset: DatasetItem | null;
  // Overview fallback (shown when nothing is selected)
  allDatasets: DatasetItem[];
  folders: DataFolder[];
  loading: boolean;

  // Actions
  onInspect: (ds: DatasetItem) => void;
  onEdit: (ds: DatasetItem) => void;
  onDownload: (ds: DatasetItem) => void;
  onOpenTileUrl: (ds: DatasetItem) => void;
  onAddToProject: (ids: string[]) => void;
  onRequestDelete: (id: string, name: string) => void;
  onCopyId: (id: string) => void;
  idCopied: boolean;
  onClose: () => void;
}

function geometryIcon(dominant: string | null): LucideIcon {
  if (dominant === "point") return MapPin;
  if (dominant === "line") return Route;
  if (dominant === "polygon") return Shapes;
  return Globe;
}

/** A single key/value fact in the preview pane. */
const Fact = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) => (
  <div className="border-border-secondary bg-surface-hover/30 flex items-center gap-2 rounded-lg border px-2.5 py-2">
    <Icon
      className="text-text-tertiary shrink-0"
      size={14}
    />
    <div className="min-w-0">
      <div className="text-text-tertiary truncate text-[0.6rem] font-medium tracking-wide uppercase">
        {label}
      </div>
      <div className="text-text-primary truncate text-xs font-semibold capitalize">
        {value}
      </div>
    </div>
  </div>
);

/** Compact stat tile used in the overview state. */
const Stat = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) => (
  <div className="border-border-secondary bg-surface-hover/30 flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
    <Icon
      className="text-primary shrink-0"
      size={16}
    />
    <div className="min-w-0">
      <div className="text-text-primary truncate text-sm font-bold tabular-nums">
        {value}
      </div>
      <div className="text-text-tertiary truncate text-[0.65rem]">{label}</div>
    </div>
  </div>
);

/** Catalog overview shown when no dataset is selected. */
const Overview = ({
  allDatasets,
  folders,
  loading,
}: {
  allDatasets: DatasetItem[];
  folders: DataFolder[];
  loading: boolean;
}) => {
  const totalBytes = useMemo(
    () => allDatasets.reduce((s, d) => s + (d.file_size_bytes ?? 0), 0),
    [allDatasets]
  );
  const byType = useMemo(() => {
    const m: Record<string, number> = {};
    allDatasets.forEach((d) => {
      m[d.type] = (m[d.type] ?? 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [allDatasets]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <div className="text-primary mb-1 text-[0.62rem] font-bold tracking-wider uppercase">
          Preview
        </div>
        <h2 className="text-text-primary text-base font-semibold">
          Catalog overview
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="skeleton h-[52px] rounded-lg"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Stat
              icon={Database}
              label="Datasets"
              value={allDatasets.length}
            />
            <Stat
              icon={Folder}
              label="Folders"
              value={folders.length}
            />
            <Stat
              icon={Layers}
              label="Tiled layers"
              value={allDatasets.filter((d) => isVectorized(d)).length}
            />
            <Stat
              icon={HardDrive}
              label="Storage"
              value={formatBytes(totalBytes)}
            />
          </div>

          <div>
            <div className="text-text-tertiary mb-2 text-[0.65rem] font-bold tracking-wider uppercase">
              By type
            </div>
            <div className="border-border-secondary divide-y overflow-hidden rounded-lg border">
              {byType.length === 0 ? (
                <div className="text-text-tertiary px-3 py-3 text-xs">
                  No datasets yet.
                </div>
              ) : (
                byType.map(([t, c]) => (
                  <div
                    key={t}
                    className="flex items-center justify-between px-3 py-2 text-xs"
                  >
                    <span className="text-text-secondary font-medium">
                      {typeLabel(t)}
                    </span>
                    <span className="text-text-primary font-semibold tabular-nums">
                      {c}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-border-secondary bg-primary/[0.04] text-text-secondary flex items-start gap-2.5 rounded-lg border border-dashed p-3 text-xs leading-relaxed">
            <Box
              className="text-primary mt-0.5 shrink-0"
              size={15}
            />
            <span>
              Select any dataset to inspect its schema, sample rows, and
              available actions — no need to open a dialog.
            </span>
          </div>
        </>
      )}
    </div>
  );
};
/**
 * Persistent right-hand preview pane (Explorer "preview pane" / Finder Quick
 * Look). When a dataset is selected it fetches a bounded schema + sample
 * rows and the geometry profile, and surfaces the key facts and actions.
 * When nothing is selected it shows a compact catalog overview.
 */
export default function DetailsPane(props: Props) {
  const {
    dataset,
    allDatasets,
    folders,
    loading,
    onInspect,
    onEdit,
    onDownload,
    onOpenTileUrl,
    onAddToProject,
    onRequestDelete,
    onCopyId,
    idCopied,
    onClose,
  } = props;

  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [geo, setGeo] = useState<GeometrySummary | null>(null);

  const datasetId = dataset?.id;

  useEffect(() => {
    if (!datasetId) {
      setPreview(null);
      setGeo(null);
      setPreviewErr(null);
      return;
    }
    let alive = true;
    setPreview(null);
    setPreviewErr(null);
    setGeo(null);
    previewDataset(datasetId, 6)
      .then((p) => alive && setPreview(p))
      .catch(
        (e) => alive && setPreviewErr(e?.message ?? "Preview unavailable")
      );
    getGeometrySummary(datasetId)
      .then((g) => alive && setGeo(g))
      .catch(() => {
        /* geometry profile is optional */
      });
    return () => {
      alive = false;
    };
  }, [datasetId]);

  if (!dataset) {
    return (
      <Overview
        allDatasets={allDatasets}
        folders={folders}
        loading={loading}
      />
    );
  }

  const colors = formatColor(dataset.format);
  const FIcon = formatLucide(dataset.format);
  const vectorized = isVectorized(dataset);
  const stored = isStoredAsset(dataset);
  const GeoIcon = geo ? geometryIcon(geo.dominant) : Globe;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border-secondary flex items-start gap-3 border-b p-4">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
            colors.bg,
            colors.text,
            colors.border
          )}
        >
          <FIcon size={21} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-text-tertiary text-[0.62rem] font-bold tracking-wider uppercase">
            Preview
          </div>
          <h2
            className="text-text-primary truncate text-sm font-semibold"
            title={dataset.name}
          >
            {dataset.name}
          </h2>
        </div>
        <button
          aria-label="Close preview"
          className="text-text-tertiary hover:bg-surface-hover hover:text-text-primary flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors"
          type="button"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 scrollbar-thin space-y-4 overflow-y-auto p-4">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            leftIcon={<FIcon size={11} />}
            size="xs"
            variant="primary"
          >
            {typeLabel(dataset.type)}
          </Badge>
          <Badge
            size="xs"
            variant="secondary"
          >
            {dataset.format}
          </Badge>
          {vectorized ? (
            <Badge
              leftIcon={<Layers size={11} />}
              size="xs"
              variant="info"
            >
              Tiled
            </Badge>
          ) : null}
          {stored ? (
            <Badge
              leftIcon={<PackageOpen size={11} />}
              size="xs"
              variant="success"
            >
              Stored
            </Badge>
          ) : null}
        </div>
        {/* Facts grid */}
        <div className="grid grid-cols-2 gap-2">
          <Fact
            icon={Table2}
            label="Records"
            value={featureCountLabel(dataset)}
          />
          <Fact
            icon={GeoIcon}
            label="Geometry"
            value={geo?.dominant ? geo.dominant : "—"}
          />
          <Fact
            icon={Database}
            label="Size"
            value={formatBytes(dataset.file_size_bytes)}
          />
          <Fact
            icon={Globe}
            label="CRS"
            value={dataset.crs || "Standard"}
          />
          <Fact
            icon={Clock}
            label="Created"
            value={dataset.created_at ? dataset.created_at.slice(0, 10) : "—"}
          />
          <Fact
            icon={Clock}
            label="Updated"
            value={dataset.updated_at ? dataset.updated_at.slice(0, 10) : "—"}
          />
        </div>

        {/* Description */}
        {dataset.description ? (
          <div>
            <div className="text-text-tertiary mb-1.5 text-[0.65rem] font-bold tracking-wider uppercase">
              Description
            </div>
            <p className="text-text-secondary text-xs leading-relaxed whitespace-pre-wrap">
              {dataset.description}
            </p>
          </div>
        ) : null}

        {/* Tags */}
        {dataset.tags && dataset.tags.length > 0 ? (
          <div>
            <div className="text-text-tertiary mb-1.5 text-[0.65rem] font-bold tracking-wider uppercase">
              Tags
            </div>
            <div className="flex flex-wrap gap-1.5">
              {dataset.tags.map((t) => (
                <span
                  key={t}
                  className="bg-surface-hover text-text-secondary border-border-secondary rounded-full border px-2 py-0.5 text-[0.68rem] font-medium"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {/* Schema + sample rows */}
        <div>
          <div className="text-text-tertiary mb-2 flex items-center justify-between text-[0.65rem] font-bold tracking-wider uppercase">
            <span>Schema</span>
            {preview ? (
              <span className="text-text-tertiary font-medium normal-case">
                {preview.columns.length} column
                {preview.columns.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>

          {previewErr ? (
            <div className="border-error/20 bg-error/[0.06] text-error flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
              <X size={13} /> {previewErr}
            </div>
          ) : !preview ? (
            <div className="space-y-2">
              <div className="skeleton h-4 w-1/2 rounded" />
              <div className="skeleton h-4 w-2/3 rounded" />
              <div className="skeleton h-4 w-1/3 rounded" />
            </div>
          ) : (
            <>
              <div className="border-border-secondary divide-y overflow-hidden rounded-lg border">
                {preview.columns.length === 0 ? (
                  <div className="text-text-tertiary px-3 py-2 text-xs">
                    No tabular columns to display.
                  </div>
                ) : (
                  preview.columns.slice(0, 8).map((c) => (
                    <div
                      key={c.field}
                      className="flex items-center justify-between gap-2 px-3 py-1.5"
                    >
                      <span className="text-text-primary truncate text-xs font-medium">
                        {c.field}
                      </span>
                      <span className="text-text-tertiary shrink-0 text-[0.62rem]">
                        {c.type}
                      </span>
                    </div>
                  ))
                )}
                {preview.columns.length > 8 ? (
                  <div className="text-text-tertiary px-3 py-1.5 text-[0.62rem]">
                    +{preview.columns.length - 8} more columns
                  </div>
                ) : null}
              </div>

              {preview.rows && preview.rows.length > 0 ? (
                <div className="border-border-secondary mt-3 overflow-hidden rounded-lg border">
                  <div className="border-border-secondary bg-surface-hover/40 text-text-tertiary border-b px-3 py-1.5 text-[0.6rem] font-bold tracking-wider uppercase">
                    Sample rows
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[0.68rem]">
                      <thead>
                        <tr>
                          {preview.columns.slice(0, 5).map((c) => (
                            <th
                              key={c.field}
                              className="text-text-tertiary px-2 py-1.5 font-semibold whitespace-nowrap"
                            >
                              {c.field}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="border-border-secondary divide-y">
                        {preview.rows.slice(0, 6).map((r, i) => (
                          <tr key={i}>
                            {preview.columns.slice(0, 5).map((c) => (
                              <td
                                key={c.field}
                                className="text-text-secondary max-w-[140px] truncate px-2 py-1.5 whitespace-nowrap"
                              >
                                {String(r.values[c.field] ?? "—")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
        {/* Actions */}
        <div className="border-border-secondary space-y-2 border-t pt-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              leftIcon={<Eye size={15} />}
              size="sm"
              variant="primary"
              onClick={() => onInspect(dataset)}
            >
              Inspect
            </Button>
            <Button
              leftIcon={<Pencil size={15} />}
              size="sm"
              variant="secondary"
              onClick={() => onEdit(dataset)}
            >
              Edit
            </Button>
            <Button
              leftIcon={<Download size={15} />}
              size="sm"
              variant="secondary"
              onClick={() => onDownload(dataset)}
            >
              Download
            </Button>
            {vectorized ? (
              <Button
                leftIcon={<MapPin size={15} />}
                size="sm"
                variant="secondary"
                onClick={() => onOpenTileUrl(dataset)}
              >
                Tile URL
              </Button>
            ) : (
              <Button
                leftIcon={<Copy size={15} />}
                size="sm"
                variant="secondary"
                onClick={() => onCopyId(dataset.id)}
              >
                {idCopied ? "Copied" : "Copy ID"}
              </Button>
            )}
            <Button
              leftIcon={<FolderPlus size={15} />}
              size="sm"
              variant="ghost"
              onClick={() => onAddToProject([dataset.id])}
            >
              Add to project
            </Button>
            <Button
              leftIcon={<Trash2 size={15} />}
              size="sm"
              variant="error"
              onClick={() => onRequestDelete(dataset.id, dataset.name)}
            >
              Delete
            </Button>
          </div>
          {vectorized ? (
            <Button
              className="w-full"
              leftIcon={<Copy size={15} />}
              size="sm"
              variant="ghost"
              onClick={() => onCopyId(dataset.id)}
            >
              {idCopied ? "Dataset ID copied" : "Copy dataset ID"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
