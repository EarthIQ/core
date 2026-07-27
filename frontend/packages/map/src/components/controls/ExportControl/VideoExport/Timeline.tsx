// src/components/video-export/Timeline.tsx

import React, {
  useCallback,
  useRef,
  useState,
  useMemo,
  useEffect,
} from "react";
import type { Keyframe, TimelineState } from "../../types/video-export";
import { Diamond, Trash2, Copy, MapPin } from "lucide-react";

interface TimelineProps {
  keyframes: Keyframe[];
  timeline: TimelineState;
  selectedKeyframeId: string | null;
  getKeyframeTime: (index: number) => number;
  onSeek: (time: number) => void;
  onKeyframeSelect: (id: string | null) => void;
  onKeyframeRemove: (id: string) => void;
  onKeyframeDuplicate: (id: string) => void;
  onKeyframeUpdateFromMap: (id: string) => void;
  onKeyframeUpdate: (id: string, updates: Partial<Keyframe>) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}:${secs.toFixed(1).padStart(4, "0")}`;
  return `${secs.toFixed(1)}s`;
}

export function Timeline({
  keyframes,
  timeline,
  selectedKeyframeId,
  getKeyframeTime,
  onSeek,
  onKeyframeSelect,
  onKeyframeRemove,
  onKeyframeDuplicate,
  onKeyframeUpdateFromMap,
  onKeyframeUpdate,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hoveredKeyframeId, setHoveredKeyframeId] = useState<string | null>(
    null
  );
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);

  // Dragging state
  const [draggingKeyframe, setDraggingKeyframe] = useState<{
    index: number;
    startX: number;
    initialDuration: number;
    initialTotalDuration: number;
  } | null>(null);

  const { totalDuration, currentTime } = timeline;

  // Adaptive time markers
  const timeMarkers = useMemo(() => {
    const markers: { time: number; label: string; major: boolean }[] = [];
    if (totalDuration <= 0) return markers;

    let step = 1;
    if (totalDuration > 30) step = 5;
    if (totalDuration > 120) step = 10;
    if (totalDuration > 300) step = 30;
    if (totalDuration > 600) step = 60;
    if (totalDuration <= 5) step = 0.5;
    if (totalDuration <= 2) step = 0.25;

    for (let t = 0; t <= totalDuration; t += step) {
      markers.push({
        time: t,
        label: formatTime(t),
        major: t % (step * 2) === 0 || step >= 5,
      });
    }
    return markers;
  }, [totalDuration]);

  const getTimeFromPosition = useCallback(
    (clientX: number): number => {
      if (!trackRef.current || totalDuration <= 0) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      );
      return ratio * totalDuration;
    },
    [totalDuration]
  );

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      const time = getTimeFromPosition(e.clientX);
      onSeek(time);
      onKeyframeSelect(null);
    },
    [getTimeFromPosition, onSeek, onKeyframeSelect]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      setContextMenu({ id, x: e.clientX, y: e.clientY });
      onKeyframeSelect(id);
    },
    [onKeyframeSelect]
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // Handle Dragging
  useEffect(() => {
    if (!draggingKeyframe) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      // Calculate how many seconds we dragged
      const deltaX = e.clientX - draggingKeyframe.startX;

      // Calculate how many pixels represent 1 second.
      // E.g., rect.width represents totalDuration initially.
      // But we can also compute the absolute time cursor is hovering on.
      // It's safer to use ratio over the track width for delta time.
      const pixelsPerSecond =
        draggingKeyframe.initialTotalDuration > 0
          ? rect.width / draggingKeyframe.initialTotalDuration
          : 100;
      const deltaTime = deltaX / pixelsPerSecond;

      let newDuration = draggingKeyframe.initialDuration + deltaTime;
      newDuration = Math.max(0.1, newDuration); // Ensure minimum duration of 0.1s

      const prevKeyframe = keyframes[draggingKeyframe.index - 1];
      if (prevKeyframe) {
        onKeyframeUpdate(prevKeyframe.id, {
          duration: Number(newDuration.toFixed(1)),
        });
      }
    };

    const handleMouseUp = () => {
      setDraggingKeyframe(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingKeyframe, trackRef, keyframes, totalDuration, onKeyframeUpdate]);

  const currentPct =
    totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div
      className="relative select-none"
      onClick={closeContextMenu}
    >
      {/* Time markers */}
      <div className="relative mb-1 h-5">
        {timeMarkers.map(({ time, label, major }) => (
          <div
            key={time}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${(time / totalDuration) * 100}%` }}
          >
            <span
              className={`font-mono text-[9px] leading-none ${
                major
                  ? "text-[var(--text-secondary)]"
                  : "text-[var(--text-tertiary)]"
              }`}
            >
              {label}
            </span>
            <div
              className={`mt-0.5 w-px ${
                major
                  ? "h-2 bg-[var(--border-hover)]"
                  : "h-1 bg-[var(--border-primary)]"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-5 cursor-pointer rounded-md"
        style={{ backgroundColor: "var(--bg-tertiary)" }}
        onClick={handleTrackClick}
      >
        {/* Segment highlights */}
        {keyframes.length >= 2 &&
          keyframes.slice(0, -1).map((kf, idx) => {
            const startT = getKeyframeTime(idx);
            const endT = getKeyframeTime(idx + 1);
            if (totalDuration <= 0) return null;
            return (
              <div
                key={`segment-${kf.id}`}
                className="absolute top-0 h-full rounded-sm opacity-20"
                style={{
                  left: `${(startT / totalDuration) * 100}%`,
                  width: `${((endT - startT) / totalDuration) * 100}%`,
                  background:
                    "linear-gradient(90deg, var(--primary), var(--secondary))",
                }}
              />
            );
          })}

        {/* Keyframe diamonds */}
        {keyframes.map((kf, index) => {
          const kfTime = getKeyframeTime(index);
          const leftPct =
            totalDuration > 0 ? (kfTime / totalDuration) * 100 : 0;

          return (
            <div
              key={kf.id}
              className={`group absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize transition-transform duration-100 ${selectedKeyframeId === kf.id ? "scale-110" : ""} `}
              style={{ left: `${leftPct}%` }}
              onPointerDown={(e) => {
                if (index === 0) return; // Cannot drag the first keyframe (locked at 0s)
                e.stopPropagation();
                onKeyframeSelect(kf.id);
                onSeek(kfTime);
                setDraggingKeyframe({
                  index,
                  startX: e.clientX,
                  initialDuration: keyframes[index - 1].duration,
                  initialTotalDuration: totalDuration,
                });
              }}
              onContextMenu={(e) => handleContextMenu(e, kf.id)}
              onMouseEnter={() => setHoveredKeyframeId(kf.id)}
              onMouseLeave={() => setHoveredKeyframeId(null)}
            >
              <Diamond
                size={18}
                className={`transition-colors ${
                  selectedKeyframeId === kf.id
                    ? "fill-[var(--primary)] text-[var(--primary)]"
                    : "fill-[var(--accent)] text-[var(--accent)] group-hover:fill-[var(--primary)] group-hover:text-[var(--primary)]"
                }`}
              />
              <span
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 font-mono text-[8px] font-bold"
                style={{ color: "var(--text-tertiary)" }}
              >
                {index + 1}
              </span>

              {/* Hover tooltip */}
              {hoveredKeyframeId === kf.id && (
                <div
                  className="pointer-events-none absolute -top-14 left-1/2 z-30 -translate-x-1/2 rounded-md px-2 py-1 font-mono text-[10px] whitespace-nowrap"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border-primary)",
                    boxShadow: "var(--shadow-md)",
                    color: "var(--text-primary)",
                  }}
                >
                  <div className="font-semibold">
                    {kf.label || `Keyframe ${index + 1}`}
                  </div>
                  <div style={{ color: "var(--text-secondary)" }}>
                    {formatTime(kfTime)} • z{kf.zoom.toFixed(1)} • p
                    {kf.pitch.toFixed(0)}° • b{kf.bearing.toFixed(0)}°
                  </div>
                  {index < keyframes.length - 1 && (
                    <div style={{ color: "var(--text-tertiary)" }}>
                      → {kf.duration}s to next
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Playhead */}
        <div
          className="pointer-events-none absolute top-0 z-20 h-full w-0.5"
          style={{ left: `${currentPct}%`, backgroundColor: "var(--error)" }}
        >
          <div
            className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full"
            style={{
              backgroundColor: "var(--error)",
              boxShadow: "var(--shadow-sm)",
            }}
          />
          <div
            className="absolute -top-6 left-1/2 -translate-x-1/2 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold whitespace-nowrap"
            style={{
              backgroundColor: "var(--error)",
              color: "var(--text-inverse)",
            }}
          >
            {formatTime(currentTime)}
          </div>
        </div>
      </div>

      {/* Easing labels between keyframes */}
      <div className="relative mt-0.5 h-3">
        {keyframes.slice(0, -1).map((kf, idx) => {
          const startT = getKeyframeTime(idx);
          const endT = getKeyframeTime(idx + 1);
          if (totalDuration <= 0) return null;
          return (
            <div
              key={`easing-${kf.id}`}
              className="absolute top-0 flex h-full items-center justify-center"
              style={{
                left: `${(startT / totalDuration) * 100}%`,
                width: `${((endT - startT) / totalDuration) * 100}%`,
              }}
            >
              <span
                className="font-mono text-[7px] tracking-wider uppercase"
                style={{ color: "var(--text-tertiary)" }}
              >
                {kf.easing} • {kf.duration}s
              </span>
            </div>
          );
        })}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={closeContextMenu}
          />
          <div
            className="fixed z-50 min-w-[160px] overflow-hidden rounded-lg py-1"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-primary)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <ContextMenuItem
              icon={<MapPin size={14} />}
              label="Update from map"
              onClick={() => {
                onKeyframeUpdateFromMap(contextMenu.id);
                closeContextMenu();
              }}
            />
            <ContextMenuItem
              icon={<Copy size={14} />}
              label="Duplicate"
              onClick={() => {
                onKeyframeDuplicate(contextMenu.id);
                closeContextMenu();
              }}
            />
            <div
              className="my-1"
              style={{ borderTop: "1px solid var(--divider)" }}
            />
            <ContextMenuItem
              icon={<Trash2 size={14} />}
              label="Delete"
              danger
              onClick={() => {
                onKeyframeRemove(contextMenu.id);
                closeContextMenu();
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ContextMenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors"
      style={{ color: danger ? "var(--error)" : "var(--text-primary)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          "var(--surface-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
      }}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
