/**
 * CollaboratorCursors
 *
 * SVG/DOM overlay rendered on top of the MapLibre canvas.
 * Shows each collaborator's cursor as a colored pin with their name.
 *
 * Positions are computed by projecting geographic lngLat coordinates
 * to pixel coordinates using map.project().
 */
import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type * as maplibregl from "maplibre-gl";
import type { CollaboratorState } from "@/lib/useCollaboration";

// Deterministic color from email string
const AVATAR_COLORS = [
  "#3b82f6", "#22d3a0", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

function hashColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function getInitials(fullName: string | null, email: string): string {
  const source = fullName || email;
  return source
    .split(/[\s.@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

interface CursorPixelPos {
  x: number;
  y: number;
  visible: boolean;
}

interface CollaboratorCursorsProps {
  collaborators: CollaboratorState[];
  mapRef: MutableRefObject<maplibregl.Map | null>;
}

export function CollaboratorCursors({
  collaborators,
  mapRef,
}: CollaboratorCursorsProps) {
  const [, forceUpdate] = useState(0);
  const frameRef = useRef<number>(0);

  // Re-render on map move so cursor pixels stay in sync
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const tick = () => {
      forceUpdate((n) => n + 1);
    };
    map.on("move", tick);
    map.on("zoom", tick);
    map.on("rotate", tick);
    return () => {
      map.off("move", tick);
      map.off("zoom", tick);
      map.off("rotate", tick);
      cancelAnimationFrame(frameRef.current);
    };
  }, [mapRef]);

  const map = mapRef.current;
  if (!map) return null;

  const bounds = map.getBounds();

  const projected: Array<CollaboratorState & { px: CursorPixelPos }> =
    collaborators
      .filter((c) => c.cursor !== null)
      .map((c) => {
        const lngLat = c.cursor!;
        const px = map.project([lngLat.lng, lngLat.lat]);
        // Check whether cursor is inside the current viewport
        const inView =
          bounds.contains([lngLat.lng, lngLat.lat]) &&
          px.x >= 0 &&
          px.y >= 0;
        return {
          ...c,
          px: { x: px.x, y: px.y, visible: inView },
        };
      });

  return (
    <div
      className="absolute inset-0 pointer-events-none z-10"
      aria-hidden="true"
    >
      {projected.map(({ user_id, email, full_name, px }) => {
        if (!px.visible) return null;
        const color = hashColor(email);
        const initials = getInitials(full_name, email);
        const label = full_name || email;

        return (
          <div
            key={user_id}
            className="absolute transition-[left,top] duration-75 ease-linear"
            style={{ left: px.x, top: px.y }}
          >
            {/* Cursor arrow */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
            >
              <path
                d="M3 2L17 10L10 12L7 18L3 2Z"
                fill={color}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>

            {/* Name tag */}
            <div
              className="absolute left-4 top-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-white text-[11px] font-semibold whitespace-nowrap shadow-lg"
              style={{ background: color }}
            >
              <span
                className="w-4 h-4 rounded-full bg-white/20 text-white text-[9px] font-bold flex items-center justify-center shrink-0"
              >
                {initials || "?"}
              </span>
              <span>{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
