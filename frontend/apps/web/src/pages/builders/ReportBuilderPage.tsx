import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, FileText, List, Map } from "lucide-react";
import { Button } from "@packages/ui";
import { BuilderScaffold } from "@/components/builder/BuilderScaffold";
import {
  BuilderWorkspace,
  SidebarHeader,
  SidebarItem,
} from "@/components/builder/BuilderWorkspace";
import { getProjectBuilder, type BuilderIcon } from "@/lib/builders";

interface ReportSection {
  id: string;
  title: string;
  icon: BuilderIcon;
}

const DEFAULT_SECTIONS: ReportSection[] = [
  { id: "cover", title: "Cover page", icon: FileText },
  { id: "overview-map", title: "Overview map", icon: Map },
  { id: "data-tables", title: "Data tables", icon: List },
  { id: "summary", title: "Summary & export", icon: Download },
];

/**
 * Report builder — assemble project maps and data into a PDF-ready report.
 *
 * Initial structure: a section list on the left and a document preview on the
 * right. The "Export to PDF" action is wired up but disabled until the report
 * engine is implemented.
 */
export default function ReportBuilderPage() {
  const [params] = useSearchParams();
  const projectId = params.get("projectId") ?? "";
  const builder = getProjectBuilder("report");

  const [sections, setSections] =
    useState<ReportSection[]>(DEFAULT_SECTIONS);
  const [activeId, setActiveId] = useState(DEFAULT_SECTIONS[0]?.id ?? "");

  if (!builder) return null;

  const activeSection =
    sections.find((s) => s.id === activeId) ?? sections[0];
  const ActiveSectionIcon = activeSection?.icon ?? FileText;

  function addSection() {
    const id = `section-${Date.now()}`;
    setSections((prev) => [
      ...prev,
      { id, title: `Section ${prev.length + 1}`, icon: FileText },
    ]);
    setActiveId(id);
  }

  return (
    <BuilderScaffold builder={builder} projectId={projectId}>
      <BuilderWorkspace
        sidebar={
          <>
            <SidebarHeader
              icon={FileText}
              title="Sections"
              addLabel="Add"
              onAdd={addSection}
            />
            <div className="flex flex-col gap-0.5">
              {sections.map((section) => (
                <SidebarItem
                  key={section.id}
                  icon={section.icon}
                  title={section.title}
                  subtitle="Report section"
                  active={section.id === activeId}
                  onClick={() => setActiveId(section.id)}
                />
              ))}
            </div>
          </>
        }
        main={
          <div className="flex flex-col gap-4">
            {/* Document preview */}
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-8 py-10 shadow-[var(--shadow-md)]">
              <div className="mx-auto max-w-2xl">
                <div className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                  EarthIQ report
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ActiveSectionIcon size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      {activeSection?.title ?? "Report"}
                    </h3>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Report content will be rendered here from your project
                      maps and data.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Export bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-4 py-3">
              <div className="text-sm text-[var(--text-secondary)]">
                Compiled report ·{" "}
                <span className="text-[var(--text-tertiary)]">
                  {sections.length} sections
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  disabled
                  leftIcon={<Download size={14} />}
                >
                  Export to PDF
                </Button>
                <span className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide text-[var(--text-tertiary)]">
                  soon
                </span>
              </div>
            </div>
          </div>
        }
      />
    </BuilderScaffold>
  );
}