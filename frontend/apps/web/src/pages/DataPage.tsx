import { useState } from "react";
import { useNavigate } from "react-router-dom";

export interface DatasetItem {
  id: string;
  name: string;
  format: "GeoJSON" | "GeoTIFF" | "Shapefile" | "CSV" | "COG";
  type: "vector" | "raster" | "tabular" | "remote-sensing";
  size: string;
  featureCount: string;
  crs: string;
  updatedAt: string;
  tags: string[];
  attributes?: { field: string; type: string; sample: string }[];
}

const INITIAL_DATASETS: DatasetItem[] = [
  {
    id: "ds-01",
    name: "Global_Administrative_Boundaries_v4.geojson",
    format: "GeoJSON",
    type: "vector",
    size: "48.2 MB",
    featureCount: "254,120 pols",
    crs: "EPSG:4326 (WGS 84)",
    updatedAt: "2026-07-20",
    tags: ["boundaries", "admin", "global"],
    attributes: [
      { field: "GID_0", type: "String", sample: "USA" },
      { field: "NAME_0", type: "String", sample: "United States" },
      { field: "POP_EST", type: "Integer", sample: "331002651" },
    ],
  },
  {
    id: "ds-02",
    name: "Sentinel2_NDVI_Composite_Q2_2026.tif",
    format: "GeoTIFF",
    type: "remote-sensing",
    size: "340.5 MB",
    featureCount: "10m Raster Grid",
    crs: "EPSG:32633 (UTM 33N)",
    updatedAt: "2026-07-24",
    tags: ["vegetation", "sentinel-2", "satellite"],
    attributes: [
      { field: "Band_1", type: "Float32", sample: "0.742 (NDVI)" },
      { field: "CloudMask", type: "UInt8", sample: "0 (Clear)" },
    ],
  },
  {
    id: "ds-03",
    name: "River_Basin_Hydrology_Contours.shp",
    format: "Shapefile",
    type: "vector",
    size: "12.8 MB",
    featureCount: "14,800 lines",
    crs: "EPSG:4326 (WGS 84)",
    updatedAt: "2026-07-18",
    tags: ["hydrology", "elevation", "contours"],
    attributes: [
      { field: "ELEVATION", type: "Float", sample: "450.5" },
      { field: "FLOW_RATE", type: "Float", sample: "12.4" },
    ],
  },
  {
    id: "ds-04",
    name: "Urban_Air_Quality_Stations_2026.csv",
    format: "CSV",
    type: "tabular",
    size: "2.4 MB",
    featureCount: "8,920 rows",
    crs: "EPSG:4326 (Lat/Lng)",
    updatedAt: "2026-07-25",
    tags: ["pollution", "sensors", "urban"],
    attributes: [
      { field: "station_id", type: "String", sample: "STN-8802" },
      { field: "pm2_5", type: "Float", sample: "14.2" },
      { field: "lat", type: "Float", sample: "52.52" },
      { field: "lng", type: "Float", sample: "13.405" },
    ],
  },
];

export default function DataPage() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<DatasetItem[]>(INITIAL_DATASETS);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewDataset, setPreviewDataset] = useState<DatasetItem | null>(null);

  // Form states for Add Data
  const [datasetName, setDatasetName] = useState("");
  const [format, setFormat] = useState<DatasetItem["format"]>("GeoJSON");
  const [type, setType] = useState<DatasetItem["type"]>("vector");
  const [crs, setCrs] = useState("EPSG:4326 (WGS 84)");
  const [tagsInput, setTagsInput] = useState("");

  const filteredDatasets = datasets.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    if (typeFilter !== "all" && d.type !== typeFilter) return false;
    return matchesSearch;
  });

  function handleAddDataset(e: React.FormEvent) {
    e.preventDefault();
    if (!datasetName.trim()) return;

    const newDataset: DatasetItem = {
      id: `ds-${Date.now()}`,
      name: datasetName.trim(),
      format,
      type,
      size: `${(Math.random() * 25 + 1).toFixed(1)} MB`,
      featureCount: type === "vector" ? "1,200 features" : type === "raster" ? "Raster Grid" : "500 rows",
      crs,
      updatedAt: new Date().toISOString().split("T")[0],
      tags: tagsInput ? tagsInput.split(",").map((t) => t.trim()) : ["custom", "uploaded"],
      attributes: [
        { field: "id", type: "Integer", sample: "1" },
        { field: "name", type: "String", sample: "Sample Feature" },
        { field: "value", type: "Float", sample: "42.0" },
      ],
    };

    setDatasets([newDataset, ...datasets]);
    setIsAddModalOpen(false);
    setDatasetName("");
    setTagsInput("");
  }

  function handleDeleteDataset(id: string) {
    setDatasets(datasets.filter((d) => d.id !== id));
  }

  return (
    <div className="eq-content-inner">
      {/* Header */}
      <div className="eq-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="eq-page-header__eyebrow">Spatial Catalog</div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ color: "var(--eq-accent)" }}>📊</span> Data Hub & Assets
          </h1>
          <p style={{ marginTop: "0.4rem", maxWidth: "650px" }}>
            Upload, manage, inspect schemas, and perform operations on vector shapefiles, raster imagery, and spatial datasets.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.65rem 1.25rem",
            borderRadius: "var(--eq-radius-md)",
            background: "linear-gradient(135deg, var(--eq-accent), #3b82f6)",
            color: "#080d14",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            fontSize: "0.875rem",
            boxShadow: "0 4px 16px rgba(34,211,160,0.25)",
            transition: "transform var(--eq-transition)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Add Data / Upload
        </button>
      </div>

      {/* Summary Cards */}
      <div className="eq-data-stats">
        <div className="eq-stat-card">
          <div className="eq-stat-card__icon">📦</div>
          <div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--eq-text-primary)" }}>{datasets.length}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--eq-text-muted)" }}>Total Datasets</div>
          </div>
        </div>

        <div className="eq-stat-card">
          <div className="eq-stat-card__icon" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>🗺️</div>
          <div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--eq-text-primary)" }}>
              {datasets.filter((d) => d.type === "vector").length}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--eq-text-muted)" }}>Vector Layers</div>
          </div>
        </div>

        <div className="eq-stat-card">
          <div className="eq-stat-card__icon" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>🛰️</div>
          <div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--eq-text-primary)" }}>
              {datasets.filter((d) => d.type === "raster" || d.type === "remote-sensing").length}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--eq-text-muted)" }}>Satellite / Rasters</div>
          </div>
        </div>

        <div className="eq-stat-card">
          <div className="eq-stat-card__icon" style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>📑</div>
          <div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--eq-text-primary)" }}>
              {datasets.filter((d) => d.type === "tabular").length}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--eq-text-muted)" }}>Tabular CSVs</div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div
        className="eq-card"
        style={{
          padding: "0.85rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: "260px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--eq-text-muted)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search dataset by name or tag (e.g. boundaries, sentinel, hydrology)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--eq-text-primary)",
              width: "100%",
              fontSize: "0.875rem",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.8125rem", color: "var(--eq-text-muted)" }}>Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              background: "var(--eq-bg-elevated)",
              border: "1px solid var(--eq-border)",
              borderRadius: "var(--eq-radius-md)",
              color: "var(--eq-text-primary)",
              padding: "0.4rem 0.75rem",
              fontSize: "0.8125rem",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Data Types</option>
            <option value="vector">Vector Shapefiles/GeoJSON</option>
            <option value="remote-sensing">Remote Sensing / Satellite</option>
            <option value="raster">Raster Layers</option>
            <option value="tabular">Tabular CSV</option>
          </select>
        </div>
      </div>

      {/* Datasets Table */}
      <div className="eq-data-table-container">
        <table className="eq-data-table">
          <thead>
            <tr>
              <th>Dataset Name</th>
              <th>Format</th>
              <th>CRS</th>
              <th>Features / Size</th>
              <th>Updated</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDatasets.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "var(--eq-text-muted)" }}>
                  No datasets found matching your search criteria.
                </td>
              </tr>
            ) : (
              filteredDatasets.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 600, color: "var(--eq-text-primary)" }}>{d.name}</span>
                      <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.25rem" }}>
                        {d.tags.map((t) => (
                          <span key={t} className="eq-cap-chip" style={{ fontSize: "0.65rem" }}>
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "0.2rem 0.55rem",
                        borderRadius: "var(--eq-radius-sm)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        background: "rgba(34,211,160,0.12)",
                        color: "var(--eq-accent)",
                        border: "1px solid rgba(34,211,160,0.25)",
                      }}
                    >
                      {d.format}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.8125rem", color: "var(--eq-text-secondary)", fontFamily: "var(--eq-font-mono)" }}>
                    {d.crs}
                  </td>
                  <td>
                    <div style={{ fontSize: "0.8125rem", color: "var(--eq-text-primary)" }}>{d.featureCount}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--eq-text-muted)" }}>{d.size}</div>
                  </td>
                  <td style={{ fontSize: "0.8125rem", color: "var(--eq-text-muted)" }}>{d.updatedAt}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.5rem" }}>
                      <button
                        onClick={() => setPreviewDataset(d)}
                        title="Inspect Schema / Attributes"
                        style={{
                          padding: "0.35rem 0.65rem",
                          borderRadius: "var(--eq-radius-sm)",
                          background: "var(--eq-bg-elevated)",
                          border: "1px solid var(--eq-border)",
                          color: "var(--eq-text-primary)",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                        }}
                      >
                        Inspect
                      </button>

                      <button
                        onClick={() => navigate("/projects")}
                        title="Add to Map Project"
                        style={{
                          padding: "0.35rem 0.65rem",
                          borderRadius: "var(--eq-radius-sm)",
                          background: "var(--eq-accent-dim)",
                          border: "1px solid var(--eq-border-accent)",
                          color: "var(--eq-accent)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        + Project
                      </button>

                      <button
                        onClick={() => handleDeleteDataset(d.id)}
                        title="Delete dataset"
                        style={{
                          padding: "0.35rem 0.5rem",
                          borderRadius: "var(--eq-radius-sm)",
                          background: "transparent",
                          border: "none",
                          color: "#f87171",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Data Modal */}
      {isAddModalOpen && (
        <div className="eq-modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="eq-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="eq-modal-header">
              <h2 style={{ fontSize: "1.25rem" }}>Upload & Add Spatial Dataset</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--eq-text-muted)", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDataset} className="eq-form">
              {/* Dropzone mockup */}
              <div
                style={{
                  border: "2px dashed var(--eq-border-accent)",
                  borderRadius: "var(--eq-radius-lg)",
                  padding: "1.5rem",
                  textAlign: "center",
                  background: "rgba(34,211,160,0.03)",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📁</div>
                <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--eq-text-primary)" }}>
                  Click or drag GeoJSON, Shapefile, GeoTIFF, or CSV here
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--eq-text-muted)", marginTop: "0.25rem" }}>
                  Max size up to 500 MB per spatial file
                </div>
              </div>

              <div className="eq-field">
                <label className="eq-field__label">Dataset Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Watershed_Boundaries_2026.geojson"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  className="eq-field__input"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="eq-field">
                  <label className="eq-field__label">Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="eq-field__input"
                  >
                    <option value="GeoJSON">GeoJSON</option>
                    <option value="GeoTIFF">GeoTIFF</option>
                    <option value="Shapefile">Shapefile (.zip)</option>
                    <option value="CSV">CSV / Tabular</option>
                    <option value="COG">Cloud Optimized GeoTIFF</option>
                  </select>
                </div>

                <div className="eq-field">
                  <label className="eq-field__label">Category</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="eq-field__input"
                  >
                    <option value="vector">Vector Layer</option>
                    <option value="remote-sensing">Remote Sensing / Satellite</option>
                    <option value="raster">Raster Surface</option>
                    <option value="tabular">Tabular Data</option>
                  </select>
                </div>
              </div>

              <div className="eq-field">
                <label className="eq-field__label">Coordinate Reference System (CRS)</label>
                <input
                  type="text"
                  value={crs}
                  onChange={(e) => setCrs(e.target.value)}
                  className="eq-field__input"
                />
              </div>

              <div className="eq-field">
                <label className="eq-field__label">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. hydrology, elevation, 2026"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="eq-field__input"
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: "0.6rem 1rem",
                    borderRadius: "var(--eq-radius-md)",
                    background: "var(--eq-bg-elevated)",
                    border: "1px solid var(--eq-border)",
                    color: "var(--eq-text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "0.6rem 1.25rem",
                    borderRadius: "var(--eq-radius-md)",
                    background: "var(--eq-accent)",
                    color: "#080d14",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Upload & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Schema Modal */}
      {previewDataset && (
        <div className="eq-modal-overlay" onClick={() => setPreviewDataset(null)}>
          <div className="eq-modal-card" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
            <div className="eq-modal-header">
              <div>
                <h2 style={{ fontSize: "1.15rem" }}>Dataset Attributes & Schema</h2>
                <div style={{ fontSize: "0.75rem", color: "var(--eq-accent)" }}>{previewDataset.name}</div>
              </div>
              <button
                onClick={() => setPreviewDataset(null)}
                style={{ background: "transparent", border: "none", color: "var(--eq-text-muted)", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.8125rem", color: "var(--eq-text-secondary)", marginBottom: "0.75rem" }}>
                CRS: <code style={{ color: "var(--eq-accent)" }}>{previewDataset.crs}</code> | Features: <b>{previewDataset.featureCount}</b>
              </div>

              <div className="eq-data-table-container">
                <table className="eq-data-table" style={{ fontSize: "0.8125rem" }}>
                  <thead>
                    <tr>
                      <th>Attribute Field</th>
                      <th>Data Type</th>
                      <th>Sample Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewDataset.attributes?.map((attr) => (
                      <tr key={attr.field}>
                        <td style={{ fontWeight: 600 }}>{attr.field}</td>
                        <td>
                          <code style={{ fontSize: "0.75rem" }}>{attr.type}</code>
                        </td>
                        <td style={{ color: "var(--eq-text-secondary)" }}>{attr.sample}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setPreviewDataset(null)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "var(--eq-radius-md)",
                  background: "var(--eq-bg-elevated)",
                  border: "1px solid var(--eq-border)",
                  color: "var(--eq-text-primary)",
                  cursor: "pointer",
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
