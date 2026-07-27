import React, { useState, useCallback, useRef, useEffect } from "react";
import { useMap } from "../../hooks/useMap";
import { Card, Stack, Text } from "@packages/ui";
import type {
  StyleSpecification,
  LayerSpecification,
  SourceSpecification,
} from "maplibre-gl";

export interface BasemapOption {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Style URL or style object */
  style: string | StyleSpecification;
  /** Thumbnail URL */
  thumbnail?: string;
  /** Category/group */
  category?: "light" | "dark" | "satellite" | "terrain" | "custom";
  /** Attribution */
  attribution?: string;
  /** Labels overlay URL (for satellite maps) */
  labelsOverlay?: string;
}

export interface BasemapSelectorProps {
  /** Available basemap options */
  basemaps: BasemapOption[];
  /** Default basemap ID */
  defaultBasemap?: string;
  /** Position on map */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Display mode */
  displayMode?: "dropdown" | "gallery" | "compact" | "floating";
  /** Show thumbnails */
  showThumbnails?: boolean;
  /** Thumbnail size */
  thumbnailSize?: "sm" | "md" | "lg";
  /** Group by category */
  groupByCategory?: boolean;
  /** Callback on basemap change */
  onChange?: (basemap: BasemapOption) => void;
  /** Show labels toggle for satellite */
  showLabelsToggle?: boolean;
  /** Custom className */
  className?: string;
  /** Collapsible */
  collapsible?: boolean;
  /** Initially collapsed */
  defaultCollapsed?: boolean;
}

// Known basemap source prefixes to filter out when preserving custom layers
const BASEMAP_SOURCE_PREFIXES = [
  "composite",
  "mapbox",
  "openmaptiles",
  "maptiler",
  "carto",
  "esri",
  "stadia",
  "osm",
];

// Predefined popular basemaps
export const PREDEFINED_BASEMAPS: BasemapOption[] = [
  // Light themes
  {
    id: "carto-positron",
    name: "Positron",
    style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    thumbnail:
      "https://basemaps.cartocdn.com/gl/positron-gl-style/thumbnail.png",
    category: "light",
    attribution: "© CARTO",
  },
  {
    id: "osm-bright",
    name: "OSM Bright",
    style: "https://tiles.stadiamaps.com/styles/osm_bright.json",
    thumbnail: "https://tiles.stadiamaps.com/styles/osm_bright/thumbnail.png",
    category: "light",
    attribution: "© Stadia Maps © OpenMapTiles © OpenStreetMap",
  },
  // Dark themes
  {
    id: "carto-dark-matter",
    name: "Dark Matter",
    style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    thumbnail:
      "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/thumbnail.png",
    category: "dark",
    attribution: "© CARTO",
  },
  {
    id: "stadia-alidade-smooth-dark",
    name: "Alidade Dark",
    style: "https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json",
    category: "dark",
    attribution: "© Stadia Maps © OpenMapTiles © OpenStreetMap",
  },
  // Satellite
  {
    id: "esri-satellite",
    name: "ESRI Satellite",
    style: {
      version: 8,
      sources: {
        "esri-satellite": {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "© Esri",
        },
      },
      layers: [
        {
          id: "esri-satellite-layer",
          type: "raster",
          source: "esri-satellite",
        },
      ],
    } as StyleSpecification,
    category: "satellite",
    attribution: "© Esri",
  },
  // Terrain
  {
    id: "stadia-outdoors",
    name: "Stadia Outdoors",
    style: "https://tiles.stadiamaps.com/styles/outdoors.json",
    category: "terrain",
    attribution: "© Stadia Maps © OpenMapTiles © OpenStreetMap",
  },
];

interface PreservedData {
  sources: Record<string, SourceSpecification>;
  layers: LayerSpecification[];
  images: string[];
}

export const BasemapSelector: React.FC<BasemapSelectorProps> = ({
  basemaps = PREDEFINED_BASEMAPS,
  defaultBasemap,
  position = "bottom-left",
  displayMode = "compact",
  showThumbnails = true,
  thumbnailSize = "md",
  groupByCategory = false,
  onChange,
  showLabelsToggle = true,
  className,
  collapsible = true,
  defaultCollapsed = true,
}) => {
  const { map, isLoaded } = useMap();
  const [activeBasemap, setActiveBasemap] = useState<string>(
    defaultBasemap ?? basemaps[0]?.id ?? ""
  );
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);
  const [showLabels, setShowLabels] = useState(true);
  const [isChanging, setIsChanging] = useState(false);

  // Use refs to store preserved data to avoid stale closures
  const preservedDataRef = useRef<PreservedData>({
    sources: {},
    layers: [],
    images: [],
  });

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Store pending style change to handle race conditions
  const pendingChangeRef = useRef<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const thumbnailSizes = {
    sm: { width: 48, height: 48 },
    md: { width: 64, height: 64 },
    lg: { width: 96, height: 96 },
  };

  // Group basemaps by category
  const groupedBasemaps = React.useMemo(() => {
    if (!groupByCategory) return { all: basemaps };

    return basemaps.reduce(
      (acc, basemap) => {
        const category = basemap.category || "custom";
        if (!acc[category]) acc[category] = [];
        acc[category].push(basemap);
        return acc;
      },
      {} as Record<string, BasemapOption[]>
    );
  }, [basemaps, groupByCategory]);

  const categoryLabels: Record<string, string> = {
    light: "Light",
    dark: "Dark",
    satellite: "Satellite",
    terrain: "Terrain",
    custom: "Custom",
  };

  // Check if a source ID is a basemap source
  const isBasemapSource = useCallback((sourceId: string): boolean => {
    const lowerSourceId = sourceId.toLowerCase();
    return BASEMAP_SOURCE_PREFIXES.some(
      (prefix) =>
        lowerSourceId.startsWith(prefix) ||
        lowerSourceId.includes("basemap") ||
        sourceId.startsWith("mapbox://")
    );
  }, []);

  // Preserve custom layers before style change
  const preserveLayers = useCallback(() => {
    if (!map) return;

    try {
      const style = map.getStyle();
      if (!style) return;

      const preserved: PreservedData = {
        sources: {},
        layers: [],
        images: [],
      };

      // Get list of custom source IDs (non-basemap sources)
      const customSourceIds = new Set<string>();

      Object.entries(style.sources || {}).forEach(([id, source]) => {
        if (!isBasemapSource(id)) {
          customSourceIds.add(id);
          // Deep clone the source to avoid reference issues
          preserved.sources[id] = JSON.parse(JSON.stringify(source));
        }
      });

      // Preserve layers that use custom sources
      (style.layers || []).forEach((layer) => {
        const layerSource = (layer as any).source;
        if (layerSource && customSourceIds.has(layerSource)) {
          // Deep clone the layer
          preserved.layers.push(JSON.parse(JSON.stringify(layer)));
        }
      });

      // Preserve custom images/icons
      const images = (map as any).style?.imageManager?.images;
      if (images) {
        Object.keys(images).forEach((imageId) => {
          // Skip default/built-in images
          if (!imageId.startsWith("mapbox-") && !imageId.startsWith("maki-")) {
            preserved.images.push(imageId);
          }
        });
      }

      preservedDataRef.current = preserved;

      console.debug("Preserved layers:", {
        sources: Object.keys(preserved.sources),
        layers: preserved.layers.map((l) => l.id),
        images: preserved.images,
      });
    } catch (error) {
      console.error("Error preserving layers:", error);
    }
  }, [map, isBasemapSource]);

  // Restore custom layers after style change
  const restoreLayers = useCallback(() => {
    if (!map) return;

    const { sources, layers } = preservedDataRef.current;

    try {
      // Re-add sources
      Object.entries(sources).forEach(([id, source]) => {
        try {
          if (!map.getSource(id)) {
            map.addSource(id, source);
          }
        } catch (err) {
          console.warn(`Failed to restore source ${id}:`, err);
        }
      });

      // Re-add layers in order
      layers.forEach((layer) => {
        try {
          if (!map.getLayer(layer.id)) {
            map.addLayer(layer);
          }
        } catch (err) {
          console.warn(`Failed to restore layer ${layer.id}:`, err);
        }
      });

      console.debug("Restored layers successfully");
    } catch (error) {
      console.error("Error restoring layers:", error);
    }
  }, [map]);

  // Change basemap with proper error handling and state management
  const handleBasemapChange = useCallback(
    async (basemapId: string) => {
      if (!map || !isLoaded) {
        console.warn("Map not ready for basemap change");
        return;
      }

      if (basemapId === activeBasemap) {
        console.debug("Same basemap selected, skipping");
        return;
      }

      const basemap = basemaps.find((b) => b.id === basemapId);
      if (!basemap) {
        console.warn(`Basemap not found: ${basemapId}`);
        return;
      }

      // If already changing, queue this change
      if (isChanging) {
        pendingChangeRef.current = basemapId;
        return;
      }

      setIsChanging(true);

      try {
        // Preserve custom layers before changing
        preserveLayers();

        // Store current view state
        const viewState = {
          center: map.getCenter(),
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
        };

        // Create a promise that resolves when style is loaded
        const styleLoadPromise = new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error("Style load timeout"));
          }, 15000); // 15 second timeout

          const handleStyleLoad = () => {
            clearTimeout(timeoutId);
            map.off("style.load", handleStyleLoad);
            map.off("error", handleError);
            resolve();
          };

          const handleError = (e: any) => {
            if (e.error?.message?.includes("style")) {
              clearTimeout(timeoutId);
              map.off("style.load", handleStyleLoad);
              map.off("error", handleError);
              reject(e.error);
            }
          };

          map.on("style.load", handleStyleLoad);
          map.on("error", handleError);
        });

        // Set the new style
        map.setStyle(basemap.style);

        // Wait for style to load
        await styleLoadPromise;

        // Small delay to ensure style is fully applied
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Restore view state
        map.jumpTo({
          center: viewState.center,
          zoom: viewState.zoom,
          pitch: viewState.pitch,
          bearing: viewState.bearing,
        });

        // Restore custom layers
        restoreLayers();

        // Update state only if component is still mounted
        if (isMountedRef.current) {
          setActiveBasemap(basemapId);
          onChange?.(basemap);
        }
      } catch (error) {
        console.error("Error changing basemap:", error);

        // Optionally try to restore the previous basemap
        // This is commented out to avoid infinite loops
        // const previousBasemap = basemaps.find(b => b.id === activeBasemap);
        // if (previousBasemap) {
        //   map.setStyle(previousBasemap.style);
        // }
      } finally {
        if (isMountedRef.current) {
          setIsChanging(false);

          // Process any pending change
          if (pendingChangeRef.current) {
            const pendingId = pendingChangeRef.current;
            pendingChangeRef.current = null;
            // Use setTimeout to avoid immediate re-entry
            setTimeout(() => handleBasemapChange(pendingId), 0);
          }
        }
      }
    },
    [
      map,
      isLoaded,
      isChanging,
      activeBasemap,
      basemaps,
      preserveLayers,
      restoreLayers,
      onChange,
    ]
  );

  // Toggle labels overlay for satellite basemaps
  const handleLabelsToggle = useCallback(
    (show: boolean) => {
      if (!map || !isLoaded) return;

      const currentBasemap = basemaps.find((b) => b.id === activeBasemap);
      if (currentBasemap?.category !== "satellite") return;

      setShowLabels(show);

      try {
        const style = map.getStyle();
        if (!style?.layers) return;

        // Find and toggle all label/symbol layers
        style.layers.forEach((layer) => {
          // Check if this is a label layer
          const isLabelLayer =
            layer.type === "symbol" ||
            layer.id.toLowerCase().includes("label") ||
            layer.id.toLowerCase().includes("place") ||
            layer.id.toLowerCase().includes("poi") ||
            layer.id.toLowerCase().includes("text");

          if (isLabelLayer) {
            try {
              map.setLayoutProperty(
                layer.id,
                "visibility",
                show ? "visible" : "none"
              );
            } catch (err) {
              // Layer might not exist, ignore
            }
          }
        });
      } catch (error) {
        console.error("Error toggling labels:", error);
      }
    },
    [map, isLoaded, activeBasemap, basemaps]
  );

  // Position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    "top-left": { top: 10, left: 10 },
    "top-right": { top: 10, right: 10 },
    "bottom-left": { bottom: 10, left: 10 },
    "bottom-right": { bottom: 10, right: 10 },
  };

  // Common container style
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    ...positionStyles[position],
    zIndex: 1000,
  };

  // Labels toggle component
  const LabelsToggle = () => {
    const currentBasemap = basemaps.find((b) => b.id === activeBasemap);
    if (!showLabelsToggle || currentBasemap?.category !== "satellite") {
      return null;
    }

    return (
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          marginTop: 8,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={showLabels}
          onChange={(e) => handleLabelsToggle(e.target.checked)}
          style={{ cursor: "pointer" }}
        />
        Show labels
      </label>
    );
  };

  // Render compact mode (single thumbnail that expands)
  if (displayMode === "compact") {
    const activeBasemapData = basemaps.find((b) => b.id === activeBasemap);

    return (
      <div
        className={className}
        style={containerStyle}
      >
        {!isExpanded ? (
          // Collapsed: show current basemap thumbnail
          <button
            onClick={() => setIsExpanded(true)}
            disabled={isChanging}
            aria-label="Open basemap selector"
            style={{
              width: thumbnailSizes[thumbnailSize].width,
              height: thumbnailSizes[thumbnailSize].height,
              borderRadius: 8,
              overflow: "hidden",
              cursor: isChanging ? "wait" : "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              border: "2px solid white",
              backgroundImage: activeBasemapData?.thumbnail
                ? `url(${activeBasemapData.thumbnail})`
                : undefined,
              backgroundColor:
                activeBasemapData?.category === "dark" ? "#1f2937" : "#f3f4f6",
              backgroundSize: "cover",
              backgroundPosition: "center",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              padding: 4,
              opacity: isChanging ? 0.7 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {!activeBasemapData?.thumbnail && (
              <Text
                size="xs"
                style={{
                  color:
                    activeBasemapData?.category === "dark" ? "white" : "black",
                }}
              >
                {activeBasemapData?.name}
              </Text>
            )}
          </button>
        ) : (
          // Expanded: show all options
          <Card
            style={{
              padding: 8,
              maxHeight: 300,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text
                weight="bold"
                size="sm"
              >
                Basemap
              </Text>
              <button
                onClick={() => setIsExpanded(false)}
                aria-label="Close basemap selector"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  padding: 4,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
              }}
            >
              {basemaps.map((basemap) => (
                <BasemapThumbnail
                  key={basemap.id}
                  basemap={basemap}
                  isActive={basemap.id === activeBasemap}
                  size={thumbnailSizes.sm}
                  onClick={() => {
                    handleBasemapChange(basemap.id);
                    if (!isChanging) setIsExpanded(false);
                  }}
                  isLoading={isChanging && basemap.id !== activeBasemap}
                  disabled={isChanging}
                />
              ))}
            </div>

            <LabelsToggle />
          </Card>
        )}
      </div>
    );
  }

  // Render gallery mode (always visible grid)
  if (displayMode === "gallery") {
    return (
      <Card
        className={className}
        style={{
          ...containerStyle,
          padding: 12,
          maxWidth: 320,
          maxHeight: 400,
          overflowY: "auto",
        }}
      >
        <Stack>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text weight="bold">Basemap</Text>
            {collapsible && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? "Collapse" : "Expand"}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 18,
                  padding: 4,
                }}
              >
                {isExpanded ? "−" : "+"}
              </button>
            )}
          </div>

          {isExpanded && (
            <>
              {Object.entries(groupedBasemaps).map(
                ([category, categoryBasemaps]) => (
                  <div key={category}>
                    {groupByCategory && category !== "all" && (
                      <Text
                        size="xs"
                        color="muted"
                        style={{ marginBottom: 8, textTransform: "uppercase" }}
                      >
                        {categoryLabels[category] || category}
                      </Text>
                    )}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 8,
                      }}
                    >
                      {categoryBasemaps.map((basemap) => (
                        <BasemapThumbnail
                          key={basemap.id}
                          basemap={basemap}
                          isActive={basemap.id === activeBasemap}
                          size={thumbnailSizes[thumbnailSize]}
                          onClick={() => handleBasemapChange(basemap.id)}
                          showName
                          isLoading={isChanging && basemap.id !== activeBasemap}
                          disabled={isChanging}
                        />
                      ))}
                    </div>
                  </div>
                )
              )}

              <LabelsToggle />
            </>
          )}
        </Stack>
      </Card>
    );
  }

  // Render dropdown mode
  if (displayMode === "dropdown") {
    return (
      <div
        className={className}
        style={containerStyle}
      >
        <select
          value={activeBasemap}
          onChange={(e) => handleBasemapChange(e.target.value)}
          disabled={isChanging}
          aria-label="Select basemap"
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            backgroundColor: "white",
            fontSize: 14,
            cursor: isChanging ? "wait" : "pointer",
            minWidth: 150,
            opacity: isChanging ? 0.7 : 1,
          }}
        >
          {groupByCategory
            ? Object.entries(groupedBasemaps).map(
                ([category, categoryBasemaps]) => (
                  <optgroup
                    key={category}
                    label={categoryLabels[category] || category}
                  >
                    {categoryBasemaps.map((basemap) => (
                      <option
                        key={basemap.id}
                        value={basemap.id}
                      >
                        {basemap.name}
                      </option>
                    ))}
                  </optgroup>
                )
              )
            : basemaps.map((basemap) => (
                <option
                  key={basemap.id}
                  value={basemap.id}
                >
                  {basemap.name}
                </option>
              ))}
        </select>
      </div>
    );
  }

  // Render floating mode (minimal floating button)
  if (displayMode === "floating") {
    return (
      <div
        className={className}
        style={containerStyle}
      >
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={isChanging}
            aria-label="Toggle basemap selector"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "2px solid white",
              backgroundColor: "#3b82f6",
              color: "white",
              cursor: isChanging ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              fontSize: 16,
              opacity: isChanging ? 0.7 : 1,
              transition: "opacity 0.2s",
            }}
            title="Change basemap"
          >
            🗺️
          </button>

          {isExpanded && (
            <Card
              style={{
                position: "absolute",
                bottom: position.includes("bottom") ? 44 : "auto",
                top: position.includes("top") ? 44 : "auto",
                left: position.includes("left") ? 0 : "auto",
                right: position.includes("right") ? 0 : "auto",
                padding: 8,
                minWidth: 200,
                maxHeight: 300,
                overflowY: "auto",
              }}
            >
              <Stack>
                {basemaps.map((basemap) => (
                  <button
                    key={basemap.id}
                    onClick={() => {
                      handleBasemapChange(basemap.id);
                      if (!isChanging) setIsExpanded(false);
                    }}
                    disabled={isChanging}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      border: "none",
                      borderRadius: 4,
                      backgroundColor:
                        basemap.id === activeBasemap
                          ? "#eff6ff"
                          : "transparent",
                      cursor: isChanging ? "wait" : "pointer",
                      width: "100%",
                      textAlign: "left",
                      opacity:
                        isChanging && basemap.id !== activeBasemap ? 0.6 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    {showThumbnails && basemap.thumbnail && (
                      <img
                        src={basemap.thumbnail}
                        alt=""
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 4,
                          objectFit: "cover",
                        }}
                      />
                    )}
                    <span style={{ fontSize: 13 }}>{basemap.name}</span>
                    {basemap.id === activeBasemap && (
                      <span style={{ marginLeft: "auto", color: "#3b82f6" }}>
                        ✓
                      </span>
                    )}
                  </button>
                ))}

                <LabelsToggle />
              </Stack>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return null;
};

// Thumbnail component
interface BasemapThumbnailProps {
  basemap: BasemapOption;
  isActive: boolean;
  size: { width: number; height: number };
  onClick: () => void;
  showName?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
}

const BasemapThumbnail: React.FC<BasemapThumbnailProps> = ({
  basemap,
  isActive,
  size,
  onClick,
  showName = false,
  isLoading = false,
  disabled = false,
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled || isActive}
      aria-label={`Select ${basemap.name} basemap`}
      aria-pressed={isActive}
      style={{
        cursor: disabled ? "wait" : isActive ? "default" : "pointer",
        opacity: isLoading ? 0.6 : 1,
        transition: "all 0.2s",
        background: "none",
        border: "none",
        padding: 0,
      }}
    >
      <div
        style={{
          width: size.width,
          height: size.height,
          borderRadius: 6,
          overflow: "hidden",
          border: isActive ? "2px solid #3b82f6" : "2px solid #e5e7eb",
          backgroundImage:
            basemap.thumbnail && !imageError
              ? `url(${basemap.thumbnail})`
              : undefined,
          backgroundColor: basemap.category === "dark" ? "#1f2937" : "#f3f4f6",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          transition: "border-color 0.2s",
        }}
      >
        {/* Hidden image to detect load errors */}
        {basemap.thumbnail && (
          <img
            src={basemap.thumbnail}
            alt=""
            onError={() => setImageError(true)}
            style={{ display: "none" }}
          />
        )}

        {(!basemap.thumbnail || imageError) && (
          <Text
            size="xs"
            style={{
              color: basemap.category === "dark" ? "white" : "black",
              fontWeight: "bold",
            }}
          >
            {basemap.name.substring(0, 2).toUpperCase()}
          </Text>
        )}

        {isLoading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(255,255,255,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                border: "2px solid #3b82f6",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
        )}

        {isActive && !isLoading && (
          <div
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              width: 16,
              height: 16,
              borderRadius: "50%",
              backgroundColor: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 10,
            }}
          >
            ✓
          </div>
        )}
      </div>

      {showName && (
        <Text
          size="xs"
          style={{
            marginTop: 4,
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: size.width,
            color: isActive ? "#3b82f6" : "inherit",
          }}
        >
          {basemap.name}
        </Text>
      )}
    </button>
  );
};

// Add CSS for spinner animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default BasemapSelector;
