import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Modal,
  ModalFooter,
  Skeleton,
  Tabs,
} from "@packages/ui";
import {
  Boxes,
  Check,
  Copy,
  Download,
  FileText,
  Globe,
  HardDrive,
  Map,
  Pencil,
  Table2,
} from "lucide-react";
import { formatBytes, previewDataset } from "../../lib/datasets";
import {
  featureCountLabel,
  isStoredAsset,
  isVectorized,
  typeLabel,
} from "./helpers";
import type { DatasetItem, DatasetPreview } from "./types";

interface Props {
  dataset: DatasetItem;
  idCopied: boolean;
  onClose: () => void;
  onDownload: (ds: DatasetItem) => void;
  onEdit: (ds: DatasetItem) => void;
  onOpenTileUrl: (ds: DatasetItem) => void;
  onCopyId: (id: string) => void;
  addToast: (type: "success" | "error" | "info", message: string) => void;
}

type Tab = "rows" | "attributes" | "raw";

export default function PreviewModal({
  dataset,
  idCopied,
  onClose,
  onDownload,
  onEdit,
  onOpenTileUrl,
  onCopyId,
  addToast,
}: Props) {
  const [data, setData] = useState<DatasetPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("rows");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const d = await previewDataset(dataset.id, 20);
        if (!cancelled) {
          setData(d);
          // Pick the most informative tab:
          if (d.rows && d.rows.length > 0) setTab("rows");
          else if (d.columns && d.columns.length > 0) setTab("attributes");
          else setTab("raw");
        }
      } catch (err: any) {
        if (!cancelled) {
          setLoadError(err?.message ?? "Could not load preview.");
          setTab("raw");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [dataset.id]);

  // Stable column list for the attribute table
  const attributeColumns = useMemo(() => {
    if (data?.columns && data.columns.length > 0) return data.columns;
    if (dataset.attributes && dataset.attributes.length > 0)
      return dataset.attributes;
    return [];
  }, [data?.columns, dataset.attributes]);

  const hasRows = Boolean(data && data.rows && data.rows.length > 0);
  const hasAttributes = attributeColumns.length > 0;

  // ── Tab content ────────────────────────────────────────────────────────────
  const rowsContent = !hasRows ? (
    <div className="flex flex-col items-center gap-3 py-12 text-text-tertiary text-sm text-center px-6">
      <FileText size={28} />
      <div>
        No row preview is available for this dataset.
        {isStoredAsset(dataset) &&
          " It is registered as a downloadable asset — use Download to retrieve the original file."}
      </div>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="table text-sm">
        <thead>
          <tr>
            {data!.columns.map((c) => (
              <th key={c.field} className="whitespace-nowrap">
                {c.field}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data!.rows.map((r, i) => (
            <tr key={i}>
              {data!.columns.map((c) => (
                <td
                  key={c.field}
                  className="max-w-[16rem] truncate"
                  title={String(r.values[c.field] ?? "")}
                >
                  {r.values[c.field] === undefined ||
                  r.values[c.field] === null
                    ? "—"
                    : String(r.values[c.field])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data!.row_count != null && data!.row_count > data!.rows.length && (
        <div className="px-6 py-2 text-xs text-text-tertiary">
          Showing first {data!.rows.length} of{" "}
          {data!.row_count.toLocaleString()} rows.
        </div>
      )}
    </div>
  );

  const attributesContent = !hasAttributes ? (
    <div className="flex flex-col items-center gap-3 py-12 text-text-tertiary text-sm text-center px-6">
      <Boxes size={28} />
      <div>No attribute schema is available for this dataset.</div>
    </div>
  ) : (
    <div>
      <div className="overflow-x-auto">
        <table className="table text-sm">
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Sample</th>
            </tr>
          </thead>
          <tbody>
            {attributeColumns.map((attr) => (
              <tr key={attr.field}>
                <td className="font-mono text-xs">{attr.field}</td>
                <td className="text-text-tertiary">{attr.type || "—"}</td>
                <td className="text-text-tertiary max-w-[14rem] truncate">
                  {attr.sample ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-[0.7rem] text-text-tertiary">
        {attributeColumns.length} attribute
        {attributeColumns.length === 1 ? "" : "s"} on the {dataset.format}{" "}
        layer. These fields can be used for querying, styling, and pop-ups in
        map clients.
      </div>
    </div>
  );

  const rawContent = (
    <pre className="p-4 max-h-72 overflow-auto rounded-lg bg-bg-tertiary border border-border-secondary text-xs font-mono text-text-secondary leading-relaxed">
      {JSON.stringify(data?.asset_meta ?? dataset.meta ?? {}, null, 2)}
    </pre>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Dataset Preview & Schema"
      description={`${dataset.name} · ${dataset.format} · ${typeLabel(dataset.type)}`}
      size="full"
    >
      <div className="flex flex-col gap-4">
        {/* Meta strip */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border-secondary bg-surface-hover px-2 py-1 text-xs text-text-secondary">
            <HardDrive size={12} className="text-text-tertiary" />
            {formatBytes(dataset.file_size_bytes)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border-secondary bg-surface-hover px-2 py-1 text-xs text-text-secondary">
            <Table2 size={12} className="text-text-tertiary" />
            {featureCountLabel(dataset)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border-secondary bg-surface-hover px-2 py-1 text-xs text-text-secondary">
            <Globe size={12} className="text-text-tertiary" />
            {dataset.crs || "unknown CRS"}
          </span>
          <button
            type="button"
            onClick={() => onCopyId(dataset.id)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-secondary bg-surface-hover px-2 py-1 text-xs text-text-tertiary hover:text-primary cursor-pointer transition-colors"
            title="Copy dataset ID"
          >
            {idCopied ? (
              <Check size={12} className="text-success" />
            ) : (
              <Copy size={12} />
            )}
            {dataset.id.slice(0, 8)}…
            {idCopied ? " copied" : ""}
          </button>
        </div>

        {loadError && (
          <Alert variant="error" title="Preview unavailable">
            {loadError}
          </Alert>
        )}

        {loading ? (
          <div className="flex flex-col gap-2 py-4">
            <div className="skeleton h-4 rounded w-1/2" />
            <div className="skeleton h-4 rounded w-2/3" />
            <div className="skeleton h-4 rounded w-3/4" />
            <div className="skeleton h-4 rounded w-1/3" />
          </div>
        ) : (
          <Tabs
            variant="underline"
            size="sm"
            activeKey={tab}
            onChange={(key) => setTab(key as Tab)}
            items={[
              {
                key: "rows",
                label: "Rows",
                icon: <Table2 size={14} />,
                disabled: !hasRows && !loading,
                content: rowsContent,
              },
              {
                key: "attributes",
                label: "Attributes",
                icon: <Boxes size={14} />,
                disabled: !hasAttributes && !loading,
                content: attributesContent,
              },
              {
                key: "raw",
                label: "Raw meta",
                icon: <FileText size={14} />,
                content: rawContent,
              },
            ]}
          />
        )}

        <ModalFooter>
          {isVectorized(dataset) && (
            <Button
              variant="secondary"
              leftIcon={<Map size={16} />}
              onClick={() => {
                onClose();
                onOpenTileUrl(dataset);
              }}
            >
              View Tile URL
            </Button>
          )}
          <Button
            variant="secondary"
            leftIcon={<Download size={16} />}
            onClick={() => onDownload(dataset)}
          >
            Download
          </Button>
          <Button
            leftIcon={<Pencil size={16} />}
            onClick={() => {
              onClose();
              onEdit(dataset);
            }}
          >
            Edit
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}

