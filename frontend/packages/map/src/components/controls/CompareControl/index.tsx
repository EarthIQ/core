// components/controls/CompareControl.tsx
import {
  type ReactNode,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import * as maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import { cn } from "@packages/ui";
import { ControlButton, ControlButtonFlyout } from "../MapControlButton";
import { useMap } from "../../../hooks/useMap";
import { Map } from "../../primitives/Map";
import { MapProvider } from "../../../context/MapContext";
import {
  ArrowLeftRight,
  Code,
  Columns2,
  PanelLeftOpen,
  Search,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type CompareMode = "side-by-side" | "swipe" | "spyglass";

export interface CompareModeDefinition {
  mode: CompareMode;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

function getDefaultModeIcon(mode: CompareMode): ReactNode {
  const icons: Record<CompareMode, ReactNode> = {
    "side-by-side": <Columns2 className="h-4 w-4" />,
    swipe: <PanelLeftOpen className="h-4 w-4" />,
    spyglass: <Search className="h-4 w-4" />,
  };
  return icons[mode];
}

const DEFAULT_MODES: CompareModeDefinition[] = [
  { mode: "side-by-side", label: "Side by side" },
  { mode: "swipe", label: "Swipe compare" },
  { mode: "spyglass", label: "Spyglass" },
];

// ═══════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════

export interface CompareControlProps {
  modes?: CompareModeDefinition[];
  activeMode?: CompareMode | null;
  swipePosition?: number;
  spyglassRadius?: number;
  onModeChange?: (mode: CompareMode | null) => void;
  onSwipePositionChange?: (position: number) => void;
  onOpenChange?: (open: boolean) => void;
  flyoutSide?: "left" | "right";
  icon?: ReactNode;
  label?: string;
  className?: string;
  flyoutClassName?: string;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  rightMapChildren?: ReactNode;
  renderLeftControl?: ReactNode;
  renderRightControl?: ReactNode;
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function CompareControl({
  modes = DEFAULT_MODES,
  activeMode = null,
  swipePosition: swipePositionProp,
  spyglassRadius = 150,
  onModeChange,
  onSwipePositionChange,
  onOpenChange,
  flyoutSide = "left",
  icon,
  label = "Compare maps",
  className,
  flyoutClassName,
  closeOnClickOutside = true,
  closeOnEscape = true,
  rightMapChildren,
  renderLeftControl,
  renderRightControl,
}: CompareControlProps) {
  const { map } = useMap();

  // ── State ────────────────────────────────────────────────────────
  const [manuallyOpen, setManuallyOpen] = useState(false);
  const [swipePosition, setSwipePosition] = useState(swipePositionProp ?? 50);
  const [spyglassPosition, setSpyglassPosition] = useState({ x: 0, y: 0 });
  const [isSpyglassActive, setIsSpyglassActive] = useState(false);
  const [capturedStyle, setCapturedStyle] = useState<StyleSpecification | null>(
    null
  );
  // Track when the drag handle mounts so we can re-run the drag effect
  const [handleMounted, setHandleMounted] = useState(false);

  const isActive = activeMode !== null;
  const renderMode = activeMode === "side-by-side" ? "swipe" : activeMode;
  const isSideBySide = activeMode === "side-by-side";
  const currentSwipePos = isSideBySide ? 50 : swipePosition;
  const isOpen = manuallyOpen || isActive;

  const showSwipeUI = renderMode === "swipe";
  const showSpyglassUI = renderMode === "spyglass";
  const showDragHandle = showSwipeUI && !isSideBySide;

  // ── Refs ─────────────────────────────────────────────────────────
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rightMapInstanceRef = useRef<maplibregl.Map | null>(null);
  const [rightMapInstance, setRightMapInstance] =
    useState<maplibregl.Map | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const prevActiveModeRef = useRef<CompareMode | null>(null);
  const onSwipePositionChangeRef = useRef(onSwipePositionChange);
  onSwipePositionChangeRef.current = onSwipePositionChange;

  // ── Callback ref for the drag handle ─────────────────────────────
  // This fires when the handle element mounts/unmounts, triggering
  // the drag useEffect to re-run.
  const handleCallbackRef = useCallback((node: HTMLDivElement | null) => {
    handleRef.current = node;
    setHandleMounted(node !== null);
  }, []);

  // ── Sync controlled swipe position ───────────────────────────────
  useEffect(() => {
    if (swipePositionProp !== undefined) setSwipePosition(swipePositionProp);
  }, [swipePositionProp]);

  // ── Capture style ONLY on null → active transition ───────────────
  useEffect(() => {
    const wasActive = prevActiveModeRef.current !== null;
    const nowActive = activeMode !== null;

    if (!wasActive && nowActive && map) {
      try {
        const style = map.getStyle();
        if (style) {
          setCapturedStyle(JSON.parse(JSON.stringify(style)));
        }
      } catch (e) {
        setCapturedStyle(null);
      }
    } else if (wasActive && !nowActive) {
      setCapturedStyle(null);
    }

    prevActiveModeRef.current = activeMode;
  }, [activeMode, map]);

  // ── Helpers ──────────────────────────────────────────────────────
  const closePanel = useCallback(() => {
    setManuallyOpen(false);
    if (activeMode !== null) onModeChange?.(null);
    onOpenChange?.(false);
  }, [activeMode, onModeChange, onOpenChange]);

  const selectMode = useCallback(
    (mode: CompareMode) => {
      if (mode === activeMode) onModeChange?.(null);
      else onModeChange?.(mode);
    },
    [activeMode, onModeChange]
  );

  // ── Click outside ────────────────────────────────────────────────
  useEffect(() => {
    if (!closeOnClickOutside || !isOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        if (activeMode !== null) return;
        closePanel();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [closeOnClickOutside, isOpen, activeMode, closePanel]);

  // ── Escape key ───────────────────────────────────────────────────
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePanel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeOnEscape, isOpen, closePanel]);

  // ── Sync right map camera ────────────────────────────────────────
  useEffect(() => {
    if (!map || !rightMapInstance || !isActive) return;
    const syncFromLeft = () => {
      rightMapInstance.setCenter(map.getCenter());
      rightMapInstance.setZoom(map.getZoom());
      rightMapInstance.setBearing(map.getBearing());
      rightMapInstance.setPitch(map.getPitch());
    };
    map.on("move", syncFromLeft);
    syncFromLeft();
    return () => {
      map.off("move", syncFromLeft);
    };
  }, [map, rightMapInstance, isActive]);

  // ── Side-by-side padding ─────────────────────────────────────────
  useEffect(() => {
    if (!map) return;
    const updatePadding = () => {
      try {
        if (isSideBySide) {
          const rect = map.getContainer().getBoundingClientRect();
          const halfWidth = rect.width / 2;
          map.setPadding({ left: 0, top: 0, bottom: 0, right: halfWidth });
          if (rightMapInstance) {
            rightMapInstance.setPadding({
              right: 0,
              top: 0,
              bottom: 0,
              left: halfWidth,
            });
          }
        } else {
          map.setPadding({ left: 0, top: 0, bottom: 0, right: 0 });
          if (rightMapInstance) {
            rightMapInstance.setPadding({
              left: 0,
              top: 0,
              bottom: 0,
              right: 0,
            });
          }
        }
      } catch (e) {}
    };
    updatePadding();
    window.addEventListener("resize", updatePadding);
    return () => {
      window.removeEventListener("resize", updatePadding);
      try {
        map.setPadding({ left: 0, top: 0, bottom: 0, right: 0 });
        if (rightMapInstance) {
          rightMapInstance.setPadding({ left: 0, top: 0, bottom: 0, right: 0 });
        }
      } catch (e) {}
    };
  }, [map, isSideBySide, rightMapInstance]);

  // ══════════════════════════════════════════════════════════════════
  // SWIPE DRAG — re-runs when activeMode changes OR handle mounts
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const handle = handleRef.current;
    const overlay = overlayRef.current;

    // Guard: only attach when we're in swipe mode AND elements exist
    if (activeMode !== "swipe" || !handle || !overlay) return;

    let dragging = false;

    function calcPosition(clientX: number): number {
      const rect = overlay!.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 100;
      return Math.max(2, Math.min(98, x));
    }

    function onPointerDown(e: PointerEvent) {
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      handle!.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const clamped = calcPosition(e.clientX);
      setSwipePosition(clamped);
      onSwipePositionChangeRef.current?.(clamped);
    }

    function onPointerUp(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      try {
        handle!.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    function onLostCapture() {
      dragging = false;
    }

    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
    handle.addEventListener("pointercancel", onPointerUp);
    handle.addEventListener("lostpointercapture", onLostCapture);

    return () => {
      handle.removeEventListener("pointerdown", onPointerDown);
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", onPointerUp);
      handle.removeEventListener("pointercancel", onPointerUp);
      handle.removeEventListener("lostpointercapture", onLostCapture);
    };
    // handleMounted triggers re-run when the DOM element appears
  }, [activeMode, handleMounted]);

  // ══════════════════════════════════════════════════════════════════
  // SPYGLASS
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (activeMode !== "spyglass" || !map) return;

    function onMouseMove(e: MouseEvent) {
      const container = map!.getContainer();
      const rect = container.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      setIsSpyglassActive(inside);
      if (inside) {
        setSpyglassPosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    }

    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      setIsSpyglassActive(false);
    };
  }, [activeMode, map]);

  // ── Derived ──────────────────────────────────────────────────────
  const resolvedModes = useMemo(
    () =>
      modes.map((mode) => ({
        ...mode,
        icon: mode.icon ?? getDefaultModeIcon(mode.mode),
      })),
    [modes]
  );

  const initialRightMapState = useMemo(() => {
    if (!map)
      return { longitude: 0, latitude: 0, zoom: 2, bearing: 0, pitch: 0 };
    return {
      longitude: map.getCenter().lng,
      latitude: map.getCenter().lat,
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    };
  }, [map]);

  const rightMapClipPath = useMemo(() => {
    if (renderMode === "swipe") {
      return `inset(0 0 0 ${currentSwipePos}%)`;
    }
    if (renderMode === "spyglass" && isSpyglassActive) {
      return `circle(${spyglassRadius}px at ${spyglassPosition.x}px ${spyglassPosition.y}px)`;
    }
    return "none";
  }, [
    renderMode,
    currentSwipePos,
    isSpyglassActive,
    spyglassRadius,
    spyglassPosition,
  ]);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <>
      <div
        ref={wrapperRef}
        className="relative"
      >
        <ControlButtonFlyout
          icon={icon ?? <ArrowLeftRight className="h-3.5 w-3.5" />}
          label={label}
          flyoutSide={flyoutSide}
          flyoutClassName={flyoutClassName}
          active={isOpen}
          className={className}
        >
          {resolvedModes.map((mode) => (
            <ControlButton
              key={mode.mode}
              icon={mode.icon}
              label={mode.label}
              active={activeMode === mode.mode}
              disabled={mode.disabled}
              onClick={() => selectMode(mode.mode)}
            />
          ))}
        </ControlButtonFlyout>
      </div>

      {isActive &&
        capturedStyle &&
        map?.getContainer() &&
        createPortal(
          <div
            ref={overlayRef}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 400,
              pointerEvents: "none",
            }}
          >
            {/* ── Right Map ────────────────────────────────────── */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                clipPath: rightMapClipPath,
                opacity: showSpyglassUI && !isSpyglassActive ? 0 : 1,
                transition: showSpyglassUI ? "opacity 0.2s ease" : "none",
              }}
            >
              <MapProvider>
                <Map
                  interactive={false}
                  attributionControl={false}
                  initialViewState={initialRightMapState}
                  style={capturedStyle}
                  onLoad={(m) => {
                    rightMapInstanceRef.current = m;
                    setRightMapInstance(m);
                  }}
                >
                  {rightMapChildren}
                </Map>
              </MapProvider>
            </div>

            {/* ── Swipe / Side-by-side UI ──────────────────────── */}
            {showSwipeUI && (
              <>
                {renderLeftControl && (
                  <div
                    style={{
                      position: "absolute",
                      top: 16,
                      left: 16,
                      zIndex: 800,
                      pointerEvents: "auto",
                    }}
                  >
                    {renderLeftControl}
                  </div>
                )}
                {renderRightControl && (
                  <div
                    style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      zIndex: 800,
                      pointerEvents: "auto",
                    }}
                  >
                    {renderRightControl}
                  </div>
                )}

                {/* Divider line */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${currentSwipePos}%`,
                    width: 4,
                    transform: "translateX(-50%)",
                    background: "white",
                    boxShadow: "0 0 8px rgba(0,0,0,0.4)",
                    zIndex: 850,
                    pointerEvents: "none",
                  }}
                />

                {/* Drag handle */}
                {showDragHandle && (
                  <div
                    ref={handleCallbackRef}
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: `calc(${currentSwipePos}% - 20px)`,
                      width: 40,
                      zIndex: 900,
                      pointerEvents: "auto",
                      cursor: "ew-resize",
                      touchAction: "none",
                      userSelect: "none",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 10px rgba(0,0,0,0.3)",
                        pointerEvents: "none",
                      }}
                    >
                      <Code className="h-4 w-4" />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Spyglass cursor ──────────────────────────────── */}
            {showSpyglassUI && isSpyglassActive && (
              <div
                className={cn(
                  "pointer-events-none absolute rounded-full",
                  "border-4 border-white",
                  "shadow-[0_0_0_2px_rgba(0,0,0,0.3),var(--shadow-xl)]"
                )}
                style={{
                  zIndex: 700,
                  width: spyglassRadius * 2,
                  height: spyglassRadius * 2,
                  left: spyglassPosition.x - spyglassRadius,
                  top: spyglassPosition.y - spyglassRadius,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-4 w-px bg-white/50" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-px w-4 bg-white/50" />
                </div>
              </div>
            )}
          </div>,
          map.getContainer()
        )}
    </>
  );
}

export default CompareControl;
