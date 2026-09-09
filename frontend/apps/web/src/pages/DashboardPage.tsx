import { Button } from "@packages/ui";
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
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/lib/auth";
import { listDatasets } from "@/lib/datasets";
import { fetchMaps, type MapItem } from "@/lib/maps";
import { useModules, type ModuleInfo } from "@/lib/modules";
import {
  fetchProjects,
  createProject,
  type ProjectItem,
  type ProjectCreateInput,
} from "@/lib/projects";

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

const HeroSlideshow = ({
  userName,
  onCreateProject,
}: {
  userName: string;
  onCreateProject: () => void;
}) => {
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
      className="group relative mb-6 flex min-h-[220px] items-center overflow-hidden rounded-2xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Landscape background */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 260"
      >
        <defs>
          <linearGradient
            id="hero-sky"
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#aee3f5"
            />
            <stop
              offset="55%"
              stopColor="#cdeef7"
            />
            <stop
              offset="100%"
              stopColor="#e8f7e9"
            />
          </linearGradient>
          <linearGradient
            id="hero-mountain"
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#8d9aa8"
            />
            <stop
              offset="45%"
              stopColor="#b3bec9"
            />
            <stop
              offset="100%"
              stopColor="#5f7050"
            />
          </linearGradient>
          <linearGradient
            id="hero-grass"
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#7fb069"
            />
            <stop
              offset="100%"
              stopColor="#4e8c46"
            />
          </linearGradient>
        </defs>
        <rect
          fill="url(#hero-sky)"
          height="260"
          width="1200"
        />
        <circle
          cx="980"
          cy="70"
          fill="#fff6d8"
          opacity="0.85"
          r="42"
        />
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
      <div className="relative z-10 flex w-full items-center justify-between gap-6 px-8 py-10">
        {/* Left: greeting (static) */}
        <div>
          <h1 className="text-3xl leading-tight font-extrabold text-white drop-shadow-md sm:text-4xl">
            {greeting}
            <br />
            {userName}
          </h1>
          <p className="mt-2 text-sm text-white/95 drop-shadow-sm sm:text-base">
            Here's what's happening within the workspace.
          </p>
        </div>

        {/* Right: slideshow content */}
        <div className="hidden flex-col items-end gap-3 text-right md:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm">
              {slide.icon}
            </div>
            <div>
              <div className="text-base font-bold text-white drop-shadow-sm">
                {slide.title}
              </div>
              <p className="max-w-[220px] text-xs text-white/90 drop-shadow-sm">
                {slide.subtitle}
              </p>
            </div>
          </div>
          <button
            className="cursor-pointer rounded-lg bg-white/90 px-4 py-2 text-xs font-bold text-gray-800 shadow-md transition-colors hover:bg-white"
            onClick={handleCta}
          >
            {slide.ctaLabel}
          </button>
          <div className="flex items-center gap-2">
            <button
              aria-label="Previous slide"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/35"
              onClick={goPrev}
            >
              <ChevronLeft size={15} />
            </button>
            <div className="flex items-center gap-1">
              {HERO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`cursor-pointer rounded-full transition-all ${
                    i === current
                      ? "h-1 w-5 bg-white"
                      : "h-1 w-2 bg-white/50 hover:bg-white/75"
                  }`}
                  onClick={() => setCurrent(i)}
                />
              ))}
            </div>
            <button
              aria-label="Next slide"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/35"
              onClick={goNext}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile: slideshow below greeting */}
      <div className="absolute right-6 bottom-3 left-6 flex items-center justify-between md:hidden">
        <div className="flex items-center gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              className={`cursor-pointer rounded-full transition-all ${
                i === current ? "h-1 w-5 bg-white" : "h-1 w-2 bg-white/50"
              }`}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
        <button
          className="cursor-pointer rounded-md bg-white/90 px-3 py-1.5 text-xs font-bold text-gray-800 shadow"
          onClick={handleCta}
        >
          {slide.ctaLabel}
        </button>
      </div>
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────

const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) => {
  return (
    <div className="bg-surface border-border-primary hover:border-primary/30 flex items-start justify-between gap-3 rounded-xl border px-5 py-4 transition-colors">
      <div className="bg-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm">
        {icon}
      </div>
      <div className="flex flex-col items-end text-right">
        <span className="text-text-secondary text-sm font-medium">{label}</span>
        <span className="text-text-primary mt-1 text-2xl font-extrabold tabular-nums">
          {value}
        </span>
      </div>
    </div>
  );
};

// ── Create Project Illustration ───────────────────────────────────────────────

const CreateProjectIllustration = () => {
  return (
    <div className="pointer-events-none relative hidden h-[170px] w-[240px] shrink-0 select-none lg:block">
      {/* Back card */}
      <div className="bg-elevated border-border-primary absolute top-2 right-0 h-[140px] w-[150px] rotate-3 rounded-xl border p-3 opacity-90 shadow-lg">
        <div className="mb-2 flex gap-1.5">
          <span className="bg-error/70 h-2 w-2 rounded-full" />
          <span className="bg-warning/70 h-2 w-2 rounded-full" />
          <span className="bg-success/70 h-2 w-2 rounded-full" />
        </div>
        <div className="bg-surface-hover mb-1.5 h-2 w-4/5 rounded" />
        <div className="bg-surface-hover mb-1.5 h-2 w-3/5 rounded" />
        <div className="bg-surface-hover mb-3 h-2 w-2/3 rounded" />
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-accent/20 h-10 rounded-lg" />
          <div className="bg-primary/15 h-10 rounded-lg" />
        </div>
      </div>

      {/* Front card */}
      <div className="bg-elevated border-border-primary absolute top-6 left-0 h-[130px] w-[160px] -rotate-2 rounded-xl border p-3 shadow-xl">
        <div className="bg-surface-hover mb-1.5 h-2 w-5/6 rounded" />
        <div className="bg-surface-hover mb-1.5 h-2 w-2/3 rounded" />
        <div className="bg-surface-hover mb-3 h-2 w-3/4 rounded" />
        <div className="space-y-1.5">
          <div className="bg-error/60 h-2 w-4/5 rounded" />
          <div className="bg-warning/60 h-2 w-3/5 rounded" />
          <div className="bg-success/60 h-2 w-2/3 rounded" />
          <div className="bg-accent/50 h-2 w-1/2 rounded" />
        </div>
      </div>

      {/* Floating chips */}
      <div className="bg-elevated border-border-primary absolute bottom-1 left-6 flex items-center gap-1.5 rounded-full border px-2 py-1 shadow-md">
        <span className="bg-primary h-2.5 w-2.5 rounded-full" />
        <span className="bg-success h-2.5 w-2.5 rounded-full" />
        <span className="bg-warning h-2.5 w-2.5 rounded-full" />
      </div>
    </div>
  );
};

// ── Recent Projects Panel ─────────────────────────────────────────────────────

const RecentProjectsPanel = ({
  projects,
  loading,
}: {
  projects: ProjectItem[];
  loading: boolean;
}) => {
  const navigate = useNavigate();
  const recent = projects.slice(0, 5);

  return (
    <div className="bg-surface border-border-primary flex flex-col rounded-2xl border p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-text-primary text-lg font-bold">Recent Projects</h2>
        <button
          className="text-primary hover:text-primary/80 flex cursor-pointer items-center gap-0.5 border-none bg-transparent p-0 text-sm font-semibold"
          onClick={() => navigate("/projects")}
        >
          View all Projects <ChevronRight size={16} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton h-14 rounded-xl"
            />
          ))}
        </div>
      ) : null}

      {!loading && recent.length === 0 && (
        <p className="text-text-tertiary py-6 text-center text-sm">
          No projects yet. Create your first one to get started.
        </p>
      )}

      {!loading && recent.length > 0 && (
        <ul className="divide-border-subtle flex flex-col divide-y">
          {recent.map((p) => (
            <li key={p.id}>
              <button
                className="hover:bg-surface-hover flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-1 py-3 text-left transition-colors"
                onClick={() => navigate("/projects")}
              >
                <div className="from-primary/25 to-accent/20 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br">
                  <MapIcon
                    className="text-primary"
                    size={18}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-text-primary truncate text-sm font-semibold">
                    {p.title}
                  </div>
                  <div className="text-text-tertiary mt-0.5 text-xs">
                    {relativeTime(p.created_at)}
                  </div>
                </div>
                <ChevronRight
                  className="text-text-tertiary shrink-0"
                  size={16}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── Discover More Module Card ─────────────────────────────────────────────────

const DiscoverCard = ({ mod }: { mod: ModuleInfo }) => {
  const navigate = useNavigate();
  const routeName = mod.name.replace("-module", "");
  const clickable = mod.enabled && mod.capabilities.has_frontend;

  return (
    <button
      disabled={!clickable}
      className={`card flex items-start gap-4 p-5 text-left transition-all duration-200 ${
        clickable
          ? "hover:border-primary/40 cursor-pointer hover:shadow-lg"
          : "cursor-default opacity-70"
      }`}
      onClick={() => clickable && navigate(`/${routeName}`)}
    >
      <div className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
        <Layers size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-text-primary text-sm font-bold capitalize">
          {mod.name.replace("-", " ").replace(" module", "")}
        </div>
        <p className="text-text-secondary mt-1 line-clamp-2 text-xs leading-relaxed">
          {mod.description ||
            "Explore what this module can do for your project."}
        </p>
      </div>
      <ChevronRight
        className="text-text-tertiary mt-1 shrink-0"
        size={16}
      />
    </button>
  );
};

// ── Create Project Modal ──────────────────────────────────────────────────────

const CreateProjectModal = ({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) => {
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
        basemap: "opentopomap",
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
    <div className="overlay animate-fade-in fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="bg-elevated border-border-primary animate-scale-in flex w-full max-w-[480px] flex-col gap-4 rounded-2xl border p-6 shadow-2xl">
        <h2 className="text-text-primary text-xl font-bold">
          Create a Project
        </h2>
        <p className="text-text-secondary -mt-2 text-sm">
          Start a new project to organize your data.
        </p>

        {error ? (
          <div className="bg-error-subtle text-error border-error/20 rounded-md border p-3 text-sm">
            {error}
          </div>
        ) : null}

        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit}
        >
          <div className="form-field">
            <label className="form-label">Project Title</label>
            <input
              required
              className="input"
              placeholder="e.g. Watershed Assessment 2026"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea
              className="input textarea"
              placeholder="What is this project about?"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button
              className="btn btn-secondary btn-md"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary btn-md"
              disabled={loading}
              type="submit"
            >
              {loading ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

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
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
    [user]
  );

  const discoverModules = modules.filter((m) => m.enabled);

  return (
    <div className="mx-auto max-w-7xl pb-12">
      {/* Hero Slideshow */}
      <HeroSlideshow
        userName={userName}
        onCreateProject={() => setIsModalOpen(true)}
      />

      {/* Stat Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
        <StatCard
          icon={<UserIcon size={22} />}
          label="User"
          value={1}
        />
      </div>

      {/* Create a Project + Recent Projects */}
      <div className="mb-10 grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Create a Project card */}
        <div className="from-primary/10 via-surface to-surface border-border-primary flex items-center justify-between gap-6 overflow-hidden rounded-2xl border bg-gradient-to-r p-7 xl:col-span-2">
          <div className="max-w-md">
            <h2 className="text-text-primary text-2xl font-extrabold">
              Create a Project
            </h2>
            <p className="text-text-secondary mt-2 text-sm leading-relaxed">
              To get started you can start by creating a new one or browse
              existing projects
            </p>
            <div className="mt-5 flex gap-3">
              <Button
                variant="secondary"
                onClick={() => window.location.assign("/projects")}
              >
                Browse Project
              </Button>
              <Button
                variant="primary"
                onClick={() => setIsModalOpen(true)}
              >
                Create Project
              </Button>
            </div>
          </div>
          <CreateProjectIllustration />
        </div>

        {/* Recent Projects */}
        <RecentProjectsPanel
          loading={projectsLoading}
          projects={projects}
        />
      </div>

      {/* Discover more */}
      <section>
        <div className="mb-1 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-text-primary text-2xl font-extrabold">
              Discover more
            </h2>
            <p className="text-text-secondary mt-1 text-sm">
              Choose an action to get started with your project
            </p>
          </div>
          <button
            className="text-primary hover:text-primary/80 flex shrink-0 cursor-pointer items-center gap-0.5 border-none bg-transparent p-0 text-sm font-semibold"
            onClick={() => window.location.assign("/dashboard")}
          >
            View all Modules <ChevronRight size={16} />
          </button>
        </div>

        {discoverModules.length === 0 ? (
          <div className="text-text-tertiary border-border-primary mt-4 rounded-xl border-[1.5px] border-dashed px-8 py-10 text-center">
            <p className="text-sm">No modules are currently installed.</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {discoverModules.map((m) => (
              <DiscoverCard
                key={m.name}
                mod={m}
              />
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
