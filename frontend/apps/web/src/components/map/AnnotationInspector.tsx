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

import { useMapEditor } from "@/lib/mapEditor/store";
import {
  POINT_KINDS,
  type _Annotation,
  type PointAnnotation,
  type ShapeAnnotation,
} from "@/lib/mapEditor/types";

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
const Field = ({ label, children }: FieldProps) => {
  return (
    <label className="block">
      <span className="text-text-tertiary mb-1.5 block text-[11px] font-semibold tracking-wide uppercase">
        {label}
      </span>
      {children}
    </label>
  );
};

export const AnnotationInspector = ({
  _mapRef,
  _mapReady,
}: {
  mapRef: React.RefObject<any>;
  mapReady: boolean;
}) => {
  const ann = useMapEditor((s) =>
    s.annotations.find((a) => a.id === s.selectionId)
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
    updateAnnotation(ann.id, p);
  }

  function handleRemove() {
    removeAnnotation(ann.id);
    setActiveTool({ groupId: "navigate", variantId: "select" });
  }

  return (
    <div className="bg-elevated border-border-primary animate-fade-in-up flex max-h-full w-[280px] flex-col overflow-hidden rounded-2xl border shadow-xl">
      {/* header */}
      <div className="border-border-primary flex items-center gap-2.5 border-b px-4 py-3">
        <span className="bg-primary/10 flex h-7 w-7 items-center justify-center rounded-lg">
          <Icon
            className="text-primary"
            size={16}
          />
        </span>
        <span className="text-text-primary flex-1 text-sm font-semibold">
          {meta.label}
        </span>
        <button
          aria-label="Close inspector"
          className="text-text-tertiary hover:bg-surface-hover hover:text-text-primary flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          type="button"
          onClick={() => setSelectionId(null)}
        >
          <X size={15} />
        </button>
      </div>

      {/* body */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {isPoint ? (
          <div className="text-text-tertiary bg-surface-hover rounded-md px-2 py-1 font-mono text-xs">
            {point.lngLat.map((n) => n.toFixed(5)).join(", ")}
          </div>
        ) : null}

        {(ann.kind === "text" || ann.kind === "note") && (
          <Field label={ann.kind === "text" ? "Text" : "Note"}>
            <textarea
              className="bg-input-bg border-input-border text-text-primary focus:border-input-focus-border min-h-[64px] w-full resize-y rounded-lg border px-3 py-2 text-sm focus:outline-none"
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
              className="bg-input-bg border-input-border text-text-primary focus:border-input-focus-border w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
              placeholder="https://…"
              value={point.url ?? ""}
              onChange={(e) => patch({ url: e.target.value })}
            />
          </Field>
        )}

        {/* shape-only fields */}
        {!isPoint && ann.kind === "circle" && (
          <Field label="Radius">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 accent-[var(--primary)]"
                max={100000}
                min={10}
                step={10}
                type="range"
                value={shape.radius ?? 100}
                onChange={(e) => patch({ radius: Number(e.target.value) })}
              />
              <span className="text-text-tertiary w-16 text-right text-xs tabular-nums">
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
                className="w-full accent-[var(--primary)]"
                max={1}
                min={0}
                step={0.05}
                type="range"
                value={shape.opacity ?? 0.45}
                onChange={(e) => patch({ opacity: Number(e.target.value) })}
              />
            </Field>
          )}

        {!isPoint && ann.kind === "line" && (
          <Field label="Line width">
            <input
              className="w-full accent-[var(--primary)]"
              max={24}
              min={1}
              step={1}
              type="range"
              value={shape.lineWidth ?? 4}
              onChange={(e) => patch({ lineWidth: Number(e.target.value) })}
            />
          </Field>
        )}

        {/* color */}
        <Field label="Color">
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                aria-label={`Set color ${c}`}
                style={{ background: c }}
                type="button"
                className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                  ann.color === c ? "ring-primary ring-2 ring-offset-2" : ""
                }`}
                onClick={() => patch({ color: c })}
              />
            ))}
            <input
              aria-label="Custom color"
              className="border-border-primary h-6 w-6 cursor-pointer rounded-full border bg-transparent"
              type="color"
              value={toHex(ann.color)}
              onChange={(e) => patch({ color: e.target.value })}
            />
          </div>
        </Field>
      </div>

      {/* footer */}
      <div className="border-border-primary border-t px-4 py-3">
        <button
          className="text-error hover:bg-error-subtle flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          type="button"
          onClick={handleRemove}
        >
          <Trash2 size={15} />
          Delete annotation
        </button>
      </div>
    </div>
  );
};

function formatRadius(m: number) {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function toHex(c: string) {
  // Ensure color inputs get a valid hex value.
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
  return "#50aad1";
}
