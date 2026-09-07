import {
  Button,
  Badge,
  Avatar,
  Select,
  Dropdown,
  EmptyState,
  Skeleton,
  ConfirmDialog,
} from "@packages/ui";
import {
  Layers,
  Map as MapIcon,
  Bookmark,
  MessageSquare,
  Clock,
  Plus,
  Search,
  Share2,
  MoreVertical,
  Crown,
  Pencil,
  Eye,
  ExternalLink,
  Loader2,
  Trash2,
  LayoutGrid,
  List,
  Globe,
  Satellite,
  Mountain,
  MapPin,
  Users,
  X,
  FolderOpen,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ShareDialog } from "@/components/map/share/ShareDialog";
import { useAuth } from "@/lib/auth";
import {
  fetchProjects,
  createProject,
  deleteProject,
  type ProjectItem,
} from "@/lib/projects";

// ── Types & constants ─────────────────────────────────────────────────────────

type AccessFilter = "all" | "mine" | "shared";
type SortKey =
  | "updated_desc"
  | "updated_asc"
  | "created_desc"
  | "created_asc"
  | "title_asc"
  | "title_desc"
  | "layers_desc"
  | "maps_desc";
type ViewMode = "grid" | "list";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "updated_desc", label: "Last updated" },
  { value: "updated_asc", label: "Oldest updated" },
  { value: "created_desc", label: "Newest created" },
  { value: "created_asc", label: "Oldest created" },
  { value: "title_asc", label: "Title A–Z" },
  { value: "title_desc", label: "Title Z–A" },
  { value: "layers_desc", label: "Most layers" },
  { value: "maps_desc", label: "Most maps" },
];

const BASEMAPS: Record<
  string,
  {
    label: string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
  }
> = {
  osm: { label: "OpenStreetMap", Icon: Globe },
  "esri-satellite": { label: "Satellite", Icon: Satellite },
  opentopomap: { label: "Topographic", Icon: Mountain },
};

const BASEMAP_CHOICES = [
  { value: "opentopomap", label: "Topographic (OpenTopoMap)" },
  { value: "osm", label: "OpenStreetMap" },
  { value: "esri-satellite", label: "Satellite (ESRI)" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  const years = Math.floor(months / 12);
  return `${years} yr${years === 1 ? "" : "s"} ago`;
}

function basemapMeta(id?: string) {
  if (id && BASEMAPS[id]) return BASEMAPS[id];
  return { label: id || "Basemap", Icon: MapPin };
}

function ownerName(p: ProjectItem): string {
  return p.owner?.full_name || p.owner?.email || "Unknown owner";
}

type RoleVariant = "primary" | "info" | "success" | "default";
function roleFor(
  p: ProjectItem,
  myId?: string,
): {
  label: string;
  variant: RoleVariant;
  Icon: React.ComponentType<{ size?: number }>;
} {
  if (myId && p.owner_id === myId)
    return { label: "Owner", variant: "primary", Icon: Crown };
  if (p.user_permission === "write")
    return { label: "Editor", variant: "info", Icon: Pencil };
  if (p.user_permission === "admin")
    return { label: "Admin", variant: "success", Icon: Crown };
  return { label: "Viewer", variant: "default", Icon: Eye };
}

function sortProjects(list: ProjectItem[], key: SortKey): ProjectItem[] {
  const arr = [...list];
  if (key === "title_asc")
    return arr.sort((a, b) => a.title.localeCompare(b.title));
  if (key === "title_desc")
    return arr.sort((a, b) => b.title.localeCompare(a.title));
  const numeric = (p: ProjectItem): number => {
    switch (key) {
      case "updated_desc":
      case "updated_asc":
        return new Date(p.updated_at).getTime() || 0;
      case "created_desc":
      case "created_asc":
        return new Date(p.created_at).getTime() || 0;
      case "layers_desc":
        return p.layers_config?.length ?? 0;
      case "maps_desc":
        return p.maps?.length ?? 0;
      default:
        return 0;
    }
  };
  const asc = key.endsWith("_asc");
  return arr.sort((a, b) =>
    asc ? numeric(a) - numeric(b) : numeric(b) - numeric(a),
  );
}

// ── Small stat tile ───────────────────────────────────────────────────────────

const StatTile = ({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "primary" | "info" | "success";
}) => {
  const toneCls: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    info: "bg-info-bg text-info-text",
    success: "bg-success-bg text-success-text",
  };
  return (
    <div className="bg-surface border border-border-primary rounded-2xl px-4 py-3.5 flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${toneCls[tone]}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold text-text-primary leading-none">
          {value}
        </div>
        <div className="text-xs text-text-tertiary mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}

// ── Project card ──────────────────────────────────────────────────────────────

interface CardHandlers {
  onOpen: () => void;
  onShare: () => void;
  onDelete: () => void;
}

const ProjectCard = ({
  project,
  myId,
  view,
  onOpen,
  onShare,
  onDelete,
}: {
  project: ProjectItem;
  myId?: string;
  view: ViewMode;
} & CardHandlers) => {
  const { label: bmLabel, Icon: BmIcon } = basemapMeta(project.basemap);
  const role = roleFor(project, myId);
  const RoleIcon = role.Icon;
  const sharedGroups = project.group_access?.length ?? 0;
  const isMine = myId ? project.owner_id === myId : false;
  const oName = ownerName(project);

  const menuItems = [
    {
      key: "open",
      label: "Open project",
      icon: <ExternalLink size={15} />,
      onClick: onOpen,
    },
    {
      key: "share",
      label: "Share project",
      icon: <Share2 size={15} />,
      onClick: onShare,
    },
    { key: "divider", divider: true },
    {
      key: "delete",
      label: "Delete project",
      icon: <Trash2 size={15} />,
      danger: true,
      onClick: onDelete,
    },
  ];

  const actions = (
    <div
      className="flex items-center gap-1 shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        aria-label="Share project"
        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors border-none bg-transparent cursor-pointer"
        title="Share project"
        type="button"
        onClick={onShare}
      >
        <Share2 size={15} />
      </button>
      <Dropdown
        items={menuItems}
        placement="bottom-end"
        trigger={
          <button
            aria-label="More actions"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors border-none bg-transparent cursor-pointer"
            title="More actions"
            type="button"
          >
            <MoreVertical size={16} />
          </button>
        }
      />
    </div>
  );

  const metaChips = (
    <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-text-tertiary">
      <span className="inline-flex items-center gap-1">
        <Layers size={13} /> {project.layers_config?.length ?? 0} layers
      </span>
      <span className="inline-flex items-center gap-1">
        <MapIcon size={13} /> {project.maps?.length ?? 0} maps
      </span>
      <span className="inline-flex items-center gap-1">
        <Bookmark size={13} /> {project.bookmarks?.length ?? 0}
      </span>
      <span className="inline-flex items-center gap-1">
        <MessageSquare size={13} /> {project.comments?.length ?? 0}
      </span>
    </div>
  );

  const badges = (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge leftIcon={<RoleIcon size={12} />} size="xs" variant={role.variant}>
        {role.label}
      </Badge>
      <Badge leftIcon={<BmIcon size={12} />} size="xs" variant="outline">
        {bmLabel}
      </Badge>
      {!isMine && sharedGroups > 0 && (
        <Badge leftIcon={<Users size={12} />} size="xs" variant="info">
          {sharedGroups} group{sharedGroups === 1 ? "" : "s"}
        </Badge>
      )}
    </div>
  );

  if (view === "list") {
    return (
      <article
        className="group flex items-center gap-4 bg-surface border border-border-primary rounded-xl p-3 cursor-pointer transition-all hover:border-primary/40 hover:shadow-md"
        onClick={onOpen}
      >
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/25 to-accent/10 flex items-center justify-center shrink-0">
          <BmIcon className="text-primary" size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm text-text-primary truncate max-w-[10rem] sm:max-w-[220px]">
              {project.title}
            </h3>
            <Badge size="xs" variant={role.variant}>
              {role.label}
            </Badge>
          </div>
          <p className="text-xs text-text-secondary mt-0.5 truncate">
            {project.description || "No description"}
          </p>
        </div>
        <div className="hidden lg:flex flex-col items-end gap-0.5 shrink-0 w-28">
          <span className="text-xs text-text-tertiary inline-flex items-center gap-1">
            <Layers size={12} /> {project.layers_config?.length ?? 0} layers
          </span>
          <span className="text-[11px] text-text-tertiary inline-flex items-center gap-1">
            <Clock size={11} /> {relativeTime(project.updated_at)}
          </span>
        </div>
        <Avatar bordered name={oName} size="sm" />
        {actions}
      </article>
    );
  }

  return (
    <article
      className="group relative flex flex-col bg-surface border border-border-primary rounded-2xl overflow-hidden cursor-pointer transition-all hover:border-primary/40 hover:shadow-lg"
      onClick={onOpen}
    >
      <div className="h-1.5 bg-gradient-to-r from-primary/60 via-primary/20 to-accent/40" />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/25 to-accent/10 flex items-center justify-center shrink-0">
            <BmIcon className="text-primary" size={20} />
          </div>
          <h3 className="min-w-0 flex-1 font-bold text-sm text-text-primary leading-snug line-clamp-2">
            {project.title}
          </h3>
        </div>
        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed min-h-[2rem]">
          {project.description || "No description"}
        </p>
        {badges}
        {metaChips}
        <div className="mt-auto" />
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border-subtle">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar bordered name={oName} size="xs" />
            <div className="min-w-0">
              <div className="text-xs font-medium text-text-primary truncate">
                {oName}
              </div>
              <div className="text-[10px] text-text-tertiary truncate">
                {relativeTime(project.updated_at)} · {bmLabel}
              </div>
            </div>
          </div>
          {actions}
        </div>
      </div>
    </article>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const myId = user?.id;

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [access, setAccess] = useState<AccessFilter>("all");
  const [sort, setSort] = useState<SortKey>("updated_desc");
  const [view, setView] = useState<ViewMode>("grid");

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [cTitle, setCTitle] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cBasemap, setCBasemap] = useState("opentopomap");
  const [creating, setCreating] = useState(false);
  const [cError, setCError] = useState<string | null>(null);

  // Share + delete
  const [shareProject, setShareProject] = useState<ProjectItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Inline notice (no global ToastProvider is mounted in the shell)
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const flash = useCallback((type: "success" | "error", text: string) => {
    setNotice({ type, text });
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3500);
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const mineCount = useMemo(
    () => projects.filter((p) => myId && p.owner_id === myId).length,
    [projects, myId],
  );
  const sharedCount = useMemo(
    () => projects.filter((p) => (myId ? p.owner_id !== myId : true)).length,
    [projects, myId],
  );
  const totalMaps = useMemo(
    () => projects.reduce((n, p) => n + (p.maps?.length ?? 0), 0),
    [projects],
  );

  const visibleProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = projects;
    if (access === "mine")
      list = list.filter((p) => myId && p.owner_id === myId);
    else if (access === "shared")
      list = list.filter((p) => (myId ? p.owner_id !== myId : false));
    if (q)
      list = list.filter(
        (p) =>
          (p.title && p.title.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)),
      );
    return sortProjects(list, sort);
  }, [projects, search, access, sort, myId]);

  const hasActiveFilters = search.trim() !== "" || access !== "all";

  const openProject = useCallback(
    (p: ProjectItem) => navigate(`/map?projectId=${p.id}`),
    [navigate],
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!cTitle.trim()) return;
    setCreating(true);
    setCError(null);
    try {
      const created = await createProject({
        title: cTitle.trim(),
        description: cDesc.trim(),
        center_lng: 0,
        center_lat: 20,
        zoom: 3,
        basemap: cBasemap,
        layers_config: [],
      });
      setProjects((prev) => [created, ...prev]);
      setCreateOpen(false);
      setCTitle("");
      setCDesc("");
      setCBasemap("opentopomap");
      flash("success", "Project created");
      navigate(`/map?projectId=${created.id}`);
    } catch (err) {
      setCError(
        err instanceof Error ? err.message : "Could not create project",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProject(deleteTarget.id);
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      flash("success", "Project deleted");
      setDeleteTarget(null);
    } catch (err) {
      flash(
        "error",
        err instanceof Error ? err.message : "Could not delete project",
      );
    } finally {
      setDeleting(false);
    }
  }

  const resetFilters = () => {
    setSearch("");
    setAccess("all");
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary">
            Projects
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Your geospatial workspaces - the ones you own and the ones shared
            with you.
          </p>
        </div>
        <Button
          className="whitespace-nowrap"
          leftIcon={<Plus size={16} />}
          variant="primary"
          onClick={() => setCreateOpen(true)}
        >
          New project
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile
          icon={<FolderOpen size={18} />}
          label="Total projects"
          tone="primary"
          value={projects.length}
        />
        <StatTile
          icon={<Crown size={18} />}
          label="Created by me"
          tone="success"
          value={mineCount}
        />
        <StatTile
          icon={<Users size={18} />}
          label="Shared with me"
          tone="info"
          value={sharedCount}
        />
        <StatTile
          icon={<MapIcon size={18} />}
          label="Published maps"
          tone="primary"
          value={totalMaps}
        />
      </div>

      {/* Toolbar */}
      <div className="bg-surface border border-border-primary rounded-2xl p-3 mb-5">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
              size={15}
            />
            <input
              className="input pl-9"
              placeholder="Search projects by name or description…"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? <button
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary cursor-pointer"
                type="button"
                onClick={() => setSearch("")}
              >
                <X size={15} />
              </button> : null}
          </div>

          {/* Access filter */}
          <div
            aria-label="Filter by access"
            className="inline-flex items-center rounded-xl border border-border-primary bg-surface p-0.5"
            role="tablist"
          >
            {(
              [
                { key: "all", label: "All", count: projects.length },
                { key: "mine", label: "Mine", count: mineCount },
                { key: "shared", label: "Shared", count: sharedCount },
              ] as { key: AccessFilter; label: string; count: number }[]
            ).map((t) => (
              <button
                key={t.key}
                aria-selected={access === t.key}
                role="tab"
                type="button"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border-none ${
                  access === t.key
                    ? "bg-primary text-[var(--text-on-primary)]"
                    : "text-text-secondary hover:text-text-primary bg-transparent"
                }`}
                onClick={() => setAccess(t.key)}
              >
                {t.label}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${access === t.key ? "bg-white/20" : "bg-surface-hover text-text-tertiary"}`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Sort + view */}
          <div className="flex items-center gap-2">
            <Select
              options={SORT_OPTIONS}
              size="sm"
              value={sort}
              onChange={(v: string) => setSort(v as SortKey)}
            />
            <div className="inline-flex items-center rounded-xl border border-border-primary bg-surface p-0.5">
              <button
                aria-label="Grid view"
                className={`w-8 h-8 inline-flex items-center justify-center rounded-lg cursor-pointer border-none transition-colors ${view === "grid" ? "bg-primary text-[var(--text-on-primary)]" : "bg-transparent text-text-secondary hover:text-text-primary"}`}
                type="button"
                onClick={() => setView("grid")}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                aria-label="List view"
                className={`w-8 h-8 inline-flex items-center justify-center rounded-lg cursor-pointer border-none transition-colors ${view === "list" ? "bg-primary text-[var(--text-on-primary)]" : "bg-transparent text-text-secondary hover:text-text-primary"}`}
                type="button"
                onClick={() => setView("list")}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Result count */}
      {!loading && !error && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-text-tertiary">
            Showing {visibleProjects.length} of {projects.length} project
            {projects.length === 1 ? "" : "s"}
            {hasActiveFilters ? " (filtered)" : null}
          </p>
          {hasActiveFilters ? <button
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 cursor-pointer border-none bg-transparent"
              type="button"
              onClick={resetFilters}
            >
              <X size={13} /> Clear filters
            </button> : null}
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {error ? (
        <div className="bg-surface border border-border-primary rounded-2xl">
          <EmptyState
            action={{ label: "Try again", onClick: () => loadProjects() }}
            description={error}
            size="lg"
            title="Couldn't load your projects"
          />
        </div>
      ) : loading ? (
        view === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface border border-border-primary rounded-2xl p-5 flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <Skeleton
                    className="w-11 h-11 shrink-0"
                    height={44}
                    variant="rounded"
                    width={44}
                  />
                  <div className="flex-1 space-y-2">
                    <Skeleton width="70%" />
                    <Skeleton width="45%" />
                  </div>
                </div>
                <Skeleton width="55%" />
                <Skeleton width="80%" />
                <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
                  <Skeleton
                    className="w-6 h-6"
                    height={24}
                    variant="circular"
                    width={24}
                  />
                  <Skeleton className="w-16 h-8" width={64} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface border border-border-primary rounded-xl p-3 flex items-center gap-4"
              >
                <Skeleton
                  className="w-11 h-11 shrink-0"
                  height={44}
                  variant="rounded"
                  width={44}
                />
                <div className="flex-1 space-y-2">
                  <Skeleton width="40%" />
                  <Skeleton width="65%" />
                </div>
                <Skeleton
                  className="w-8 h-8"
                  height={32}
                  variant="circular"
                  width={32}
                />
                <Skeleton className="w-16 h-8" width={64} />
              </div>
            ))}
          </div>
        )
      ) : projects.length === 0 ? (
        <div className="bg-surface border border-border-primary rounded-2xl">
          <EmptyState
            description="Create your first geospatial workspace to start organizing layers, maps, and analysis."
            icon={<FolderOpen className="text-primary" size={40} />}
            size="lg"
            title="No projects yet"
            action={{
              label: "Create a project",
              onClick: () => setCreateOpen(true),
            }}
          />
        </div>
      ) : visibleProjects.length === 0 ? (
        <div className="bg-surface border border-border-primary rounded-2xl">
          <EmptyState
            action={{ label: "Clear filters", onClick: resetFilters }}
            size="md"
            title="No matching projects"
            description={
              search.trim()
                ? `Nothing matched “${search.trim()}”. Try a different search or clear your filters.`
                : "Nothing matches the current filters. Try switching tabs or clearing filters."
            }
          />
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleProjects.map((p) => (
            <ProjectCard
              key={p.id}
              myId={myId}
              project={p}
              view={view}
              onDelete={() => setDeleteTarget(p)}
              onOpen={() => openProject(p)}
              onShare={() => setShareProject(p)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleProjects.map((p) => (
            <ProjectCard
              key={p.id}
              myId={myId}
              project={p}
              view={view}
              onDelete={() => setDeleteTarget(p)}
              onOpen={() => openProject(p)}
              onShare={() => setShareProject(p)}
            />
          ))}
        </div>
      )}

      {/* ── Create Project modal ──────────────────────────────────────────── */}
      {createOpen ? <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 overlay animate-fade-in"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setCreateOpen(false)
          }
        >
          <div className="w-full max-w-[480px] bg-elevated border border-border-primary rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
              <div>
                <h2 className="text-lg font-bold text-text-primary">
                  Create a project
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  A workspace to organize layers, maps, and analysis.
                </p>
              </div>
              <button
                aria-label="Close"
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover cursor-pointer border-none bg-transparent"
                type="button"
                onClick={() => setCreateOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form className="p-6 flex flex-col gap-4" onSubmit={handleCreate}>
              {cError ? <div className="p-3 rounded-lg bg-error-subtle text-error text-sm border border-error/20">
                  {cError}
                </div> : null}

              <div>
                <label className="form-label" htmlFor="np-title">
                  Project title
                </label>
                <input
                  autoFocus
                  required
                  className="input"
                  id="np-title"
                  maxLength={255}
                  placeholder="e.g. Coastal Wetland Vulnerability Index"
                  type="text"
                  value={cTitle}
                  onChange={(e) => setCTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" htmlFor="np-desc">
                  Description
                </label>
                <textarea
                  className="input textarea"
                  id="np-desc"
                  placeholder="Brief overview of layers, objectives, and area of interest…"
                  rows={3}
                  value={cDesc}
                  onChange={(e) => setCDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" htmlFor="np-basemap">
                  Default basemap
                </label>
                <select
                  className="input select"
                  id="np-basemap"
                  value={cBasemap}
                  onChange={(e) => setCBasemap(e.target.value)}
                >
                  {BASEMAP_CHOICES.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end mt-2">
                <Button
                  variant="secondary"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={creating}
                  type="submit"
                  variant="primary"
                  leftIcon={
                    creating ? (
                      <Loader2 className="animate-spin" size={15} />
                    ) : (
                      <Plus size={15} />
                    )
                  }
                >
                  Create Project
                </Button>
              </div>
            </form>
          </div>
        </div> : null}

      {/* ── Share dialog (reuses the map/project share surface) ──────────── */}
      {shareProject ? <ShareDialog
          entityId={shareProject.id}
          entityTitle={shareProject.title}
          entityType="project"
          open={!!shareProject}
          shareUrl={`${window.location.origin}/map?projectId=${shareProject.id}`}
          canManage={
            (myId && shareProject.owner_id === myId) ||
            shareProject.user_permission === "admin"
          }
          onClose={() => setShareProject(null)}
        /> : null}

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      <ConfirmDialog
        cancelLabel="Cancel"
        confirmLabel="Delete project"
        icon={<Trash2 size={22} />}
        isOpen={!!deleteTarget}
        loading={deleting}
        title="Delete project?"
        variant="danger"
        description={
          deleteTarget
            ? `“${deleteTarget.title}” and its layers, annotations, and published maps will be permanently removed. This cannot be undone.`
            : undefined
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* ── Inline notice ────────────────────────────────────────────────── */}
      {notice ? <div
          aria-live="polite"
          role="status"
          className={`fixed left-1/2 bottom-6 -translate-x-1/2 z-[1001] px-4 py-2.5 rounded-xl border shadow-2xl text-sm font-medium whitespace-nowrap animate-fade-in ${
            notice.type === "success"
              ? "bg-success-bg text-success-text border-success-border"
              : "bg-error-bg text-error-text border-error-border"
          }`}
        >
          {notice.text}
        </div> : null}
    </div>
  );
}
