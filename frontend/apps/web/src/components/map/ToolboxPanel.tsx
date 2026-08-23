/**
 * Map Toolbox — right-side panel listing the tools that enabled modules
 * expose via the optional `tools` export (see `lib/tools.ts` for the contract).
 *
 * Flow: list (grouped by category) → click a tool → its inputs form →
 * "Run tool" executes `tool.run(inputs, ctx)` → result/error is shown.
 *
 * This component is 100% generic: it never references a specific module.
 */
import { useState } from "react";
import {
  Wrench,
  X,
  ChevronLeft,
  Play,
  Loader2,
  Sparkles,
  Droplets,
  Gauge,
  Calculator,
  Building2,
  Footprints,
  Leaf,
  Scale,
  Map as MapIcon,
} from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Input,
  Select,
  Switch,
  Textarea,
} from "@packages/ui";
import { api, ApiError } from "@/lib/api";
import {
  groupToolsByCategory,
  useModuleTools,
  type ResolvedTool,
  type ToolInput,
  type ToolMapState,
  type ToolRunContext,
} from "@/lib/tools";

/** Panel width — MapPage uses this to shift the map canvas. */
export const TOOLBOX_PANEL_WIDTH = 360;

/* ──────────────────────────────────────────────────────────────────────── */
/*  Tool icon (emoji string or a known lucide icon name)                     */
/* ──────────────────────────────────────────────────────────────────────── */

const KNOWN_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  wrench: Wrench,
  sparkles: Sparkles,
  droplets: Droplets,
  gauge: Gauge,
  calculator: Calculator,
  building: Building2,
  building2: Building2,
  footprints: Footprints,
  leaf: Leaf,
  scale: Scale,
  map: MapIcon,
};

function ToolIcon({ icon, size = 15 }: { icon?: string; size?: number }) {
  const name = (icon ?? "").trim().toLowerCase();
  const Comp = KNOWN_ICONS[name];
  if (Comp) return <Comp size={size} className="text-primary shrink-0" />;
  if (name) return <span className="leading-none shrink-0" style={{ fontSize: size }}>{icon}</span>;
  return <Wrench size={size} className="text-primary shrink-0" />;
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Props                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

interface ToolboxPanelProps {
  isOpen: boolean;
  onClose: () => void;
  mapRef: React.RefObject<any>;
  mapReady: boolean;
  basemap: string;
  layers?: { id: string; name: string; type?: string; visible: boolean }[];
}

function defaultValueFor(input: ToolInput): unknown {
  if (input.default !== undefined) return input.default;
  switch (input.type) {
    case "boolean":
      return false;
    case "select":
      return input.options?.[0] ?? "";
    default:
      return "";
  }
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Result rendering                                                         */
/* ──────────────────────────────────────────────────────────────────────── */

function stringifyResult(result: unknown): string | null {
  if (typeof result === "string") return result;
  if (result === undefined || result === null) return null;
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

function ResultView({ result }: { result: unknown }) {
  if (typeof result === "string") {
    return (
      <div className="text-xs leading-relaxed whitespace-pre-wrap text-text-secondary">
        {result}
      </div>
    );
  }

  const obj =
    typeof result === "object" && result !== null
      ? (result as Record<string, unknown>)
      : null;
  const notes =
    obj && Array.isArray(obj.notes)
      ? (obj.notes as unknown[]).filter((n) => typeof n === "string")
      : null;
  const body = obj && notes ? Object.fromEntries(Object.entries(obj).filter(([k]) => k !== "notes")) : result;

  return (
    <div className="space-y-2">
      {stringifyResult(body) !== null && (
        <pre className="text-[11px] leading-relaxed font-mono text-text-secondary bg-surface-hover/50 border border-border-secondary rounded-lg p-3 overflow-x-auto max-h-64 overflow-y-auto">
          {stringifyResult(body)}
        </pre>
      )}
      {notes && notes.length > 0 && (
        <ul className="space-y-1">
          {notes.map((n, i) => (
            <li key={i} className="text-[11px] text-text-tertiary flex gap-1.5">
              <span className="text-primary">•</span>
              <span>{n as string}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Generated input field (driven by the tool's `inputs` spec)               */
/* ──────────────────────────────────────────────────────────────────────── */

interface FieldControlProps {
  input: ToolInput;
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}

function FieldControl({ input, value, disabled, onChange }: FieldControlProps) {
  const label = input.label || input.key;
  const required = input.required !== false;

  switch (input.type) {
    case "textarea":
      return (
        <Textarea
          label={label}
          description={input.description}
          required={required}
          disabled={disabled}
          placeholder="Type here…"
          className="min-h-24 text-xs"
          value={typeof value === "string" ? value : ""}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onChange(e.target.value)
          }
        />
      );
    case "select":
      return (
        <Select
          label={label}
          options={(input.options ?? []).map((o) => ({ value: o, label: o }))}
          placeholder={input.options?.[0] ?? "Select…"}
          disabled={disabled}
          value={String(value ?? "")}
          onChange={(v: string) => onChange(v)}
        />
      );
    case "boolean":
      return (
        <Switch
          checked={value === true}
          disabled={disabled}
          onChange={(checked: boolean) => onChange(checked)}
          label={label}
          description={input.description}
          size="sm"
        />
      );
    case "number":
    case "integer":
      return (
        <Input
          type="number"
          step={input.type === "integer" ? "1" : "any"}
          label={label}
          description={input.description}
          required={required}
          disabled={disabled}
          placeholder={input.default !== undefined ? String(input.default) : "0"}
          value={value === "" ? "" : String(value ?? "")}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange("");
              return;
            }
            const n = Number(raw);
            if (Number.isNaN(n)) return;
            onChange(input.type === "integer" ? Math.trunc(n) : n);
          }}
        />
      );
    default:
      return (
        <Input
          label={label}
          description={input.description}
          required={required}
          disabled={disabled}
          placeholder={input.default !== undefined ? String(input.default) : ""}
          value={typeof value === "string" ? value : value === undefined ? "" : String(value)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value)
          }
        />
      );
  }
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Main panel                                                               */
/* ──────────────────────────────────────────────────────────────────────── */

export function ToolboxPanel({
  isOpen,
  onClose,
  mapRef,
  mapReady,
  basemap,
  layers = [],
}: ToolboxPanelProps) {
  const { tools, isLoading, error } = useModuleTools();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [runError, setRunError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedTool = tools.find((t) => t.id === selectedId) ?? null;
  const groups = groupToolsByCategory(tools);

  function selectTool(tool: ResolvedTool) {
    setSelectedId(tool.id);
    const init: Record<string, unknown> = {};
    for (const input of tool.inputs ?? []) init[input.key] = defaultValueFor(input);
    setValues(init);
    setResult(null);
    setRunError(null);
    setRunning(false);
  }

  function goBack() {
    setSelectedId(null);
    setRunning(false);
    setResult(null);
    setRunError(null);
  }

  function setField(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  /** Snapshot of the live map for the tool's run context. */
  function buildMapState(): ToolMapState | undefined {
    const map = mapRef.current;
    if (!map || !mapReady) return undefined;
    try {
      const c = map.getCenter?.();
      const b = map.getBounds?.();
      return {
        center: [c?.lng ?? 0, c?.lat ?? 0],
        zoom: map.getZoom?.() ?? 0,
        bounds: b
          ? [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
          : [0, 0, 0, 0],
        basemap,
        layers: layers.map((l) => ({ id: l.id, name: l.name, visible: l.visible })),
      };
    } catch {
      return undefined;
    }
  }

  async function runTool() {
    if (!selectedTool) return;
    setRunning(true);
    setRunError(null);
    setResult(null);
    try {
      const ctx: ToolRunContext = { api, map: buildMapState() };
      const res = await selectedTool.run(values, ctx);
      setResult(res);
    } catch (err) {
      setRunError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err),
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div
      className="absolute top-14 right-0 bottom-10 z-30 flex flex-col bg-surface border-l border-border-secondary shadow-2xl animate-slide-in-right"
      style={{ width: TOOLBOX_PANEL_WIDTH }}
      id="map-toolbox-panel"
    >
      {/* ── Header (back button lives here in the detail view) ── */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-secondary shrink-0">
        {selectedTool ? (
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1.5 min-w-0 text-sm font-semibold text-text-primary hover:text-primary transition-colors"
            aria-label="Back to all tools"
          >
            <ChevronLeft size={16} className="shrink-0" />
            <span className="truncate">All tools</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wrench size={14} className="text-primary" />
            </span>
            <span className="text-sm font-semibold text-text-primary">Toolbox</span>
            {!isLoading && tools.length > 0 && (
              <Badge variant="default" size="sm">
                {tools.length}
              </Badge>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close toolbox"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        {selectedTool ? (
          /* ─────────── Tool detail: inputs + process + result ─────────── */
          <>
            <div className="px-4 py-3.5 border-b border-border-secondary">
              {/* Module tag + category at the top */}
              <div className="flex items-center gap-2 mb-2.5">
                <Badge variant="default" size="sm" className="uppercase tracking-wider">
                  {selectedTool.moduleName.replace(/-module$/i, "")}
                </Badge>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-quaternary">
                  {selectedTool.category}
                </span>
              </div>
              {/* Tool name + icon */}
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ToolIcon icon={selectedTool.icon} size={17} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text-primary truncate">
                    {selectedTool.label}
                  </div>
                </div>
              </div>
              {/* Description spans the full panel width */}
              {selectedTool.description && (
                <div className="mt-2.5 text-[11px] leading-relaxed text-text-secondary">
                  {selectedTool.description}
                </div>
              )}
            </div>

            <div className="p-4 space-y-4">
              {(selectedTool.inputs ?? []).length === 0 && (
                <div className="text-[11px] text-text-tertiary">
                  This tool takes no inputs — just run it.
                </div>
              )}
              {(selectedTool.inputs ?? []).map((input) => (
                <FieldControl
                  key={input.key}
                  input={input}
                  value={values[input.key]}
                  disabled={running}
                  onChange={(v) => setField(input.key, v)}
                />
              ))}

              {running && (
                <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
                  <Loader2 size={13} className="animate-spin" />
                  Running tool…
                </div>
              )}

              {runError && (
                <Alert variant="error" title="Tool failed" className="text-xs">
                  {runError}
                </Alert>
              )}

              {!running && result !== null && (
                <div className="rounded-xl border border-border-secondary bg-surface-hover/30 p-3 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-quaternary">
                    Result
                  </div>
                  <ResultView result={result} />
                </div>
              )}
            </div>

            <div className="px-4 pb-4">
              <Button variant="primary" className="w-full" disabled={running} onClick={runTool}>
                {running ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                {running ? "Running…" : "Run tool"}
              </Button>
            </div>
          </>
        ) : (
          /* ─────────── Tool list (grouped by category) ─────────── */
          <>
            {isLoading && (
              <div className="flex items-center gap-2 px-4 py-6 text-[11px] text-text-tertiary">
                <Loader2 size={13} className="animate-spin" />
                Discovering tools from modules…
              </div>
            )}

            {!isLoading && error && (
              <div className="p-4">
                <Alert variant="error" title="Could not load tools" className="text-xs">
                  {error}
                </Alert>
              </div>
            )}

            {!isLoading && !error && groups.length === 0 && (
              <div className="px-2 pt-4">
                <EmptyState
                  size="sm"
                  icon={<Wrench size={22} className="text-text-tertiary" />}
                  title="No tools yet"
                  description="Modules can surface tools here by exporting a valid `tools` array from their frontend entry — the toolbox picks them up automatically, no core changes needed."
                />
              </div>
            )}

            {!isLoading &&
              groups.map(({ category, tools: catTools }) => (
                <div key={category} className="pb-1">
                  <div className="flex items-center justify-between px-4 pt-3.5 pb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-quaternary">
                      {category}
                    </span>
                    <span className="text-[10px] text-text-quaternary">
                      {catTools.length}
                    </span>
                  </div>
                  {catTools.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => selectTool(tool)}
                      className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-surface-hover/60 active:bg-surface-hover transition-colors"
                    >
                      <span className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <ToolIcon icon={tool.icon} size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-text-primary truncate">
                          {tool.label}
                        </span>
                        {tool.description && (
                          <span className="block text-[11px] leading-snug text-text-tertiary mt-0.5 line-clamp-2">
                            {tool.description}
                          </span>
                        )}
                      </span>
                      <Badge variant="default" size="sm" className="shrink-0 mt-0.5">
                        {tool.moduleName.replace(/-module$/i, "")}
                      </Badge>
                    </button>
                  ))}
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
}

export default ToolboxPanel;