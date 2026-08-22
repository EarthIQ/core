import type { DatasetFormat, DatasetType } from "./types";

// ── Format / Type vocabulary ──────────────────────────────────────────────────
export const FORMATS: {
  value: DatasetFormat;
  label: string;
  extensions: string;
}[] = [
  { value: "GeoJSON", label: "GeoJSON", extensions: ".geojson, .json" },
  {
    value: "Shapefile",
    label: "Shapefile (zipped .shp)",
    extensions: ".zip (containing .shp)",
  },
  { value: "KML", label: "KML / Google Earth", extensions: ".kml, .kmz" },
  { value: "GeoRSS", label: "GeoRSS / RSS Feed", extensions: ".xml" },
  { value: "GeoTIFF", label: "GeoTIFF", extensions: ".tif, .tiff" },
  { value: "COG", label: "Cloud Optimized GeoTIFF", extensions: ".tif, .tiff" },
  { value: "GeoPackage", label: "GeoPackage", extensions: ".gpkg" },
  { value: "GeoParquet", label: "GeoParquet", extensions: ".parquet" },
  { value: "CSV", label: "CSV / Tabular", extensions: ".csv, .tsv" },
];

export const TYPES: { value: DatasetType; label: string }[] = [
  { value: "vector", label: "Vector Layer" },
  { value: "raster", label: "Raster Surface" },
  { value: "tabular", label: "Tabular Data" },
  { value: "remote-sensing", label: "Remote Sensing / Satellite" },
  { value: "points", label: "Point Collection" },
];

export const INGESTED_FORMATS = new Set<string>([
  "GeoJSON",
  "Shapefile",
  "KML",
  "GeoRSS",
]);
// CSV can also be ingested if a coordinate pair is detected — flag comes from meta.
export const STORED_FORMATS = new Set<string>([
  "GeoTIFF",
  "COG",
  "GeoPackage",
  "GeoParquet",
]);
