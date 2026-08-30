import { Button, Modal, ModalFooter } from "@packages/ui";
import { Check, Copy } from "lucide-react";
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
  const url = getVectorTileUrl(dataset.id);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Vector Tile URL"
      description={dataset.name}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary leading-relaxed">
          This dataset is served as Mapbox Vector Tiles (MVT) via PostGIS{" "}
          <code className="text-primary font-mono text-xs">ST_AsMVT</code>. Use
          this URL pattern in MapLibre GL, Mapbox GL, or any MVT-compatible
          client.
        </p>

        <div className="p-3.5 rounded-lg bg-bg-tertiary border border-border-primary font-mono text-sm text-primary break-all leading-relaxed">
          {url}
        </div>

        <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
          <div className="text-xs font-semibold text-accent mb-2">
            MapLibre GL example:
          </div>
          <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap leading-relaxed">
            {`map.addSource("${dataset.id.slice(0, 8)}", {
  type: "vector",
  tiles: ["${url}"],
  minzoom: 0, maxzoom: 14
});`}
          </pre>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            leftIcon={copied ? <Check size={16} /> : <Copy size={16} />}
            onClick={() => onCopy(dataset)}
          >
            {copied ? "Copied!" : "Copy URL"}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}
