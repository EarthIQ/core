import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { Marker } from "maplibre-gl";
import { useMap } from "../../hooks/useMap";
import debounce from "lodash/debounce";

export interface SearchResult {
  id: string;
  text: string;
  placeName: string;
  center: [number, number];
  bbox?: [number, number, number, number];
  type?: string;
  context?: { id: string; text: string }[];
  properties?: Record<string, any>;
}

export type Position =
  | "top-left"
  | "top-right"
  | "top-center"
  | "bottom-left"
  | "bottom-right"
  | "bottom-center";

export interface SearchControlProps {
  position?: Position;
  placeholder?: string;
  provider?: "nominatim" | "photon" | "custom";
  customEndpoint?: string;
  apiKey?: string;
  limit?: number;
  bounds?: [number, number, number, number];
  biasToViewport?: boolean;
  countries?: string[];
  language?: string;
  minLength?: number;
  debounceMs?: number;
  showMarker?: boolean;
  markerColor?: string;
  zoomTo?: number;
  onSelect?: (result: SearchResult) => void;
  onSearch?: (query: string) => void;
  onClear?: () => void;
  showRecent?: boolean;
  maxRecent?: number;
  renderResult?: (result: SearchResult) => React.ReactNode;
  width?: number | string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  showCoordinatesInput?: boolean;
}

const COORD_PATTERN = /^\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*$/;

function parseCoordinates(value: string): [number, number] | null {
  const match = value.match(COORD_PATTERN);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

// ── Icons ──────────────────────────────────────────────────────────────────────

const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const CrosshairIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <circle
      cx="12"
      cy="12"
      r="3"
      strokeWidth={2}
    />
    <path
      strokeLinecap="round"
      strokeWidth={2}
      d="M12 2v4M12 18v4M2 12h4M18 12h4"
    />
  </svg>
);

const SpinnerIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export const SearchControl: React.FC<SearchControlProps> = ({
  position = "top-left",
  placeholder = "Search places…",
  provider = "nominatim",
  customEndpoint,
  apiKey,
  limit = 5,
  bounds,
  biasToViewport = true,
  countries,
  language = "en",
  minLength = 2,
  debounceMs = 300,
  showMarker = true,
  markerColor,
  zoomTo = 16,
  onSelect,
  onSearch,
  onClear,
  showRecent = true,
  maxRecent = 5,
  renderResult,
  width = 320,
  collapsible = false,
  defaultCollapsed = false,
  showCoordinatesInput = true,
}) => {
  const { map, isLoaded } = useMap();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const initialWidth =
      typeof window !== "undefined" ? window.innerWidth : 1024;
    return initialWidth < 640 ? true : defaultCollapsed;
  });
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("map-recent-searches") || "[]");
    } catch {
      return [];
    }
  });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const parsedCoords = useMemo(
    () => (showCoordinatesInput ? parseCoordinates(query) : null),
    [query, showCoordinatesInput]
  );
  const isCoordQuery = parsedCoords !== null;

  const [windowWidth, setWindowWidth] = useState(() => {
    if (typeof window !== "undefined") return window.innerWidth;
    return 1024;
  });

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const responsiveWidth = useMemo(() => {
    if (windowWidth < 640) return Math.min(windowWidth * 0.7, 280);
    if (windowWidth < 1024) return 320;
    return 360;
  }, [windowWidth]);

  const dropdownMaxHeight = useMemo(() => {
    if (windowWidth < 640) return 200;
    if (windowWidth < 1024) return 250;
    return 300;
  }, [windowWidth]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "map-recent-searches",
        JSON.stringify(recentSearches.slice(0, maxRecent))
      );
    } catch {}
  }, [recentSearches, maxRecent]);

  // ── Geocoding ──────────────────────────────────────────────────────────────

  const geocode = useCallback(
    async (searchQuery: string): Promise<SearchResult[]> => {
      if (!searchQuery || searchQuery.length < minLength) return [];

      let url: string;
      const viewportBounds = biasToViewport && map ? map.getBounds() : null;
      const searchBounds =
        bounds ||
        (viewportBounds
          ? [
              viewportBounds.getWest(),
              viewportBounds.getSouth(),
              viewportBounds.getEast(),
              viewportBounds.getNorth(),
            ]
          : undefined);

      switch (provider) {
        case "nominatim": {
          const params = new URLSearchParams({
            q: searchQuery,
            format: "json",
            limit: String(limit),
            addressdetails: "1",
            "accept-language": language,
          });
          if (searchBounds) {
            params.set("viewbox", searchBounds.join(","));
            params.set("bounded", "1");
          }
          if (countries?.length)
            params.set("countrycodes", countries.join(","));
          url = `https://nominatim.openstreetmap.org/search?${params}`;
          break;
        }
        case "photon": {
          const params = new URLSearchParams({
            q: searchQuery,
            limit: String(limit),
            lang: language,
          });
          if (viewportBounds) {
            const center = viewportBounds.getCenter();
            params.set("lat", String(center.lat));
            params.set("lon", String(center.lng));
          }
          url = `https://photon.komoot.io/api/?${params}`;
          break;
        }
        case "custom":
          if (!customEndpoint) throw new Error("Custom endpoint required");
          url = customEndpoint.replace(
            "{query}",
            encodeURIComponent(searchQuery)
          );
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);
      return normalizeResults(await response.json(), provider);
    },
    [
      provider,
      customEndpoint,
      limit,
      bounds,
      biasToViewport,
      countries,
      language,
      minLength,
      map,
    ]
  );

  const normalizeResults = (data: any, prov: string): SearchResult[] => {
    switch (prov) {
      case "nominatim":
        return data.map((item: any) => ({
          id: item.place_id,
          text: item.display_name.split(",")[0],
          placeName: item.display_name,
          center: [parseFloat(item.lon), parseFloat(item.lat)] as [
            number,
            number,
          ],
          bbox: item.boundingbox
            ? ([
                parseFloat(item.boundingbox[2]),
                parseFloat(item.boundingbox[0]),
                parseFloat(item.boundingbox[3]),
                parseFloat(item.boundingbox[1]),
              ] as [number, number, number, number])
            : undefined,
          type: item.type,
          properties: item,
        }));
      case "photon":
        return (
          data.features?.map((f: any) => ({
            id: f.properties.osm_id,
            text: f.properties.name || f.properties.street,
            placeName: [
              f.properties.name,
              f.properties.street,
              f.properties.city,
              f.properties.country,
            ]
              .filter(Boolean)
              .join(", "),
            center: f.geometry.coordinates as [number, number],
            type: f.properties.osm_value,
            properties: f.properties,
          })) || []
        );
      default:
        return data;
    }
  };

  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (parseCoordinates(searchQuery)) {
        setResults([]);
        setIsLoading(false);
        return;
      }
      if (!searchQuery || searchQuery.length < minLength) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const searchResults = await geocode(searchQuery);
        setResults(searchResults);
        onSearch?.(searchQuery);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs),
    [geocode, minLength, debounceMs, onSearch]
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    debouncedSearch(value);
  };

  const flyToAndMark = useCallback(
    (center: [number, number], bbox?: [number, number, number, number]) => {
      if (!map || !isLoaded) return;
      if (bbox) {
        map.fitBounds(bbox as any, { padding: 50 });
      } else {
        map.flyTo({ center, zoom: zoomTo });
      }
      if (showMarker) {
        if (markerRef.current) {
          markerRef.current.setLngLat(center);
        } else {
          markerRef.current = new Marker({
            color: markerColor || "var(--primary)",
          })
            .setLngLat(center)
            .addTo(map);
        }
      }
    },
    [map, isLoaded, zoomTo, showMarker, markerColor]
  );

  const handleGoToCoords = useCallback(() => {
    if (!parsedCoords) return;
    const [lat, lng] = parsedCoords;
    flyToAndMark([lng, lat]);
    setIsFocused(false);
    inputRef.current?.blur();
  }, [parsedCoords, flyToAndMark]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setQuery(result.text);
      setResults([]);
      setIsFocused(false);

      setRecentSearches((prev) => {
        const filtered = prev.filter((r) => r.id !== result.id);
        return [result, ...filtered].slice(0, maxRecent);
      });

      flyToAndMark(result.center, result.bbox);
      onSelect?.(result);
    },
    [flyToAndMark, maxRecent, onSelect]
  );

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setSelectedIndex(-1);
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    onClear?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const hasCoordSuggestion = isCoordQuery;
    const listItems =
      results.length > 0 ? results : showRecent ? recentSearches : [];
    const totalItems = hasCoordSuggestion
      ? listItems.length + 1
      : listItems.length;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (hasCoordSuggestion && selectedIndex === 0) {
          handleGoToCoords();
        } else {
          const adjustedIndex = hasCoordSuggestion
            ? selectedIndex - 1
            : selectedIndex;
          if (adjustedIndex >= 0 && listItems[adjustedIndex]) {
            handleSelect(listItems[adjustedIndex]);
          } else if (hasCoordSuggestion && selectedIndex === -1) {
            handleGoToCoords();
          }
        }
        break;
      case "Escape":
        setIsFocused(false);
        inputRef.current?.blur();
        break;
    }
  };

  useEffect(
    () => () => {
      markerRef.current?.remove();
    },
    []
  );

  // ── Dropdown visibility ────────────────────────────────────────────────────

  const showDropdown =
    isFocused &&
    (isCoordQuery ||
      results.length > 0 ||
      (showRecent && recentSearches.length > 0 && !query) ||
      // show hint panel when focused and query is empty or too short
      (!query && showCoordinatesInput));

  // ── Collapsed button ───────────────────────────────────────────────────────

  if (collapsible && isCollapsed) {
    const isMobile = windowWidth < 640;
    const padding = isMobile ? 8 : 10;
    return (
      <button
        onClick={() => {
          setIsCollapsed(false);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="absolute z-[var(--z-dropdown)] flex h-9 w-9 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-secondary)] shadow-[var(--shadow-md)] transition-colors duration-[var(--transition-fast)] hover:bg-[var(--surface-hover)]"
        style={{
          top: padding,
          ...(position.includes("left")
            ? { left: padding }
            : { right: padding }),
        }}
        aria-label="Open search"
      >
        <SearchIcon className="h-4 w-4" />
      </button>
    );
  }

  const getPositionStyles = (pos: Position): React.CSSProperties => {
    const isMobile = windowWidth < 640;
    const padding = isMobile ? 8 : 12;
    const positions: Record<Position, React.CSSProperties> = {
      "top-left": { top: padding, left: padding },
      "top-right": { top: padding, right: padding },
      "top-center": {
        top: padding,
        left: "50%",
        transform: "translateX(-50%)",
      },
      "bottom-left": { bottom: padding, left: padding },
      "bottom-right": { bottom: padding, right: padding },
      "bottom-center": {
        bottom: padding,
        left: "50%",
        transform: "translateX(-50%)",
      },
    };
    return positions[pos];
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="absolute z-[var(--z-dropdown)]"
      style={{ width: responsiveWidth, ...getPositionStyles(position) }}
    >
      <div className="relative">
        {/* ── Search input ── */}
        <div className="relative">
          {/* Left icon */}
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-tertiary)]">
            {isLoading ? (
              <SpinnerIcon className="h-4 w-4 animate-spin" />
            ) : isCoordQuery ? (
              <CrosshairIcon className="h-4 w-4" />
            ) : (
              <SearchIcon className="h-4 w-4" />
            )}
          </span>

          {/*
            pl-10  → 2.5 rem left padding, enough clearance for the icon at left-3 (0.75rem) + 1rem icon + gap
            pr-16  → room for clear + collapse buttons on the right
          */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="input w-full pr-16 pl-10"
            style={{ paddingLeft: 30 }}
          />

          {/* Right-side actions */}
          <span className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-0.5">
            {query && !isLoading && (
              <button
                onClick={handleClear}
                className="rounded-[var(--radius-sm)] p-1 text-[var(--text-tertiary)] transition-colors duration-[var(--transition-fast)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]"
                aria-label="Clear search"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
            {collapsible && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="rounded-[var(--radius-sm)] p-1 text-[var(--text-tertiary)] transition-colors duration-[var(--transition-fast)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]"
                aria-label="Collapse search"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
          </span>
        </div>

        {/* ── Dropdown ── */}
        {showDropdown && (
          <div
            className="card absolute top-[calc(100%+4px)] right-0 left-0 overflow-y-auto p-0"
            style={{ maxHeight: dropdownMaxHeight }}
          >
            {/* Coordinate suggestion */}
            {isCoordQuery && parsedCoords && (
              <button
                onClick={handleGoToCoords}
                className={`flex w-full items-center gap-3 border-b border-[var(--border-secondary)] px-3 py-2.5 text-left transition-colors duration-[var(--transition-fast)] ${
                  selectedIndex === 0
                    ? "bg-[var(--surface-hover)]"
                    : "hover:bg-[var(--surface-hover)]"
                }`}
              >
                <span
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                  style={{
                    background:
                      "var(--primary-subtle, color-mix(in srgb, var(--primary) 12%, transparent))",
                  }}
                >
                  <CrosshairIcon
                    className="h-3.5 w-3.5"
                    style={{ color: "var(--primary)" }}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Go to coordinates
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {parsedCoords[0].toFixed(5)}, {parsedCoords[1].toFixed(5)}
                  </p>
                </div>
                <kbd className="hidden flex-shrink-0 rounded border border-[var(--border-primary)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)] sm:inline-block">
                  ↵
                </kbd>
              </button>
            )}

            {/* Place results */}
            {results.length > 0 && (
              <div>
                {results.map((result, index) => {
                  const adjustedIndex = isCoordQuery ? index + 1 : index;
                  return (
                    <SearchResultItem
                      key={result.id}
                      result={result}
                      isSelected={adjustedIndex === selectedIndex}
                      onClick={() => handleSelect(result)}
                      renderResult={renderResult}
                    />
                  );
                })}
              </div>
            )}

            {/* Recent searches */}
            {showRecent && recentSearches.length > 0 && !query && (
              <div>
                <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-3 py-2">
                  <span className="text-xs text-[var(--text-tertiary)]">
                    Recent searches
                  </span>
                  <button
                    onClick={() => setRecentSearches([])}
                    className="text-xs text-[var(--text-tertiary)] transition-colors duration-[var(--transition-fast)] hover:text-[var(--text-secondary)]"
                  >
                    Clear all
                  </button>
                </div>
                {recentSearches.map((result, index) => {
                  const adjustedIndex = isCoordQuery ? index + 1 : index;
                  return (
                    <SearchResultItem
                      key={result.id}
                      result={result}
                      isSelected={adjustedIndex === selectedIndex}
                      onClick={() => handleSelect(result)}
                      renderResult={renderResult}
                      isRecent
                    />
                  );
                })}
              </div>
            )}

            {/* No results */}
            {query && !isCoordQuery && results.length === 0 && !isLoading && (
              <div className="px-3 py-4 text-center">
                <p className="text-sm text-[var(--text-tertiary)]">
                  No results found
                </p>
                {showCoordinatesInput && (
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    Try entering coordinates like{" "}
                    <button
                      className="font-medium underline underline-offset-2"
                      style={{ color: "var(--primary)" }}
                      onClick={() => {
                        setQuery("48.8566, 2.3522");
                        inputRef.current?.focus();
                      }}
                    >
                      48.8566, 2.3522
                    </button>
                  </p>
                )}
              </div>
            )}

            {/*
              ── Coordinate hint ──────────────────────────────────────────────
              Shown when the box is focused, the query is empty (or below
              minLength), and no other content is occupying the dropdown.
            */}
            {showCoordinatesInput &&
              !query &&
              !isCoordQuery &&
              results.length === 0 &&
              !(showRecent && recentSearches.length > 0) && (
                <div className="flex items-start gap-2.5 border-t border-[var(--border-secondary)] px-3 py-2.5">
                  {/* Icon pill */}
                  <span
                    className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                    style={{
                      background:
                        "var(--primary-subtle, color-mix(in srgb, var(--primary) 12%, transparent))",
                    }}
                  >
                    <CrosshairIcon
                      className="h-3 w-3"
                      style={{ color: "var(--primary)" }}
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[var(--text-secondary)]">
                      Tip: Search location or jump to coordinates
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
                      Type{" "}
                      <button
                        className="font-mono font-semibold underline underline-offset-2 transition-colors hover:text-[var(--text-secondary)]"
                        style={{ color: "var(--primary)" }}
                        onMouseDown={(e) => {
                          // prevent onBlur from closing the dropdown
                          e.preventDefault();
                          setQuery("48.8566, 2.3522");
                          setSelectedIndex(-1);
                          inputRef.current?.focus();
                        }}
                      >
                        lat, lng
                      </button>{" "}
                      (e.g.{" "}
                      <button
                        className="font-mono underline underline-offset-2 transition-colors hover:text-[var(--text-secondary)]"
                        style={{ color: "var(--primary)" }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setQuery("48.8566, 2.3522");
                          setSelectedIndex(-1);
                          inputRef.current?.focus();
                        }}
                      >
                        48.8566, 2.3522
                      </button>
                      ) to jump directly to a location.
                    </p>
                  </div>
                </div>
              )}

            {/*
              Same hint but appended below recent-searches list so it's
              always visible when recents are showing and query is empty.
            */}
            {showCoordinatesInput &&
              !query &&
              !isCoordQuery &&
              results.length === 0 &&
              showRecent &&
              recentSearches.length > 0 && (
                <div className="flex items-center gap-2 border-t border-[var(--border-secondary)] px-3 py-2">
                  <CrosshairIcon
                    className="h-3 w-3 flex-shrink-0"
                    style={{ color: "var(--primary)" }}
                  />
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    You can also type{" "}
                    <span
                      className="font-mono font-medium"
                      style={{ color: "var(--primary)" }}
                    >
                      lat, lng
                    </span>{" "}
                    to jump to exact coordinates
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── SearchResultItem ───────────────────────────────────────────────────────────

interface SearchResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  onClick: () => void;
  renderResult?: (result: SearchResult) => React.ReactNode;
  isRecent?: boolean;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({
  result,
  isSelected,
  onClick,
  renderResult,
  isRecent,
}) => {
  if (renderResult) {
    return (
      <div
        onClick={onClick}
        className={`cursor-pointer px-3 py-2 transition-colors duration-[var(--transition-fast)] ${
          isSelected
            ? "bg-[var(--surface-hover)]"
            : "hover:bg-[var(--surface-hover)]"
        }`}
      >
        {renderResult(result)}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer items-start gap-2 border-b border-[var(--border-secondary)] px-3 py-2 transition-colors duration-[var(--transition-fast)] ${
        isSelected
          ? "bg-[var(--surface-hover)]"
          : "hover:bg-[var(--surface-hover)]"
      }`}
    >
      <span className="mt-0.5 flex-shrink-0 text-[var(--text-tertiary)]">
        {isRecent ? (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-sm font-medium text-[var(--text-primary)]">
          {result.text}
        </p>
        <p className="overflow-hidden text-xs text-ellipsis whitespace-nowrap text-[var(--text-tertiary)]">
          {result.placeName}
        </p>
      </div>
      {result.type && (
        <span className="flex-shrink-0 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-xs text-[var(--text-tertiary)]">
          {result.type}
        </span>
      )}
    </div>
  );
};
