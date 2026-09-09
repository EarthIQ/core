/**
 * Settings - Appearance section (core).
 *
 * Live, server-synced customization: theme mode, accent color, font scale,
 * compact mode, map units and default basemap. Every control applies to the
 * running UI immediately and persists via ``PUT /api/v1/profile/me/preferences``.
 */
import { useState } from "react";

import {
  ACCENT_PRESETS,
  usePreferences,
  type FontScale,
  type MapUnits,
} from "@/lib/preferences";
import { useTheme, type ThemeMode } from "@/lib/theme";

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: string }[] = [
  { id: "dark", label: "Dark", icon: "🌙" },
  { id: "light", label: "Light", icon: "☀️" },
  { id: "system", label: "System", icon: "💻" },
];

const FONT_OPTIONS: { id: FontScale; label: string }[] = [
  { id: "small", label: "S" },
  { id: "normal", label: "M" },
  { id: "large", label: "L" },
];

const BASEMAPS: { id: string; label: string }[] = [
  { id: "osm", label: "OpenStreetMap" },
  { id: "esri-satellite", label: "ESRI Satellite" },
  { id: "opentopomap", label: "OpenTopoMap" },
];

export default function AppearanceSection() {
  const { prefs, update, reset } = usePreferences();
  const { activeTheme } = useTheme();
  const [customHex, setCustomHex] = useState(prefs.accent_color ?? "");

  function pickAccent(hex: string | null) {
    setCustomHex(hex ?? "");
    update({ accent_color: hex });
  }

  return (
    <div className="grid gap-6">
      {/* ── Theme ── */}
      <div className="card flex flex-col gap-4 p-6">
        <div>
          <h3 className="text-text-primary text-sm font-semibold">Theme</h3>
          <p className="text-text-secondary mt-0.5 text-xs">
            Currently rendering in{" "}
            <span className="capitalize">{activeTheme}</span> mode. Changes
            apply instantly.
          </p>
        </div>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((t) => (
            <button
              key={t.id}
              className={`flex-1 cursor-pointer rounded-xl border py-2.5 text-sm font-medium transition-all sm:flex-none sm:px-5 ${
                prefs.theme_mode === t.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border-secondary text-text-secondary hover:bg-surface-hover"
              }`}
              onClick={() => update({ theme_mode: t.id })}
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Accent color ── */}
      <div className="card flex flex-col gap-4 p-6">
        <div>
          <h3 className="text-text-primary text-sm font-semibold">
            Accent color
          </h3>
          <p className="text-text-secondary mt-0.5 text-xs">
            Personalize the brand color used across buttons, links and
            highlights.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            title="Default"
            className={`h-9 w-9 cursor-pointer rounded-full border-2 transition-transform ${
              !prefs.accent_color
                ? "border-text-primary scale-110"
                : "border-border-secondary"
            }`}
            style={{
              background:
                "conic-gradient(from 0deg, #50aad1, #10b981, #f59e0b, #ef4444, #8b5cf6, #50aad1)",
            }}
            onClick={() => pickAccent(null)}
          />
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.value}
              style={{ backgroundColor: p.value }}
              title={p.label}
              className={`h-9 w-9 cursor-pointer rounded-full border-2 transition-transform ${
                prefs.accent_color === p.value
                  ? "border-text-primary scale-110"
                  : "border-transparent hover:scale-105"
              }`}
              onClick={() => pickAccent(p.value)}
            />
          ))}
          <label
            className="text-text-secondary flex cursor-pointer items-center gap-2 pl-2 text-xs"
            title="Pick a custom color"
          >
            <span
              className="border-border-secondary h-8 w-8 rounded-full border"
              style={{ background: customHex || "transparent" }}
            >
              <input
                className="sr-only"
                type="color"
                value={
                  /^#[0-9a-fA-F]{6}$/.test(customHex) ? customHex : "#50aad1"
                }
                onChange={(e) => pickAccent(e.target.value)}
              />
            </span>
            Custom
          </label>
          <input
            className="input w-32"
            placeholder="#22c55e"
            value={customHex}
            onChange={(e) => {
              const v = e.target.value.trim();
              setCustomHex(v);
              if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) pickAccent(v);
            }}
          />
        </div>
      </div>

      {/* ── Density & text ── */}
      <div className="card flex flex-col gap-4 p-6">
        <div>
          <h3 className="text-text-primary text-sm font-semibold">
            Text & density
          </h3>
          <p className="text-text-secondary mt-0.5 text-xs">
            Adjust the base text size and overall interface density.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="form-field">
            <label className="form-label">Font scale</label>
            <div className="flex gap-2">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  className={`flex-1 cursor-pointer rounded-lg border py-2 text-sm font-semibold transition-all ${
                    prefs.font_scale === f.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border-secondary text-text-secondary hover:bg-surface-hover"
                  }`}
                  onClick={() => update({ font_scale: f.id })}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Compact mode</label>
            <button
              aria-checked={prefs.compact_mode}
              role="switch"
              className={`relative h-7 w-12 cursor-pointer rounded-full transition-colors ${
                prefs.compact_mode
                  ? "bg-primary"
                  : "bg-surface-hover border-border-secondary border"
              }`}
              onClick={() => update({ compact_mode: !prefs.compact_mode })}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  prefs.compact_mode ? "left-6" : "left-1"
                }`}
              />
            </button>
            <span className="text-text-tertiary text-xs">
              {prefs.compact_mode
                ? "Denser layout for smaller screens."
                : "Comfortable spacing (default)."}
            </span>
          </div>
        </div>
      </div>

      {/* ── Map defaults ── */}
      <div className="card flex flex-col gap-4 p-6">
        <div>
          <h3 className="text-text-primary text-sm font-semibold">
            Map defaults
          </h3>
          <p className="text-text-secondary mt-0.5 text-xs">
            Pre-selected values for new maps and measurements.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="form-field">
            <label className="form-label">Measurement units</label>
            <select
              className="input"
              value={prefs.map_units}
              onChange={(e) =>
                update({ map_units: e.target.value as MapUnits })
              }
            >
              <option value="metric">Metric (meters, kilometers)</option>
              <option value="imperial">Imperial (feet, miles)</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Default basemap</label>
            <select
              className="input"
              value={prefs.default_basemap}
              onChange={(e) => update({ default_basemap: e.target.value })}
            >
              {BASEMAPS.map((b) => (
                <option
                  key={b.id}
                  value={b.id}
                >
                  {b.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Reset ── */}
      <div className="flex justify-end">
        <button
          className="btn btn-ghost"
          onClick={reset}
        >
          ↺ Reset appearance to defaults
        </button>
      </div>
    </div>
  );
}
