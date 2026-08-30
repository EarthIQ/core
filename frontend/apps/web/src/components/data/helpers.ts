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
