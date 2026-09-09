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

import { formatBytes } from "@/lib/datasets";

import {
  featureCountLabel,
  formatColor,
  formatLucide,
  isStoredAsset,
  isVectorized,
  typeLabel,
  typeLucide,
} from "./helpers";
import RowActions from "./RowActions";

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
  onMove?: (ds: DatasetItem) => void;
}

const MetaTile = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) => {
  return (
    <div className="bg-surface-hover/50 border-border-secondary flex min-w-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5">
      <Icon
        className="text-text-tertiary shrink-0"
        size={12}
      />
      <span className="text-text-tertiary shrink-0 text-[0.68rem]">
        {label}:
      </span>
      <span
        className="text-text-primary truncate text-xs font-semibold"
        title={value}
      >
        {value}
      </span>
    </div>
  );
};

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
  onMove,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
      {loading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="card bg-surface border-border-primary flex animate-pulse flex-col gap-3 rounded-xl border p-4"
          >
            <div className="flex items-start gap-3">
              <div className="skeleton h-10 w-10 shrink-0 rounded-lg" />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="skeleton h-7 rounded-lg" />
              <div className="skeleton h-7 rounded-lg" />
            </div>
          </div>
        ))
      ) : items.length === 0 ? (
        <div className="card bg-surface border-border-primary col-span-full rounded-xl border p-8">
          <EmptyState
            icon={
              <Database
                className="text-primary"
                size={28}
              />
            }
            size="md"
            action={
              activeFilterCount > 0
                ? { label: "Clear all filters", onClick: onClearFilters }
                : { label: "Upload dataset", onClick: onAddData }
            }
            description={
              activeFilterCount > 0
                ? "Try adjusting or clearing your filters to see more datasets."
                : "Upload your first geospatial file to start building your catalog."
            }
            title={
              activeFilterCount > 0
                ? "No matching datasets found"
                : "Your catalog is empty"
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
              className={`card bg-surface border-border-primary hover:border-border-hover group flex cursor-pointer flex-col justify-between gap-3 rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${
                d._optimistic ? "opacity-60" : ""
              }`}
              onClick={() => onInspect(d)}
            >
              <div className="flex flex-col gap-2.5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${colors.bg} ${colors.text} ${colors.border}`}
                    >
                      <FIcon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          className="text-text-primary hover:text-primary block max-w-full cursor-pointer truncate text-left text-sm font-bold transition-colors"
                          title={d.name}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspect(d);
                          }}
                        >
                          {d.name}
                        </button>
                      </div>
                      <div className="text-text-tertiary mt-0.5 flex items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <TIcon size={12} />
                          {typeLabel(d.type)}
                        </span>
                        <span>•</span>
                        <span className={`font-semibold ${colors.text}`}>
                          {d.format}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <RowActions
                      d={d}
                      onDownload={onDownload}
                      onEdit={onEdit}
                      onInspect={onInspect}
                      onMove={onMove}
                      onOpenTileUrl={onOpenTileUrl}
                      onRequestDelete={onRequestDelete}
                    />
                  </div>
                </div>

                {/* Description */}
                {d.description ? (
                  <p className="text-text-secondary line-clamp-2 text-xs leading-relaxed">
                    {d.description}
                  </p>
                ) : null}

                {/* Badges row: Stored / Tiled / Tags */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {stored ? (
                    <span className="bg-info/10 text-info border-info/20 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.65rem] font-medium">
                      <PackageOpen size={10} />
                      Stored
                    </span>
                  ) : null}
                  {vectorized ? (
                    <span className="bg-accent/10 text-accent border-accent/20 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.65rem] font-medium">
                      <Layers size={10} />
                      Tiled MVT
                    </span>
                  ) : null}
                  {d.tags
                    ? d.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="bg-surface-hover text-text-secondary border-border-secondary rounded border px-1.5 py-0.5 text-[0.65rem] font-medium"
                        >
                          #{t}
                        </span>
                      ))
                    : null}
                  {d.tags && d.tags.length > 3 ? (
                    <span className="text-text-tertiary text-[0.65rem]">
                      +{d.tags.length - 3}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="border-border-secondary grid grid-cols-2 gap-2 border-t pt-1 text-xs">
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
                  value={d.updated_at ? d.updated_at.slice(0, 10) : "-"}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
