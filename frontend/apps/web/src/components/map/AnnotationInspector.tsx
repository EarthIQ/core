import { useMapEditor } from "@/lib/mapEditor/store";
import type {
  Annotation,
  PointAnnotation,
  ShapeAnnotation,
} from "@/lib/mapEditor/types";
import {
  Trash2,
  X,
  Circle,
  Square,
  Spline,
  Shapes,
  Pen,
  Highlighter,
  Type,
  StickyNote,
  Image as ImageIcon,
  Link2,
  Play,
} from "lucide-react";
import { POINT_KINDS } from "@/lib/mapEditor/types";

const KIND_META: Record<string, { label: string; icon: any }> = {
  marker: { label: "Marker", icon: Pen },
  text: { label: "Text", icon: Type },
  note: { label: "Note", icon: StickyNote },
  image: { label: "Image", icon: ImageIcon },
  link: { label: "Link", icon: Link2 },
  video: { label: "Video", icon: Play },
  circle: { label: "Circle", icon: Circle },
  rectangle: { label: "Rectangle", icon: Square },
  line: { label: "Line", icon: Spline },
  shape: { label: "Shape", icon: Shapes },
  highlight: { label: "Highlighter", icon: Highlighter },
};

const SWATCHES = [
  "#50aad1",
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#111827",
];

interface FieldProps {
  label: string;
  children: React.ReactNode;
}
function Field({ label, children }: FieldProps) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-text-tertiary mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

export function AnnotationInspector({
  mapRef,
  mapReady,
}: {
  mapRef: React.RefObject<any>;
  mapReady: boolean;
}) {
  const ann = useMapEditor((s) =>
    s.annotations.find((a) => a.id === s.selectionId),
  );
  const updateAnnotation = useMapEditor((s) => s.updateAnnotation);
  const removeAnnotation = useMapEditor((s) => s.removeAnnotation);
  const setSelectionId = useMapEditor((s) => s.setSelectionId);
  const setActiveTool = useMapEditor((s) => s.setActiveTool);

  if (!ann) return null;

  const meta = KIND_META[ann.kind] ?? { label: "Annotation", icon: Shapes };
  const Icon = meta.icon;
  const isPoint = (POINT_KINDS as string[]).includes(ann.kind);
  const point = ann as PointAnnotation;
  const shape = ann as ShapeAnnotation;

  function patch(p: Record<string, unknown>) {
    updateAnnotation(ann!.id, p as any);
  }

  function handleRemove() {
    removeAnnotation(ann!.id);
    setActiveTool({ groupId: "navigate", variantId: "select" });
  }

  return (
    <div className="w-[280px] max-h-full flex flex-col bg-elevated border border-border-primary rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
      {/* header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-primary">
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
          <Icon size={16} className="text-primary" />
        </span>
        <span className="text-sm font-semibold text-text-primary flex-1">
          {meta.label}
        </span>
        <button
          type="button"
          onClick={() => setSelectionId(null)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors"
          aria-label="Close inspector"
        >
          <X size={15} />
        </button>
      </div>

      {/* body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isPoint && (
          <div className="text-xs text-text-tertiary font-mono bg-surface-hover rounded-md px-2 py-1">
            {point.lngLat.map((n) => n.toFixed(5)).join(", ")}
          </div>
        )}

        {(ann.kind === "text" || ann.kind === "note") && (
          <Field label={ann.kind === "text" ? "Text" : "Note"}>
            <textarea
              className="w-full min-h-[64px] px-3 py-2 text-sm rounded-lg bg-input-bg border border-input-border text-text-primary resize-y focus:outline-none focus:border-input-focus-border"
              value={point.text ?? ""}
              placeholder={
                ann.kind === "text" ? "Type your text…" : "Add a note…"
              }
              onChange={(e) => patch({ text: e.target.value })}
            />
          </Field>
        )}

        {(ann.kind === "image" ||
          ann.kind === "link" ||
          ann.kind === "video") && (
          <Field
            label={
              ann.kind === "image"
                ? "Image URL"
                : ann.kind === "link"
                  ? "Link URL"
                  : "Video URL"
            }
          >
            <input
              className="w-full px-3 py-2 text-sm rounded-lg bg-input-bg border border-input-border text-text-primary focus:outline-none focus:border-input-focus-border"
              value={point.url ?? ""}
              placeholder="https://…"
              onChange={(e) => patch({ url: e.target.value })}
            />
          </Field>
        )}

        {/* shape-only fields */}
        {!isPoint && ann.kind === "circle" && (
          <Field label="Radius">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={10}
                max={100000}
                step={10}
                value={shape.radius ?? 100}
                onChange={(e) => patch({ radius: Number(e.target.value) })}
                className="flex-1 accent-[var(--primary)]"
              />
              <span className="text-xs text-text-tertiary w-16 text-right tabular-nums">
                {formatRadius(shape.radius ?? 100)}
              </span>
            </div>
          </Field>
        )}

        {!isPoint &&
          (ann.kind === "rectangle" ||
            ann.kind === "highlight" ||
            ann.kind === "shape") && (
            <Field label="Fill opacity">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={shape.opacity ?? 0.45}
                onChange={(e) => patch({ opacity: Number(e.target.value) })}
                className="w-full accent-[var(--primary)]"
              />
            </Field>
          )}

        {!isPoint && ann.kind === "line" && (
          <Field label="Line width">
            <input
              type="range"
              min={1}
              max={24}
              step={1}
              value={shape.lineWidth ?? 4}
              onChange={(e) => patch({ lineWidth: Number(e.target.value) })}
              className="w-full accent-[var(--primary)]"
            />
          </Field>
        )}

        {/* color */}
        <Field label="Color">
          <div className="flex items-center gap-2 flex-wrap">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => patch({ color: c })}
                className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                  ann.color === c ? "ring-2 ring-offset-2 ring-primary" : ""
                }`}
                style={{ background: c }}
                aria-label={`Set color ${c}`}
              />
            ))}
            <input
              type="color"
              value={toHex(ann.color)}
              onChange={(e) => patch({ color: e.target.value })}
              className="w-6 h-6 rounded-full cursor-pointer border border-border-primary bg-transparent"
              aria-label="Custom color"
            />
          </div>
        </Field>
      </div>

      {/* footer */}
      <div className="px-4 py-3 border-t border-border-primary">
        <button
          type="button"
          onClick={handleRemove}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-error hover:bg-error-subtle transition-colors"
        >
          <Trash2 size={15} />
          Delete annotation
        </button>
      </div>
    </div>
  );
}

function formatRadius(m: number) {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function toHex(c: string) {
  // Ensure color inputs get a valid hex value.
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
  return "#50aad1";
}
