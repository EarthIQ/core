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
        <label className="text-[0.65rem] uppercase tracking-widest text-text-quaternary font-semibold">
          {label}
        </label>
        <span className="text-[0.7rem] font-mono text-text-secondary">
          {display}
        </span>
      </div>
      <input
        className="w-full accent-primary"
        max={max}
        min={min}
        step={step}
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

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
      className="absolute top-16 right-3 z-30 w-72 bg-elevated border border-border-primary rounded-xl shadow-2xl"
      style={{ maxHeight: "calc(100vh - 8rem)", overflowY: "auto" }}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-secondary">
        <div className="flex items-center gap-2">
          <span className="text-sm">🎨</span>
          <span className="text-xs font-bold text-text-primary">
            Layer Style
          </span>
        </div>
        <button
          className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
          type="button"
          onClick={onClose}
        >
          <X size={14} />
        </button>
      </div>

      <div className="px-3 pt-3 pb-1">
        <div className="text-[0.65rem] uppercase tracking-widest text-text-quaternary font-semibold mb-1">
          Layer Name
        </div>
        <input
          className="w-full text-xs font-semibold text-text-primary bg-surface-hover border border-border-secondary rounded-md px-2 py-1.5 outline-none focus:border-primary/50"
          value={nameDraft}
          onBlur={commitName}
          onChange={(e) => setNameDraft(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.target as HTMLInputElement).blur()
          }
        />
      </div>

      <div className="px-3 pb-4 flex flex-col gap-5 mt-3">
        <div className="flex flex-col gap-2">
          <label className="text-[0.65rem] uppercase tracking-widest text-text-quaternary font-semibold">
            {layer.layerType === "raster"
              ? "Tint Color"
              : "Fill / Stroke Color"}
          </label>
          <div className="flex items-center gap-3">
            <input
              className="w-9 h-9 rounded-lg border-2 border-border-primary cursor-pointer bg-transparent p-0.5"
              type="color"
              value={color}
              onChange={(e) => onChange(layer.id, { color: e.target.value })}
            />
            <div className="flex gap-1.5 flex-wrap">
              {LAYER_COLORS.map((c) => (
                <button
                  key={c}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
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
          <label className="text-[0.65rem] uppercase tracking-widest text-text-quaternary font-semibold">
            Visible Zoom Range
          </label>
          <div className="flex items-center gap-2 text-[0.7rem] text-text-secondary">
            <input
              className="w-14 bg-surface-hover border border-border-secondary rounded px-1.5 py-1 text-center outline-none"
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
              className="w-14 bg-surface-hover border border-border-secondary rounded px-1.5 py-1 text-center outline-none"
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

        {layer.tileUrl ? <div className="flex flex-col gap-1.5">
            <label className="text-[0.65rem] uppercase tracking-widest text-text-quaternary font-semibold">
              Tile URL
            </label>
            <div className="text-[0.68rem] font-mono text-text-tertiary bg-surface-hover rounded-lg px-2.5 py-2 break-all leading-relaxed border border-border-secondary">
              {layer.tileUrl}
            </div>
          </div> : null}

        <div className="flex flex-col gap-1.5">
          <label className="text-[0.65rem] uppercase tracking-widest text-text-quaternary font-semibold">
            Preview
          </label>
          <div
            className="h-10 rounded-lg border border-border-secondary"
            style={{ background: color, opacity }}
          />
        </div>

        <button
          className="text-[0.7rem] text-text-tertiary hover:text-error underline self-start"
          type="button"
          onClick={resetStyle}
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
