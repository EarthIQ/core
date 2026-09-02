import {
  Box,
  File,
  FileBox,
  FileText,
  Globe,
  Map,
  MapPin,
  Radio,
  Satellite,
  Table2,
  type LucideIcon,
} from "lucide-react";
import { INGESTED_FORMATS, STORED_FORMATS, TYPES } from "./constants";
import type { DatasetFormat, DatasetItem } from "./types";

/** Lucide icon for a dataset format (replaces the old emoji map). */
export function formatLucide(format: string): LucideIcon {
  switch (format) {
    case "GeoJSON":
      return FileText;
    case "Shapefile":
      return Box;
    case "KML":
      return MapPin;
    case "GeoRSS":
      return Radio;
    case "GeoTIFF":
    case "COG":
      return Satellite;
    case "GeoPackage":
      return FileBox;
    case "GeoParquet":
      return FileText;
    case "CSV":
      return Table2;
    default:
      return File;
  }
}

/** Lucide icon for a dataset semantic type. */
export function typeLucide(type: string): LucideIcon {
  switch (type) {
    case "vector":
      return Map;
    case "raster":
      return Satellite;
    case "remote-sensing":
      return Globe;
    case "tabular":
      return Table2;
    case "points":
      return MapPin;
    default:
      return Box;
  }
}

export function formatColor(format: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (format) {
    case "GeoJSON":
      return {
        bg: "bg-cyan-500/10",
        text: "text-cyan-600 dark:text-cyan-400",
        border: "border-cyan-500/25",
      };
    case "Shapefile":
      return {
        bg: "bg-emerald-500/10",
        text: "text-emerald-600 dark:text-emerald-400",
        border: "border-emerald-500/25",
      };
    case "COG":
    case "GeoTIFF":
      return {
        bg: "bg-purple-500/10",
        text: "text-purple-600 dark:text-purple-400",
        border: "border-purple-500/25",
      };
    case "GeoPackage":
      return {
        bg: "bg-blue-500/10",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-500/25",
      };
    case "GeoParquet":
      return {
        bg: "bg-indigo-500/10",
        text: "text-indigo-600 dark:text-indigo-400",
        border: "border-indigo-500/25",
      };
    case "CSV":
      return {
        bg: "bg-amber-500/10",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-500/25",
      };
    case "KML":
      return {
        bg: "bg-rose-500/10",
        text: "text-rose-600 dark:text-rose-400",
        border: "border-rose-500/25",
      };
    case "GeoRSS":
      return {
        bg: "bg-orange-500/10",
        text: "text-orange-600 dark:text-orange-400",
        border: "border-orange-500/25",
      };
    default:
      return {
        bg: "bg-primary/10",
        text: "text-primary",
        border: "border-primary/25",
      };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function featureCountLabel(ds: DatasetItem): string {
  if (ds.type === "tabular") {
    if (ds.feature_count === null || ds.feature_count === undefined)
      return "Tabular";
    return `${ds.feature_count.toLocaleString()} rows`;
  }
  if (ds.type === "raster" || ds.type === "remote-sensing") {
    return "Raster Asset";
  }
  if (ds.feature_count === null || ds.feature_count === undefined) return "—";
  return `${ds.feature_count.toLocaleString()} features`;
}

export function isVectorized(ds: DatasetItem): boolean {
  if (INGESTED_FORMATS.has(ds.format)) return true;
  if (ds.format === "CSV") return Boolean(ds.meta?.ingested);
  return false;
}

export function isStoredAsset(ds: DatasetItem): boolean {
  return STORED_FORMATS.has(ds.format);
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export function detectFormat(fileName: string): DatasetFormat | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "geojson" || ext === "json") return "GeoJSON";
  if (ext === "tif" || ext === "tiff") return "GeoTIFF";
  if (ext === "zip") return "Shapefile";
  if (ext === "gpkg") return "GeoPackage";
  if (ext === "kml" || ext === "kmz") return "KML";
  if (ext === "xml") return "GeoRSS";
  if (ext === "parquet") return "GeoParquet";
  if (ext === "csv" || ext === "tsv") return "CSV";
  return null;
}

export function formatAccept(format: DatasetFormat): string {
  const map: Record<DatasetFormat, string> = {
    GeoJSON: ".geojson,.json",
    Shapefile: ".zip,.shp",
    KML: ".kml,.kmz",
    GeoRSS: ".xml",
    GeoTIFF: ".tif,.tiff",
    COG: ".tif,.tiff",
    GeoPackage: ".gpkg",
    GeoParquet: ".parquet",
    CSV: ".csv,.tsv,.txt",
  };
  return map[format] ?? ".*";
}

export function formatIcon(format: string): string {
  switch (format) {
    case "GeoJSON":
      return "🧬";
    case "Shapefile":
      return "🗂️";
    case "KML":
      return "📍";
    case "GeoRSS":
      return "📡";
    case "GeoTIFF":
    case "COG":
      return "🛰️";
    case "GeoPackage":
      return "📦";
    case "GeoParquet":
      return "🧊";
    case "CSV":
      return "📑";
    default:
      return "📄";
  }
}

export function typeIcon(type: string): string {
  switch (type) {
    case "vector":
      return "🗺️";
    case "raster":
      return "🛰️";
    case "remote-sensing":
      return "🌍";
    case "tabular":
      return "📊";
    case "points":
      return "📍";
    default:
      return "📦";
  }
}

export function typeLabel(type: string): string {
  const t = TYPES.find((x) => x.value === type);
  return t?.label ?? type;
}
