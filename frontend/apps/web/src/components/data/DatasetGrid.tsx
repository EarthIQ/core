import { Badge, EmptyState, cn } from "@packages/ui";
import {
  Database,
  Globe,
  Hash,
  PackageOpen,
  type LucideIcon,
} from "lucide-react";
import { formatBytes } from "../../lib/datasets";
import RowActions from "./RowActions";
import {
  featureCountLabel,
  formatLucide,
  isStoredAsset,
  typeLabel,
  typeLucide,
} from "./helpers";
import type { DatasetItem } from "./types";

interface Props {
  items: DatasetItem[];
  loading: boolean;
  activeFilterCount: number;
  onClearFilters: () => void;
  onAddData: () => void;
  onInspect: (ds: DatasetItem) => void;
  onEdit: (ds: DatasetItem) => void;
  onDownload: (ds: DatasetItem) => void;
  onOpenTileUrl: (ds: DatasetItem) => void;
  onRequestDelete: (id: string, name: string) => void;
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon size={12} className="shrink-0 text-text-tertiary" />
      <span className="text-text-tertiary shrink-0">{label}</span>
      <span className="truncate text-text-secondary font-medium" title={value}>
        {value}
      </span>
    </div>
  );
}

export default function DatasetGrid({
  items,
  loading,
  activeFilterCount,
  onClearFilters,
  onAddData,
  onInspect,
  onEdit,
  onDownload,
  onOpenTileUrl,
  onRequestDelete,
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {loading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4 flex flex-col gap-3">
            <div className="skeleton h-4 rounded w-2/3" />
            <div className="skeleton h-3 rounded w-1/2" />
            <div className="skeleton h-3 rounded w-1/3" />
            <div className="skeleton h-3 rounded w-3/4" />
          </div>
        ))
      ) : items.length === 0 ? (
        <div className="col-span-full card">
          <EmptyState
            size="md"
            icon={<Database size={26} />}
            title={
              activeFilterCount > 0
                ? "No matching datasets"
                : "Your catalog is empty"
            }
            description={
              activeFilterCount > 0
                ? "No datasets match the current folder, filters or search."
                : "Upload your first geospatial file to start building your catalog."
            }
            action={
              activeFilterCount > 0
                ? { label: "Clear filters", onClick: onClearFilters }
                : { label: "Upload dataset", onClick: onAddData }
            }
          />
        </div>
      ) : (
        items.map((d) => {
          const FIcon = formatLucide(d.format);
          const TIcon = typeLucide(d.type);
          return (
            <div
              key={d.id}
              className={
                "card p-4 flex flex-col gap-3 transition-shadow " +
                (d._optimistic ? "opacity-60" : "")
              }
            >
              {/* Header */}
              <div className="flex items-start gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FIcon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onInspect(d)}
                    className="font-semibold text-text-primary text-sm truncate block max-w-full hover:text-primary cursor-pointer text-left"
                    title="Inspect"
                  >
                    {d.name}
                  </button>
                  <div className="flex items-center gap-1 text-[0.7rem] text-text-tertiary">
                    <TIcon size={11} />
                    {typeLabel(d.type)}
                  </div>
                </div>
                <RowActions
                  d={d}
                  onInspect={onInspect}
                  onEdit={onEdit}
                  onDownload={onDownload}
                  onOpenTileUrl={onOpenTileUrl}
                  onRequestDelete={onRequestDelete}
                />
              </div>

              {/* Tags */}
              {d.tags && d.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {d.tags.slice(0, 4).map((t) => (
                    <Badge key={t} size="xs" variant="primary">
                      #{t}
                    </Badge>
                  ))}
                  {d.tags.length > 4 && (
                    <span className="text-[0.65rem] text-text-tertiary self-center">
                      +{d.tags.length - 4}
                    </span>
                  )}
                </div>
              )}

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <Meta
                  icon={Hash}
                  label="Features"
                  value={featureCountLabel(d)}
                />
                <Meta icon={Globe} label="CRS" value={d.crs || "—"} />
                <Meta
                  icon={Database}
                  label="Size"
                  value={formatBytes(d.file_size_bytes)}
                />
                <Meta
                  icon={PackageOpen}
                  label="Updated"
                  value={d.updated_at ? d.updated_at.slice(0, 10) : "—"}
                />
              </div>

              {/* Stored-asset marker */}
              {isStoredAsset(d) && (
                <div className="flex items-center gap-1.5 text-[0.7rem] text-info">
                  <PackageOpen size={12} />
                  Stored asset — download the original file
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
