import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
  memo,
  useContext,
  type DragEvent,
} from "react";
import * as maplibregl from "maplibre-gl";
import { setWorkerUrl } from "maplibre-gl";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import { Deck } from "@deck.gl/core";
import { MapContext, type MapContextValue } from "../../context/MapContext";
import { cn } from "@packages/ui";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

setWorkerUrl(workerUrl);

/* =============================================================================
   Type Definitions
   ============================================================================= */

export interface InitialViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

export interface MapClickEvent {
  lngLat: { lng: number; lat: number };
  point: { x: number; y: number };
  features?: maplibregl.MapGeoJSONFeature[];
  originalEvent: MouseEvent;
}

export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface TerrainConfig {
  enabled: boolean;
  sourceUrl?: string;
  exaggeration?: number;
}

export interface FileDropEvent {
  /** The dropped files that passed validation */
  files: File[];
  /** Pixel coordinates relative to the map container */
  point: { x: number; y: number };
  /** Geographic coordinates where the file was dropped */
  lngLat: { lng: number; lat: number } | null;
}

export interface FileDropError {
  file: File;
  reason: string;
}

export interface FileDropConfig {
  /** Enable file drag & drop on the map */
  enabled: boolean;
  /** Accepted file types (MIME types or extensions) */
  accept?: string[];
  /** Max file size in bytes (default 50MB) */
  maxSize?: number;
  /** Allow multiple files (default true) */
  multiple?: boolean;
  /** Custom overlay content */
  overlay?: React.ReactNode | ((state: FileDropState) => React.ReactNode);
}

export interface FileDropState {
  isDragOver: boolean;
  fileCount: number;
}

export interface MapRef {
  getMap: () => MapLibreMap | null;
  getDeck: () => Deck | null;
  flyTo: (options: maplibregl.FlyToOptions) => void;
  jumpTo: (options: maplibregl.JumpToOptions) => void;
  fitBounds: (
    bounds: maplibregl.LngLatBoundsLike,
    options?: maplibregl.FitBoundsOptions
  ) => void;
  getViewState: () => ViewState | null;
}

export interface MapProps {
  initialViewState?: InitialViewState;
  style?: string | StyleSpecification;
  terrain?: TerrainConfig | boolean;
  className?: string;
  containerStyle?: React.CSSProperties;
  children?: React.ReactNode;
  onLoad?: (map: MapLibreMap) => void;
  onClick?: (event: MapClickEvent) => void;
  onDblClick?: (event: MapClickEvent) => void;
  onMove?: (viewState: ViewState) => void;
  onMoveEnd?: (viewState: ViewState) => void;
  onError?: (error: Error) => void;
  useDeckGL?: boolean;
  deckLayers?: any[];
  interactive?: boolean;
  projection?: "mercator" | "globe";
  minZoom?: number;
  maxZoom?: number;
  maxBounds?: maplibregl.LngLatBoundsLike;
  hash?: boolean;
  attributionControl?: boolean;
  ariaLabel?: string;

  /** File drag & drop configuration */
  fileDrop?: FileDropConfig;
  /** Called when valid files are dropped on the map */
  onFileDrop?: (event: FileDropEvent) => void;
  /** Called when dropped files fail validation */
  onFileDropError?: (errors: FileDropError[]) => void;

  /** Custom loading icon component */
  loadingIcon?: React.ReactNode;
}

/* =============================================================================
   Constants
   ============================================================================= */

const DEFAULT_VIEW_STATE: InitialViewState = {
  longitude: 0,
  latitude: 0,
  zoom: 2,
  pitch: 0,
  bearing: 0,
};

const DEFAULT_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [],
};
const DEFAULT_TERRAIN_SOURCE = "https://tiles.mapterhorn.com/{z}/{x}/{y}.webp";

const DEFAULT_ACCEPTED_FILE_TYPES = [
  // Geo formats
  ".geojson",
  ".json",
  ".kml",
  ".gpx",
  ".csv",
  ".topojson",
  // Raster
  ".tif",
  ".tiff",
  ".png",
  ".jpg",
  ".jpeg",
  // MIME types
  "application/geo+json",
  "application/json",
  "application/vnd.google-earth.kml+xml",
  "application/gpx+xml",
  "text/csv",
  "image/tiff",
  "image/png",
  "image/jpeg",
];

const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/* =============================================================================
   Helper Functions
   ============================================================================= */

const normalizeTerrainConfig = (
  terrain: TerrainConfig | boolean | undefined
): TerrainConfig => {
  if (typeof terrain === "boolean") {
    return { enabled: terrain };
  }
  return terrain ?? { enabled: false };
};

const getViewStateFromMap = (map: MapLibreMap): ViewState => {
  const center = map.getCenter();
  return {
    longitude: center.lng,
    latitude: center.lat,
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    bearing: map.getBearing(),
  };
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

function validateFile(
  file: File,
  accept: string[],
  maxSize: number
): string | null {
  // Size check
  if (file.size > maxSize) {
    return `File exceeds ${formatBytes(maxSize)} limit (${formatBytes(file.size)})`;
  }

  // Type check
  if (accept.length > 0) {
    const isAccepted = accept.some((type) => {
      if (type.startsWith(".")) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      if (type.endsWith("/*")) {
        return file.type.startsWith(type.replace("/*", "/"));
      }
      return file.type === type;
    });

    if (!isAccepted) {
      const ext = getFileExtension(file.name);
      return `File type ".${ext}" (${file.type || "unknown"}) is not supported`;
    }
  }

  return null;
}

/* =============================================================================
   File Drop Overlay Component
   ============================================================================= */

const DefaultFileDropOverlay: React.FC<{ fileCount: number }> = memo(
  ({ fileCount }) => (
    <div className="rounded-2xl border-2 border-dashed border-blue-400 bg-white/90 px-8 py-6 shadow-2xl dark:bg-gray-900/90">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
          <svg
            className="h-8 w-8 animate-bounce text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
            Drop file{fileCount > 1 ? "s" : ""} on map
          </p>
          <p className="mt-1 text-sm text-gray-500">
            GeoJSON, KML, GPX, CSV, Images
          </p>
          {fileCount > 0 && (
            <p className="mt-1 text-xs text-blue-500">
              {fileCount} file{fileCount > 1 ? "s" : ""} detected
            </p>
          )}
        </div>
      </div>
    </div>
  )
);

DefaultFileDropOverlay.displayName = "DefaultFileDropOverlay";

/* =============================================================================
   Component
   ============================================================================= */

export const Map = memo(
  forwardRef<MapRef, MapProps>(
    (
      {
        initialViewState = DEFAULT_VIEW_STATE,
        style = DEFAULT_STYLE,
        terrain = false,
        className = "",
        containerStyle,
        children,
        onLoad,
        onClick,
        onDblClick,
        onMove,
        onMoveEnd,
        onError,
        useDeckGL = false,
        deckLayers = [],
        interactive = true,
        projection = "mercator",
        minZoom = 0,
        maxZoom = 24,
        maxBounds,
        hash = false,
        attributionControl = true,
        ariaLabel = "Interactive map",
        fileDrop,
        onFileDrop,
        onFileDropError,
        loadingIcon,
      },
      ref
    ) => {
      const containerRef = useRef<HTMLDivElement>(null);
      const mapContainerRef = useRef<HTMLDivElement>(null);
      const deckCanvasRef = useRef<HTMLCanvasElement>(null);
      const mapInstanceRef = useRef<MapLibreMap | null>(null);
      const deckInstanceRef = useRef<Deck | null>(null);
      const parentContext = useContext(MapContext);

      const [isLoaded, setIsLoaded] = useState(false);
      const [error, setError] = useState<Error | null>(null);

      // ─── File Drop State ───────────────────────────
      const [isDragOver, setIsDragOver] = useState(false);
      const [dragFileCount, setDragFileCount] = useState(0);
      const dragCounterRef = useRef(0);

      const fileDropEnabled = fileDrop?.enabled ?? false;
      const fileDropAccept = fileDrop?.accept ?? DEFAULT_ACCEPTED_FILE_TYPES;
      const fileDropMaxSize = fileDrop?.maxSize ?? DEFAULT_MAX_FILE_SIZE;
      const fileDropMultiple = fileDrop?.multiple ?? true;

      const mergedViewState = useMemo(
        () => ({ ...DEFAULT_VIEW_STATE, ...initialViewState }),
        [initialViewState]
      );

      const terrainConfig = useMemo(
        () => normalizeTerrainConfig(terrain),
        [terrain]
      );

      // Store callbacks in refs to use latest version without re-creating map
      const callbacksRef = useRef({
        onLoad,
        onClick,
        onDblClick,
        onMove,
        onMoveEnd,
        onError,
        onFileDrop,
        onFileDropError,
      });
      useEffect(() => {
        callbacksRef.current = {
          onLoad,
          onClick,
          onDblClick,
          onMove,
          onMoveEnd,
          onError,
          onFileDrop,
          onFileDropError,
        };
      }, [
        onLoad,
        onClick,
        onDblClick,
        onMove,
        onMoveEnd,
        onError,
        onFileDrop,
        onFileDropError,
      ]);

      useImperativeHandle(
        ref,
        () => ({
          getMap: () => mapInstanceRef.current,
          getDeck: () => deckInstanceRef.current,
          flyTo: (options) => mapInstanceRef.current?.flyTo(options),
          jumpTo: (options) => mapInstanceRef.current?.jumpTo(options),
          fitBounds: (bounds, options) =>
            mapInstanceRef.current?.fitBounds(bounds, options),
          getViewState: () => {
            const map = mapInstanceRef.current;
            return map ? getViewStateFromMap(map) : null;
          },
        }),
        []
      );

      /* -----------------------------------------------------------------------
         File Drop Handlers
         ----------------------------------------------------------------------- */

      const handleDragEnter = useCallback(
        (e: DragEvent<HTMLDivElement>) => {
          if (!fileDropEnabled) return;

          e.preventDefault();
          e.stopPropagation();

          dragCounterRef.current += 1;

          // Check if the drag contains files
          const hasFiles = Array.from(e.dataTransfer.types).includes("Files");
          if (!hasFiles) return;

          if (e.dataTransfer.items) {
            setDragFileCount(e.dataTransfer.items.length);
          }
          setIsDragOver(true);
        },
        [fileDropEnabled]
      );

      const handleDragLeave = useCallback(
        (e: DragEvent<HTMLDivElement>) => {
          if (!fileDropEnabled) return;

          e.preventDefault();
          e.stopPropagation();

          dragCounterRef.current -= 1;
          if (dragCounterRef.current === 0) {
            setIsDragOver(false);
            setDragFileCount(0);
          }
        },
        [fileDropEnabled]
      );

      const handleDragOver = useCallback(
        (e: DragEvent<HTMLDivElement>) => {
          if (!fileDropEnabled) return;

          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "copy";
        },
        [fileDropEnabled]
      );

      const handleDrop = useCallback(
        (e: DragEvent<HTMLDivElement>) => {
          if (!fileDropEnabled) return;

          e.preventDefault();
          e.stopPropagation();

          // Reset drag state
          dragCounterRef.current = 0;
          setIsDragOver(false);
          setDragFileCount(0);

          const droppedFiles = Array.from(e.dataTransfer.files);
          if (droppedFiles.length === 0) return;

          const filesToProcess = fileDropMultiple
            ? droppedFiles
            : droppedFiles.slice(0, 1);

          // Validate files
          const accepted: File[] = [];
          const errors: FileDropError[] = [];

          for (const file of filesToProcess) {
            const validationError = validateFile(
              file,
              fileDropAccept,
              fileDropMaxSize
            );
            if (validationError) {
              errors.push({ file, reason: validationError });
            } else {
              accepted.push(file);
            }
          }

          // Calculate drop coordinates
          const rect = containerRef.current?.getBoundingClientRect();
          const point = rect
            ? { x: e.clientX - rect.left, y: e.clientY - rect.top }
            : { x: 0, y: 0 };

          // Convert pixel to lngLat using the map instance
          let lngLat: { lng: number; lat: number } | null = null;
          const map = mapInstanceRef.current;
          if (map) {
            try {
              const coords = map.unproject([point.x, point.y]);
              lngLat = { lng: coords.lng, lat: coords.lat };
            } catch {
              // Map might not be ready; leave lngLat as null
            }
          }

          if (accepted.length > 0) {
            callbacksRef.current.onFileDrop?.({
              files: accepted,
              point,
              lngLat,
            });
          }

          if (errors.length > 0) {
            callbacksRef.current.onFileDropError?.(errors);
          }
        },
        [fileDropEnabled, fileDropMultiple, fileDropAccept, fileDropMaxSize]
      );

      /* -----------------------------------------------------------------------
         Map Initialization Effect
         ----------------------------------------------------------------------- */
      useEffect(() => {
        if (!mapContainerRef.current) return;

        let isActive = true;
        let map: MapLibreMap | null = null;
        let deck: Deck | null = null;

        const initMap = () => {
          try {
            map = new maplibregl.Map({
              container: mapContainerRef.current!,
              style,
              center: [mergedViewState.longitude, mergedViewState.latitude],
              zoom: mergedViewState.zoom,
              pitch: mergedViewState.pitch,
              bearing: mergedViewState.bearing,
              interactive,
              minZoom,
              maxZoom,
              maxBounds,
              hash,
              attributionControl: attributionControl as any,
              preserveDrawingBuffer: true,
            } as any);

            mapInstanceRef.current = map;

            const handleLoad = () => {
              if (!isActive) {
                map?.remove();
                return;
              }

              if (terrainConfig.enabled && map) {
                const sourceUrl =
                  terrainConfig.sourceUrl || DEFAULT_TERRAIN_SOURCE;
                const exaggeration = terrainConfig.exaggeration ?? 1;

                if (!map.getSource("terrain-dem")) {
                  map.addSource("terrain-dem", {
                    type: "raster-dem",
                    tiles: [sourceUrl],
                    encoding: "terrarium",
                    maxzoom: 14,
                    tileSize: 256,
                  });
                }
                map.setTerrain({ source: "terrain-dem", exaggeration });
              }

              if (useDeckGL && deckCanvasRef.current && map) {
                deck = new Deck({
                  canvas: deckCanvasRef.current,
                  width: "100%",
                  height: "100%",
                  initialViewState: mergedViewState,
                  controller: false,
                  layers: deckLayers,
                });
                deckInstanceRef.current = deck;
                parentContext?.setDeck?.(deck);

                map.on("move", () => {
                  if (deck && map) {
                    deck.setProps({ viewState: getViewStateFromMap(map) });
                  }
                });
              }

              setIsLoaded(true);
              parentContext?.setIsLoaded?.(true);
              parentContext?.setMap?.(map);
              setError(null);
              callbacksRef.current.onLoad?.(map!);
            };

            const handleError = (e: maplibregl.ErrorEvent) => {
              const errorMessage = e.error?.message || "";
              if (
                errorMessage.includes("aborted") ||
                errorMessage.includes("abort")
              ) {
                return;
              }

              if (isActive) {
                const mapError = new Error(
                  errorMessage || "Map error occurred"
                );
                setError(mapError);
                callbacksRef.current.onError?.(mapError);
              }
            };

            map.once("load", handleLoad);
            // map.on("error", handleError);

            map.on("click", (e) => {
              if (!isActive || !map) return;
              const features = map.queryRenderedFeatures(e.point);
              callbacksRef.current.onClick?.({
                lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
                point: { x: e.point.x, y: e.point.y },
                features,
                originalEvent: e.originalEvent,
              });
            });

            map.on("dblclick", (e) => {
              if (!isActive || !map) return;
              const features = map.queryRenderedFeatures(e.point);
              callbacksRef.current.onDblClick?.({
                lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
                point: { x: e.point.x, y: e.point.y },
                features,
                originalEvent: e.originalEvent,
              });
            });

            map.on("move", () => {
              if (!isActive || !map) return;
              callbacksRef.current.onMove?.(getViewStateFromMap(map));
            });

            map.on("moveend", () => {
              if (!isActive || !map) return;
              callbacksRef.current.onMoveEnd?.(getViewStateFromMap(map));
            });
          } catch (err) {
            if (isActive) {
              const mapError =
                err instanceof Error
                  ? err
                  : new Error("Map initialization failed");
              setError(mapError);
              callbacksRef.current.onError?.(mapError);
            }
          }
        };

        initMap();

        return () => {
          isActive = false;

          if (deckInstanceRef.current) {
            deckInstanceRef.current.finalize();
            deckInstanceRef.current = null;
            parentContext?.setDeck?.(null);
          }

          if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
            parentContext?.setMap?.(null);
          }

          parentContext?.setIsLoaded?.(false);
          deck = null;
          map = null;
        };
      }, [
        style,
        mergedViewState.longitude,
        mergedViewState.latitude,
        mergedViewState.zoom,
        mergedViewState.pitch,
        mergedViewState.bearing,
        interactive,
        minZoom,
        maxZoom,
        hash,
        attributionControl,
        terrainConfig.enabled,
        terrainConfig.sourceUrl,
        terrainConfig.exaggeration,
        useDeckGL,
      ]);

      useEffect(() => {
        if (deckInstanceRef.current && useDeckGL) {
          deckInstanceRef.current.setProps({ layers: deckLayers });
        }
      }, [deckLayers, useDeckGL]);

      const contextValue = useMemo<MapContextValue>(
        () => ({
          map: mapInstanceRef.current,
          deck: deckInstanceRef.current,
          isLoaded,
          setMap: () => {},
          setDeck: () => {},
          setIsLoaded: () => {},
        }),
        [isLoaded]
      );

      // ─── File Drop State for Overlay ────────────────
      const fileDropState: FileDropState = useMemo(
        () => ({
          isDragOver,
          fileCount: dragFileCount,
        }),
        [isDragOver, dragFileCount]
      );

      // Error display
      if (error) {
        return (
          <div
            className={`map-error ${className}`}
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              padding: "1rem",
              ...containerStyle,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <strong>Map Error</strong>
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem" }}>
                {error.message}
              </p>
            </div>
          </div>
        );
      }

      return (
        <MapContext.Provider value={contextValue}>
          <div
            ref={containerRef}
            className={cn("map-container relative h-full w-full", className)}
            style={containerStyle}
            role="application"
            aria-label={ariaLabel}
            // ─── File Drop Event Handlers ────────────────
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* MapLibre GL Container */}
            <div
              ref={mapContainerRef}
              className="absolute inset-0 h-full w-full"
            />

            {/* Deck.gl Canvas */}
            {useDeckGL && (
              <canvas
                ref={deckCanvasRef}
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
            )}

            {/* Loading indicator */}
            {!isLoaded && (
              <div
                className={cn(
                  "absolute inset-0 z-10",
                  "flex items-center justify-center",
                  "bg-[var(--backdrop)]",
                  "text-[var(--text-secondary)]"
                )}
                role="status"
                aria-live="polite"
                aria-label="Loading map"
              >
                {loadingIcon ? (
                  loadingIcon
                ) : (
                  <>
                    <img
                      src="/logo_dark.svg"
                      alt="Loading map"
                      className="h-48 w-48 animate-pulse dark:hidden"
                    />
                    <img
                      src="/logo.svg"
                      alt="Loading map"
                      className="hidden h-48 w-48 animate-pulse dark:block"
                    />
                  </>
                )}
              </div>
            )}

            {/* File Drop Overlay */}
            {fileDropEnabled && isDragOver && (
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 z-50",
                  "flex items-center justify-center",
                  "bg-blue-500/10 backdrop-blur-[2px]",
                  "transition-all duration-200"
                )}
                aria-live="assertive"
                role="status"
              >
                {typeof fileDrop?.overlay === "function"
                  ? fileDrop.overlay(fileDropState)
                  : (fileDrop?.overlay ?? (
                      <DefaultFileDropOverlay fileCount={dragFileCount} />
                    ))}
              </div>
            )}

            {/* Children only render when loaded */}
            {isLoaded && children}
          </div>
        </MapContext.Provider>
      );
    }
  )
);

Map.displayName = "Map";
