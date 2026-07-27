import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMaps, createMap, MapItem } from "@/lib/maps";
import { Button } from "@packages/ui";
import { Plus } from "lucide-react";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "public" | "private">(
    "all",
  );

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
          setProjects(data);
        } else {
          setProjects([]);
        }
      })
      .catch(() => {
        setProjects([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description &&
        p.description.toLowerCase().includes(searchQuery.toLowerCase()));
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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
            Projects
          </div>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          variant="primary"
          size="md"
          leftIcon={<Plus />}
        >
          Create Project
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="card p-3.5 px-5 mb-8 flex items-center justify-between gap-4 flex-wrap">
        {/* Search */}
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-text-tertiary shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search projects by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-text-primary w-full text-sm placeholder:text-text-tertiary"
          />
        </div>

        {/* Filter Select */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-tertiary">Filter:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="input input-sm text-sm"
          >
            <option value="all">All Projects ({projects.length})</option>
            <option value="public">Public Maps</option>
            <option value="private">My Private Maps</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-16 text-center text-text-tertiary">
          Loading geospatial projects...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="card text-center py-16 px-8">
          <div className="text-5xl mb-4">🗺️</div>
          <h3 className="text-lg font-bold text-text-primary">
            No Projects Found
          </h3>
          <p className="mt-2 text-text-secondary text-sm">
            No map projects matched your search criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              className="card card-interactive cursor-pointer group flex flex-col overflow-hidden hover-lift"
              onClick={() => navigate(`/map?mapId=${p.id}`)}
            >
              {/* Thumbnail / Visual Header */}
              <div className="relative flex items-center justify-center h-36 bg-gradient-to-br from-bg-tertiary to-bg-recessed">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-primary opacity-60 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>

                <span
                  className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[0.7rem] font-semibold border ${
                    p.is_public
                      ? "bg-success/10 text-success border-success/30"
                      : "bg-accent/10 text-accent border-accent/30"
                  }`}
                >
                  {p.is_public ? "Public" : "Private"}
                </span>
              </div>

              {/* Card Body */}
              <div className="flex flex-col flex-1 p-4 gap-2">
                <div className="flex-1">
                  <h3 className="text-base font-bold text-text-primary line-clamp-1">
                    {p.title}
                  </h3>
                  <p className="text-sm text-text-secondary mt-1.5 line-clamp-2">
                    {p.description || "No project description provided."}
                  </p>
                </div>

                {/* Footer Meta */}
                <div className="mt-auto pt-3 border-t border-border-secondary flex items-center justify-between">
                  <span className="text-xs text-text-tertiary flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Basemap: {p.basemap || "Dark"}
                  </span>
                  <span className="text-sm font-semibold text-primary flex items-center gap-1 group-hover:gap-2 transition-all duration-200">
                    Open Map
                    <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 overlay animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-elevated border border-border-primary rounded-2xl shadow-2xl animate-scale-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
              <h2 className="text-xl font-bold text-text-primary">
                Create New Project
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn btn-ghost btn-icon btn-sm text-text-tertiary hover:text-text-primary cursor-pointer transition-colors duration-150"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={handleCreateProject}
              className="p-6 flex flex-col gap-4"
            >
              <div className="form-field">
                <label className="form-label">Project Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Coastal Wetland Vulnerability Index"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief overview of spatial layers, objectives, and area of interest..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="input textarea"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Default Basemap</label>
                <select
                  value={newBasemap}
                  onChange={(e) => setNewBasemap(e.target.value)}
                  className="input select"
                >
                  <option value="dataviz-dark">Dark Matter (Vector)</option>
                  <option value="dataviz-light">Positron (Light)</option>
                  <option value="satellite">Satellite Imagery</option>
                </select>
              </div>

              {/* Public Toggle */}
              <div className="flex items-center justify-between gap-4 py-1">
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    Public Access
                  </div>
                  <div className="text-xs text-text-tertiary mt-0.5">
                    Allow team members to view this map project
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={newPublic}
                  onChange={(e) => setNewPublic(e.target.checked)}
                  className="w-[18px] h-[18px] accent-primary cursor-pointer rounded"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary btn-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn btn-primary btn-md"
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
