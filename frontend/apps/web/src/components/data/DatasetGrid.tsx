import { EmptyState } from "@packages/ui";
import {
  Clock,
  Database,
  Globe2,
  Hash,
  Layers,
  PackageOpen,
  type LucideIcon,
} from "lucide-react";
import { formatBytes } from "../../lib/datasets";
import RowActions from "./RowActions";
import {
  featureCountLabel,
  formatColor,
  formatLucide,
  isStoredAsset,
  isVectorized,
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

function MetaTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 min-w-0 bg-surface-hover/50 px-2.5 py-1.5 rounded-lg border border-border-secondary">
      <Icon size={12} className="shrink-0 text-text-tertiary" />
      <span className="text-[0.68rem] text-text-tertiary shrink-0">{label}:</span>
      <span className="truncate text-xs text-text-primary font-semibold" title={value}>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
      {loading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="card p-4 flex flex-col gap-3 bg-surface border border-border-primary rounded-xl animate-pulse"
          >
            <div className="flex items-start gap-3">
              <div className="skeleton h-10 w-10 rounded-lg shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="skeleton h-4 rounded w-3/4" />
                <div className="skeleton h-3 rounded w-1/2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="skeleton h-7 rounded-lg" />
              <div className="skeleton h-7 rounded-lg" />
            </div>
          </div>
        ))
      ) : items.length === 0 ? (
        <div className="col-span-full card p-8 bg-surface border border-border-primary rounded-xl">
          <EmptyState
            size="md"
            icon={<Database size={28} className="text-primary" />}
            title={
              activeFilterCount > 0
                ? "No matching datasets found"
                : "Your catalog is empty"
            }
            description={
              activeFilterCount > 0
                ? "Try adjusting or clearing your filters to see more datasets."
                : "Upload your first geospatial file to start building your catalog."
            }
            action={
              activeFilterCount > 0
                ? { label: "Clear all filters", onClick: onClearFilters }
                : { label: "Upload dataset", onClick: onAddData }
            }
          />
        </div>
      ) : (
        items.map((d) => {
          const FIcon = formatLucide(d.format);
          const TIcon = typeLucide(d.type);
          const colors = formatColor(d.format);
          const vectorized = isVectorized(d);
          const stored = isStoredAsset(d);

          return (
            <div
              key={d.id}
              onClick={() => onInspect(d)}
              className={`card p-4 flex flex-col justify-between gap-3 bg-surface border border-border-primary hover:border-border-hover hover:shadow-md transition-all duration-200 rounded-xl cursor-pointer group ${
                d._optimistic ? "opacity-60" : ""
              }`}
            >
              <div className="flex flex-col gap-2.5">
                {/* Header */}
                <div className="flex items-start gap-3 justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${colors.bg} ${colors.text} ${colors.border}`}
                    >
                      <FIcon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspect(d);
                          }}
                          className="font-bold text-text-primary text-sm truncate max-w-full hover:text-primary transition-colors cursor-pointer text-left block"
                          title={d.name}
                        >
                          {d.name}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-text-tertiary">
                        <span className="inline-flex items-center gap-1">
                          <TIcon size={12} />
                          {typeLabel(d.type)}
                        </span>
                        <span>•</span>
                        <span
                          className={`font-semibold ${colors.text}`}
                        >
                          {d.format}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <RowActions
                      d={d}
                      onInspect={onInspect}
                      onEdit={onEdit}
                      onDownload={onDownload}
                      onOpenTileUrl={onOpenTileUrl}
                      onRequestDelete={onRequestDelete}
                    />
                  </div>
                </div>

                {/* Description */}
                {d.description && (
                  <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                    {d.description}
                  </p>
                )}

                {/* Badges row: Stored / Tiled / Tags */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {stored && (
                    <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium px-1.5 py-0.5 rounded-md bg-info/10 text-info border border-info/20">
                      <PackageOpen size={10} />
                      Stored
                    </span>
                  )}
                  {vectorized && (
                    <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium px-1.5 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
                      <Layers size={10} />
                      Tiled MVT
                    </span>
                  )}
                  {d.tags &&
                    d.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[0.65rem] font-medium px-1.5 py-0.5 rounded bg-surface-hover text-text-secondary border border-border-secondary"
                      >
                        #{t}
                      </span>
                    ))}
                  {d.tags && d.tags.length > 3 && (
                    <span className="text-[0.65rem] text-text-tertiary">
                      +{d.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border-secondary">
                <MetaTile
                  icon={Hash}
                  label="Records"
                  value={featureCountLabel(d)}
                />
                <MetaTile
                  icon={Globe2}
                  label="CRS"
                  value={d.crs || "Standard"}
                />
                <MetaTile
                  icon={Database}
                  label="Size"
                  value={formatBytes(d.file_size_bytes)}
                />
                <MetaTile
                  icon={Clock}
                  label="Date"
                  value={d.updated_at ? d.updated_at.slice(0, 10) : "—"}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

