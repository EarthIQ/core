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
        onClick={() => onInspect(d)}
        title="Inspect Schema / Preview"
        className={`${compact ? base : ""} btn btn-secondary btn-xs`}
      >
        Inspect
      </button>

      <button
        onClick={() => onEdit(d)}
        title="Edit metadata"
        className={`${compact ? base : ""} btn btn-xs bg-info/10 text-info border border-info/30 hover:bg-info/20`}
      >
        ✏️ Edit
      </button>

      <button
        onClick={() => onDownload(d)}
        title="Download original file"
        className={`${compact ? base : ""} btn btn-xs bg-success/10 text-success border border-success/30 hover:bg-success/20`}
      >
        ⬇️
      </button>

      {isVectorized(d) && (
        <button
          onClick={() => onOpenTileUrl(d)}
          title="Get MVT Tile URL"
          className={`${compact ? base : ""} btn btn-xs bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20`}
        >
          🗺
        </button>
      )}

      <button
        onClick={() => onRequestDelete(d.id, d.name)}
        title="Delete dataset"
        className={`${compact ? base : ""} btn btn-ghost btn-icon btn-xs text-error hover:bg-error/10`}
      >
        🗑️
      </button>
    </div>
  );
}
