import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMaps, createMap, MapItem } from "@/lib/maps";

// Fallback project data to show rich preview if backend map count is small
const SAMPLE_PROJECTS: MapItem[] = [
  {
    id: "sample-global-climate",
    title: "Global Climate & Land Use Model 2026",
    description: "Multi-spectral Sentinel-2 satellite analysis of forest canopy changes, land surface temperature, and urban growth corridors.",
    center_lng: 13.405,
    center_lat: 52.52,
    zoom: 5,
    basemap: "dataviz-dark",
    is_public: true,
    owner_id: "system",
    group_access: [],
    user_permission: "admin",
    layers_config: [
      { id: "sentinel-2-rgb", name: "Sentinel-2 RGB", type: "raster", visible: true },
      { id: "land-use", name: "Land Use / LULC", type: "vector", visible: true },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-hydrology-risk",
    title: "River Basin Hydrology & Flood Risk Assessment",
    description: "Elevation contour mapping and watershed runoff simulation layers for environmental hazard monitoring.",
    center_lng: -95.7129,
    center_lat: 37.0902,
    zoom: 4,
    basemap: "satellite",
    is_public: true,
    owner_id: "system",
    group_access: [],
    user_permission: "write",
    layers_config: [
      { id: "elevation-contours", name: "Elevation Contours", type: "vector", visible: true },
      { id: "dem-30m", name: "DEM 30m", type: "raster", visible: true },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-urban-transit",
    title: "Metropolitan Transit & Infrastructure Grid",
    description: "Vector administrative boundaries overlaid with population density raster heatmaps.",
    center_lng: 139.6917,
    center_lat: 35.6895,
    zoom: 10,
    basemap: "dataviz-dark",
    is_public: false,
    owner_id: "user-1",
    group_access: [],
    user_permission: "admin",
    layers_config: [
      { id: "admin-boundaries", name: "Admin Boundaries", type: "vector", visible: true },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "public" | "private">("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newBasemap, setNewBasemap] = useState("dataviz-dark");
  const [newPublic, setNewPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchMaps()
      .then((data) => {
        if (data && data.length > 0) {
          // Merge API data with sample projects for rich demo view
          const apiIds = new Set(data.map((p) => p.id));
          const combined = [...data, ...SAMPLE_PROJECTS.filter((s) => !apiIds.has(s.id))];
          setProjects(combined);
        } else {
          setProjects(SAMPLE_PROJECTS);
        }
      })
      .catch(() => {
        setProjects(SAMPLE_PROJECTS);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterType === "public") return matchesSearch && p.is_public;
    if (filterType === "private") return matchesSearch && !p.is_public;
    return matchesSearch;
  });

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);

    try {
      const created = await createMap({
        title: newTitle.trim(),
        description: newDesc.trim(),
        basemap: newBasemap,
        is_public: newPublic,
        center_lng: 0,
        center_lat: 20,
        zoom: 3,
      });
      setProjects([created, ...projects]);
      setIsModalOpen(false);
      setNewTitle("");
      setNewDesc("");
      navigate(`/map?mapId=${created.id}`);
    } catch {
      // Fallback local addition if backend offline
      const mockProject: MapItem = {
        id: `project-${Date.now()}`,
        title: newTitle.trim(),
        description: newDesc.trim(),
        center_lng: 0,
        center_lat: 20,
        zoom: 3,
        basemap: newBasemap,
        is_public: newPublic,
        owner_id: "current-user",
        group_access: [],
        user_permission: "admin",
        layers_config: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProjects([mockProject, ...projects]);
      setIsModalOpen(false);
      setNewTitle("");
      setNewDesc("");
      navigate(`/map?mapId=${mockProject.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="eq-content-inner">
      {/* Header */}
      <div className="eq-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="eq-page-header__eyebrow">Workspace Projects</div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ color: "var(--eq-accent)" }}>📁</span> Geospatial Projects
          </h1>
          <p style={{ marginTop: "0.4rem", maxWidth: "650px" }}>
            Explore active GIS mapping projects, manage layers & boundaries, and create interactive spatial analytics dashboards.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.65rem 1.25rem",
            borderRadius: "var(--eq-radius-md)",
            background: "linear-gradient(135deg, var(--eq-accent), #10b981)",
            color: "#080d14",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            fontSize: "0.875rem",
            boxShadow: "0 4px 16px rgba(34,211,160,0.25)",
            transition: "transform var(--eq-transition), box-shadow var(--eq-transition)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Project
        </button>
      </div>

      {/* Filter Bar */}
      <div
        className="eq-card"
        style={{
          padding: "0.85rem 1.25rem",
          marginBottom: "2rem",
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
            placeholder="Search projects by title or description..."
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
          <span style={{ fontSize: "0.8125rem", color: "var(--eq-text-muted)" }}>Filter:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
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
            <option value="all">All Projects ({projects.length})</option>
            <option value="public">Public Maps</option>
            <option value="private">My Private Maps</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--eq-text-muted)" }}>
          Loading geospatial projects...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="eq-card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🗺️</div>
          <h3>No Projects Found</h3>
          <p style={{ marginTop: "0.5rem" }}>No map projects matched your search criteria.</p>
        </div>
      ) : (
        <div className="eq-projects-grid">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              className="eq-project-card"
              onClick={() => navigate(`/map?mapId=${p.id}`)}
            >
              <div className="eq-project-card__thumb">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--eq-accent)" strokeWidth="1.5" style={{ opacity: 0.8 }}>
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>

                <span
                  style={{
                    position: "absolute",
                    top: "0.75rem",
                    right: "0.75rem",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "999px",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    background: p.is_public ? "rgba(34,211,160,0.15)" : "rgba(99,102,241,0.15)",
                    color: p.is_public ? "var(--eq-accent)" : "#818cf8",
                    border: `1px solid ${p.is_public ? "rgba(34,211,160,0.3)" : "rgba(99,102,241,0.3)"}`,
                  }}
                >
                  {p.is_public ? "Public" : "Private"}
                </span>
              </div>

              <div className="eq-project-card__body">
                <div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--eq-text-primary)" }}>
                    {p.title}
                  </h3>
                  <p style={{ fontSize: "0.8125rem", color: "var(--eq-text-secondary)", marginTop: "0.4rem" }}>
                    {p.description || "No project description provided."}
                  </p>
                </div>

                <div style={{ marginTop: "auto", paddingTop: "0.75rem", borderTop: "1px solid var(--eq-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--eq-text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--eq-accent)" }} />
                    Basemap: {p.basemap || "Dark"}
                  </span>

                  <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--eq-accent)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    Open Map →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="eq-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="eq-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="eq-modal-header">
              <h2 style={{ fontSize: "1.25rem" }}>Create New Map Project</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--eq-text-muted)", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="eq-form">
              <div className="eq-field">
                <label className="eq-field__label">Project Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Coastal Wetland Vulnerability Index"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="eq-field__input"
                />
              </div>

              <div className="eq-field">
                <label className="eq-field__label">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief overview of spatial layers, objectives, and area of interest..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="eq-field__input"
                  style={{ resize: "vertical" }}
                />
              </div>

              <div className="eq-field">
                <label className="eq-field__label">Default Basemap</label>
                <select
                  value={newBasemap}
                  onChange={(e) => setNewBasemap(e.target.value)}
                  className="eq-field__input"
                >
                  <option value="dataviz-dark">Dark Matter (Vector)</option>
                  <option value="dataviz-light">Positron (Light)</option>
                  <option value="satellite">Satellite Imagery</option>
                </select>
              </div>

              <div className="eq-field" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div className="eq-field__label">Public Access</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--eq-text-muted)" }}>Allow team members to view this map project</div>
                </div>
                <input
                  type="checkbox"
                  checked={newPublic}
                  onChange={(e) => setNewPublic(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "var(--eq-accent)", cursor: "pointer" }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  disabled={creating}
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
                  {creating ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
