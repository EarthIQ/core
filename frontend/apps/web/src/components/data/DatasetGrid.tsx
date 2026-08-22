import { formatBytes } from "../../lib/datasets";
import DatasetActions from "./DatasetActions";
import { featureCountLabel, formatIcon, typeIcon, typeLabel } from "./helpers";
import type { DatasetItem } from "./types";

interface Props {
  items: DatasetItem[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggleSelectRow: (id: string) => void;
  activeFilterCount: number;
  onClearFilters: () => void;
  onAddData: () => void;
  onInspect: (ds: DatasetItem) => void;
  onEdit: (ds: DatasetItem) => void;
  onDownload: (ds: DatasetItem) => void;
  onOpenTileUrl: (ds: DatasetItem) => void;
  onRequestDelete: (id: string, name: string) => void;
}

export default function DatasetGrid({
  items,
  loading,
  selectedIds,
  onToggleSelectRow,
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
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {loading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4 flex flex-col gap-3">
            <div className="skeleton h-4 rounded w-2/3" />
            <div className="skeleton h-3 rounded w-1/2" />
            <div className="skeleton h-3 rounded w-1/3" />
          </div>
        ))
      ) : items.length === 0 ? (
        <div className="col-span-full flex flex-col items-center gap-3 text-center py-14">
          <div className="text-4xl">🗺️</div>
          <div className="text-text-secondary text-sm max-w-sm">
            {activeFilterCount > 0
              ? "No datasets match your current filters."
              : "No datasets found. Upload your first file to get started."}
          </div>
          <button
            onClick={() =>
              activeFilterCount > 0 ? onClearFilters() : onAddData()
            }
            className="btn btn-primary btn-sm"
          >
            {activeFilterCount > 0 ? "Clear Filters" : "Upload Dataset"}
          </button>
        </div>
      ) : (
        items.map((d) => (
          <div
            key={d.id}
            className={`card p-4 flex flex-col gap-3 hover-lift transition-shadow ${
              selectedIds.has(d.id) ? "ring-2 ring-primary/40" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={selectedIds.has(d.id)}
                  onChange={() => onToggleSelectRow(d.id)}
                  aria-label={`Select ${d.name}`}
                />
                <span className="text-xl shrink-0">{typeIcon(d.type)}</span>
                <span className="font-semibold text-text-primary text-sm truncate">
                  {d.name}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {d.tags.map((t) => (
                <span
                  key={t}
                  className="text-[0.65rem] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                >
                  #{t}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
              <div>
                <span className="text-text-tertiary">Format: </span>
                {formatIcon(d.format)} {d.format}
              </div>
              <div>
                <span className="text-text-tertiary">Type: </span>
                {typeLabel(d.type)}
              </div>
              <div>
                <span className="text-text-tertiary">CRS: </span>
                <span className="font-mono">{d.crs}</span>
              </div>
              <div>
                <span className="text-text-tertiary">Size: </span>
                {formatBytes(d.file_size_bytes)}
              </div>
            </div>

            <div className="text-xs text-text-primary font-medium">
              {featureCountLabel(d)}
            </div>

            <DatasetActions
              d={d}
              compact
              onInspect={onInspect}
              onEdit={onEdit}
              onDownload={onDownload}
              onOpenTileUrl={onOpenTileUrl}
              onRequestDelete={onRequestDelete}
            />
          </div>
        ))
      )}
    </div>
  );
}
