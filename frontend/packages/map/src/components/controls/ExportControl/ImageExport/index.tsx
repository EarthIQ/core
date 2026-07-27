import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@packages/ui";
import { Map } from "maplibre-gl";

// ─── Types ────────────────────────────────────────────────────────────

type ExportFormat = "png" | "jpeg" | "webp";
type ExportSize = "current" | "hd" | "2k" | "4k" | "custom";

interface ExportOptions {
  format: ExportFormat;
  size: ExportSize;
  quality: number;
  customWidth: number;
  customHeight: number;
}

const DEFAULT_OPTIONS: ExportOptions = {
  format: "png",
  size: "current",
  quality: 0.92,
  customWidth: 1920,
  customHeight: 1080,
};

const SIZE_PRESETS: Record<
  ExportSize,
  { label: string; width?: number; height?: number; description: string }
> = {
  current: { label: "Viewport", description: "Current size" },
  hd: { label: "HD", width: 1920, height: 1080, description: "1920 × 1080" },
  "2k": { label: "2K", width: 2560, height: 1440, description: "2560 × 1440" },
  "4k": { label: "4K", width: 3840, height: 2160, description: "3840 × 2160" },
  custom: { label: "Custom", description: "Custom size" },
};

const FORMAT_INFO: Record<
  ExportFormat,
  { label: string; ext: string; mime: string; description: string }
> = {
  png: { label: "PNG", ext: "png", mime: "image/png", description: "Lossless" },
  jpeg: {
    label: "JPEG",
    ext: "jpg",
    mime: "image/jpeg",
    description: "Compact",
  },
  webp: {
    label: "WebP",
    ext: "webp",
    mime: "image/webp",
    description: "Modern",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatBytes(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

// ─── Icons ────────────────────────────────────────────────────────────

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4", className)}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line
        x1="12"
        y1="15"
        x2="12"
        y2="3"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4", className)}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4 animate-spin", className)}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4", className)}
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        ry="2"
      />
      <circle
        cx="8.5"
        cy="8.5"
        r="1.5"
      />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4", className)}
    >
      <line
        x1="18"
        y1="6"
        x2="6"
        y2="18"
      />
      <line
        x1="6"
        y1="6"
        x2="18"
        y2="18"
      />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

function ImageExport({
  map,
  onClose,
}: {
  map: Map | null;
  onClose: () => void;
}) {
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_OPTIONS);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [estimatedSize, setEstimatedSize] = useState("–");
  const [mapCanvas, setMapCanvas] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const exportedTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const previewUrlRef = useRef<string | null>(null);

  const updateOption = useCallback(
    <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
      setOptions((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const getOutputDimensions = useCallback((): {
    width: number;
    height: number;
  } => {
    if (options.size === "custom") {
      return { width: options.customWidth, height: options.customHeight };
    }
    if (options.size === "current" && mapCanvas) {
      return { width: mapCanvas.width, height: mapCanvas.height };
    }
    const preset = SIZE_PRESETS[options.size];
    return { width: preset.width ?? 1920, height: preset.height ?? 1080 };
  }, [options.size, options.customWidth, options.customHeight, mapCanvas]);

  // ── Generate preview ────────────────────────────────────────
  const generatePreview = useCallback(() => {
    if (!map) return;

    const capturePreview = () => {
      try {
        const canvas = map.getCanvas();
        setMapCanvas({ width: canvas.width, height: canvas.height });

        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);

        const url = canvas.toDataURL("image/png", 0.4);
        previewUrlRef.current = url;
        setPreviewUrl(url);

        const base64Len = url.length - "data:image/png;base64,".length;
        const bytes = (base64Len * 3) / 4;
        setEstimatedSize(formatBytes(bytes));
      } catch {
        setPreviewUrl(null);
        setEstimatedSize("–");
      }
    };

    map.once("render", capturePreview);
    map.triggerRepaint();
  }, [map]);

  useEffect(() => {
    const timer = setTimeout(generatePreview, 150);
    return () => clearTimeout(timer);
  }, [generatePreview]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (exportedTimerRef.current) clearTimeout(exportedTimerRef.current);
    };
  }, []);

  // ── Export logic ────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (!map || exporting) return;
    setExporting(true);
    setExported(false);

    const performExport = async () => {
      try {
        const canvas = map.getCanvas();
        const dims = getOutputDimensions();

        const offscreen = document.createElement("canvas");
        offscreen.width = dims.width;
        offscreen.height = dims.height;
        const ctx = offscreen.getContext("2d");
        if (!ctx) throw new Error("Failed to get canvas context");

        if (options.format === "jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, offscreen.width, offscreen.height);
        }

        ctx.drawImage(canvas, 0, 0, dims.width, dims.height);

        const fmt = FORMAT_INFO[options.format];
        const blob = await new Promise<Blob | null>((resolve) =>
          offscreen.toBlob(resolve, fmt.mime, options.quality)
        );

        if (blob) {
          const timestamp = new Date()
            .toISOString()
            .slice(0, 19)
            .replace(/[T:]/g, "-");
          downloadBlob(blob, `map-${timestamp}.${fmt.ext}`);
        }

        setExported(true);
        if (exportedTimerRef.current) clearTimeout(exportedTimerRef.current);
        exportedTimerRef.current = setTimeout(() => setExported(false), 3000);
      } catch (err) {
        console.error("Export failed:", err);
      } finally {
        setExporting(false);
      }
    };

    map.once("render", performExport);
    map.triggerRepaint();
  }, [map, options, exporting, getOutputDimensions]);

  // ── Keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !exporting) {
        e.preventDefault();
        handleExport();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleExport, exporting, onClose]);

  const dims = getOutputDimensions();

  return (
    <div
      className="animate-scale-in flex w-full flex-col overflow-hidden"
      style={{
        backgroundColor: "var(--bg-elevated)",
        maxHeight: "calc(100dvh - 80px)",
      }}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: "var(--border-primary)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: "var(--info-bg)" }}
          >
            <ImageIcon
              className="h-4.5 w-4.5"
              style={{ color: "var(--primary)" }}
            />
          </div>
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Export Image
            </h2>
            <p
              className="text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              Save your map as an image file
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--surface-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          <XIcon />
        </button>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        {/* Preview */}
        <div
          className="flex flex-1 flex-col items-center justify-center p-8"
          style={{ backgroundColor: "var(--bg-secondary)" }}
        >
          <div className="w-full max-w-2xl space-y-3">
            <div
              className="relative overflow-hidden"
              style={{
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--border-primary)",
                backgroundColor: "var(--bg-tertiary)",
                aspectRatio: `${dims.width} / ${dims.height}`,
                maxHeight: "420px",
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Map preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full flex-col items-center justify-center gap-2"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <ImageIcon className="h-10 w-10 opacity-40" />
                  <span className="text-sm">Loading preview…</span>
                </div>
              )}
            </div>

            <div
              className="flex items-center justify-between px-1 text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              <span className="font-medium">
                {dims.width} × {dims.height}
              </span>
              <span>~{estimatedSize}</span>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div
          className="flex w-[300px] shrink-0 flex-col overflow-y-auto border-l p-6"
          style={{
            borderColor: "var(--border-primary)",
            backgroundColor: "var(--bg-elevated)",
          }}
        >
          <div className="space-y-6">
            {/* Format */}
            <div className="space-y-2.5">
              <label
                className="text-[11px] font-semibold tracking-wider uppercase"
                style={{ color: "var(--text-tertiary)" }}
              >
                Format
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(FORMAT_INFO) as ExportFormat[]).map((fmt) => {
                  const info = FORMAT_INFO[fmt];
                  const selected = options.format === fmt;
                  return (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => updateOption("format", fmt)}
                      className="relative flex flex-col items-center gap-0.5 rounded-xl border py-3 transition-all"
                      style={{
                        borderColor: selected
                          ? "var(--primary)"
                          : "var(--border-primary)",
                        backgroundColor: selected
                          ? "color-mix(in oklch, var(--primary) 8%, transparent)"
                          : "transparent",
                        borderRadius: "var(--radius-lg)",
                      }}
                    >
                      <span
                        className="text-xs font-bold"
                        style={{
                          color: selected
                            ? "var(--primary)"
                            : "var(--text-primary)",
                        }}
                      >
                        {info.label}
                      </span>
                      <span
                        className="text-[10px]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {info.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size */}
            <div className="space-y-2.5">
              <label
                className="text-[11px] font-semibold tracking-wider uppercase"
                style={{ color: "var(--text-tertiary)" }}
              >
                Size
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(SIZE_PRESETS) as ExportSize[]).map((size) => {
                  const preset = SIZE_PRESETS[size];
                  const selected = options.size === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => updateOption("size", size)}
                      className={cn(
                        "flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-all",
                        size === "custom" && "col-span-2"
                      )}
                      style={{
                        borderColor: selected
                          ? "var(--primary)"
                          : "var(--border-primary)",
                        backgroundColor: selected
                          ? "color-mix(in oklch, var(--primary) 8%, transparent)"
                          : "transparent",
                        borderRadius: "var(--radius-lg)",
                      }}
                    >
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color: selected
                            ? "var(--primary)"
                            : "var(--text-primary)",
                        }}
                      >
                        {preset.label}
                      </span>
                      <span
                        className="text-[10px]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {size === "current" && mapCanvas
                          ? `${mapCanvas.width} × ${mapCanvas.height}`
                          : preset.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              {options.size === "custom" && (
                <div className="grid grid-cols-2 gap-2">
                  {(["customWidth", "customHeight"] as const).map((key) => (
                    <div
                      key={key}
                      className="space-y-1"
                    >
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {key === "customWidth" ? "Width" : "Height"}
                      </span>
                      <input
                        type="number"
                        value={options[key]}
                        onChange={(e) =>
                          updateOption(
                            key,
                            Math.max(100, parseInt(e.target.value) || 100)
                          )
                        }
                        min={100}
                        max={7680}
                        className="w-full rounded-lg px-3 py-2 font-mono text-sm"
                        style={{
                          backgroundColor: "var(--input-bg)",
                          border: "1px solid var(--input-border)",
                          color: "var(--text-primary)",
                          borderRadius: "var(--radius-md)",
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quality (only for lossy formats) */}
            {options.format !== "png" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label
                    className="text-[11px] font-semibold tracking-wider uppercase"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Quality
                  </label>
                  <span
                    className="font-mono text-xs font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {Math.round(options.quality * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={options.quality}
                  onChange={(e) =>
                    updateOption("quality", parseFloat(e.target.value))
                  }
                  className={cn(
                    "h-1.5 w-full cursor-pointer appearance-none rounded-full",
                    "[&::-webkit-slider-thumb]:appearance-none",
                    "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
                    "[&::-webkit-slider-thumb]:rounded-full",
                    "[&::-webkit-slider-thumb]:shadow-sm",
                    "[&::-webkit-slider-thumb]:cursor-pointer",
                    "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
                    "[&::-moz-range-thumb]:rounded-full",
                    "[&::-moz-range-thumb]:border-0",
                    "[&::-moz-range-thumb]:cursor-pointer"
                  )}
                  style={{ backgroundColor: "var(--toggle-bg-off)" }}
                />
                <style>{`
                  input[type="range"]::-webkit-slider-thumb { background-color: var(--primary); }
                  input[type="range"]::-moz-range-thumb { background-color: var(--primary); }
                `}</style>
              </div>
            )}

            {/* Map Info */}
            {map && (
              <div className="space-y-2.5">
                <label
                  className="text-[11px] font-semibold tracking-wider uppercase"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Map Info
                </label>
                <div
                  className="space-y-1 rounded-xl border p-3"
                  style={{
                    borderColor: "var(--border-primary)",
                    borderRadius: "var(--radius-lg)",
                    backgroundColor: "var(--bg-tertiary)",
                  }}
                >
                  {[
                    { label: "Zoom", value: map.getZoom().toFixed(2) },
                    {
                      label: "Center",
                      value: `${map.getCenter().lat.toFixed(4)}°, ${map.getCenter().lng.toFixed(4)}°`,
                    },
                    {
                      label: "Bearing",
                      value: `${map.getBearing().toFixed(1)}°`,
                    },
                    { label: "Pitch", value: `${map.getPitch().toFixed(1)}°` },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between py-0.5 text-xs"
                    >
                      <span style={{ color: "var(--text-tertiary)" }}>
                        {row.label}
                      </span>
                      <span
                        className="font-mono"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between border-t px-6 py-4"
        style={{
          borderColor: "var(--border-primary)",
          backgroundColor: "var(--bg-elevated)",
        }}
      >
        <div
          className="flex items-center gap-2 text-xs"
          style={{ color: "var(--text-tertiary)" }}
        >
          <kbd
            className="rounded px-1.5 py-0.5 font-mono text-[10px]"
            style={{
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-tertiary)",
            }}
          >
            ⌘↵
          </kbd>
          <span>to export</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
            style={{
              borderColor: "var(--border-primary)",
              color: "var(--text-primary)",
              backgroundColor: "var(--surface)",
              borderRadius: "var(--radius-md)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--surface-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--surface)")
            }
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || !map}
            className="flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: exported ? "var(--success)" : "var(--primary)",
              color: "var(--text-on-primary)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-primary)",
            }}
            onMouseEnter={(e) => {
              if (!exported && !exporting)
                e.currentTarget.style.backgroundColor = "var(--primary-dark)";
            }}
            onMouseLeave={(e) => {
              if (!exported)
                e.currentTarget.style.backgroundColor = "var(--primary)";
            }}
          >
            {exporting ? (
              <>
                <LoaderIcon />
                Exporting…
              </>
            ) : exported ? (
              <>
                <CheckIcon />
                Done!
              </>
            ) : (
              <>
                <DownloadIcon />
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImageExport;
export type { ExportOptions, ExportFormat, ExportSize };
