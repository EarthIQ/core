import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Folder,
  Database,
  Map as MapIcon,
  User as UserIcon,
  ChevronRight,
  Layers,
  ChevronLeft,
  Plus,
  Upload,
} from "lucide-react";
import { Button } from "@packages/ui";
import { useAuth } from "@/lib/auth";
import { useModules, ModuleInfo } from "@/lib/modules";
import {
  fetchProjects,
  createProject,
  ProjectItem,
  ProjectCreateInput,
} from "@/lib/projects";
import { fetchMaps, MapItem } from "@/lib/maps";
import { listDatasets } from "@/lib/datasets";

// ── Helpers ───────────────────────────────────────────────────────────────────

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning!";
  if (hour < 18) return "Good afternoon!";
  return "Good evening!";
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `about ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `about ${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `about ${months} month${months === 1 ? "" : "s"} ago`;
}

function displayName(fullName?: string, email?: string): string {
  if (fullName && fullName.trim()) return fullName.trim();
  if (!email) return "there";
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

// ── Hero Slideshow ────────────────────────────────────────────────────────────

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaAction: string;
  icon: React.ReactNode;
}

const HERO_SLIDES: Slide[] = [
  {
    id: "create-project",
    title: "Create a Project",
    subtitle: "Start a new project to organize your data, maps, and layers.",
    ctaLabel: "Create Project",
    ctaAction: "project",
    icon: <Plus size={28} />,
  },
  {
    id: "add-data",
    title: "Add Your Data",
    subtitle: "Upload datasets and geospatial files to build your workspace.",
    ctaLabel: "Upload Data",
    ctaAction: "data",
    icon: <Upload size={28} />,
  },
  {
    id: "create-map",
    title: "Build a Map",
    subtitle: "Compose interactive maps with layers, styles, and annotations.",
    ctaLabel: "Create Map",
    ctaAction: "maps",
    icon: <MapIcon size={28} />,
  },
  {
    id: "profile",
    title: "Manage Your Profile",
    subtitle: "Update your account details and workspace settings.",
    ctaLabel: "View Profile",
    ctaAction: "profile",
    icon: <UserIcon size={28} />,
  },
];

function HeroSlideshow({
  userName,
  onCreateProject,
}: {
  userName: string;
  onCreateProject: () => void;
}) {
  const [greeting] = useState(() => greetingForHour(new Date().getHours()));
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = HERO_SLIDES.length;

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % total);
    }, 5000);
    return () => clearInterval(timer);
  }, [paused, total]);

  const goPrev = () => setCurrent((c) => (c - 1 + total) % total);
  const goNext = () => setCurrent((c) => (c + 1) % total);

  const slide = HERO_SLIDES[current];

  const handleCta = () => {
    if (slide.ctaAction === "project") {
      onCreateProject();
    } else if (slide.ctaAction === "data") {
      window.location.assign("/data");
    } else if (slide.ctaAction === "maps") {
      window.location.assign("/maps");
    } else if (slide.ctaAction === "profile") {
      window.location.assign("/dashboard");
    }
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden mb-6 min-h-[220px] flex items-center group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Landscape background */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1200 260"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#aee3f5" />
            <stop offset="55%" stopColor="#cdeef7" />
            <stop offset="100%" stopColor="#e8f7e9" />
          </linearGradient>
          <linearGradient id="hero-mountain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8d9aa8" />
            <stop offset="45%" stopColor="#b3bec9" />
            <stop offset="100%" stopColor="#5f7050" />
          </linearGradient>
          <linearGradient id="hero-grass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7fb069" />
            <stop offset="100%" stopColor="#4e8c46" />
          </linearGradient>
        </defs>
        <rect width="1200" height="260" fill="url(#hero-sky)" />
        <circle cx="980" cy="70" r="42" fill="#fff6d8" opacity="0.85" />
        <path
          d="M0 190 Q150 150 300 185 T600 180 T900 190 T1200 175 V260 H0 Z"
          fill="#9db98a"
          opacity="0.7"
        />
        <path
          d="M420 210 L580 40 L700 130 L760 90 L880 210 Z"
          fill="url(#hero-mountain)"
        />
        <path
          d="M580 40 L548 78 L566 74 L582 92 L600 72 L616 80 L612 62 Z"
          fill="#f4f8fb"
        />
        <path
          d="M596 100 q-6 40 -10 110 h14 q-2 -70 -4 -110 Z"
          fill="#dff2fa"
          opacity="0.9"
        />
        <path
          d="M0 215 Q200 195 420 212 T820 208 T1200 214 V260 H0 Z"
          fill="url(#hero-grass)"
        />
      </svg>

      {/* Content overlay */}
      <div className="relative z-10 w-full flex items-center justify-between px-8 py-10 gap-6">
        {/* Left: greeting (static) */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-md leading-tight">
            {greeting}
            <br />
            {userName}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-white/95 drop-shadow-sm">
            Here's what's happening within the workspace.
          </p>
        </div>

        {/* Right: slideshow content */}
        <div className="hidden md:flex flex-col items-end text-right gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shrink-0">
              {slide.icon}
            </div>
            <div>
              <div className="text-base font-bold text-white drop-shadow-sm">
                {slide.title}
              </div>
              <p className="text-xs text-white/90 drop-shadow-sm max-w-[220px]">
                {slide.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={handleCta}
            className="px-4 py-2 rounded-lg bg-white/90 text-gray-800 font-bold text-xs hover:bg-white transition-colors cursor-pointer shadow-md"
          >
            {slide.ctaLabel}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/35 transition-colors cursor-pointer"
              aria-label="Previous slide"
            >
              <ChevronLeft size={15} />
            </button>
            <div className="flex items-center gap-1">
              {HERO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all cursor-pointer ${
                    i === current
                      ? "w-5 h-1 bg-white"
                      : "w-2 h-1 bg-white/50 hover:bg-white/75"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={goNext}
              className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/35 transition-colors cursor-pointer"
              aria-label="Next slide"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile: slideshow below greeting */}
      <div className="md:hidden absolute bottom-3 left-6 right-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all cursor-pointer ${
                i === current ? "w-5 h-1 bg-white" : "w-2 h-1 bg-white/50"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
        <button
          onClick={handleCta}
          className="px-3 py-1.5 rounded-md bg-white/90 text-gray-800 font-bold text-xs cursor-pointer shadow"
        >
          {slide.ctaLabel}
        </button>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-surface border border-border-primary rounded-xl px-5 py-4 flex items-start justify-between gap-3 hover:border-primary/30 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
        {icon}
      </div>
      <div className="flex flex-col items-end text-right">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <span className="text-2xl font-extrabold text-text-primary tabular-nums mt-1">
          {value}
        </span>
      </div>
    </div>
  );
}

// ── Create Project Illustration ───────────────────────────────────────────────

function CreateProjectIllustration() {
  return (
    <div className="relative w-[240px] h-[170px] shrink-0 hidden lg:block select-none pointer-events-none">
      {/* Back card */}
      <div className="absolute right-0 top-2 w-[150px] h-[140px] bg-elevated border border-border-primary rounded-xl shadow-lg rotate-3 p-3 opacity-90">
        <div className="flex gap-1.5 mb-2">
          <span className="w-2 h-2 rounded-full bg-error/70" />
          <span className="w-2 h-2 rounded-full bg-warning/70" />
          <span className="w-2 h-2 rounded-full bg-success/70" />
        </div>
        <div className="h-2 rounded bg-surface-hover mb-1.5 w-4/5" />
        <div className="h-2 rounded bg-surface-hover mb-1.5 w-3/5" />
        <div className="h-2 rounded bg-surface-hover mb-3 w-2/3" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-10 rounded-lg bg-accent/20" />
          <div className="h-10 rounded-lg bg-primary/15" />
        </div>
      </div>

      {/* Front card */}
      <div className="absolute left-0 top-6 w-[160px] h-[130px] bg-elevated border border-border-primary rounded-xl shadow-xl -rotate-2 p-3">
        <div className="h-2 rounded bg-surface-hover mb-1.5 w-5/6" />
        <div className="h-2 rounded bg-surface-hover mb-1.5 w-2/3" />
        <div className="h-2 rounded bg-surface-hover mb-3 w-3/4" />
        <div className="space-y-1.5">
          <div className="h-2 rounded bg-error/60 w-4/5" />
          <div className="h-2 rounded bg-warning/60 w-3/5" />
          <div className="h-2 rounded bg-success/60 w-2/3" />
          <div className="h-2 rounded bg-accent/50 w-1/2" />
        </div>
      </div>

      {/* Floating chips */}
      <div className="absolute left-6 bottom-1 flex items-center gap-1.5 bg-elevated border border-border-primary rounded-full px-2 py-1 shadow-md">
        <span className="w-2.5 h-2.5 rounded-full bg-primary" />
        <span className="w-2.5 h-2.5 rounded-full bg-success" />
        <span className="w-2.5 h-2.5 rounded-full bg-warning" />
      </div>
    </div>
  );
}

// ── Recent Projects Panel ─────────────────────────────────────────────────────

function RecentProjectsPanel({
  projects,
  loading,
}: {
  projects: ProjectItem[];
  loading: boolean;
}) {
  const navigate = useNavigate();
  const recent = projects.slice(0, 5);

  return (
    <div className="bg-surface border border-border-primary rounded-2xl p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-text-primary">Recent Projects</h2>
        <button
          onClick={() => navigate("/projects")}
          className="flex items-center gap-0.5 text-sm font-semibold text-primary hover:text-primary/80 bg-transparent border-none cursor-pointer p-0"
        >
          View all Projects <ChevronRight size={16} />
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl skeleton" />
          ))}
        </div>
      )}

      {!loading && recent.length === 0 && (
        <p className="text-sm text-text-tertiary py-6 text-center">
          No projects yet. Create your first one to get started.
        </p>
      )}

      {!loading && recent.length > 0 && (
        <ul className="flex flex-col divide-y divide-border-subtle">
          {recent.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => navigate("/projects")}
                className="w-full flex items-center gap-3 py-3 px-1 bg-transparent border-none cursor-pointer text-left hover:bg-surface-hover rounded-lg transition-colors"
              >
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-primary/25 to-accent/20 flex items-center justify-center shrink-0 overflow-hidden">
                  <MapIcon size={18} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-text-primary truncate">
                    {p.title}
                  </div>
                  <div className="text-xs text-text-tertiary mt-0.5">
                    {relativeTime(p.created_at)}
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="text-text-tertiary shrink-0"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Discover More Module Card ─────────────────────────────────────────────────

function DiscoverCard({ mod }: { mod: ModuleInfo }) {
  const navigate = useNavigate();
  const routeName = mod.name.replace("-module", "");
  const clickable = mod.enabled && mod.capabilities.has_frontend;

  return (
    <button
      onClick={() => clickable && navigate(`/${routeName}`)}
      disabled={!clickable}
      className={`card p-5 flex items-start gap-4 text-left transition-all duration-200 ${
        clickable
          ? "hover:border-primary/40 hover:shadow-lg cursor-pointer"
          : "opacity-70 cursor-default"
      }`}
    >
      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Layers size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-sm text-text-primary capitalize">
          {mod.name.replace("-", " ").replace(" module", "")}
        </div>
        <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
          {mod.description ||
            "Explore what this module can do for your project."}
        </p>
      </div>
      <ChevronRight size={16} className="text-text-tertiary shrink-0 mt-1" />
    </button>
  );
}

// ── Create Project Modal ──────────────────────────────────────────────────────

function CreateProjectModal({
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const input: ProjectCreateInput = {
        title: title.trim(),
        description: description.trim(),
        center_lng: 0.0,
        center_lat: 20.0,
        zoom: 2.5,
        basemap: "dataviz-light",
      };
      await createProject(input);
      setTitle("");
      setDescription("");
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
          Create a Project
        </h2>
        <p className="text-sm text-text-secondary -mt-2">
          Start a new project to organize your data.
        </p>

        {error && (
          <div className="p-3 rounded-md bg-error-subtle text-error text-sm border border-error/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-field">
            <label className="form-label">Project Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Watershed Assessment 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea
              rows={3}
              placeholder="What is this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input textarea"
            />
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
              {loading ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Landing Page ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const { modules } = useModules();

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [mapsCount, setMapsCount] = useState(0);
  const [datasetsCount, setDatasetsCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const data = await fetchProjects();
      // Most recently created first
      data.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setProjects(data);
    } catch {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    fetchMaps()
      .then((maps: MapItem[]) => setMapsCount(maps.length))
      .catch(() => setMapsCount(0));
    listDatasets()
      .then((items) => setDatasetsCount(items.length))
      .catch(() => setDatasetsCount(0));
  }, []);

  const userName = useMemo(
    () => displayName(user?.full_name, user?.email),
    [user],
  );

  const discoverModules = modules.filter((m) => m.enabled);

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Hero Slideshow */}
      <HeroSlideshow
        userName={userName}
        onCreateProject={() => setIsModalOpen(true)}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Folder size={22} />}
          label="Project Created"
          value={projects.length}
        />
        <StatCard
          icon={<Database size={22} />}
          label="Data Uploaded"
          value={datasetsCount}
        />
        <StatCard
          icon={<MapIcon size={22} />}
          label="Map Created"
          value={mapsCount}
        />
        <StatCard icon={<UserIcon size={22} />} label="User" value={1} />
      </div>

      {/* Create a Project + Recent Projects */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-10">
        {/* Create a Project card */}
        <div className="xl:col-span-2 rounded-2xl bg-gradient-to-r from-primary/10 via-surface to-surface border border-border-primary p-7 flex items-center justify-between gap-6 overflow-hidden">
          <div className="max-w-md">
            <h2 className="text-2xl font-extrabold text-text-primary">
              Create a Project
            </h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              To get started you can start by creating a new one or browse
              existing projects
            </p>
            <div className="flex gap-3 mt-5">
              <Button
                variant="secondary"
                onClick={() => window.location.assign("/projects")}
              >
                Browse Project
              </Button>
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                Create Project
              </Button>
            </div>
          </div>
          <CreateProjectIllustration />
        </div>

        {/* Recent Projects */}
        <RecentProjectsPanel projects={projects} loading={projectsLoading} />
      </div>

      {/* Discover more */}
      <section>
        <div className="flex items-end justify-between gap-4 mb-1">
          <div>
            <h2 className="text-2xl font-extrabold text-text-primary">
              Discover more
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Choose an action to get started with your project
            </p>
          </div>
          <button
            onClick={() => window.location.assign("/dashboard")}
            className="flex items-center gap-0.5 text-sm font-semibold text-primary hover:text-primary/80 bg-transparent border-none cursor-pointer p-0 shrink-0"
          >
            View all Modules <ChevronRight size={16} />
          </button>
        </div>

        {discoverModules.length === 0 ? (
          <div className="py-10 px-8 text-center text-text-tertiary border-[1.5px] border-dashed border-border-primary rounded-xl mt-4">
            <p className="text-sm">No modules are currently installed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            {discoverModules.map((m) => (
              <DiscoverCard key={m.name} mod={m} />
            ))}
          </div>
        )}
      </section>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={loadProjects}
      />
    </div>
  );
}
