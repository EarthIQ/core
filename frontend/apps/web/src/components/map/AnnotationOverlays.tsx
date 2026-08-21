import { useEffect, useMemo, useRef } from "react";
import { useMapEditor } from "@/lib/mapEditor/store";
import type { PointAnnotation } from "@/lib/mapEditor/types";
import { POINT_KINDS } from "@/lib/mapEditor/types";
import { StickyNote, Image as ImageIcon, Link2, Play } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────── */
/*  Per-kind content                                                         */
/* ──────────────────────────────────────────────────────────────────────── */
function PointContent({ ann }: { ann: PointAnnotation }) {
  const color = ann.color || "#50aad1";

  switch (ann.kind) {
    case "marker":
      return (
        <div
          className="w-6 h-6 rounded-full border-[3px] border-white shadow-md"
          style={{ background: color }}
        />
      );
    case "text":
      return (
        <div
          className="max-w-[200px] px-2.5 py-1 rounded-lg text-[13px] font-medium shadow-md border"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-primary)",
            color: "var(--text-primary)",
          }}
        >
          {ann.text || "Text"}
        </div>
      );
    case "note":
      return (
        <div
          className="w-12 h-12 rounded-md shadow-md border border-black/5 flex items-center justify-center"
          style={{ background: color }}
          title={ann.text || "Note"}
        >
          <StickyNote size={20} className="text-white/90" />
        </div>
      );
    case "image":
      return (
        <div
          className="w-12 h-12 rounded-lg overflow-hidden shadow-md border border-white"
          style={{ background: "#000" }}
        >
          {ann.url ? (
            <img src={ann.url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-hover">
              <ImageIcon size={20} className="text-text-tertiary" />
            </div>
          )}
        </div>
      );
    case "link":
      return (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium shadow-md border"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-primary)",
            color,
          }}
        >
          <Link2 size={14} />
          <span className="max-w-[160px] truncate">
            {ann.url ? safeHost(ann.url) : "Link"}
          </span>
        </div>
      );
    case "video":
      return (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium shadow-md text-white"
          style={{ background: color }}
        >
          <Play size={14} fill="currentColor" />
          <span className="max-w-[140px] truncate">
            {ann.url ? safeHost(ann.url) : "Video"}
          </span>
        </div>
      );
    default:
      return null;
  }
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 24);
  }
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Overlay layer                                                            */
/* ──────────────────────────────────────────────────────────────────────── */
export function AnnotationOverlays({
  mapRef,
  mapReady,
}: {
  mapRef: React.RefObject<any>;
  mapReady: boolean;
}) {
  const annotations = useMapEditor((s) => s.annotations);
  const selectionId = useMapEditor((s) => s.selectionId);
  const setSelectionId = useMapEditor((s) => s.setSelectionId);
  const setActiveTool = useMapEditor((s) => s.setActiveTool);

  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const pointAnnotations = useMemo(
    () =>
      annotations.filter((a) =>
        (POINT_KINDS as string[]).includes(a.kind),
      ) as PointAnnotation[],
    [annotations],
  );

  /* Position every point overlay imperatively on map movement. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const position = () => {
      for (const ann of pointAnnotations) {
        const el = nodeRefs.current[ann.id];
        if (!el) continue;
        try {
          const pt = map.project(ann.lngLat);
          el.style.transform = `translate(-50%, -100%) translate(${pt.x}px, ${pt.y}px)`;
          el.style.display = "";
        } catch {
          el.style.display = "none";
        }
      }
    };

    position();
    map.on("move", position);
    map.on("resize", position);
    return () => {
      map.off("move", position);
      map.off("resize", position);
    };
  }, [pointAnnotations, mapRef, mapReady]);

  function onNodeClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    e.preventDefault();
    setSelectionId(id);
    // Switch to the select tool so the inspector stays interactive.
    setActiveTool({ groupId: "navigate", variantId: "select" });
  }

  if (!mapReady) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {pointAnnotations.map((ann) => {
        const selected = ann.id === selectionId;
        return (
          <div
            key={ann.id}
            ref={(el) => {
              nodeRefs.current[ann.id] = el;
            }}
            className="absolute top-0 left-0 will-change-transform"
            style={{ transform: "translate(-50%, -100%)" }}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => onNodeClick(e, ann.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onNodeClick(e as any, ann.id);
                }
              }}
              className={`pointer-events-auto cursor-pointer transition-transform hover:scale-105 ${
                selected ? "scale-105" : ""
              }`}
              style={{
                outline: selected ? "2px solid var(--primary)" : "none",
                outlineOffset: 3,
                borderRadius: "9999px",
              }}
            >
              <PointContent ann={ann} />
            </div>
            {/* selection halo dot above marker */}
            {ann.kind === "marker" && (
              <div className="flex justify-center -mt-1 -translate-y-3">
                {selected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </div>
            )}
            {/* decorative pin stem for the marker */}
            {ann.kind === "marker" && (
              <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent border-t-[8px] border-t-white -mt-0.5 mx-auto opacity-90" />
            )}
          </div>
        );
      })}
    </div>
  );
}
