import { MapPin, Compass, ZoomIn, Mountain, Timer } from "lucide-react";
import React from "react";

import type { Keyframe, EasingType } from "../../types/video-export";

interface KeyframePropertiesProps {
  keyframe: Keyframe;
  keyframeIndex: number;
  keyframeTime: number;
  isLast: boolean;
  onUpdate: (id: string, updates: Partial<Keyframe>) => void;
  onUpdateFromMap: (id: string) => void;
}

const easingOptions: { value: EasingType; label: string }[] = [
  { value: "linear", label: "Lin" },
  { value: "ease-in", label: "In" },
  { value: "ease-out", label: "Out" },
  { value: "ease-in-out", label: "InOut" },
];

export const KeyframeProperties = ({
  keyframe,
  keyframeIndex,
  keyframeTime,
  isLast,
  onUpdate,
  onUpdateFromMap,
}: KeyframePropertiesProps) => {
  return (
    <div
      className="space-y-2 rounded-lg p-2"
      style={{
        backgroundColor: "var(--bg-tertiary)",
        border: "1px solid var(--border-secondary)",
      }}
    >
      {/* Header row: index, time, label, sync button */}
      <div className="flex items-center gap-2">
        <span
          className="bg-opacity-20 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--text-on-primary)",
          }}
        >
          {keyframeIndex + 1}
        </span>
        <span
          className="shrink-0 font-mono text-[10px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {keyframeTime.toFixed(1)}s
        </span>
        <input
          className="input min-w-0 flex-1 !px-2 !py-0.5 !text-[11px]"
          placeholder="Label..."
          type="text"
          value={keyframe.label || ""}
          onChange={(e) => onUpdate(keyframe.id, { label: e.target.value })}
        />
        <button
          className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors"
          title="Sync from current map view"
          style={{
            backgroundColor: "var(--info-bg)",
            color: "var(--info-text)",
          }}
          onClick={() => onUpdateFromMap(keyframe.id)}
        >
          <MapPin
            className="inline"
            size={9}
          />{" "}
          Sync
        </button>
      </div>

      {/* Compact properties row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <CompactInput
          icon={<ZoomIn size={9} />}
          label="Z"
          max={22}
          min={0}
          step={0.1}
          value={keyframe.zoom}
          width="w-14"
          onChange={(v) => onUpdate(keyframe.id, { zoom: v })}
        />
        <CompactInput
          icon={<Mountain size={9} />}
          label="P"
          max={85}
          min={0}
          step={1}
          suffix="°"
          value={keyframe.pitch}
          width="w-12"
          onChange={(v) => onUpdate(keyframe.id, { pitch: v })}
        />
        <CompactInput
          icon={<Compass size={9} />}
          label="B"
          max={180}
          min={-180}
          step={1}
          suffix="°"
          value={keyframe.bearing}
          width="w-14"
          onChange={(v) => onUpdate(keyframe.id, { bearing: v })}
        />
        <div className="flex items-center gap-1">
          <MapPin
            size={9}
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            className="input !w-20 !px-1.5 !py-0.5 font-mono !text-[10px]"
            step={0.001}
            title="Longitude"
            type="number"
            value={Number(keyframe.center[0].toFixed(4))}
            onChange={(e) =>
              onUpdate(keyframe.id, {
                center: [parseFloat(e.target.value) || 0, keyframe.center[1]],
              })
            }
          />
          <span
            className="text-[9px]"
            style={{ color: "var(--text-quaternary)" }}
          >
            ,
          </span>
          <input
            className="input !w-20 !px-1.5 !py-0.5 font-mono !text-[10px]"
            step={0.001}
            title="Latitude"
            type="number"
            value={Number(keyframe.center[1].toFixed(4))}
            onChange={(e) =>
              onUpdate(keyframe.id, {
                center: [keyframe.center[0], parseFloat(e.target.value) || 0],
              })
            }
          />
        </div>
      </div>

      {/* Duration + Easing row (only if not last) */}
      {!isLast && (
        <div className="flex items-center gap-2">
          <Timer
            size={9}
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            className="input !w-12 !px-1.5 !py-0.5 font-mono !text-[10px]"
            min={0.5}
            step={0.5}
            type="number"
            value={keyframe.duration}
            onChange={(e) =>
              onUpdate(keyframe.id, {
                duration: Math.max(0.5, parseFloat(e.target.value) || 1),
              })
            }
          />
          <span
            className="text-[9px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            sec →
          </span>
          <div className="flex gap-0.5">
            {easingOptions.map((opt) => (
              <button
                key={opt.value}
                className="rounded px-1.5 py-0.5 text-[9px] font-medium transition-all"
                title={opt.value}
                style={{
                  backgroundColor:
                    keyframe.easing === opt.value
                      ? "var(--primary)"
                      : "var(--surface)",
                  color:
                    keyframe.easing === opt.value
                      ? "var(--text-on-primary)"
                      : "var(--text-tertiary)",
                  border: `1px solid ${keyframe.easing === opt.value ? "var(--primary)" : "var(--border-secondary)"}`,
                }}
                onClick={() => onUpdate(keyframe.id, { easing: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Quick duration presets */}
          <div className="ml-auto flex gap-0.5">
            {[2, 5, 10].map((d) => (
              <button
                key={d}
                className="rounded px-1 py-0.5 font-mono text-[8px] transition-colors"
                style={{
                  backgroundColor:
                    keyframe.duration === d ? "var(--primary)" : "transparent",
                  color:
                    keyframe.duration === d
                      ? "var(--text-on-primary)"
                      : "var(--text-quaternary)",
                }}
                onClick={() => onUpdate(keyframe.id, { duration: d })}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const CompactInput = ({
  icon,
  label,
  value,
  min,
  max,
  step,
  suffix,
  width = "w-14",
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  width?: string;
  onChange: (value: number) => void;
}) => {
  return (
    <div className="flex items-center gap-1">
      <span
        className="flex items-center gap-0.5 text-[9px]"
        style={{ color: "var(--text-tertiary)" }}
        title={label}
      >
        {icon}
      </span>
      <div className="relative">
        <input
          className={`input ${width} !px-1.5 !py-0.5 font-mono !text-[10px] ${suffix ? "!pr-4" : ""}`}
          max={max}
          min={min}
          step={step}
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
        {suffix ? <span
            className="pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 text-[8px]"
            style={{ color: "var(--text-quaternary)" }}
          >
            {suffix}
          </span> : null}
      </div>
    </div>
  );
}
