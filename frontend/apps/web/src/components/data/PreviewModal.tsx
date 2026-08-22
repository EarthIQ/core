import { useEffect, useMemo, useState } from "react";
import { formatBytes, previewDataset } from "../../lib/datasets";
import {
  featureCountLabel,
  formatDate,
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
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("rows");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
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
        if (!cancelled)
          addToast("error", err?.message ?? "Could not load preview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [dataset.id, addToast]);

  // Stable key for the attribute table
  const attributeColumns = useMemo(() => {
    if (data?.columns && data.columns.length > 0) return data.columns;
    if (dataset.attributes && dataset.attributes.length > 0)
      return dataset.attributes;
    return [];
  }, [data?.columns, dataset.attributes]);

  const hasRows = Boolean(data && data.rows && data.rows.length > 0);
  const hasAttributes = attributeColumns.length > 0;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 overlay animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-elevated border border-border-primary rounded-2xl shadow-2xl animate-scale-in overflow-hidden max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border-primary shrink-0">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              Dataset Preview & Schema
            </h2>
            <div className="text-xs text-primary mt-0.5 flex items-center gap-2 flex-wrap">
              {dataset.name}
              <span className="text-text-tertiary">
                · {dataset.format} · {typeLabel(dataset.type)}
              </span>
              <button
                onClick={() => onCopyId(dataset.id)}
                className="text-text-tertiary hover:text-primary underline text-[0.65rem]"
              >
                {idCopied ? "ID copied ✓" : "copy ID"}
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon btn-sm text-text-tertiary hover:text-text-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Meta row */}
        <div className="px-6 py-3 bg-bg-tertiary border-b border-border-secondary text-xs text-text-secondary flex flex-wrap gap-3 shrink-0">
          <span>
            CRS: <code className="text-primary font-mono">{dataset.crs}</code>
          </span>
          <span>
            Contents: <strong>{featureCountLabel(dataset)}</strong>
          </span>
          <span>
            Size: <strong>{formatBytes(dataset.file_size_bytes)}</strong>
          </span>
          <span>
            Updated: <strong>{formatDate(dataset.updated_at)}</strong>
          </span>
          <span>
            Ingested:{" "}
            <strong>
              {isVectorized(dataset) ? "Yes (queryable)" : "No (stored asset)"}
            </strong>
          </span>
        </div>

        {dataset.description && (
          <div className="px-6 py-3 border-b border-border-secondary text-sm text-text-secondary shrink-0">
            {dataset.description}
          </div>
        )}

        {/* Tabs */}
        {(hasRows || hasAttributes) && (
          <div className="px-6 pt-4 flex items-center gap-1 border-b border-border-secondary shrink-0">
            {hasRows && (
              <button
                onClick={() => setTab("rows")}
                className={`px-3 py-2 text-sm rounded-t-lg border-b-2 transition-colors ${
                  tab === "rows"
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-text-tertiary hover:text-text-primary"
                }`}
              >
                📄 Sample Rows
                {data?.row_count != null && (
                  <span className="ml-1.5 text-[0.7rem] text-text-tertiary">
                    ({data.row_count.toLocaleString()})
                  </span>
                )}
              </button>
            )}
            {hasAttributes && (
              <button
                onClick={() => setTab("attributes")}
                className={`px-3 py-2 text-sm rounded-t-lg border-b-2 transition-colors ${
                  tab === "attributes"
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-text-tertiary hover:text-text-primary"
                }`}
              >
                🧬 Attributes
                <span className="ml-1.5 text-[0.7rem] text-text-tertiary">
                  ({attributeColumns.length})
                </span>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12 text-text-tertiary">
              <span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <div className="text-sm">Loading preview…</div>
            </div>
          ) : tab === "attributes" || (!hasRows && hasAttributes) ? (
            <div className="p-4">
              <div className="rounded-lg overflow-hidden border border-border-secondary">
                <table className="table text-sm w-full">
                  <thead className="bg-bg-tertiary">
                    <tr>
                      <th className="text-left px-3 py-2 w-40">
                        <span className="text-[0.65rem] font-semibold text-text-tertiary uppercase tracking-wide">
                          Field
                        </span>
                      </th>
                      <th className="text-left px-3 py-2 w-36">
                        <span className="text-[0.65rem] font-semibold text-text-tertiary uppercase tracking-wide">
                          Type
                        </span>
                      </th>
                      <th className="text-left px-3 py-2">
                        <span className="text-[0.65rem] font-semibold text-text-tertiary uppercase tracking-wide">
                          Sample Value
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {attributeColumns.map((attr) => (
                      <tr
                        key={attr.field}
                        className="hover:bg-surface-hover transition-colors"
                      >
                        <td className="px-3 py-2 font-semibold text-text-primary font-mono text-xs">
                          {attr.field}
                        </td>
                        <td className="px-3 py-2">
                          <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-info/10 text-info border border-info/20">
                            {attr.type}
                          </code>
                        </td>
                        <td className="px-3 py-2 text-text-secondary font-mono text-xs break-all">
                          {attr.sample ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-[0.7rem] text-text-tertiary">
                {attributeColumns.length} attribute
                {attributeColumns.length === 1 ? "" : "s"} on the{" "}
                {dataset.format} layer. These fields can be used for querying,
                styling, and pop-ups in map clients.
              </div>
            </div>
          ) : data && data.columns && data.columns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table text-sm">
                <thead>
                  <tr>
                    {data.columns.map((c) => (
                      <th key={c.field} className="whitespace-nowrap">
                        {c.field}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={i}>
                      {data.columns.map((c) => (
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
              {data.row_count != null && data.row_count > data.rows.length && (
                <div className="px-6 py-2 text-xs text-text-tertiary">
                  Showing first {data.rows.length} of{" "}
                  {data.row_count.toLocaleString()} rows.
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-text-tertiary text-sm text-center px-6">
              <div className="text-3xl">🗃️</div>
              <div>
                No row preview is available for this dataset.
                {isStoredAsset(dataset) &&
                  " It is registered as a downloadable asset — use Download to retrieve the original file."}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border-primary shrink-0 flex-wrap">
          {isVectorized(dataset) && (
            <button
              onClick={() => {
                onOpenTileUrl(dataset);
                onClose();
              }}
              className="btn btn-secondary btn-md"
            >
              🗺 View Tile URL
            </button>
          )}
          <button
            onClick={() => onDownload(dataset)}
            className="btn btn-secondary btn-md"
          >
            ⬇️ Download
          </button>
          <button
            onClick={() => {
              onEdit(dataset);
              onClose();
            }}
            className="btn btn-primary btn-md"
          >
            ✏️ Edit
          </button>
        </div>
      </div>
    </div>
  );
}
