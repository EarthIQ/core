import { getVectorTileUrl } from "../../lib/datasets";
import type { DatasetItem } from "./types";

interface Props {
  dataset: DatasetItem;
  copied: boolean;
  onClose: () => void;
  onCopy: (ds: DatasetItem) => void;
}

export default function TileUrlModal({
  dataset,
  copied,
  onClose,
  onCopy,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 overlay animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-elevated border border-border-primary rounded-2xl shadow-2xl animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-border-primary">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              🗺 Vector Tile URL
            </h2>
            <div className="text-xs text-primary mt-0.5">{dataset.name}</div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon btn-sm text-text-tertiary hover:text-text-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-text-secondary leading-relaxed">
            This dataset is served as Mapbox Vector Tiles (MVT) via PostGIS{" "}
            <code className="text-primary font-mono text-xs">ST_AsMVT</code>.
            Use this URL pattern in MapLibre GL, Mapbox GL, or any
            MVT-compatible client.
          </p>

          <div className="p-3.5 rounded-lg bg-bg-tertiary border border-border-primary font-mono text-sm text-primary break-all leading-relaxed">
            {getVectorTileUrl(dataset.id)}
          </div>

          <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
            <div className="text-xs font-semibold text-accent mb-2">
              MapLibre GL example:
            </div>
            <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap leading-relaxed">
              {`map.addSource("${dataset.id.slice(0, 8)}", {\n  type: "vector",\n  tiles: ["${getVectorTileUrl(dataset.id)}"],\n  minzoom: 0, maxzoom: 14\n});`}
            </pre>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="btn btn-secondary btn-md">
              Close
            </button>
            <button
              onClick={() => onCopy(dataset)}
              className={`btn btn-md transition-all duration-200 ${
                copied
                  ? "bg-success/10 text-success border border-success/30 hover:bg-success/20"
                  : "bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20"
              }`}
            >
              {copied ? "✅ Copied!" : "📋 Copy URL"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
