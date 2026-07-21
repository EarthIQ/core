import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useModules, ModuleInfo } from "@/lib/modules";
import { Badge } from "@repo/ui";
import {
  fetchMaps,
  createMap,
  deleteMap,
  shareMap,
  MapItem,
  MapCreateInput,
} from "@/lib/maps";

// ── Module capability chips ────────────────────────────────────────────────────

function CapChips({ caps }: { caps: ModuleInfo["capabilities"] }) {
  const chips: string[] = [];
  if (caps.has_backend) chips.push("backend");
  if (caps.has_frontend) chips.push("frontend");
  if (caps.has_infra) chips.push("infra");
  caps.extras?.forEach((e) => chips.push(e));
  return (
    <div className="eq-module-card__caps">
      {chips.map((c) => (
        <span key={c} className="eq-cap-chip">
          {c}
        </span>
      ))}
    </div>
  );
}

function ModuleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 1 0 20A14.5 14.5 0 0 1 12 2" />
      <path d="M2 12h20" />
    </svg>
  );
}

function ModuleCard({ mod }: { mod: ModuleInfo }) {
  return (
    <div className="eq-module-card" id={`module-card-${mod.name}`}>
      <div className="eq-module-card__header">
        <div
          style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}
        >
          <div className="eq-module-card__icon">
            <ModuleIcon />
          </div>
          <div>
            <div className="eq-module-card__name">{mod.name}</div>
            <div className="eq-module-card__version">v{mod.version}</div>
          </div>
        </div>
        <Badge
          status={mod.enabled ? "available" : "unavailable"}
          pulse={mod.enabled}
        />
      </div>
      {mod.description && (
        <p className="eq-module-card__desc">{mod.description}</p>
      )}
      <CapChips caps={mod.capabilities} />
    </div>
  );
}

function StatsBar({ modules }: { modules: ModuleInfo[] }) {
  const enabled = modules.filter((m) => m.enabled).length;
  return (
    <div
      style={{
        display: "flex",
        gap: "2rem",
        padding: "1rem 1.5rem",
        background: "var(--eq-bg-surface)",
        border: "1px solid var(--eq-border)",
        borderRadius: "var(--eq-radius-lg)",
        marginBottom: "2rem",
      }}
    >
      {[
        { label: "Installed modules", value: modules.length },
        { label: "Active", value: enabled },
        { label: "Inactive", value: modules.length - enabled },
      ].map((s) => (
        <div key={s.label}>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              fontFamily: "var(--eq-font-display)",
              color: "var(--eq-text-primary)",
              lineHeight: 1,
            }}
          >
            {s.value}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--eq-text-muted)",
              marginTop: "0.25rem",
            }}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Map Card ───────────────────────────────────────────────────────────────────

function MapCard({
  mapItem,
  onDelete,
  onTogglePublic,
}: {
  mapItem: MapItem;
  onDelete: (id: string) => void;
  onTogglePublic: (mapItem: MapItem) => void;
}) {
  const navigate = useNavigate();

  return (
    <div
      className="eq-module-card"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "0.75rem",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "#e2e8f0" }}>
            {mapItem.title}
          </div>
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              padding: "0.15rem 0.5rem",
              borderRadius: "999px",
              background: mapItem.is_public
                ? "rgba(34,211,160,0.12)"
                : "rgba(99,102,241,0.12)",
              color: mapItem.is_public ? "#22d3a0" : "#818cf8",
              border: `1px solid ${mapItem.is_public ? "rgba(34,211,160,0.3)" : "rgba(99,102,241,0.3)"}`,
            }}
          >
            {mapItem.is_public ? "Public" : "Private"}
          </span>
        </div>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "#94a3b8",
            marginTop: "0.35rem",
            minHeight: "2.4rem",
          }}
        >
          {mapItem.description || "No description provided."}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          fontSize: "0.7rem",
          color: "#64748b",
        }}
      >
        <span
          style={{
            padding: "0.1rem 0.4rem",
            borderRadius: "4px",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          Basemap: {mapItem.basemap}
        </span>
        <span
          style={{
            padding: "0.1rem 0.4rem",
            borderRadius: "4px",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          Zoom: {mapItem.zoom}
        </span>
        <span
          style={{
            padding: "0.1rem 0.4rem",
            borderRadius: "4px",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          Perm: {mapItem.user_permission}
        </span>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <button
          onClick={() => navigate(`/map?mapId=${mapItem.id}`)}
          style={{
            flex: 1,
            padding: "0.4rem 0.75rem",
            borderRadius: "0.375rem",
            background: "#22d3a0",
            color: "#090d16",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            fontSize: "0.75rem",
          }}
        >
          Open Map ↗
        </button>

        {mapItem.user_permission === "admin" && (
          <>
            <button
              onClick={() => onTogglePublic(mapItem)}
              title="Toggle Public Access"
              style={{
                padding: "0.4rem 0.6rem",
                borderRadius: "0.375rem",
                background: "rgba(255,255,255,0.06)",
                color: "#e2e8f0",
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              {mapItem.is_public ? "Make Private" : "Make Public"}
            </button>
            <button
              onClick={() => onDelete(mapItem.id)}
              title="Delete Map"
              style={{
                padding: "0.4rem 0.6rem",
                borderRadius: "0.375rem",
                background: "rgba(239,68,68,0.12)",
                color: "#f87171",
                border: "1px solid rgba(239,68,68,0.25)",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Create Map Modal ───────────────────────────────────────────────────────────

function CreateMapModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [basemap, setBasemap] = useState("dataviz-dark");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const input: MapCreateInput = {
        title,
        description,
        basemap,
        is_public: isPublic,
        center_lng: 0.0,
        center_lat: 20.0,
        zoom: 2.5,
      };
      await createMap(input);
      onCreated();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "var(--eq-bg-surface, #0e1623)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "1rem",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            margin: 0,
            color: "#e2e8f0",
          }}
        >
          Create Configurable Map
        </h2>

        {error && (
          <div
            style={{
              padding: "0.5rem",
              background: "rgba(239,68,68,0.1)",
              color: "#f87171",
              borderRadius: "0.375rem",
              fontSize: "0.8rem",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "#94a3b8",
                marginBottom: "0.25rem",
              }}
            >
              Map Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Global River Quality Dashboard"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "0.5rem 0.75rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.375rem",
                color: "#e2e8f0",
                fontSize: "0.875rem",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "#94a3b8",
                marginBottom: "0.25rem",
              }}
            >
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Brief summary of layers & viewport"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "0.5rem 0.75rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.375rem",
                color: "#e2e8f0",
                fontSize: "0.875rem",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "#94a3b8",
                  marginBottom: "0.25rem",
                }}
              >
                Default Basemap
              </label>
              <select
                value={basemap}
                onChange={(e) => setBasemap(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  background: "#090d16",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "0.375rem",
                  color: "#e2e8f0",
                  fontSize: "0.875rem",
                }}
              >
                <option value="dataviz-dark">DataViz Dark</option>
                <option value="dataviz-light">DataViz Light</option>
                <option value="satellite">Satellite</option>
              </select>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: "1.25rem",
              }}
            >
              <input
                type="checkbox"
                id="is_public_cb"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <label
                htmlFor="is_public_cb"
                style={{
                  fontSize: "0.8125rem",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
              >
                Make Publicly Accessibly
              </label>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "flex-end",
              marginTop: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.5rem 1rem",
                background: "transparent",
                color: "#94a3b8",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.375rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.5rem 1rem",
                background: "#22d3a0",
                color: "#090d16",
                fontWeight: 700,
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
              }}
            >
              {loading ? "Creating..." : "Create Map"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const {
    modules,
    isLoading: modulesLoading,
    error: modulesError,
  } = useModules();
  const [activeTab, setActiveTab] = useState<"modules" | "maps">("maps");

  const [maps, setMaps] = useState<MapItem[]>([]);
  const [mapsLoading, setMapsLoading] = useState(true);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadMaps = async () => {
    setMapsLoading(true);
    try {
      const data = await fetchMaps();
      setMaps(data);
      setMapsError(null);
    } catch (err) {
      setMapsError(String(err));
    } finally {
      setMapsLoading(false);
    }
  };

  useEffect(() => {
    loadMaps();
  }, []);

  const handleDeleteMap = async (id: string) => {
    if (!confirm("Are you sure you want to delete this map?")) return;
    try {
      await deleteMap(id);
      loadMaps();
    } catch (err) {
      alert("Failed to delete map: " + String(err));
    }
  };

  const handleTogglePublic = async (mapItem: MapItem) => {
    try {
      await shareMap(mapItem.id, { is_public: !mapItem.is_public });
      loadMaps();
    } catch (err) {
      alert("Failed to update access: " + String(err));
    }
  };

  return (
    <div>
      <div className="eq-page-header">
        <div className="eq-page-header__eyebrow">Platform Overview</div>
        <h1 className="eq-gradient-text">Dashboard</h1>
        <p style={{ marginTop: "0.5rem", color: "var(--eq-text-secondary)" }}>
          Geospatial intelligence at your fingertips. Manage configurable maps
          and monitor active modules.
        </p>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
          <button
            onClick={() => setActiveTab("maps")}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: "0.375rem",
              border: "none",
              cursor: "pointer",
              fontSize: "0.8125rem",
              fontWeight: activeTab === "maps" ? 700 : 500,
              background:
                activeTab === "maps" ? "rgba(34,211,160,0.15)" : "transparent",
              color: activeTab === "maps" ? "#22d3a0" : "#94a3b8",
            }}
          >
            Configurable Maps ({maps.length})
          </button>
          <button
            onClick={() => setActiveTab("modules")}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: "0.375rem",
              border: "none",
              cursor: "pointer",
              fontSize: "0.8125rem",
              fontWeight: activeTab === "modules" ? 700 : 500,
              background:
                activeTab === "modules"
                  ? "rgba(34,211,160,0.15)"
                  : "transparent",
              color: activeTab === "modules" ? "#22d3a0" : "#94a3b8",
            }}
          >
            Installed Modules ({modules.length})
          </button>
        </div>
      </div>

      {/* ── MAPS TAB ── */}
      {activeTab === "maps" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  margin: 0,
                  color: "#e2e8f0",
                }}
              >
                Maps Dashboard
              </h2>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#94a3b8",
                  marginTop: "0.15rem",
                }}
              >
                Maps accessible to your user role and group permissions
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                background: "#22d3a0",
                color: "#090d16",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                fontSize: "0.8125rem",
              }}
            >
              + Create New Map
            </button>
          </div>

          {mapsLoading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {[70, 50, 90].map((w) => (
                <div
                  key={w}
                  style={{
                    height: "1.25rem",
                    width: `${w}%`,
                    borderRadius: "0.5rem",
                    background:
                      "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.04) 75%)",
                    backgroundSize: "200% 100%",
                    animation: "eq-shimmer 1.4s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          )}

          {mapsError && (
            <div className="eq-form__error">
              Could not load maps: {mapsError}
            </div>
          )}

          {!mapsLoading && !mapsError && maps.length === 0 && (
            <div
              style={{
                padding: "3rem 2rem",
                textAlign: "center",
                color: "var(--eq-text-muted)",
                border: "1.5px dashed var(--eq-border)",
                borderRadius: "var(--eq-radius-xl)",
              }}
            >
              <p>No maps configured yet.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                style={{
                  marginTop: "0.75rem",
                  padding: "0.4rem 0.875rem",
                  borderRadius: "0.375rem",
                  background: "#22d3a0",
                  color: "#090d16",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Create your first map
              </button>
            </div>
          )}

          {!mapsLoading && !mapsError && maps.length > 0 && (
            <div className="eq-dashboard__grid">
              {maps.map((m) => (
                <MapCard
                  key={m.id}
                  mapItem={m}
                  onDelete={handleDeleteMap}
                  onTogglePublic={handleTogglePublic}
                />
              ))}
            </div>
          )}

          <CreateMapModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onCreated={loadMaps}
          />
        </div>
      )}

      {/* ── MODULES TAB ── */}
      {activeTab === "modules" && (
        <>
          {modulesLoading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {[70, 50, 90].map((w) => (
                <div
                  key={w}
                  style={{
                    height: "1.25rem",
                    width: `${w}%`,
                    borderRadius: "0.5rem",
                    background:
                      "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.04) 75%)",
                    backgroundSize: "200% 100%",
                    animation: "eq-shimmer 1.4s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          )}

          {modulesError && (
            <div className="eq-form__error">
              Could not load module status: {modulesError}
            </div>
          )}

          {!modulesLoading && !modulesError && (
            <>
              <StatsBar modules={modules} />
              {modules.length === 0 ? (
                <div
                  style={{
                    padding: "4rem 2rem",
                    textAlign: "center",
                    color: "var(--eq-text-muted)",
                    border: "1.5px dashed var(--eq-border)",
                    borderRadius: "var(--eq-radius-xl)",
                  }}
                >
                  <p>No modules are currently installed.</p>
                </div>
              ) : (
                <div className="eq-dashboard__grid">
                  {modules.map((m) => (
                    <ModuleCard key={m.name} mod={m} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
