import { useState, useCallback, useEffect, useMemo } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";
import { useMapAnimationEngine } from "../../../../hooks/useMapAnimationEngine";
import { useVideoExport } from "../../../../hooks/useVideoExport";
import { Timeline } from "./Timeline";
import { KeyframeProperties } from "./KeyframeProperties";
import { ExportSettingsPanel } from "./ExportSettings";
import type {
  PlaybackSpeed,
  ExportSettings,
} from "../../../../types/video-export";
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  Trash2,
  ChevronUp,
  ChevronDown,
  Gauge,
  Clock,
  Layers,
  X,
} from "lucide-react";

interface VideoExportPanelProps {
  map?: MaplibreMap | null;
  onClose?: () => void;
  className?: string;
}

const SPEED_OPTIONS: PlaybackSpeed[] = [0.25, 0.5, 1, 1.5, 2, 4];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}:${secs.toFixed(1).padStart(4, "0")}`;
  return `${secs.toFixed(1)}s`;
}

export function VideoExportPanel({
  map,
  onClose,
  className = "",
}: VideoExportPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showExportSettings, setShowExportSettings] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const engine = useMapAnimationEngine({ map });

  const exporter = useVideoExport({
    map,
    getStateAtTime: (normalizedTime: number) =>
      engine.getStateAtTime(normalizedTime * engine.totalDuration),
    applyStateToMap: engine.applyStateToMap,
  });

  const selectedKeyframe = useMemo(
    () => engine.keyframes.find((kf) => kf.id === engine.selectedKeyframeId),
    [engine.keyframes, engine.selectedKeyframeId]
  );

  const selectedKeyframeIndex = useMemo(
    () =>
      engine.keyframes.findIndex((kf) => kf.id === engine.selectedKeyframeId),
    [engine.keyframes, engine.selectedKeyframeId]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          engine.togglePlayPause();
          break;
        case "k":
          e.preventDefault();
          engine.addKeyframe();
          break;
        case "Delete":
        case "Backspace":
          if (engine.selectedKeyframeId) {
            e.preventDefault();
            engine.removeKeyframe(engine.selectedKeyframeId);
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          e.shiftKey ? engine.goToPrevKeyframe() : engine.stepBackward();
          break;
        case "ArrowRight":
          e.preventDefault();
          e.shiftKey ? engine.goToNextKeyframe() : engine.stepForward();
          break;
        case "Home":
          e.preventDefault();
          engine.seekTo(0);
          break;
        case "End":
          e.preventDefault();
          engine.seekTo(engine.totalDuration);
          break;
        case "Escape":
          if (showExportSettings) {
            setShowExportSettings(false);
          } else if (engine.selectedKeyframeId) {
            engine.setSelectedKeyframeId(null);
          } else {
            onClose?.();
          }
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [engine]);

  const handleExport = useCallback(
    async (settings: ExportSettings) => {
      engine.pause();
      await exporter.startExport({
        ...settings,
        totalDuration: engine.totalDuration,
      });
    },
    [engine, exporter]
  );

  return (
    <>
      <div
        className={`relative mb-9 flex w-full flex-col ${className}`}
        style={{
          backgroundColor: "var(--bg-elevated)",
          maxHeight: isExpanded ? "350px" : "40px",
        }}
      >
        {/* Export Settings Overlay */}
        <div className="relative">
          <ExportSettingsPanel
            isOpen={showExportSettings}
            onClose={() => setShowExportSettings(false)}
            onExport={handleExport}
            onCancel={exporter.cancelExport}
            isExporting={exporter.isExporting}
            progress={exporter.progress}
            totalDuration={engine.totalDuration}
            keyframeCount={engine.keyframes.length}
          />
        </div>

        {/* Top bar */}
        <div
          className="flex items-center justify-between px-3 py-1.5"
          style={{
            borderBottom: isExpanded ? "1px solid var(--divider)" : "none",
          }}
        >
          {/* Left: Auto-computed duration & keyframe count */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Clock
                size={12}
                style={{ color: "var(--text-tertiary)" }}
              />
              <span
                className="font-mono text-[11px]"
                style={{ color: "var(--text-secondary)" }}
              >
                {formatTime(engine.totalDuration)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers
                size={12}
                style={{ color: "var(--text-tertiary)" }}
              />
              <span
                className="font-mono text-[11px]"
                style={{ color: "var(--text-secondary)" }}
              >
                {engine.keyframes.length} keyframes
              </span>
            </div>
          </div>

          {/* Center: Transport controls */}
          <div className="flex items-center gap-1">
            <button
              className="rounded-md p-1.5 transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: "var(--text-secondary)" }}
              onClick={engine.goToPrevKeyframe}
              title="Previous Keyframe (Shift+←)"
            >
              <SkipBack size={14} />
            </button>
            <button
              className="rounded-md p-1.5 transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: "var(--text-secondary)" }}
              onClick={engine.stepBackward}
              title="Step Backward (←)"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              className="rounded-lg p-2 transition-all"
              style={{
                backgroundColor: engine.timeline.isPlaying
                  ? "var(--error)"
                  : "var(--primary)",
                color: "var(--text-on-primary)",
              }}
              onClick={engine.togglePlayPause}
              disabled={engine.keyframes.length < 2}
              title="Play/Pause (Space)"
            >
              {engine.timeline.isPlaying ? (
                <Pause size={16} />
              ) : (
                <Play size={16} />
              )}
            </button>
            <button
              className="rounded-md p-1.5 transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: "var(--text-secondary)" }}
              onClick={engine.stop}
              title="Stop"
            >
              <Square size={14} />
            </button>
            <button
              className="rounded-md p-1.5 transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: "var(--text-secondary)" }}
              onClick={engine.stepForward}
              title="Step Forward (→)"
            >
              <ChevronRight size={14} />
            </button>
            <button
              className="rounded-md p-1.5 transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: "var(--text-secondary)" }}
              onClick={engine.goToNextKeyframe}
              title="Next Keyframe (Shift+→)"
            >
              <SkipForward size={14} />
            </button>

            {/* Speed */}
            <div className="relative ml-1">
              <button
                className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] transition-colors hover:bg-[var(--surface-hover)]"
                style={{
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-secondary)",
                }}
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              >
                <Gauge size={10} />
                {engine.playbackSpeed}x
              </button>
              {showSpeedMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSpeedMenu(false)}
                  />
                  <div
                    className="absolute bottom-full left-0 z-50 mb-1 min-w-[80px] overflow-hidden rounded-lg py-1"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border-primary)",
                      boxShadow: "var(--shadow-lg)",
                    }}
                  >
                    {SPEED_OPTIONS.map((speed) => (
                      <button
                        key={speed}
                        className="w-full px-3 py-1 text-left font-mono text-[11px] transition-colors hover:bg-[var(--surface-hover)]"
                        style={{
                          color:
                            engine.playbackSpeed === speed
                              ? "var(--primary)"
                              : "var(--text-primary)",
                          fontWeight:
                            engine.playbackSpeed === speed ? 600 : 400,
                        }}
                        onClick={() => {
                          engine.setPlaybackSpeed(speed);
                          setShowSpeedMenu(false);
                        }}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5">
            <button
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all"
              style={{
                backgroundColor: "var(--success-bg)",
                color: "var(--success-text)",
                border: "1px solid var(--success-border)",
              }}
              onClick={() => engine.addKeyframe()}
              title="Add Keyframe (K)"
            >
              <Plus size={12} />
              Keyframe
            </button>

            {engine.keyframes.length > 0 && (
              <button
                className="rounded-md p-1.5 transition-colors hover:bg-[var(--error-bg)]"
                style={{ color: "var(--text-tertiary)" }}
                onClick={() => {
                  if (window.confirm("Clear all keyframes?"))
                    engine.clearKeyframes();
                }}
                title="Clear All"
              >
                <Trash2 size={13} />
              </button>
            )}

            <div
              className="mx-1 h-5 w-px"
              style={{ backgroundColor: "var(--divider)" }}
            />

            <button
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--text-on-primary)",
              }}
              onClick={() => setShowExportSettings(true)}
              disabled={engine.keyframes.length < 2}
            >
              <Download size={12} />
              Export
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="rounded-md p-1.5 transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: "var(--text-tertiary)" }}
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Timeline area */}
        {isExpanded && (
          <div className="px-4 pt-2 pb-3">
            <Timeline
              keyframes={engine.keyframes}
              timeline={engine.timeline}
              selectedKeyframeId={engine.selectedKeyframeId}
              getKeyframeTime={engine.getKeyframeTime}
              onSeek={engine.seekTo}
              onKeyframeSelect={engine.setSelectedKeyframeId}
              onKeyframeRemove={engine.removeKeyframe}
              onKeyframeDuplicate={engine.duplicateKeyframe}
              onKeyframeUpdateFromMap={engine.updateKeyframeFromMap}
              onKeyframeUpdate={engine.updateKeyframe}
            />

            {/* Selected keyframe properties */}
            {selectedKeyframe && selectedKeyframeIndex >= 0 && (
              <div className="mt-3">
                <KeyframeProperties
                  keyframe={selectedKeyframe}
                  keyframeIndex={selectedKeyframeIndex}
                  keyframeTime={engine.getKeyframeTime(selectedKeyframeIndex)}
                  isLast={selectedKeyframeIndex === engine.keyframes.length - 1}
                  onUpdate={engine.updateKeyframe}
                  onUpdateFromMap={engine.updateKeyframeFromMap}
                />
              </div>
            )}

            {/* Empty state */}
            {engine.keyframes.length === 0 && (
              <div className="py-4 text-center">
                <p
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Navigate the map and press{" "}
                  <kbd
                    className="rounded px-1.5 py-0.5 font-mono text-[10px]"
                    style={{
                      backgroundColor: "var(--bg-tertiary)",
                      border: "1px solid var(--border-primary)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    K
                  </kbd>{" "}
                  or click{" "}
                  <span style={{ color: "var(--success-text)" }}>
                    + Keyframe
                  </span>{" "}
                  to start
                </p>
                <p
                  className="mt-1 text-[10px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Each keyframe auto-adds 5s. Timeline grows automatically — no
                  limit.
                </p>
              </div>
            )}

            {engine.keyframes.length === 1 && (
              <div
                className="mt-2 rounded-md py-2 text-center text-[10px]"
                style={{
                  backgroundColor: "var(--warning-bg)",
                  color: "var(--warning-text)",
                  border: "1px solid var(--warning-border)",
                }}
              >
                Move the map and add another keyframe — 5s transition will be
                created automatically
              </div>
            )}
          </div>
        )}

        {/* Shortcuts bar */}
        {isExpanded && (
          <div
            className="flex items-center justify-center gap-4 px-4 py-1.5 text-[9px]"
            style={{
              borderTop: "1px solid var(--divider)",
              color: "var(--text-tertiary)",
            }}
          >
            <span>
              <kbd className="rounded bg-[var(--bg-tertiary)] px-1 font-mono">
                Space
              </kbd>{" "}
              Play
            </span>
            <span>
              <kbd className="rounded bg-[var(--bg-tertiary)] px-1 font-mono">
                K
              </kbd>{" "}
              Add KF (+5s)
            </span>
            <span>
              <kbd className="rounded bg-[var(--bg-tertiary)] px-1 font-mono">
                ←→
              </kbd>{" "}
              Step
            </span>
            <span>
              <kbd className="rounded bg-[var(--bg-tertiary)] px-1 font-mono">
                Shift+←→
              </kbd>{" "}
              Jump KF
            </span>
            <span>
              <kbd className="rounded bg-[var(--bg-tertiary)] px-1 font-mono">
                Del
              </kbd>{" "}
              Delete
            </span>
          </div>
        )}
      </div>
    </>
  );
}
