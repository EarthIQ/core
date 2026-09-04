import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Modal,
  ModalFooter,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
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
  MapPin,
  Pencil,
  Route,
  Shapes,
  Sparkles,
  Table2,
  type LucideIcon,
} from "lucide-react";
import {
  formatBytes,
  getGeometrySummary,
  previewDataset,
  type AttributeField,
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
  typeLucide,
} from "./helpers";
import AskAIPanel from "./AskAIPanel";
import type { DatasetItem } from "./types";

type Tab = "rows" | "schema" | "ask-ai" | "raw";

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

/** Map an attribute type string to a Badge variant for colour coding. */
function typeVariant(
  type?: string,
): "info" | "primary" | "warning" | "success" | "secondary" | "default" {
  const t = (type || "").toLowerCase();
  if (/\bint|float|double|real|decimal|numeric|serial|number|bigint|smallint\b/.test(t))
    return "info";
  if (/\bbool|flag\b/.test(t)) return "warning";
  if (/\bdate|time|timestamp\b/.test(t)) return "success";
  if (/\bgeom|wkb|wkt|geojson|geometry\b/.test(t)) return "secondary";
  if (/\btext|string|varchar|char|name|categor|label|code|id\b/.test(t))
    return "primary";
  return "default";
}

function geometryIcon(dominant: string | null): LucideIcon {
  if (dominant === "point") return MapPin;
  if (dominant === "line") return Route;
  if (dominant === "polygon") return Shapes;
  return Globe;
}

function FactTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: boolean;
}) {
  const c = accent
    ? { bg: "bg-primary/10", text: "text-primary", border: "border-primary/25" }
    : formatColor("default");
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border bg-surface-hover px-3 py-2.5 ${c.border}`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          accent ? "bg-primary/10 text-primary" : `${c.bg} ${c.text}`
        }`}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[0.62rem] font-semibold uppercase tracking-wide text-subtle">
          {label}
        </div>
        <div className="truncate text-sm font-medium text-[var(--text-primary)]">
          {value}
        </div>
      </div>
    </div>
  );
}

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
  const [geometry, setGeometry] = useState<GeometrySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("rows");
  const [copiedRaw, setCopiedRaw] = useState(false);

  // Load the bounded preview (schema + sample rows).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const d = await previewDataset(dataset.id, 20);
        if (cancelled) return;
        setData(d);
        // Pick the most informative tab (rows → schema → ask AI).
        const cols = d.columns?.length || dataset.attributes?.length || 0;
        if (d.rows && d.rows.length > 0) setTab("rows");
        else if (cols > 0) setTab("schema");
        else setTab("ask-ai");
      } catch (err: unknown) {
        if (!cancelled) {
          setLoadError((err as { message?: string })?.message ?? "Could not load preview.");
          setTab("ask-ai");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [dataset.id, dataset.attributes]);

  // Load the geometry profile (non-fatal — used for the facts tile + Ask AI).
  useEffect(() => {
    let cancelled = false;
    if (dataset.type === "raster" || dataset.type === "remote-sensing") return;
    getGeometrySummary(dataset.id)
      .then((g) => !cancelled && setGeometry(g))
      .catch(() => {
        /* geometry is optional */
      });
    return () => {
      cancelled = true;
    };
  }, [dataset.id, dataset.type]);

  // Stable column list for the schema table.
  const attributeColumns = useMemo(() => {
    if (data?.columns && data.columns.length > 0) return data.columns;
    if (dataset.attributes && dataset.attributes.length > 0)
      return dataset.attributes;
    return [] as AttributeField[];
  }, [data?.columns, dataset.attributes]);

  const hasRows = Boolean(data && data.rows && data.rows.length > 0);
  const hasAttributes = attributeColumns.length > 0;

  const GeomIcon = geometryIcon(geometry?.dominant ?? null);
  const geometryLabel = geometry
    ? [
        geometry.dominant ? `${geometry.dominant}s` : "mixed",
        Object.entries(geometry.counts ?? {})
          .map(([k, v]) => `${k}:${v}`)
          .filter((s) => !/^\D+$/.test(s.split(":")[0]))
          .join(", "),
      ]
        .filter(Boolean)
        .join(" · ")
    : dataset.type === "raster" || dataset.type === "remote-sensing"
      ? "Raster"
      : "—";

  function copyRaw() {
    const text = JSON.stringify(data?.asset_meta ?? dataset.meta ?? {}, null, 2);
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopiedRaw(true);
        addToast("success", "Raw metadata copied to clipboard.");
        setTimeout(() => setCopiedRaw(false), 1600);
      },
      () => addToast("error", "Couldn't copy to clipboard."),
    );
  }

  // ── Tab content ─────────────────────────────────────────────────────────────
  const rowsContent = !hasRows ? (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-subtle bg-surface-hover px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <FileText size={22} />
      </div>
      <div className="text-sm font-medium text-[var(--text-primary)]">
        No row preview is available for this dataset.
      </div>
      <div className="max-w-md text-xs text-subtle">
        {isStoredAsset(dataset)
          ? "It is registered as a downloadable asset — use Download to retrieve the original file."
          : "You can still ask the AI about it, or inspect the raw metadata."}
      </div>
    </div>
  ) : (
    <div className="overflow-hidden rounded-xl border border-subtle">
      <div className="max-h-[42vh] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <th className="px-3 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-wide text-subtle">
                #
              </th>
              {data!.columns.map((c) => (
                <th
                  key={c.field}
                  className="whitespace-nowrap px-3 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-wide text-subtle"
                >
                  {c.field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-secondary)]">
            {data!.rows.map((r, i) => (
              <tr key={i} className="transition-colors hover:bg-surface-hover">
                <td className="px-3 py-2 text-xs text-subtle tabular-nums">{i + 1}</td>
                {data!.columns.map((c) => (
                  <td
                    key={c.field}
                    className="max-w-[16rem] truncate px-3 py-2 text-[var(--text-secondary)]"
                    title={String(r.values[c.field] ?? "")}
                  >
                    {r.values[c.field] === undefined || r.values[c.field] === null
                      ? "—"
                      : String(r.values[c.field])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data!.row_count != null && data!.row_count > data!.rows.length && (
        <div className="border-t border-subtle px-3 py-2 text-xs text-subtle">
          Showing first {data!.rows.length} of{" "}
          {data!.row_count.toLocaleString()} rows.
        </div>
      )}
    </div>
  );

  const schemaContent = !hasAttributes ? (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-subtle bg-surface-hover px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Boxes size={22} />
      </div>
      <div className="text-sm font-medium text-[var(--text-primary)]">
        No attribute schema is available for this dataset.
      </div>
      <div className="max-w-md text-xs text-subtle">
        Ask the AI to help interpret what this {dataset.format} layer contains.
      </div>
    </div>
  ) : (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted">
          {attributeColumns.length} field
          {attributeColumns.length === 1 ? "" : "s"} on the {dataset.format} layer
        </span>
        <span className="text-xs text-subtle">
          Use these for querying, styling &amp; pop-ups in map clients.
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-subtle">
        <div className="max-h-[42vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr>
                <th className="px-3 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-wide text-subtle">
                  Field
                </th>
                <th className="px-3 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-wide text-subtle">
                  Type
                </th>
                <th className="px-3 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-wide text-subtle">
                  Sample
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-secondary)]">
              {attributeColumns.map((a) => (
                <tr key={a.field} className="transition-colors hover:bg-surface-hover">
                  <td className="px-3 py-2 font-mono text-xs text-[var(--text-primary)]">
                    {a.field}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={typeVariant(a.type)} size="sm">
                      {a.type || "unknown"}
                    </Badge>
                  </td>
                  <td
                    className="max-w-[16rem] truncate px-3 py-2 font-mono text-xs text-subtle"
                    title={a.sample}
                  >
                    {a.sample ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const rawContent = (
    <div className="overflow-hidden rounded-xl border border-subtle">
      <div className="flex items-center justify-between gap-3 border-b border-subtle px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs text-subtle">
          <FileText size={13} /> Raw asset metadata
        </span>
        <button
          onClick={copyRaw}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-subtle transition-colors hover:bg-surface-hover hover:text-primary"
        >
          {copiedRaw ? (
            <Check size={12} className="text-success" />
          ) : (
            <Copy size={12} />
          )}
          {copiedRaw ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-[42vh] overflow-auto p-4 font-mono text-xs leading-relaxed text-[var(--text-secondary)]">
        {JSON.stringify(data?.asset_meta ?? dataset.meta ?? {}, null, 2)}
      </pre>
    </div>
  );

  const FormatIcon = formatLucide(dataset.format);
  const TypeIcon = typeLucide(dataset.type);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Dataset Preview & Schema"
      description={`${dataset.name} · ${dataset.format} · ${typeLabel(dataset.type)}`}
      size="full"
    >
      <div className="flex flex-col gap-4">
        {/* Facts grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <FactTile icon={FormatIcon} label="Format" value={dataset.format} accent />
          <FactTile icon={TypeIcon} label="Type" value={typeLabel(dataset.type)} />
          <FactTile icon={Globe} label="CRS" value={dataset.crs || "unknown"} />
          <FactTile
            icon={HardDrive}
            label="Size"
            value={formatBytes(dataset.file_size_bytes)}
          />
          <FactTile icon={Table2} label="Features" value={featureCountLabel(dataset)} />
          <FactTile icon={GeomIcon} label="Geometry" value={geometryLabel} />
        </div>

        {/* ID + copy (kept compact on its own line) */}
        <div className="-mt-1 flex items-center justify-between gap-3 text-xs text-subtle">
          <span className="flex items-center gap-1.5 truncate">
            <span className="font-mono">{dataset.id.slice(0, 8)}…</span>
            <span>·</span>
            <span className="truncate">{dataset.tags?.length ? dataset.tags.join(", ") : "no tags"}</span>
          </span>
          <button
            type="button"
            onClick={() => onCopyId(dataset.id)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-subtle bg-surface-hover px-2 py-1 text-xs text-subtle transition-colors hover:text-primary"
            title="Copy dataset ID"
          >
            {idCopied ? (
              <Check size={12} className="text-success" />
            ) : (
              <Copy size={12} />
            )}
            {idCopied ? "Copied" : "Copy ID"}
          </button>
        </div>

        {loadError && (
          <Alert variant="error" title="Preview unavailable">
            {loadError}
          </Alert>
        )}

        {loading ? (
          <div className="flex flex-col gap-2 py-4">
            <div className="skeleton h-4 w-1/2 rounded" />
            <div className="skeleton h-4 w-2/3 rounded" />
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-4 w-1/3 rounded" />
          </div>
        ) : (
          <Tabs
            variant="underline"
            size="sm"
            value={tab}
            onValueChange={(k) => setTab(k as Tab)}
          >
            <TabsList>
              <TabsTrigger value="rows" icon={<Table2 size={14} />}>
                Rows
              </TabsTrigger>
              <TabsTrigger value="schema" icon={<Boxes size={14} />}>
                Schema
              </TabsTrigger>
              <TabsTrigger value="ask-ai" icon={<Sparkles size={14} />}>
                Ask AI
              </TabsTrigger>
              <TabsTrigger value="raw" icon={<FileText size={14} />}>
                Raw
              </TabsTrigger>
            </TabsList>
            <TabsContent value="rows">{rowsContent}</TabsContent>
            <TabsContent value="schema">{schemaContent}</TabsContent>
            <TabsContent value="ask-ai" forceMount>
              <AskAIPanel dataset={dataset} preview={data} addToast={addToast} />
            </TabsContent>
            <TabsContent value="raw">{rawContent}</TabsContent>
          </Tabs>
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