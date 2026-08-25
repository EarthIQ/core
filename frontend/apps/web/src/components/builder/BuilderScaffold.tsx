import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, MapPin, Sparkles } from "lucide-react";
import { cn } from "@packages/ui";
import { Button } from "@packages/ui";
import { BuilderPicker } from "./BuilderPicker";
import { fetchProjectById } from "@/lib/projects";
import {
  buildBuilderUrl,
  type ProjectBuilder,
} from "@/lib/builders";

interface BuilderScaffoldProps {
  /** The builder definition this page belongs to (from `lib/builders.tsx`). */
  builder: ProjectBuilder;
  /** Project id from `?projectId=`. */
  projectId: string;
  /**
   * Optional page body. When omitted, a preview placeholder is rendered so the
   * structure is fully navigable before the editor is implemented.
   */
  children?: ReactNode;
}

/**
 * Shared chrome for every builder page:
 *  - project context header (back to the project map, project title)
 *  - the general BuilderPicker, so users can hop between builders
 *  - a placeholder body until each builder’s editor ships
 *
 * Pages build on this scaffold — swap `children` for the real editor when the
 * builder is implemented. This component never knows a builder name directly;
 * it receives its definition via props.
 */
export function BuilderScaffold({
  builder,
  projectId,
  children,
}: BuilderScaffoldProps) {
  const navigate = useNavigate();
  const Icon = builder.icon;
  const [projectTitle, setProjectTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    fetchProjectById(projectId)
      .then((p) => {
        if (active) setProjectTitle(p.title);
      })
      .catch(() => {
        /* project may be unreachable — title stays generic */
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  /** No project selected — ask the user to open a project first. */
  if (!projectId) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MapPin size={24} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
          No project selected
        </h2>
        <p className="mt-1.5 text-sm text-[var(--text-tertiary)]">
          Open a project to start building with its maps and data.
        </p>
        <Button className="mt-5" onClick={() => navigate("/projects")}>
          Browse projects
        </Button>
      </div>
    );
  }

  const mapUrl = buildBuilderUrl("map", projectId);

  const pickerTrigger = (
    <button
      type="button"
      className="flex items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
      aria-label="Switch builder"
    >
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-md",
          builder.iconClassName ?? "text-primary bg-primary/10",
        )}
      >
        <Icon size={14} />
      </span>
      <span className="hidden sm:inline">{builder.label}</span>
      <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
    </button>
  );
  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* ── Project + builder header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={() => navigate("/projects")}
            aria-label="Back to projects"
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={18} />
          </Button>
          <span className="h-5 w-px bg-[var(--border-primary)]" />

          <div className="flex flex-col leading-tight">
            <span className="text-[0.7rem] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
              {projectTitle || "Project builder"}
            </span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {builder.label}
            </span>
          </div>
        </div>

        <BuilderPicker
          projectId={projectId}
          hostId={builder.id}
          trigger={pickerTrigger}
        />
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      {children ?? (
        <div className="mt-8">
          <div className="card-elevated overflow-hidden">
            <div className="border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] px-6 py-10 text-center">
              <div
                className={cn(
                  "mx-auto flex h-16 w-16 items-center justify-center rounded-2xl",
                  builder.iconClassName ?? "text-primary bg-primary/10",
                )}
              >
                <Icon size={28} />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">
                {builder.label}
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-tertiary)]">
                {builder.description}
              </p>
            </div>

            <div className="px-6 py-8">
              <div className="mx-auto max-w-md text-center">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles size={13} />
                  Preview
                </div>
                <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                  The <strong>{builder.label}</strong> editor for this project
                  is being developed. The page structure, routing and project
                  scoping are wired up and ready — the builder surface will live
                  here.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Button onClick={() => navigate(mapUrl)}>
                    Open Map builder
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/projects")}
                  >
                    All projects
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}