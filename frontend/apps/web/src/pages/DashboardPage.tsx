import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useModules, ModuleInfo } from "@/lib/modules";
import { Badge, Button } from "@packages/ui";
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
    <div className="flex flex-wrap gap-1.5 mt-3">
      {chips.map((c) => (
        <span
          key={c}
          className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20"
        >
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
    <div
      className="card p-4 flex flex-col gap-2"
      id={`module-card-${mod.name}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex gap-3 items-start">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ModuleIcon />
          </div>
          <div>
            <div className="font-semibold text-sm text-text-primary">
              {mod.name}
            </div>
            <div className="text-xs text-text-tertiary mt-0.5">
              v{mod.version}
            </div>
          </div>
        </div>
        <Badge
          variant={mod.enabled ? "success" : "default"}
          size="sm"
          dot={mod.enabled}
          dotColor={mod.enabled ? "success" : "primary"}
        >
          {mod.enabled ? "Available" : "Unavailable"}
        </Badge>
      </div>
      {mod.description && (
        <p className="text-sm text-text-secondary leading-relaxed">
          {mod.description}
        </p>
      )}
      <CapChips caps={mod.capabilities} />
    </div>
  );
}

function StatsBar({ modules }: { modules: ModuleInfo[] }) {
  const enabled = modules.filter((m) => m.enabled).length;
  const stats = [
    { label: "Installed modules", value: modules.length },
    { label: "Active", value: enabled },
    { label: "Inactive", value: modules.length - enabled },
  ];

  return (
    <div className="flex gap-8 p-4 px-6 bg-surface border border-border-primary rounded-lg mb-8">
      {stats.map((s) => (
        <div key={s.label}>
          <div className="text-3xl font-bold text-text-primary leading-none tabular-nums">
            {s.value}
          </div>
          <div className="text-xs text-text-tertiary mt-1">{s.label}</div>
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
    <div className="card p-4 flex flex-col justify-between gap-3">
      {/* Header */}
      <div>
        <div className="flex justify-between items-start">
          <div className="font-bold text-base text-text-primary">
            {mapItem.title}
          </div>
          <span
            className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full border ${
              mapItem.is_public
                ? "bg-success/10 text-success border-success/30"
                : "bg-accent/10 text-accent border-accent/30"
            }`}
          >
            {mapItem.is_public ? "Public" : "Private"}
          </span>
        </div>
        <p className="text-sm text-text-secondary mt-1.5 min-h-[2.4rem] line-clamp-2">
          {mapItem.description || "No description provided."}
        </p>
      </div>

      {/* Meta chips */}
      <div className="flex gap-2 flex-wrap text-[0.7rem] text-text-tertiary">
        {[
          `Basemap: ${mapItem.basemap}`,
          `Zoom: ${mapItem.zoom}`,
          `Perm: ${mapItem.user_permission}`,
        ].map((label) => (
          <span key={label} className="px-1.5 py-0.5 rounded bg-surface-hover">
            {label}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-2">
        <Button
          variant="primary"
          size="sm"
          fullWidth
          onClick={() => navigate(`/map?mapId=${mapItem.id}`)}
        >
          Open Map ↗
        </Button>

        {mapItem.user_permission === "admin" && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onTogglePublic(mapItem)}
              title="Toggle Public Access"
            >
              {mapItem.is_public ? "Make Private" : "Make Public"}
            </Button>
            <Button
              variant="error"
              size="sm"
              onClick={() => onDelete(mapItem.id)}
              title="Delete Map"
            >
              Delete
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Shimmer Skeleton ───────────────────────────────────────────────────────────

function ShimmerRows() {
  return (
    <div className="flex flex-col gap-3">
      {[70, 50, 90].map((w) => (
        <div
          key={w}
          className="h-5 rounded-lg skeleton"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="py-12 px-8 text-center text-text-tertiary border-[1.5px] border-dashed border-border-primary rounded-xl">
      <p>{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 btn btn-primary btn-sm"
        >
          {action.label}
        </button>
      )}
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
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 overlay animate-fade-in">
      <div className="w-full max-w-[480px] bg-elevated border border-border-primary rounded-2xl p-6 flex flex-col gap-4 animate-scale-in shadow-2xl">
        <h2 className="text-xl font-bold text-text-primary">
          Create Configurable Map
        </h2>

        {error && (
          <div className="p-3 rounded-md bg-error-subtle text-error text-sm border border-error/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div className="form-field">
            <label className="form-label">Map Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Global River Quality Dashboard"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
            />
          </div>

          {/* Description */}
          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea
              rows={3}
              placeholder="Brief summary of layers & viewport"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input textarea"
            />
          </div>

          {/* Basemap + Public toggle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-field">
              <label className="form-label">Default Basemap</label>
              <select
                value={basemap}
                onChange={(e) => setBasemap(e.target.value)}
                className="input select"
              >
                <option value="dataviz-dark">DataViz Dark</option>
                <option value="dataviz-light">DataViz Light</option>
                <option value="satellite">Satellite</option>
              </select>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <input
                type="checkbox"
                id="is_public_cb"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="cursor-pointer accent-primary w-4 h-4"
              />
              <label
                htmlFor="is_public_cb"
                className="text-sm text-text-primary cursor-pointer select-none"
              >
                Make Publicly Accessible
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end mt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-md"
            >
              {loading ? "Creating..." : "Create Map"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tab Button ─────────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md border-none cursor-pointer text-sm transition-all duration-150 ${
        active
          ? "font-bold bg-primary/15 text-primary"
          : "font-medium bg-transparent text-text-tertiary hover:text-text-secondary hover:bg-surface-hover"
      }`}
    >
      {children}
    </button>
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
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
          Platform Overview
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gradient">
          Dashboard
        </h1>
        <p className="mt-2 text-text-secondary text-sm sm:text-base max-w-2xl">
          Geospatial intelligence at your fingertips. Manage configurable maps
          and monitor active modules.
        </p>

        {/* Tab Switcher */}
        <div className="flex gap-2 mt-4">
          <TabButton
            active={activeTab === "maps"}
            onClick={() => setActiveTab("maps")}
          >
            Configurable Maps ({maps.length})
          </TabButton>
          <TabButton
            active={activeTab === "modules"}
            onClick={() => setActiveTab("modules")}
          >
            Installed Modules ({modules.length})
          </TabButton>
        </div>
      </div>

      {/* ── MAPS TAB ── */}
      {activeTab === "maps" && (
        <div className="flex flex-col gap-6">
          {/* Maps Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                Maps Dashboard
              </h2>
              <p className="text-sm text-text-secondary mt-0.5">
                Maps accessible to your user role and group permissions
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary btn-md shrink-0"
            >
              + Create New Map
            </button>
          </div>

          {/* Loading */}
          {mapsLoading && <ShimmerRows />}

          {/* Error */}
          {mapsError && (
            <div className="p-4 rounded-lg bg-error-subtle text-error text-sm border border-error/20">
              Could not load maps: {mapsError}
            </div>
          )}

          {/* Empty */}
          {!mapsLoading && !mapsError && maps.length === 0 && (
            <EmptyState
              message="No maps configured yet."
              action={{
                label: "Create your first map",
                onClick: () => setIsModalOpen(true),
              }}
            />
          )}

          {/* Map Grid */}
          {!mapsLoading && !mapsError && maps.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
          {/* Loading */}
          {modulesLoading && <ShimmerRows />}

          {/* Error */}
          {modulesError && (
            <div className="p-4 rounded-lg bg-error-subtle text-error text-sm border border-error/20">
              Could not load module status: {modulesError}
            </div>
          )}

          {/* Content */}
          {!modulesLoading && !modulesError && (
            <>
              <StatsBar modules={modules} />
              {modules.length === 0 ? (
                <EmptyState message="No modules are currently installed." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
