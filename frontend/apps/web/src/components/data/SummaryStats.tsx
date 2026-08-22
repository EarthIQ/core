import { useMemo } from "react";
import { formatBytes } from "../../lib/datasets";
import { isStoredAsset, isVectorized } from "./helpers";
import type { DatasetItem } from "./types";

interface Props {
  datasets: DatasetItem[];
  loading: boolean;
}

export default function SummaryStats({ datasets, loading }: Props) {
  const totalStorageBytes = useMemo(
    () => datasets.reduce((sum, d) => sum + (d.file_size_bytes ?? 0), 0),
    [datasets],
  );

  const stats = [
    {
      icon: "📦",
      value: loading ? "—" : datasets.length,
      label: "Datasets",
      color: "bg-primary/10 text-primary",
    },
    {
      icon: "🗺️",
      value: loading ? "—" : datasets.filter((d) => isVectorized(d)).length,
      label: "Tiled Layers",
      color: "bg-accent/10 text-accent",
    },
    {
      icon: "🛰️",
      value: loading
        ? "—"
        : datasets.filter(
            (d) =>
              d.format === "GeoTIFF" ||
              d.format === "COG" ||
              d.type === "raster" ||
              d.type === "remote-sensing",
          ).length,
      label: "Rasters",
      color: "bg-warning/10 text-warning",
    },
    {
      icon: "📑",
      value: loading
        ? "—"
        : datasets.filter((d) => d.type === "tabular").length,
      label: "Tables",
      color: "bg-success/10 text-success",
    },
    {
      icon: "📁",
      value: loading ? "—" : datasets.filter((d) => isStoredAsset(d)).length,
      label: "Stored Assets",
      color: "bg-info/10 text-info",
    },
    {
      icon: "💾",
      value: loading ? "—" : formatBytes(totalStorageBytes),
      label: "Storage",
      color: "bg-primary/10 text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="card p-3 flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${s.color}`}
          >
            {s.icon}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold text-text-primary tabular-nums leading-none truncate">
              {s.value}
            </div>
            <div className="text-[0.68rem] text-text-tertiary mt-0.5">
              {s.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
