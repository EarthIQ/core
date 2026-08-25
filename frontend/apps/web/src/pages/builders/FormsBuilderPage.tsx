import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Calendar,
  CheckSquare,
  ClipboardList,
  Hash,
  List,
  MapPin,
  Type,
} from "lucide-react";
import { Button } from "@packages/ui";
import { BuilderScaffold } from "@/components/builder/BuilderScaffold";
import {
  BuilderWorkspace,
  EditorPlaceholder,
  SidebarHeader,
  SidebarItem,
} from "@/components/builder/BuilderWorkspace";
import { getProjectBuilder } from "@/lib/builders";

interface ProjectForm {
  id: string;
  title: string;
}

/** Field types a project form can contain (shown as coming-soon chips). */
const FIELD_TYPES = [
  { label: "Short text", icon: Type },
  { label: "Number", icon: Hash },
  { label: "Dropdown", icon: List },
  { label: "Checkbox", icon: CheckSquare },
  { label: "Date", icon: Calendar },
  { label: "Map marker", icon: MapPin },
];

/**
 * Forms builder — design dynamic forms that collect data on this project.
 *
 * Initial structure: a form list on the left and a field-type palette + form
 * canvas on the right. Field types are shown as selectable chips; the real
 * form builder will live on the canvas. Responses will be stored against the
 * project once the engine is implemented.
 */
export default function FormsBuilderPage() {
  const [params] = useSearchParams();
  const projectId = params.get("projectId") ?? "";
  const builder = getProjectBuilder("forms");

  const [forms, setForms] = useState<ProjectForm[]>([
    { id: "form-1", title: "Field survey" },
  ]);
  const [activeId, setActiveId] = useState("form-1");

  if (!builder) return null;

  const activeForm = forms.find((f) => f.id === activeId) ?? forms[0];

  function addForm() {
    const id = `form-${Date.now()}`;
    setForms((prev) => [...prev, { id, title: `Form ${prev.length + 1}` }]);
    setActiveId(id);
  }

  return (
    <BuilderScaffold builder={builder} projectId={projectId}>
      <BuilderWorkspace
        sidebar={
          <>
            <SidebarHeader
              icon={ClipboardList}
              title="Forms"
              addLabel="New"
              onAdd={addForm}
            />
            <div className="flex flex-col gap-0.5">
              {forms.map((form) => (
                <SidebarItem
                  key={form.id}
                  icon={ClipboardList}
                  title={form.title}
                  subtitle="0 fields · draft"
                  active={form.id === activeId}
                  onClick={() => setActiveId(form.id)}
                />
              ))}
            </div>
          </>
        }
        main={
          <div className="flex flex-col gap-4">
            {/* Field type palette */}
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-3">
              <div className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Field types
              </div>
              <div className="flex flex-wrap gap-2">
                {FIELD_TYPES.map((field) => {
                  const FieldIcon = field.icon;
                  return (
                    <button
                      key={field.label}
                      type="button"
                      disabled
                      className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-dashed border-[var(--border-primary)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-tertiary)] opacity-70"
                    >
                      <FieldIcon size={13} />
                      {field.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form canvas */}
            <EditorPlaceholder
              icon={ClipboardList}
              title={activeForm?.title ?? "New form"}
              description="Design your form right here: choose a field type from the palette, add questions, and responses will be stored on this project."
              actions={
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <Button size="sm" disabled>
                    Responses (0)
                  </Button>
                  <Button size="sm" variant="ghost" onClick={addForm}>
                    New form
                  </Button>
                </div>
              }
            />
          </div>
        }
      />
    </BuilderScaffold>
  );
}