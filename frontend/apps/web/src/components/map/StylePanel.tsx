import { X } from "lucide-react";
import { useState } from "react";

import { LAYER_COLORS } from "./layer-panel/useLayerTree";

import type { LayerTreeNode } from "./layer-panel/types";

interface StylePanelProps {
  layer: LayerTreeNode;
  onClose: () => void;
  onChange: (id: string, patch: Partial<LayerTreeNode>) => void;
  onRename: (id: string, name: string) => void;
}

const SliderField = ({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <label className="text-text-quaternary text-[0.65rem] font-semibold tracking-widest uppercase">
          {label}
        </label>
        <span className="text-text-secondary font-mono text-[0.7rem]">
          {display}
        </span>
      </div>
      <input
        className="accent-primary w-full"
        max={max}
        min={min}
        step={step}
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
};

export const StylePanel = ({
  layer,
  onClose,
  onChange,
  onRename,
}: StylePanelProps) => {
  const [nameDraft, setNameDraft] = useState(layer.name);
  const color = layer.color ?? "#22d3a0";
  const opacity = layer.opacity ?? 0.8;
  const lineWidth = layer.lineWidth ?? 2;
  const brightness = layer.brightness ?? 1;
  const contrast = layer.contrast ?? 1;
  const minZoom = layer.minZoom ?? 0;
  const maxZoom = layer.maxZoom ?? 22;

  function commitName() {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== layer.name) onRename(layer.id, trimmed);
  }

  function resetStyle() {
    onChange(layer.id, {
      color: "#22d3a0",
      opacity: 0.8,
      lineWidth: 2,
      brightness: 1,
      contrast: 1,
      minZoom: 0,
      maxZoom: 22,
    });
  }

  return (
    <div
      className="bg-elevated border-border-primary absolute top-16 right-3 z-30 w-72 rounded-xl border shadow-2xl"
      style={{ maxHeight: "calc(100vh - 8rem)", overflowY: "auto" }}
    >
      <div className="border-border-secondary flex items-center justify-between border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm">🎨</span>
          <span className="text-text-primary text-xs font-bold">
            Layer Style
          </span>
        </div>
        <button
          className="text-text-tertiary hover:text-text-primary hover:bg-surface-hover rounded-md p-1 transition-colors"
          type="button"
          onClick={onClose}
        >
          <X size={14} />
        </button>
      </div>

      <div className="px-3 pt-3 pb-1">
        <div className="text-text-quaternary mb-1 text-[0.65rem] font-semibold tracking-widest uppercase">
          Layer Name
        </div>
        <input
          className="text-text-primary bg-surface-hover border-border-secondary focus:border-primary/50 w-full rounded-md border px-2 py-1.5 text-xs font-semibold outline-none"
          value={nameDraft}
          onBlur={commitName}
          onChange={(e) => setNameDraft(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.target as HTMLInputElement).blur()
          }
        />
      </div>

      <div className="mt-3 flex flex-col gap-5 px-3 pb-4">
        <div className="flex flex-col gap-2">
          <label className="text-text-quaternary text-[0.65rem] font-semibold tracking-widest uppercase">
            {layer.layerType === "raster"
              ? "Tint Color"
              : "Fill / Stroke Color"}
          </label>
          <div className="flex items-center gap-3">
            <input
              className="border-border-primary h-9 w-9 cursor-pointer rounded-lg border-2 bg-transparent p-0.5"
              type="color"
              value={color}
              onChange={(e) => onChange(layer.id, { color: e.target.value })}
            />
            <div className="flex flex-wrap gap-1.5">
              {LAYER_COLORS.map((c) => (
                <button
                  key={c}
                  className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
                  title={c}
                  type="button"
                  style={{
                    background: c,
                    borderColor: color === c ? "#fff" : "transparent",
                  }}
                  onClick={() => onChange(layer.id, { color: c })}
                />
              ))}
            </div>
          </div>
        </div>

        <SliderField
          display={`${Math.round(opacity * 100)}%`}
          label="Opacity"
          max={1}
          min={0}
          step={0.05}
          value={opacity}
          onChange={(v) => onChange(layer.id, { opacity: v })}
        />

        {layer.layerType === "vector" && (
          <SliderField
            display={`${lineWidth}px`}
            label="Line Width"
            max={10}
            min={0.5}
            step={0.5}
            value={lineWidth}
            onChange={(v) => onChange(layer.id, { lineWidth: v })}
          />
        )}

        {layer.layerType === "raster" && (
          <>
            <SliderField
              display={`${Math.round(brightness * 100)}%`}
              label="Brightness"
              max={2}
              min={0}
              step={0.05}
              value={brightness}
              onChange={(v) => onChange(layer.id, { brightness: v })}
            />
            <SliderField
              display={`${Math.round(contrast * 100)}%`}
              label="Contrast"
              max={2}
              min={0}
              step={0.05}
              value={contrast}
              onChange={(v) => onChange(layer.id, { contrast: v })}
            />
          </>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-text-quaternary text-[0.65rem] font-semibold tracking-widest uppercase">
            Visible Zoom Range
          </label>
          <div className="text-text-secondary flex items-center gap-2 text-[0.7rem]">
            <input
              className="bg-surface-hover border-border-secondary w-14 rounded border px-1.5 py-1 text-center outline-none"
              max={maxZoom}
              min={0}
              type="number"
              value={minZoom}
              onChange={(e) =>
                onChange(layer.id, { minZoom: Number(e.target.value) })
              }
            />
            <span>to</span>
            <input
              className="bg-surface-hover border-border-secondary w-14 rounded border px-1.5 py-1 text-center outline-none"
              max={22}
              min={minZoom}
              type="number"
              value={maxZoom}
              onChange={(e) =>
                onChange(layer.id, { maxZoom: Number(e.target.value) })
              }
            />
          </div>
        </div>

        {layer.tileUrl ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-text-quaternary text-[0.65rem] font-semibold tracking-widest uppercase">
              Tile URL
            </label>
            <div className="text-text-tertiary bg-surface-hover border-border-secondary rounded-lg border px-2.5 py-2 font-mono text-[0.68rem] leading-relaxed break-all">
              {layer.tileUrl}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label className="text-text-quaternary text-[0.65rem] font-semibold tracking-widest uppercase">
            Preview
          </label>
          <div
            className="border-border-secondary h-10 rounded-lg border"
            style={{ background: color, opacity }}
          />
        </div>

        <button
          className="text-text-tertiary hover:text-error self-start text-[0.7rem] underline"
          type="button"
          onClick={resetStyle}
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
};
