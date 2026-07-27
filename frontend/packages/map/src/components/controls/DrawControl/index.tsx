// DrawControl.tsx
import {
  type ReactNode,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from "react";
import { ControlButton, ControlButtonFlyout } from "../MapControlButton";
import { useDrawControl } from "../../../hooks/useDrawControl";
import type {
  DrawMode,
  DrawToolDefinition,
  DrawCallbacks,
  DrawOptions,
} from "./types";
import type { FeatureCollection } from "geojson";
import {
  PenLine,
  RectangleHorizontal,
  Trash2,
  Circle,
  Pentagon,
  Pen,
} from "lucide-react";

function LineIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20L20 4" />
    </svg>
  );
}

function PointIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx={12}
        cy={12}
        r={3}
      />
      <circle
        cx={12}
        cy={12}
        r={8}
        opacity={0.4}
      />
    </svg>
  );
}

function FreehandIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 17c2-4 4-8 8-8s4 6 8 2" />
    </svg>
  );
}

function getDefaultIcon(mode: DrawMode): ReactNode {
  const icons: Record<DrawMode, ReactNode> = {
    polygon: <Pentagon className="h-4 w-4" />,
    rectangle: <RectangleHorizontal className="h-4 w-4" />,
    circle: <Circle className="h-4 w-4" />,
    line: <LineIcon />,
    point: <PointIcon />,
    freehand: <FreehandIcon />,
  };
  return icons[mode] ?? null;
}

// ═══════════════════════════════════════════════════════════════════════
// DEFAULT TOOLS
// ═══════════════════════════════════════════════════════════════════════

const DEFAULT_TOOLS: DrawToolDefinition[] = [
  { mode: "polygon", label: "Draw polygon" },
  { mode: "rectangle", label: "Draw rectangle" },
  { mode: "circle", label: "Draw circle" },
  { mode: "line", label: "Draw line" },
  { mode: "point", label: "Place point" },
  { mode: "freehand", label: "Freehand draw" },
];

// ═══════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════

export interface DrawControlProps {
  /** Drawing tools to show */
  tools?: DrawToolDefinition[];
  /** Flyout direction */
  flyoutSide?: "left" | "right";
  /** Custom trigger icon */
  icon?: ReactNode;
  /** Trigger button label */
  label?: string;
  /** Trigger button className */
  className?: string;
  /** Flyout className */
  flyoutClassName?: string;
  /** Close on click outside */
  closeOnClickOutside?: boolean;
  /** Close on escape */
  closeOnEscape?: boolean;
  /** Show trash button */
  showTrash?: boolean;
  /** Initial features */
  initialFeatures?: FeatureCollection;
  /** Callback when features change */
  onFeaturesChange?: (features: FeatureCollection) => void;
  /** Callback when feature is created */
  onCreate?: DrawCallbacks["onCreate"];
  /** Callback when feature is updated */
  onUpdate?: DrawCallbacks["onUpdate"];
  /** Callback when feature is deleted */
  onDelete?: DrawCallbacks["onDelete"];
  /** Callback when selection changes */
  onSelectionChange?: DrawCallbacks["onSelectionChange"];
  /** Callback when mode changes */
  onModeChange?: DrawCallbacks["onModeChange"];
  /** Draw options */
  drawOptions?: DrawOptions;
  /** Force an active mode programmatically */
  mode?: DrawMode | null;
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export interface DrawControlRef {
  deleteAll: () => void;
  deleteFeatures: (ids: string[]) => void;
  setMode: (mode: DrawMode | null) => void;
}

export const DrawControl = forwardRef<DrawControlRef, DrawControlProps>(
  function DrawControl(
    {
      tools = DEFAULT_TOOLS,
      flyoutSide = "left",
      icon,
      label = "Drawing tools",
      className,
      flyoutClassName,
      closeOnClickOutside = true,
      closeOnEscape = true,
      showTrash = true,
      initialFeatures,
      onFeaturesChange,
      onCreate,
      onUpdate,
      onDelete,
      onSelectionChange,
      onModeChange,
      drawOptions = {},
      mode,
    },
    ref
  ) {
    // Use the standalone hook
    const { state, setMode, deleteFeatures, deleteAll, isReady } = useDrawControl(
      {
        onCreate,
        onUpdate,
        onDelete,
        onSelectionChange,
        onModeChange,
        onFeaturesChange,
      },
      {
        ...drawOptions,
        initialFeatures,
      }
    );

    useImperativeHandle(ref, () => ({
      deleteAll,
      deleteFeatures,
      setMode,
    }));

    useEffect(() => {
      if (isReady && mode !== undefined) {
        setMode(mode);
      }
    }, [mode, isReady, setMode]);

    const [manuallyOpen, setManuallyOpen] = useState(false);
    const isOpen = manuallyOpen || state.activeMode !== null;
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close panel
    const closePanel = useCallback(() => {
      setManuallyOpen(false);
      if (state.activeMode !== null) {
        setMode(null);
      }
    }, [state.activeMode, setMode]);

    // Toggle panel
    const togglePanel = useCallback(() => {
      if (isOpen) {
        closePanel();
      } else {
        setManuallyOpen(true);
      }
    }, [isOpen, closePanel]);

    // Select tool
    const selectTool = useCallback(
      (mode: DrawMode) => {
        if (mode === state.activeMode) {
          setMode(null);
        } else {
          setMode(mode);
        }
      },
      [state.activeMode, setMode]
    );

    // Delete handler
    const handleDelete = useCallback(() => {
      if (state.selectedIds.length > 0) {
        deleteFeatures(state.selectedIds);
      } else {
        deleteAll();
      }
    }, [state.selectedIds, deleteFeatures, deleteAll]);

    // Click outside
    useEffect(() => {
      if (!closeOnClickOutside || !isOpen) return;

      function handlePointerDown(event: PointerEvent) {
        if (
          wrapperRef.current &&
          !wrapperRef.current.contains(event.target as Node)
        ) {
          // Don't close when a drawing mode is active — the user
          // needs to click on the map to draw.
          if (state.activeMode !== null) return;
          closePanel();
        }
      }

      document.addEventListener("pointerdown", handlePointerDown);
      return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, [closeOnClickOutside, isOpen, closePanel, state.activeMode]);

    // Escape key
    useEffect(() => {
      if (!closeOnEscape || !isOpen) return;

      function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
          closePanel();
        }
      }

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [closeOnEscape, isOpen, closePanel]);

    // Resolved tools with icons
    const resolvedTools = useMemo(
      () =>
        tools.map((tool) => ({
          ...tool,
          icon: tool.icon ?? getDefaultIcon(tool.mode),
        })),
      [tools]
    );

    const hasSelectedFeatures = state.selectedIds.length > 0;
    const hasAnyFeatures = state.features.features.length > 0;

    return (
      <div
        ref={wrapperRef}
        className="relative"
      >
        <ControlButtonFlyout
          icon={icon ?? <PenLine className="h-4 w-4" />}
          label={label}
          flyoutSide={flyoutSide}
          flyoutAlign="start"
          active={isOpen}
          forceOpen={state.activeMode !== null}
          disabled={!isReady}
          className={className}
          flyoutClassName={flyoutClassName}
        >
          {resolvedTools.map((tool) => (
            <ControlButton
              key={tool.mode}
              icon={tool.icon}
              label={tool.label}
              active={state.activeMode === tool.mode}
              onClick={() => selectTool(tool.mode)}
              disabled={!isReady}
            />
          ))}
          {showTrash && hasAnyFeatures && (
            <>
              <div className="mx-2 h-px bg-[var(--border-primary)]" />
              <ControlButton
                icon={<Trash2 className="h-4 w-4" />}
                label={hasSelectedFeatures ? "Delete selected" : "Delete all"}
                onClick={handleDelete}
                className="text-[var(--error)] hover:bg-[var(--error-bg)]"
              />
            </>
          )}
        </ControlButtonFlyout>
      </div>
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════
// EXPORT HOOK FOR EXTERNAL USE
// ═══════════════════════════════════════════════════════════════════════

export { useDrawControl } from "../../../hooks/useDrawControl";
export type {
  DrawMode,
  DrawToolDefinition,
  DrawCallbacks,
  DrawOptions,
  DrawState,
} from "./types";
