import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useModules, ModuleInfo } from "@/lib/modules";
import { usePermissions } from "@/lib/usePermissions";
import { Badge, Button } from "@packages/ui";
import {
  fetchMaps,
  createMap,
  deleteMap,
  shareMap,
  MapItem,
  MapCreateInput,
} from "@/lib/maps";

// ── Icons ─────────────────────────────────────────────────────────────────────

function CpuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="15" x2="23" y2="15" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="15" x2="4" y2="15" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

// ── CapChips Component ───────────────────────────────────────────────────────

function CapChips({ caps }: { caps: ModuleInfo["capabilities"] }) {
  const chips: string[] = [];
  if (caps.has_backend) chips.push("backend API");
  if (caps.has_frontend) chips.push("frontend UI");
  if (caps.has_infra) chips.push("infra / compose");
  caps.extras?.forEach((e) => chips.push(e));
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {chips.map((c) => (
        <span
          key={c}
          className="px-2 py-0.5 text-xs font-medium rounded-md bg-primary/10 text-primary border border-primary/20"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

// ── Module Hub Card ────────────────────────────────────────────────────────────

function ModuleHubCard({ mod }: { mod: ModuleInfo }) {
  const navigate = useNavigate();
  // Standardized dynamic route path based on module name
  const routeName = mod.name.replace("-module", "");

  return (
    <div
      className="card p-5 flex flex-col justify-between transition-all duration-200 hover:border-primary/40 hover:shadow-lg group"
      id={`module-card-${mod.name}`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <LayersIcon />
            </div>
            <div>
              <div className="font-bold text-base text-text-primary capitalize">
                {mod.name.replace("-", " ")}
              </div>
              <div className="text-xs text-text-tertiary">v{mod.version}</div>
            </div>
          </div>
          <Badge
            variant={mod.enabled ? "success" : "default"}
            size="sm"
            dot={mod.enabled}
            dotColor={mod.enabled ? "success" : "primary"}
          >
            {mod.enabled ? "Active" : "Disabled"}
          </Badge>
        </div>

        {mod.description && (
          <p className="text-sm text-text-secondary leading-relaxed mt-3">
            {mod.description}
          </p>
        )}

        <CapChips caps={mod.capabilities} />
      </div>

      <div className="mt-5 pt-3 border-t border-border-subtle flex items-center justify-between">
        <span className="text-xs font-mono text-text-tertiary">
          /{routeName}
        </span>
        {mod.capabilities.has_frontend && mod.enabled ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/${routeName}`)}
          >
            Open Module ↗
          </Button>
        ) : (
          <span className="text-xs text-text-tertiary italic">Backend Service</span>
        )}
      </div>
    </div>
  );
}

// ── System Stats Header ───────────────────────────────────────────────────────

function ModularOverviewStats({
  modules,
  mapsCount,
}: {
  modules: ModuleInfo[];
  mapsCount: number;
}) {
  const activeCount = modules.filter((m) => m.enabled).length;
  const feCount = modules.filter((m) => m.capabilities.has_frontend).length;

  const stats = [
    { label: "Installed Modules", value: modules.length, sub: "Dynamic Micro-frontends" },
    { label: "Active Services", value: activeCount, sub: `${modules.length - activeCount} inactive` },
    { label: "UI Plug-ins", value: feCount, sub: "Hot-wired routes" },
    { label: "Configured Maps", value: mapsCount, sub: "Spatial workspaces" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((s) => (
        <div
          key={s.label}
          className="p-4 bg-surface border border-border-primary rounded-xl relative overflow-hidden group hover:border-primary/30 transition-colors"
        >
          <div className="text-3xl font-extrabold text-text-primary tabular-nums tracking-tight">
            {s.value}
          </div>
          <div className="text-sm font-semibold text-text-secondary mt-1">
            {s.label}
          </div>
          <div className="text-xs text-text-tertiary mt-0.5">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── CLI Helper Banner ──────────────────────────────────────────────────────────

function CliManagementBanner() {
  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-surface to-surface border border-primary/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
          <TerminalIcon />
        </div>
        <div>
          <div className="font-semibold text-sm text-text-primary">
            Modular Monolith CLI Manager
          </div>
          <div className="text-xs text-text-secondary mt-0.5">
            Add or remove modules effortlessly without interrupting active services.
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs font-mono bg-background/80 px-3 py-2 rounded-lg border border-border-primary">
        <span className="text-primary font-bold">uv run --project setup setup</span>
        <span className="text-text-tertiary">[add|remove|list|sync]</span>
      </div>
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
    <div className="card p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:border-primary/40 hover:shadow-lg">
      <div>
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <MapPinIcon />
            </div>
            <div className="font-bold text-base text-text-primary line-clamp-1">
              {mapItem.title}
            </div>
          </div>
          <span
            className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
              mapItem.is_public
                ? "bg-success/10 text-success border-success/30"
                : "bg-accent/10 text-accent border-accent/30"
            }`}
          >
            {mapItem.is_public ? "Public" : "Private"}
          </span>
        </div>
        <p className="text-sm text-text-secondary mt-2 min-h-[2.4rem] line-clamp-2">
          {mapItem.description || "No description provided."}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap text-[0.7rem] text-text-tertiary">
        {[
          `Basemap: ${mapItem.basemap}`,
          `Zoom: ${mapItem.zoom}`,
          `Role: ${mapItem.user_permission}`,
        ].map((label) => (
          <span key={label} className="px-2 py-0.5 rounded-md bg-surface-hover font-mono">
            {label}
          </span>
        ))}
      </div>

      <div className="flex gap-2 pt-2 border-t border-border-subtle">
        <Button
          variant="primary"
          size="sm"
          fullWidth
          onClick={() => navigate(`/map?mapId=${mapItem.id}`)}
        >
          Open Workspace ↗
        </Button>

        {mapItem.user_permission === "admin" && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onTogglePublic(mapItem)}
              title="Toggle Public Access"
            >
              {mapItem.is_public ? "Private" : "Public"}
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-44 rounded-xl skeleton" />
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
      <p className="text-sm">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 btn btn-primary btn-sm"
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
          Create Spatial Workspace
        </h2>

        {error && (
          <div className="p-3 rounded-md bg-error-subtle text-error text-sm border border-error/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-field">
            <label className="form-label">Map Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Hydrology Monitoring Map"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea
              rows={3}
              placeholder="Summary of layers & default view"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input textarea"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-field">
              <label className="form-label">Basemap Style</label>
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
                Make Public
              </label>
            </div>
          </div>

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
      className={`px-4 py-2.5 rounded-lg border-none cursor-pointer text-sm transition-all duration-150 flex items-center gap-2 ${
        active
          ? "font-bold bg-primary/15 text-primary shadow-sm"
          : "font-medium bg-transparent text-text-tertiary hover:text-text-secondary hover:bg-surface-hover"
      }`}
    >
      {children}
    </button>
  );
}

// ── Main Dashboard Page Component ───────────────────────────────────────────────

export default function DashboardPage() {
  const { canAdd } = usePermissions();
  const {
    modules,
    isLoading: modulesLoading,
    error: modulesError,
  } = useModules();
  const [activeTab, setActiveTab] = useState<"modules" | "maps">("modules");

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
    <div className="max-w-7xl mx-auto pb-12">
      {/* Hero Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary mb-2">
          <CpuIcon /> Pluggable Monolith Platform
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gradient tracking-tight">
          System Overview & Modules
        </h1>
        <p className="mt-2 text-text-secondary text-sm sm:text-base max-w-3xl leading-relaxed">
          EarthIQ core dynamically composes backend services, API routes, database schemas, and micro-frontend UI bundles seamlessly based on installed modules.
        </p>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-6 p-1 bg-surface border border-border-primary rounded-xl w-fit">
          <TabButton
            active={activeTab === "modules"}
            onClick={() => setActiveTab("modules")}
          >
            <LayersIcon /> Installed Modules ({modules.length})
          </TabButton>
          <TabButton
            active={activeTab === "maps"}
            onClick={() => setActiveTab("maps")}
          >
            <MapPinIcon /> Spatial Workspaces ({maps.length})
          </TabButton>
        </div>
      </div>

      {/* Global System Stats */}
      <ModularOverviewStats modules={modules} mapsCount={maps.length} />

      {/* CLI Quick Reference */}
      <CliManagementBanner />

      {/* ── MODULES HUB TAB ── */}
      {activeTab === "modules" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                Module Ecosystem
              </h2>
              <p className="text-sm text-text-secondary mt-0.5">
                Installed plugins registered in <code className="text-primary font-mono text-xs">modules.lock.yaml</code>
              </p>
            </div>
          </div>

          {modulesLoading && <ShimmerRows />}

          {modulesError && (
            <div className="p-4 rounded-lg bg-error-subtle text-error text-sm border border-error/20">
              Could not load module status: {modulesError}
            </div>
          )}

          {!modulesLoading && !modulesError && modules.length === 0 && (
            <EmptyState message="No modules are currently installed." />
          )}

          {!modulesLoading && !modulesError && modules.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {modules.map((m) => (
                <ModuleHubCard key={m.name} mod={m} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SPATIAL MAPS TAB ── */}
      {activeTab === "maps" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                Configurable Maps
              </h2>
              <p className="text-sm text-text-secondary mt-0.5">
                Geospatial map views accessible to your role and permissions
              </p>
            </div>
            {canAdd("maps") && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary btn-md shrink-0"
              >
                + Create New Map
              </button>
            )}
          </div>

          {mapsLoading && <ShimmerRows />}

          {mapsError && (
            <div className="p-4 rounded-lg bg-error-subtle text-error text-sm border border-error/20">
              Could not load maps: {mapsError}
            </div>
          )}

          {!mapsLoading && !mapsError && maps.length === 0 && (
            <EmptyState
              message="No configurable maps created yet."
              action={{
                label: "Create your first map",
                onClick: () => setIsModalOpen(true),
              }}
            />
          )}

          {!mapsLoading && !mapsError && maps.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
    </div>
  );
}
