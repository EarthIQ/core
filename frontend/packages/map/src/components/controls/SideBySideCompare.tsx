// components/controls/SideBySideCompare.tsx
import React, { useRef, useEffect, useCallback } from "react";
import maplibregl from "maplibre-gl";

interface SideBySideCompareProps {
  leftStyle: string;
  rightStyle: string;
  leftLabel?: string;
  rightLabel?: string;
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  syncZoom?: boolean;
  syncPan?: boolean;
  syncBearing?: boolean;
  syncPitch?: boolean;
}

export const SideBySideCompare: React.FC<SideBySideCompareProps> = ({
  leftStyle,
  rightStyle,
  leftLabel = "Left",
  rightLabel = "Right",
  initialViewState = { longitude: 0, latitude: 0, zoom: 2 },
  syncZoom = true,
  syncPan = true,
  syncBearing = true,
  syncPitch = true,
}) => {
  const leftMapRef = useRef<maplibregl.Map | null>(null);
  const rightMapRef = useRef<maplibregl.Map | null>(null);
  const leftContainerRef = useRef<HTMLDivElement>(null);
  const rightContainerRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  const syncMap = useCallback(
    (source: maplibregl.Map, target: maplibregl.Map) => {
      if (isSyncing.current) return;
      isSyncing.current = true;

      if (syncPan) target.setCenter(source.getCenter());
      if (syncZoom) target.setZoom(source.getZoom());
      if (syncBearing) target.setBearing(source.getBearing());
      if (syncPitch) target.setPitch(source.getPitch());

      isSyncing.current = false;
    },
    [syncPan, syncZoom, syncBearing, syncPitch]
  );

  useEffect(() => {
    if (!leftContainerRef.current || !rightContainerRef.current) return;

    // Initialize left map
    leftMapRef.current = new maplibregl.Map({
      container: leftContainerRef.current,
      style: leftStyle,
      center: [initialViewState.longitude, initialViewState.latitude],
      zoom: initialViewState.zoom,
      attributionControl: false,
    });

    // Initialize right map
    rightMapRef.current = new maplibregl.Map({
      container: rightContainerRef.current,
      style: rightStyle,
      center: [initialViewState.longitude, initialViewState.latitude],
      zoom: initialViewState.zoom,
      attributionControl: false,
    });

    // Sync maps
    const leftMap = leftMapRef.current;
    const rightMap = rightMapRef.current;

    leftMap.on("move", () => syncMap(leftMap, rightMap));
    rightMap.on("move", () => syncMap(rightMap, leftMap));

    // Add navigation controls
    leftMap.addControl(new maplibregl.NavigationControl(), "bottom-left");
    rightMap.addControl(new maplibregl.NavigationControl(), "bottom-right");

    return () => {
      leftMap.remove();
      rightMap.remove();
    };
  }, [leftStyle, rightStyle, initialViewState, syncMap]);

  // Update styles when they change
  useEffect(() => {
    leftMapRef.current?.setStyle(leftStyle);
  }, [leftStyle]);

  useEffect(() => {
    rightMapRef.current?.setStyle(rightStyle);
  }, [rightStyle]);

  return (
    <div className="relative flex h-full w-full">
      {/* Left Map */}
      <div className="relative flex-1 border-r border-[var(--border-primary)]">
        <div
          ref={leftContainerRef}
          className="absolute inset-0"
        />
        <div className="absolute top-4 left-4 z-10 rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface)]/90 px-3 py-1.5 shadow-[var(--shadow-md)] backdrop-blur-sm">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {leftLabel}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="absolute top-0 bottom-0 left-1/2 z-20 w-1 -translate-x-1/2 bg-[var(--border-primary)] shadow-[var(--shadow-md)]">
        <div className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-primary)] bg-[var(--surface)] shadow-[var(--shadow-md)]">
          <svg
            className="h-4 w-4 text-[var(--text-tertiary)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 9l4-4 4 4m0 6l-4 4-4-4"
            />
          </svg>
        </div>
      </div>

      {/* Right Map */}
      <div className="relative flex-1">
        <div
          ref={rightContainerRef}
          className="absolute inset-0"
        />
        <div className="absolute top-4 right-4 z-10 rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface)]/90 px-3 py-1.5 shadow-[var(--shadow-md)] backdrop-blur-sm">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {rightLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SideBySideCompare;
