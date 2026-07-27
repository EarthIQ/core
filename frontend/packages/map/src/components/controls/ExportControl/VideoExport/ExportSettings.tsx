// src/components/video-export/ExportSettings.tsx

import React, { useState } from "react";
import type {
  ExportSettings as ExportSettingsType,
  ExportProgress,
} from "../../types/video-export";
import {
  Download,
  Film,
  Image,
  Settings,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Modal } from "@packages/ui";

interface ExportSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (settings: ExportSettingsType) => void;
  onCancel: () => void;
  isExporting: boolean;
  progress: ExportProgress;
  totalDuration: number;
  keyframeCount: number;
}

const RESOLUTION_PRESETS = [
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
  { label: "1440p", width: 2560, height: 1440 },
  { label: "4K", width: 3840, height: 2160 },
  { label: "Square", width: 1080, height: 1080 },
  { label: "Story", width: 1080, height: 1920 },
];

const FPS_OPTIONS = [12, 15, 24, 30, 60];

export function ExportSettingsPanel({
  isOpen,
  onClose,
  onExport,
  onCancel,
  isExporting,
  progress,
  totalDuration,
  keyframeCount,
}: ExportSettingsPanelProps) {
  const [settings, setSettings] = useState<ExportSettingsType>({
    format: "webm",
    width: 1920,
    height: 1080,
    fps: 30,
    quality: 0.8,
    totalDuration,
    loop: true,
    filename: `map-animation-${Date.now()}`,
  });

  const [activeResolutionPreset, setActiveResolutionPreset] = useState("720p");

  const handleResolutionPreset = (
    preset: (typeof RESOLUTION_PRESETS)[number]
  ) => {
    setSettings((s) => ({
      ...s,
      width: preset.width,
      height: preset.height,
    }));
    setActiveResolutionPreset(preset.label);
  };

  const estimatedFileSize = () => {
    const totalFrames = settings.totalDuration * settings.fps;
    const pixelsPerFrame = settings.width * settings.height;
    let bytesPerPixel = 0.5;

    if (settings.format === "gif") bytesPerPixel = 2;
    else bytesPerPixel = settings.quality * 0.8;

    const bytes = totalFrames * pixelsPerFrame * bytesPerPixel;

    if (bytes > 1_000_000_000)
      return `~${(bytes / 1_000_000_000).toFixed(1)} GB`;
    if (bytes > 1_000_000) return `~${(bytes / 1_000_000).toFixed(0)} MB`;
    return `~${(bytes / 1_000).toFixed(0)} KB`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Settings"
      className="w-full max-w-md"
    >
      <div
        className="h-full w-full overflow-y-auto"
        style={{
          backgroundColor: "var(--bg-elevated)",
        }}
      >
        {isExporting ? (
          <ExportProgressView
            progress={progress}
            onCancel={onCancel}
          />
        ) : (
          <div className="space-y-4 p-4">
            {/* Format */}
            <div>
              <label
                className="mb-2 block text-xs font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      value: "webm",
                      label: "WebM",
                      icon: <Film size={16} />,
                      desc: "Best quality",
                    },
                    {
                      value: "mp4",
                      label: "MP4",
                      icon: <Film size={16} />,
                      desc: "Compatible",
                    },
                    {
                      value: "gif",
                      label: "GIF",
                      icon: <Image size={16} />,
                      desc: "Shareable",
                    },
                  ] as const
                ).map((fmt) => (
                  <button
                    key={fmt.value}
                    className="flex flex-col items-center gap-1 rounded-lg p-3 transition-all"
                    style={{
                      backgroundColor:
                        settings.format === fmt.value
                          ? "var(--info-bg)"
                          : "var(--surface)",
                      border: `1px solid ${
                        settings.format === fmt.value
                          ? "var(--primary)"
                          : "var(--border-primary)"
                      }`,
                      color:
                        settings.format === fmt.value
                          ? "var(--primary)"
                          : "var(--text-secondary)",
                    }}
                    onClick={() =>
                      setSettings((s) => ({ ...s, format: fmt.value }))
                    }
                  >
                    {fmt.icon}
                    <span className="text-xs font-semibold">{fmt.label}</span>
                    <span
                      className="text-[9px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {fmt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div>
              <label
                className="mb-2 block text-xs font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Resolution
              </label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {RESOLUTION_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    className="rounded-full px-2.5 py-1 text-[10px] font-medium transition-all"
                    style={{
                      backgroundColor:
                        activeResolutionPreset === preset.label
                          ? "var(--primary)"
                          : "var(--surface)",
                      color:
                        activeResolutionPreset === preset.label
                          ? "var(--text-on-primary)"
                          : "var(--text-secondary)",
                      border: `1px solid ${
                        activeResolutionPreset === preset.label
                          ? "var(--primary)"
                          : "var(--border-primary)"
                      }`,
                    }}
                    onClick={() => handleResolutionPreset(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    className="text-[10px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Width
                  </label>
                  <input
                    type="number"
                    className="input !py-1 font-mono !text-xs"
                    value={settings.width}
                    min={320}
                    max={7680}
                    step={2}
                    onChange={(e) => {
                      setSettings((s) => ({
                        ...s,
                        width: parseInt(e.target.value) || 1920,
                      }));
                      setActiveResolutionPreset("");
                    }}
                  />
                </div>
                <div>
                  <label
                    className="text-[10px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Height
                  </label>
                  <input
                    type="number"
                    className="input !py-1 font-mono !text-xs"
                    value={settings.height}
                    min={240}
                    max={4320}
                    step={2}
                    onChange={(e) => {
                      setSettings((s) => ({
                        ...s,
                        height: parseInt(e.target.value) || 1080,
                      }));
                      setActiveResolutionPreset("");
                    }}
                  />
                </div>
              </div>
            </div>

            {/* FPS */}
            <div>
              <label
                className="mb-2 block text-xs font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Frame Rate
              </label>
              <div className="flex gap-1.5">
                {FPS_OPTIONS.map((fps) => (
                  <button
                    key={fps}
                    className="flex-1 rounded-md py-1.5 text-xs font-medium transition-all"
                    style={{
                      backgroundColor:
                        settings.fps === fps
                          ? "var(--primary)"
                          : "var(--surface)",
                      color:
                        settings.fps === fps
                          ? "var(--text-on-primary)"
                          : "var(--text-secondary)",
                      border: `1px solid ${
                        settings.fps === fps
                          ? "var(--primary)"
                          : "var(--border-primary)"
                      }`,
                    }}
                    onClick={() => setSettings((s) => ({ ...s, fps }))}
                  >
                    {fps}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality slider */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  className="text-xs font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Quality
                </label>
                <span
                  className="font-mono text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {Math.round(settings.quality * 100)}%
                </span>
              </div>
              <input
                type="range"
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
                style={{
                  background: `linear-gradient(to right, var(--primary) ${settings.quality * 100}%, var(--bg-tertiary) ${settings.quality * 100}%)`,
                }}
                min={0.1}
                max={1}
                step={0.05}
                value={settings.quality}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    quality: parseFloat(e.target.value),
                  }))
                }
              />
            </div>

            {/* GIF Loop option */}
            {settings.format === "gif" && (
              <div className="flex items-center justify-between">
                <label
                  className="text-xs font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Loop
                </label>
                <button
                  className="toggle"
                  data-state={settings.loop ? "checked" : "unchecked"}
                  onClick={() => setSettings((s) => ({ ...s, loop: !s.loop }))}
                >
                  <div className="toggle-knob" />
                </button>
              </div>
            )}

            {/* Filename */}
            <div>
              <label
                className="mb-1 block text-xs font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Filename
              </label>
              <input
                type="text"
                className="input !py-1.5 !text-xs"
                value={settings.filename}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, filename: e.target.value }))
                }
              />
            </div>

            {/* Summary */}
            <div
              className="space-y-1 rounded-lg p-3"
              style={{
                backgroundColor: "var(--bg-tertiary)",
                border: "1px solid var(--border-secondary)",
              }}
            >
              <div className="flex justify-between text-[10px]">
                <span style={{ color: "var(--text-tertiary)" }}>
                  Duration (auto)
                </span>
                <span
                  className="font-mono"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {totalDuration.toFixed(1)}s
                </span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span style={{ color: "var(--text-tertiary)" }}>
                  Total Frames
                </span>
                <span
                  className="font-mono"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {Math.ceil(totalDuration * settings.fps)}
                </span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span style={{ color: "var(--text-tertiary)" }}>Keyframes</span>
                <span
                  className="font-mono"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {keyframeCount}
                </span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span style={{ color: "var(--text-tertiary)" }}>
                  Est. File Size
                </span>
                <span
                  className="font-mono"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {estimatedFileSize()}
                </span>
              </div>
            </div>

            {/* Export button */}
            <button
              className="btn btn-primary w-full gap-2 !py-2.5"
              disabled={keyframeCount < 2}
              onClick={() => onExport({ ...settings, totalDuration })}
            >
              <Download size={16} />
              <span>Export {settings.format.toUpperCase()}</span>
            </button>

            {keyframeCount < 2 && (
              <p
                className="text-center text-[10px]"
                style={{ color: "var(--warning-text)" }}
              >
                Add at least 2 keyframes to export
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function ExportProgressView({
  progress,
  onCancel,
}: {
  progress: ExportProgress;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col items-center gap-3">
        {progress.phase === "error" ? (
          <AlertCircle
            size={32}
            style={{ color: "var(--error)" }}
          />
        ) : progress.phase === "done" ? (
          <CheckCircle2
            size={32}
            style={{ color: "var(--success)" }}
          />
        ) : (
          <Loader2
            size={32}
            className="animate-spin"
            style={{ color: "var(--primary)" }}
          />
        )}

        <div className="text-center">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {progress.phase === "capturing" && "Capturing Frames..."}
            {progress.phase === "encoding" && "Encoding..."}
            {progress.phase === "done" && "Export Complete!"}
            {progress.phase === "error" && "Export Failed"}
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            {progress.phase === "capturing" &&
              `Frame ${progress.framesCapture} / ${progress.totalFrames}`}
            {progress.phase === "encoding" && "Processing final output..."}
            {progress.phase === "done" && "File has been downloaded"}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--bg-tertiary)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress.percentage}%`,
            backgroundColor:
              progress.phase === "error"
                ? "var(--error)"
                : progress.phase === "done"
                  ? "var(--success)"
                  : "var(--primary)",
          }}
        />
      </div>

      <div className="flex justify-between text-[10px]">
        <span style={{ color: "var(--text-tertiary)" }}>
          {progress.percentage.toFixed(0)}%
        </span>
        {progress.estimatedTimeRemaining > 0 && (
          <span style={{ color: "var(--text-tertiary)" }}>
            ~{Math.ceil(progress.estimatedTimeRemaining)}s remaining
          </span>
        )}
      </div>

      {(progress.phase === "capturing" || progress.phase === "encoding") && (
        <button
          className="btn btn-secondary w-full !py-2"
          onClick={onCancel}
        >
          Cancel
        </button>
      )}
    </div>
  );
}
