/**
 * Preferences — server-synced, customizable UX (core).
 *
 * Owns the user's UI preferences (theme mode, accent color, font scale,
 * compact mode, map units, default basemap). Values are:
 *   • applied to the DOM instantly (theme class, CSS variables, root font
 *     size, `.compact` class) — so changes are live;
 *   • persisted to ``localStorage`` (works logged-out / offline);
 *   • synced to ``PUT /api/v1/profile/me/preferences`` when authenticated, so a
 *     user's experience follows them across devices.
 *
 * The theme *mode* is applied through the existing ThemeProvider
 * (``lib/theme.tsx``); this provider watches theme changes (e.g. the topbar
 * toggle) and keeps the server row consistent.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";
import { useAuth } from "./auth";
import { useTheme, type ThemeMode } from "./theme";

// ── Types ──────────────────────────────────────────────────────────────────────

export type FontScale = "small" | "normal" | "large";
export type MapUnits = "metric" | "imperial";

export interface UIPreferences {
  theme_mode: ThemeMode;
  map_units: MapUnits;
  default_basemap: string;
  accent_color: string | null; // hex, or null = app default
  compact_mode: boolean;
  font_scale: FontScale;
}

export const PREFERENCE_DEFAULTS: UIPreferences = {
  theme_mode: "dark",
  map_units: "metric",
  default_basemap: "opentopomap",
  accent_color: null,
  compact_mode: false,
  font_scale: "normal",
};

// Curated accent palette (all read well in light + dark).
export const ACCENT_PRESETS: { label: string; value: string }[] = [
  { label: "Ocean (default)", value: "#50aad1" },
  { label: "Emerald", value: "#10b981" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Coral", value: "#f97066" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Magenta", value: "#ec4899" },
  { label: "Slate", value: "#64748b" },
];

interface PreferencesContextValue {
  prefs: UIPreferences;
  /** True once the server (or local) values have been loaded & applied. */
  ready: boolean;
  /**
   * Apply a partial set of preferences locally + persist (localStorage
   * immediately, server when authenticated).
   */
  update: (partial: Partial<UIPreferences>) => void;
  /** Reset everything to the built-in defaults. */
  reset: () => void;
  /** Re-fetch from the server (e.g. after login). */
  refresh: () => void;
}

const STORAGE_KEY = "earthiq-prefs";

const PreferencesContext = createContext<PreferencesContextValue>({
  prefs: PREFERENCE_DEFAULTS,
  ready: false,
  update: () => {},
  reset: () => {},
  refresh: () => {},
});

// ── DOM appliers ───────────────────────────────────────────────────────────────

const FONT_SCALE_PX: Record<FontScale, string> = {
  small: "14.5px",
  normal: "16px",
  large: "17.5px",
};

/** hex → hsl components */
function hexToHsl(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue = 0;
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) hue = ((b - r) / d + 2) / 6;
  else hue = ((r - g) / d + 4) / 6;
  return [hue * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.min(100, Math.max(0, s));
  l = Math.min(100, Math.max(0, l));
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Apply an accent color by overriding the brand CSS variables. */
export function applyAccentColor(hex: string | null): void {
  const root = document.documentElement;
  if (!hex) {
    root.style.removeProperty("--primary");
    root.style.removeProperty("--primary-dark");
    root.style.removeProperty("--primary-light");
    root.style.removeProperty("--primary-hover");
    return;
  }
  const hsl = hexToHsl(hex);
  if (!hsl) return;
  const [h, s, l] = hsl;
  root.style.setProperty("--primary", hex);
  root.style.setProperty("--primary-dark", hslToHex(h, Math.min(100, s + 5), Math.max(10, l - 12)));
  root.style.setProperty("--primary-light", hslToHex(h, s, Math.min(92, l + 14)));
  root.style.setProperty("--primary-hover", hslToHex(h, Math.min(100, s + 5), Math.max(10, l - 8)));
}

function applyFontScale(scale: FontScale, compact: boolean): void {
  const base = parseFloat(FONT_SCALE_PX[scale]);
  // Compact mode nudges the base slightly smaller for denser UIs.
  const next = compact ? Math.max(13, base - 1) : base;
  document.documentElement.style.fontSize = `${next}px`;
}

// ── Local storage fallback (logged-out / offline) ─────────────────────────────

function readLocal(): UIPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return PREFERENCE_DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...PREFERENCE_DEFAULTS, ...parsed };
  } catch {
    return PREFERENCE_DEFAULTS;
  }
}

function writeLocal(prefs: UIPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota / privacy errors */
  }
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const { theme, setTheme } = useTheme();

  const [prefs, setPrefs] = useState<UIPreferences>(() => readLocal());
  const [ready, setReady] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const suppressThemeSync = useRef(true); // don't PUT right after initial apply
  const putTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the latest theme value / setter in refs so `applyAll` below stays
  // REFERENTIALLY STABLE. Previously its identity changed with `theme`, which
  // re-triggered the server-prefs load effect on every theme change; that
  // re-fetched the (debounced, still stale) server value and re-applied it,
  // snapping a fresh toggle back ("auto on/off", only the 2nd click stuck).
  const themeRef = useRef(theme);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);
  const setThemeRef = useRef(setTheme);
  useEffect(() => {
    setThemeRef.current = setTheme;
  }, [setTheme]);

  const applyAll = useCallback((next: UIPreferences) => {
    setPrefs(next);
    writeLocal(next);
    if (next.theme_mode !== themeRef.current) setThemeRef.current(next.theme_mode);
    applyAccentColor(next.accent_color);
    applyFontScale(next.font_scale, next.compact_mode);
    document.documentElement.classList.toggle("compact", next.compact_mode);
  }, []);

  // Load server prefs when authenticated (and whenever the user / tick changes).
  useEffect(() => {
    if (!isAuthenticated) {
      // Logged out: honour local values (e.g. a remembered theme).
      applyAll(readLocal());
      setReady(true);
      return;
    }
    let cancelled = false;
    api
      .get<{
        theme_mode?: string;
        map_units?: string;
        default_basemap?: string | null;
        accent_color?: string | null;
        compact_mode?: boolean;
        font_scale?: string;
      }>("/api/v1/profile/me/preferences")
      .then((server) => {
        if (cancelled) return;
        const merged: UIPreferences = {
          theme_mode:
            server.theme_mode === "light" || server.theme_mode === "system"
              ? server.theme_mode
              : "dark",
          map_units: server.map_units === "imperial" ? "imperial" : "metric",
          default_basemap: server.default_basemap || "opentopomap",
          accent_color: server.accent_color || null,
          compact_mode: Boolean(server.compact_mode),
          font_scale:
            server.font_scale === "small" || server.font_scale === "large"
              ? server.font_scale
              : "normal",
        };
        applyAll(merged);
        suppressThemeSync.current = false;
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        applyAll(readLocal());
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, refreshTick, applyAll]);

  // Keep the server row in sync when the theme changes elsewhere (topbar, ...).
  useEffect(() => {
    if (!isAuthenticated || !ready) return;
    if (suppressThemeSync.current) {
      suppressThemeSync.current = false;
      return;
    }
    if (prefs.theme_mode === theme) return;
    setPrefs((p) => {
      const next = { ...p, theme_mode: theme };
      writeLocal(next);
      return next;
    });
    const t = setTimeout(() => {
      api.put("/api/v1/profile/me/preferences", { theme_mode: theme }).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, isAuthenticated, ready]);

  const update = useCallback(
    (partial: Partial<UIPreferences>) => {
      const next = { ...prefs, ...partial };
      applyAll(next);
      if (!isAuthenticated) return;
      if (putTimer.current) clearTimeout(putTimer.current);
      putTimer.current = setTimeout(() => {
        const body: Record<string, unknown> = {};
        if (partial.theme_mode !== undefined) body.theme_mode = partial.theme_mode;
        if (partial.map_units !== undefined) body.map_units = partial.map_units;
        if (partial.default_basemap !== undefined)
          body.default_basemap = partial.default_basemap;
        if (partial.accent_color !== undefined) body.accent_color = partial.accent_color;
        if (partial.compact_mode !== undefined) body.compact_mode = partial.compact_mode;
        if (partial.font_scale !== undefined) body.font_scale = partial.font_scale;
        api.put("/api/v1/profile/me/preferences", body).catch(() => {
          /* offline — local state already applied */
        });
      }, 250);
    },
    [prefs, applyAll, isAuthenticated],
  );

  const reset = useCallback(() => {
    applyAll(PREFERENCE_DEFAULTS);
    if (!isAuthenticated) return;
    api
      .put("/api/v1/profile/me/preferences", {
        theme_mode: PREFERENCE_DEFAULTS.theme_mode,
        map_units: PREFERENCE_DEFAULTS.map_units,
        default_basemap: PREFERENCE_DEFAULTS.default_basemap,
        accent_color: PREFERENCE_DEFAULTS.accent_color,
        compact_mode: PREFERENCE_DEFAULTS.compact_mode,
        font_scale: PREFERENCE_DEFAULTS.font_scale,
      })
      .catch(() => {});
  }, [applyAll, isAuthenticated]);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  const value = useMemo(
    () => ({ prefs, ready, update, reset, refresh }),
    [prefs, ready, update, reset, refresh],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  return useContext(PreferencesContext);
}