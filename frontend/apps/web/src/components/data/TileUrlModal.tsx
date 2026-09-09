import { Button, Modal, ModalFooter } from "@packages/ui";
import { Check, Copy } from "lucide-react";

import { getVectorTileUrl } from "@/lib/datasets";

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
      description={dataset.name}
      size="lg"
      title="Vector Tile URL"
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <p className="text-text-secondary text-sm leading-relaxed">
          This dataset is served as Mapbox Vector Tiles (MVT) via PostGIS{" "}
          <code className="text-primary font-mono text-xs">ST_AsMVT</code>. Use
          this URL pattern in MapLibre GL, Mapbox GL, or any MVT-compatible
          client.
        </p>

        <div className="bg-bg-tertiary border-border-primary text-primary rounded-lg border p-3.5 font-mono text-sm leading-relaxed break-all">
          {url}
        </div>

        <div className="bg-accent/5 border-accent/20 rounded-lg border p-4">
          <div className="text-accent mb-2 text-xs font-semibold">
            MapLibre GL example:
          </div>
          <pre className="text-text-secondary font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {`map.addSource("${dataset.id.slice(0, 8)}", {
  type: "vector",
  tiles: ["${url}"],
  minzoom: 0, maxzoom: 14
});`}
          </pre>
        </div>

        <ModalFooter>
          <Button
            variant="ghost"
            onClick={onClose}
          >
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
