import {
  Database,
  FolderArchive,
  HardDrive,
  Layers,
  Satellite,
  Table2,
} from "lucide-react";
import { useMemo } from "react";

import { formatBytes } from "@/lib/datasets";

import { isStoredAsset, isVectorized } from "./helpers";

import type { DatasetItem } from "./types";

interface Props {
  datasets: DatasetItem[];
  loading: boolean;
}

export default function SummaryStats({ datasets, loading }: Props) {
  const totalStorageBytes = useMemo(
    () => datasets.reduce((sum, d) => sum + (d.file_size_bytes ?? 0), 0),
    [datasets]
  );

  const stats = [
    {
      icon: Database,
      value: loading ? "-" : datasets.length,
      label: "Total Datasets",
      color: "bg-primary/10 text-primary border-primary/20",
    },
    {
      icon: Layers,
      value: loading ? "-" : datasets.filter((d) => isVectorized(d)).length,
      label: "Tiled Layers",
      color:
        "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    },
    {
      icon: Satellite,
      value: loading
        ? "-"
        : datasets.filter(
            (d) =>
              d.format === "GeoTIFF" ||
              d.format === "COG" ||
              d.type === "raster" ||
              d.type === "remote-sensing"
          ).length,
      label: "Rasters & COG",
      color:
        "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    },
    {
      icon: Table2,
      value: loading
        ? "-"
        : datasets.filter((d) => d.type === "tabular").length,
      label: "Tabular Files",
      color:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      icon: FolderArchive,
      value: loading ? "-" : datasets.filter((d) => isStoredAsset(d)).length,
      label: "Stored Assets",
      color:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      icon: HardDrive,
      value: loading ? "-" : formatBytes(totalStorageBytes),
      label: "Catalog Storage",
      color:
        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="card bg-surface border-border-primary hover:border-border-hover flex items-center gap-3 rounded-xl border p-3.5 transition-all duration-150"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${s.color}`}
            >
              <Icon size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-text-primary truncate text-lg leading-tight font-bold tabular-nums">
                {s.value}
              </div>
              <div className="text-text-tertiary truncate text-[0.7rem] font-medium">
                {s.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
