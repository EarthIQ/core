import { isVectorized } from "./helpers";

import type { DatasetItem } from "./types";

interface Props {
  d: DatasetItem;
  compact?: boolean;
  onInspect: (ds: DatasetItem) => void;
  onEdit: (ds: DatasetItem) => void;
  onDownload: (ds: DatasetItem) => void;
  onOpenTileUrl: (ds: DatasetItem) => void;
  onRequestDelete: (id: string, name: string) => void;
}

export default function DatasetActions({
  d,
  compact,
  onInspect,
  onEdit,
  onDownload,
  onOpenTileUrl,
  onRequestDelete,
}: Props) {
  const base = compact ? "flex-1" : "";
  return (
    <div
      className={`flex items-center ${
        compact
          ? "flex-wrap gap-1.5 pt-1 border-t border-border-secondary mt-1"
          : "justify-end gap-1.5"
      }`}
    >
      <button
        className={`${compact ? base : ""} btn btn-secondary btn-xs`}
        title="Inspect Schema / Preview"
        onClick={() => onInspect(d)}
      >
        Inspect
      </button>

      <button
        className={`${compact ? base : ""} btn btn-xs bg-info/10 text-info border border-info/30 hover:bg-info/20`}
        title="Edit metadata"
        onClick={() => onEdit(d)}
      >
        ✏️ Edit
      </button>

      <button
        className={`${compact ? base : ""} btn btn-xs bg-success/10 text-success border border-success/30 hover:bg-success/20`}
        title="Download original file"
        onClick={() => onDownload(d)}
      >
        ⬇️
      </button>

      {isVectorized(d) && (
        <button
          className={`${compact ? base : ""} btn btn-xs bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20`}
          title="Get MVT Tile URL"
          onClick={() => onOpenTileUrl(d)}
        >
          🗺
        </button>
      )}

      <button
        className={`${compact ? base : ""} btn btn-ghost btn-icon btn-xs text-error hover:bg-error/10`}
        title="Delete dataset"
        onClick={() => onRequestDelete(d.id, d.name)}
      >
        🗑️
      </button>
    </div>
  );
}
