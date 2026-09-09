/**
 * Map Toolbox - right-side panel listing the tools that enabled modules
 * expose via the optional `tools` export (see `lib/tools.ts` for the contract).
 *
 * Flow: list (grouped by category) → click a tool → its inputs form →
 * "Run tool" executes `tool.run(inputs, ctx)` → result/error is shown.
 *
 * This component is 100% generic: it never references a specific module.
 */
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
import { useState } from "react";

import { api, ApiError } from "@/lib/api";
import {
  groupToolsByCategory,
  useModuleTools,
  type ResolvedTool,
  type ToolInput,
  type ToolMapState,
  type ToolRunContext,
} from "@/lib/tools";

/** Panel width - MapPage uses this to shift the map canvas. */
export const TOOLBOX_PANEL_WIDTH = 360;

/* ──────────────────────────────────────────────────────────────────────── */
/*  Tool icon (emoji string or a known lucide icon name)                     */
/* ──────────────────────────────────────────────────────────────────────── */

const KNOWN_ICONS: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
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

const ToolIcon = ({ icon, size = 15 }: { icon?: string; size?: number }) => {
  const name = (icon ?? "").trim().toLowerCase();
  const Comp = KNOWN_ICONS[name];
  if (Comp)
    return (
      <Comp
        className="text-primary shrink-0"
        size={size}
      />
    );
  if (name)
    return (
      <span
        className="shrink-0 leading-none"
        style={{ fontSize: size }}
      >
        {icon}
      </span>
    );
  return (
    <Wrench
      className="text-primary shrink-0"
      size={size}
    />
  );
};

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

const ResultView = ({ result }: { result: unknown }) => {
  if (typeof result === "string") {
    return (
      <div className="text-text-secondary text-xs leading-relaxed whitespace-pre-wrap">
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
  const body =
    obj && notes
      ? Object.fromEntries(Object.entries(obj).filter(([k]) => k !== "notes"))
      : result;

  return (
    <div className="space-y-2">
      {stringifyResult(body) !== null && (
        <pre className="text-text-secondary bg-surface-hover/50 border-border-secondary max-h-64 overflow-x-auto overflow-y-auto rounded-lg border p-3 font-mono text-[11px] leading-relaxed">
          {stringifyResult(body)}
        </pre>
      )}
      {notes && notes.length > 0 ? (
        <ul className="space-y-1">
          {notes.map((n, i) => (
            <li
              key={i}
              className="text-text-tertiary flex gap-1.5 text-[11px]"
            >
              <span className="text-primary">•</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────── */
/*  Generated input field (driven by the tool's `inputs` spec)               */
/* ──────────────────────────────────────────────────────────────────────── */

interface FieldControlProps {
  input: ToolInput;
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}

const FieldControl = ({
  input,
  value,
  disabled,
  onChange,
}: FieldControlProps) => {
  const label = input.label || input.key;
  const required = input.required !== false;

  switch (input.type) {
    case "textarea":
      return (
        <Textarea
          className="min-h-24 text-xs"
          description={input.description}
          disabled={disabled}
          label={label}
          placeholder="Type here…"
          required={required}
          value={typeof value === "string" ? value : ""}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onChange(e.target.value)
          }
        />
      );
    case "select":
      return (
        <Select
          disabled={disabled}
          label={label}
          options={(input.options ?? []).map((o) => ({ value: o, label: o }))}
          placeholder={input.options?.[0] ?? "Select…"}
          value={String(value ?? "")}
          onChange={(v: string) => onChange(v)}
        />
      );
    case "boolean":
      return (
        <Switch
          checked={value === true}
          description={input.description}
          disabled={disabled}
          label={label}
          size="sm"
          onChange={(checked: boolean) => onChange(checked)}
        />
      );
    case "number":
    case "integer":
      return (
        <Input
          description={input.description}
          disabled={disabled}
          label={label}
          placeholder={
            input.default !== undefined ? String(input.default) : "0"
          }
          required={required}
          step={input.type === "integer" ? "1" : "any"}
          type="number"
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
          description={input.description}
          disabled={disabled}
          label={label}
          placeholder={input.default !== undefined ? String(input.default) : ""}
          required={required}
          value={
            typeof value === "string"
              ? value
              : value === undefined
                ? ""
                : String(value)
          }
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value)
          }
        />
      );
  }
};

/* ──────────────────────────────────────────────────────────────────────── */
/*  Main panel                                                               */
/* ──────────────────────────────────────────────────────────────────────── */

export const ToolboxPanel = ({
  isOpen,
  onClose,
  mapRef,
  mapReady,
  basemap,
  layers = [],
}: ToolboxPanelProps) => {
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
    for (const input of tool.inputs ?? [])
      init[input.key] = defaultValueFor(input);
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
        layers: layers.map((l) => ({
          id: l.id,
          name: l.name,
          visible: l.visible,
        })),
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
            : String(err)
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div
      className="bg-surface border-border-secondary animate-slide-in-right absolute top-14 right-0 bottom-10 z-30 flex flex-col border-l shadow-2xl"
      id="map-toolbox-panel"
      style={{ width: TOOLBOX_PANEL_WIDTH }}
    >
      {/* ── Header (back button lives here in the detail view) ── */}
      <div className="border-border-secondary flex shrink-0 items-center justify-between border-b px-3 py-2.5">
        {selectedTool ? (
          <button
            aria-label="Back to all tools"
            className="text-text-primary hover:text-primary flex min-w-0 items-center gap-1.5 text-sm font-semibold transition-colors"
            type="button"
            onClick={goBack}
          >
            <ChevronLeft
              className="shrink-0"
              size={16}
            />
            <span className="truncate">All tools</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 flex h-7 w-7 items-center justify-center rounded-lg">
              <Wrench
                className="text-primary"
                size={14}
              />
            </span>
            <span className="text-text-primary text-sm font-semibold">
              Toolbox
            </span>
            {!isLoading && tools.length > 0 && (
              <Badge
                size="sm"
                variant="default"
              >
                {tools.length}
              </Badge>
            )}
          </div>
        )}
        <button
          aria-label="Close toolbox"
          className="text-text-tertiary hover:text-text-primary hover:bg-surface-hover flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          type="button"
          onClick={onClose}
        >
          <X size={15} />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        {selectedTool ? (
          /* ─────────── Tool detail: inputs + process + result ─────────── */
          <>
            <div className="border-border-secondary border-b px-4 py-3.5">
              {/* Module tag + category at the top */}
              <div className="mb-2.5 flex items-center gap-2">
                <Badge
                  className="tracking-wider uppercase"
                  size="sm"
                  variant="default"
                >
                  {selectedTool.moduleName.replace(/-module$/i, "")}
                </Badge>
                <span className="text-text-quaternary text-[10px] font-bold tracking-wider uppercase">
                  {selectedTool.category}
                </span>
              </div>
              {/* Tool name + icon */}
              <div className="flex items-center gap-2.5">
                <span className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                  <ToolIcon
                    icon={selectedTool.icon}
                    size={17}
                  />
                </span>
                <div className="min-w-0">
                  <div className="text-text-primary truncate text-sm font-semibold">
                    {selectedTool.label}
                  </div>
                </div>
              </div>
              {/* Description spans the full panel width */}
              {selectedTool.description ? (
                <div className="text-text-secondary mt-2.5 text-[11px] leading-relaxed">
                  {selectedTool.description}
                </div>
              ) : null}
            </div>

            <div className="space-y-4 p-4">
              {(selectedTool.inputs ?? []).length === 0 && (
                <div className="text-text-tertiary text-[11px]">
                  This tool takes no inputs - just run it.
                </div>
              )}
              {(selectedTool.inputs ?? []).map((input) => (
                <FieldControl
                  key={input.key}
                  disabled={running}
                  input={input}
                  value={values[input.key]}
                  onChange={(v) => setField(input.key, v)}
                />
              ))}

              {running ? (
                <div className="text-text-tertiary flex items-center gap-2 text-[11px]">
                  <Loader2
                    className="animate-spin"
                    size={13}
                  />
                  Running tool…
                </div>
              ) : null}

              {runError ? (
                <Alert
                  className="text-xs"
                  title="Tool failed"
                  variant="error"
                >
                  {runError}
                </Alert>
              ) : null}

              {!running && result !== null && (
                <div className="border-border-secondary bg-surface-hover/30 space-y-2 rounded-xl border p-3">
                  <div className="text-text-quaternary text-[10px] font-bold tracking-wider uppercase">
                    Result
                  </div>
                  <ResultView result={result} />
                </div>
              )}
            </div>

            <div className="px-4 pb-4">
              <Button
                className="w-full"
                disabled={running}
                variant="primary"
                onClick={runTool}
              >
                {running ? (
                  <Loader2
                    className="animate-spin"
                    size={14}
                  />
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
            {isLoading ? (
              <div className="text-text-tertiary flex items-center gap-2 px-4 py-6 text-[11px]">
                <Loader2
                  className="animate-spin"
                  size={13}
                />
                Discovering tools from modules…
              </div>
            ) : null}

            {!isLoading && error ? (
              <div className="p-4">
                <Alert
                  className="text-xs"
                  title="Could not load tools"
                  variant="error"
                >
                  {error}
                </Alert>
              </div>
            ) : null}

            {!isLoading && !error && groups.length === 0 && (
              <div className="px-2 pt-4">
                <EmptyState
                  description="Modules can surface tools here by exporting a valid `tools` array from their frontend entry - the toolbox picks them up automatically, no core changes needed."
                  icon={
                    <Wrench
                      className="text-text-tertiary"
                      size={22}
                    />
                  }
                  size="sm"
                  title="No tools yet"
                />
              </div>
            )}

            {!isLoading &&
              groups.map(({ category, tools: catTools }) => (
                <div
                  key={category}
                  className="pb-1"
                >
                  <div className="flex items-center justify-between px-4 pt-3.5 pb-1.5">
                    <span className="text-text-quaternary text-[10px] font-bold tracking-wider uppercase">
                      {category}
                    </span>
                    <span className="text-text-quaternary text-[10px]">
                      {catTools.length}
                    </span>
                  </div>
                  {catTools.map((tool) => (
                    <button
                      key={tool.id}
                      className="hover:bg-surface-hover/60 active:bg-surface-hover flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors"
                      type="button"
                      onClick={() => selectTool(tool)}
                    >
                      <span className="bg-primary/10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                        <ToolIcon
                          icon={tool.icon}
                          size={15}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-text-primary block truncate text-xs font-semibold">
                          {tool.label}
                        </span>
                        {tool.description ? (
                          <span className="text-text-tertiary mt-0.5 line-clamp-2 block text-[11px] leading-snug">
                            {tool.description}
                          </span>
                        ) : null}
                      </span>
                      <Badge
                        className="mt-0.5 shrink-0"
                        size="sm"
                        variant="default"
                      >
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
};

export default ToolboxPanel;
