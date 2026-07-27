import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useMap } from "../../hooks/useMap";

/* =============================================================================
   Types
   ============================================================================= */

export type CoordinateFormat = "decimal" | "dms" | "utm" | "mgrs";

export type Position =
  | "top-left"
  | "top-right"
  | "top-center"
  | "bottom-left"
  | "bottom-right"
  | "bottom-center";

export interface CoordinatesDisplayProps {
  /** Position on map */
  position?: Position;
  /** Coordinate format */
  format?: CoordinateFormat;
  /** Allow format switching */
  switchable?: boolean;
  /** Decimal precision */
  precision?: number;
  /** Show zoom level */
  showZoom?: boolean;
  /** Show scale */
  showScale?: boolean;
  /** Show elevation (requires terrain) */
  showElevation?: boolean;
  /** Copy to clipboard on click */
  copyOnClick?: boolean;
  /** Custom formatter */
  formatter?: (lng: number, lat: number, zoom: number) => string;
  /** Style variant */
  variant?: "minimal" | "compact" | "full";
  /** Custom class name */
  className?: string;
}

interface Coordinates {
  lng: number;
  lat: number;
}

interface UTMCoords {
  zone: number;
  band: string;
  easting: number;
  northing: number;
}

/* =============================================================================
   Constants
   ============================================================================= */

const FORMAT_OPTIONS: Array<{
  value: CoordinateFormat;
  label: string;
  shortLabel: string;
}> = [
  { value: "decimal", label: "Decimal Degrees", shortLabel: "DD" },
  { value: "dms", label: "Degrees Minutes Seconds", shortLabel: "DMS" },
  { value: "utm", label: "UTM", shortLabel: "UTM" },
  { value: "mgrs", label: "MGRS", shortLabel: "MGRS" },
];

/* =============================================================================
   Utility Functions
   ============================================================================= */

const toDMS = (coord: number, isLat: boolean): string => {
  const absolute = Math.abs(coord);
  const degrees = Math.floor(absolute);
  const minutes = Math.floor((absolute - degrees) * 60);
  const seconds = ((absolute - degrees) * 60 - minutes) * 60;
  const direction = isLat ? (coord >= 0 ? "N" : "S") : coord >= 0 ? "E" : "W";
  return `${degrees}°${minutes.toString().padStart(2, "0")}'${seconds.toFixed(1).padStart(4, "0")}"${direction}`;
};

const getUTMBand = (lat: number): string => {
  const bands = "CDEFGHJKLMNPQRSTUVWX";
  if (lat < -80) return "A";
  if (lat > 84) return "Z";
  return bands[Math.floor((lat + 80) / 8)];
};

const latLngToUTM = (lat: number, lng: number): UTMCoords => {
  const zone = Math.floor((lng + 180) / 6) + 1;
  const band = getUTMBand(lat);

  const k0 = 0.9996;
  const a = 6378137;

  const lonRad = (lng * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const lonOrigin = (((zone - 1) * 6 - 180 + 3) * Math.PI) / 180;

  const easting = 500000 + k0 * a * (lonRad - lonOrigin) * Math.cos(latRad);
  const northing = lat >= 0 ? k0 * a * latRad : 10000000 + k0 * a * latRad;

  return { zone, band, easting, northing };
};

/* =============================================================================
   Styles
   ============================================================================= */

const baseStyles: React.CSSProperties = {
  position: "absolute",
  zIndex: 1000,
  fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
  fontSize: "12px",
  lineHeight: 1.4,
  userSelect: "none",
  transition: "all 200ms ease",
};

const getPositionStyles = (position: Position): React.CSSProperties => {
  const positions: Record<Position, React.CSSProperties> = {
    "top-left": { top: 12, left: 12 },
    "top-right": { top: 12, right: 12 },
    "top-center": { top: 12, left: "50%", transform: "translateX(-50%)" },
    "bottom-left": { bottom: 12, left: 12 },
    "bottom-right": { bottom: 12, right: 12 },
    "bottom-center": { bottom: 12, left: "50%", transform: "translateX(-50%)" },
  };
  return positions[position];
};

/* =============================================================================
   Sub-Components
   ============================================================================= */

interface InfoPillProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

const InfoPill: React.FC<InfoPillProps> = ({ label, value, icon }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "2px 8px",
      backgroundColor: "var(--bg-tertiary)",
      borderRadius: "var(--radius-full)",
      fontSize: "11px",
      color: "var(--text-secondary)",
      whiteSpace: "nowrap",
    }}
  >
    {icon}
    <span style={{ opacity: 0.7 }}>{label}</span>
    <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
      {value}
    </span>
  </div>
);

interface FormatSelectorProps {
  value: CoordinateFormat;
  onChange: (format: CoordinateFormat) => void;
  compact?: boolean;
}

const FormatSelector: React.FC<FormatSelectorProps> = ({
  value,
  onChange,
  compact,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: compact ? "4px 8px" : "6px 10px",
          backgroundColor: "var(--surface-hover)",
          border: "1px solid var(--border-primary)",
          borderRadius: "var(--radius-md)",
          fontSize: "11px",
          fontWeight: 500,
          color: "var(--text-secondary)",
          cursor: "pointer",
          transition: "all 150ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--surface-active)";
          e.currentTarget.style.borderColor = "var(--border-hover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--surface-hover)";
          e.currentTarget.style.borderColor = "var(--border-primary)";
        }}
      >
        <span>{FORMAT_OPTIONS.find((f) => f.value === value)?.shortLabel}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 150ms ease",
          }}
        >
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 999 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              minWidth: "160px",
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-primary)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              overflow: "hidden",
              zIndex: 1000,
              animation: "scaleIn 150ms ease",
            }}
          >
            {FORMAT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "8px 12px",
                  backgroundColor:
                    value === option.value
                      ? "var(--surface-hover)"
                      : "transparent",
                  border: "none",
                  fontSize: "12px",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  transition: "background-color 100ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--surface-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    value === option.value
                      ? "var(--surface-hover)"
                      : "transparent";
                }}
              >
                <span>{option.label}</span>
                {value === option.value && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                  >
                    <path
                      d="M11.5 4L5.5 10L2.5 7"
                      stroke="var(--primary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

interface CopyFeedbackProps {
  show: boolean;
}

const CopyFeedback: React.FC<CopyFeedbackProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 8px",
        backgroundColor: "var(--success-bg)",
        color: "var(--success-text)",
        borderRadius: "var(--radius-full)",
        fontSize: "11px",
        fontWeight: 500,
        animation: "fadeInUp 200ms ease",
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
      >
        <path
          d="M10 3L4.5 8.5L2 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Copied
    </div>
  );
};

/* =============================================================================
   Main Component
   ============================================================================= */

/**
 * CoordinatesDisplay - A sleek, modern coordinates display component
 *
 * @example
 * // Minimal variant at bottom center
 * <CoordinatesDisplay position="bottom-center" variant="minimal" />
 *
 * @example
 * // Full variant with all features
 * <CoordinatesDisplay
 *   position="bottom-left"
 *   variant="full"
 *   showZoom
 *   showScale
 *   showElevation
 *   switchable
 * />
 */
export const CoordinatesDisplay: React.FC<CoordinatesDisplayProps> = ({
  position = "bottom-center",
  format: initialFormat = "decimal",
  switchable = true,
  precision = 6,
  showZoom = true,
  showScale = false,
  showElevation = false,
  copyOnClick = true,
  formatter,
  variant = "minimal",
  className,
}) => {
  const { map, isLoaded } = useMap();
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [zoom, setZoom] = useState<number>(0);
  const [format, setFormat] = useState<CoordinateFormat>(initialFormat);
  const [elevation, setElevation] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Update coordinates on mouse move
  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      setCoords({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    };

    const handleZoom = () => {
      setZoom(map.getZoom());
    };

    const handleMouseLeave = () => {
      setCoords(null);
    };

    map.on("mousemove", handleMouseMove);
    map.on("zoom", handleZoom);
    map.getCanvas().addEventListener("mouseleave", handleMouseLeave);
    handleZoom();

    return () => {
      map.off("mousemove", handleMouseMove);
      map.off("zoom", handleZoom);
      map.getCanvas().removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [map, isLoaded]);

  // Query elevation
  useEffect(() => {
    if (!map || !isLoaded || !showElevation || !coords) return;

    const terrain = map.getTerrain();
    if (!terrain) {
      setElevation(null);
      return;
    }

    try {
      const elev = map.queryTerrainElevation([coords.lng, coords.lat]);
      setElevation(elev ?? null);
    } catch {
      setElevation(null);
    }
  }, [map, isLoaded, showElevation, coords]);

  // Format coordinates
  const formatCoordinates = useCallback(
    (lng: number, lat: number): string => {
      if (formatter) {
        return formatter(lng, lat, zoom);
      }

      switch (format) {
        case "decimal":
          return `${lat.toFixed(precision)}°, ${lng.toFixed(precision)}°`;

        case "dms":
          return `${toDMS(lat, true)}  ${toDMS(lng, false)}`;

        case "utm": {
          const utm = latLngToUTM(lat, lng);
          return `${utm.zone}${utm.band} ${utm.easting.toFixed(0)}E ${utm.northing.toFixed(0)}N`;
        }

        case "mgrs": {
          const utmCoords = latLngToUTM(lat, lng);
          const e = Math.floor((utmCoords.easting % 100000) / 100)
            .toString()
            .padStart(3, "0");
          const n = Math.floor((utmCoords.northing % 100000) / 100)
            .toString()
            .padStart(3, "0");
          return `${utmCoords.zone}${utmCoords.band} ${e} ${n}`;
        }

        default:
          return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
      }
    },
    [format, precision, zoom, formatter]
  );

  // Calculate scale
  const getScale = useCallback((): string => {
    if (!map) return "";

    const center = map.getCenter();
    const currentZoom = map.getZoom();

    const metersPerPixel =
      (156543.03392 * Math.cos((center.lat * Math.PI) / 180)) /
      Math.pow(2, currentZoom);
    const scale = Math.round(metersPerPixel * 96 * 39.37);

    if (scale >= 1000000) {
      return `1:${(scale / 1000000).toFixed(1)}M`;
    } else if (scale >= 1000) {
      return `1:${Math.round(scale / 1000)}K`;
    }
    return `1:${scale}`;
  }, [map]);

  // Copy handler
  const handleCopy = useCallback(async () => {
    if (!coords || !copyOnClick) return;

    const text = formatCoordinates(coords.lng, coords.lat);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [coords, copyOnClick, formatCoordinates]);

  // Memoized formatted string
  const formattedCoords = useMemo(() => {
    if (!coords) return null;
    return formatCoordinates(coords.lng, coords.lat);
  }, [coords, formatCoordinates]);

  // Don't render if no coordinates
  if (!coords || !isLoaded) return null;

  /* -------------------------------------------------------------------------
     Minimal Variant
     ------------------------------------------------------------------------- */
  if (variant === "minimal") {
    return (
      <div
        className={className}
        onClick={handleCopy}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          ...baseStyles,
          ...getPositionStyles(position),
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          backgroundColor: isHovered ? "var(--bg-elevated)" : "var(--surface)",
          backdropFilter: "blur(8px)",
          border: "1px solid var(--border-primary)",
          borderRadius: "var(--radius-full)",
          boxShadow: isHovered ? "var(--shadow-md)" : "var(--shadow-sm)",
          cursor: copyOnClick ? "pointer" : "default",
        }}
        title={copyOnClick ? "Click to copy coordinates" : undefined}
      >
        {/* Coordinates */}
        <span
          style={{
            fontWeight: 500,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {formattedCoords}
        </span>

        {/* Separator */}
        {(showZoom || showScale || showElevation) && (
          <div
            style={{
              width: "1px",
              height: "14px",
              backgroundColor: "var(--border-primary)",
            }}
          />
        )}

        {/* Zoom */}
        {showZoom && (
          <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>
            z{zoom.toFixed(1)}
          </span>
        )}

        {/* Scale */}
        {showScale && (
          <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>
            {getScale()}
          </span>
        )}

        {/* Elevation */}
        {showElevation && elevation !== null && (
          <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>
            {elevation.toFixed(0)}m
          </span>
        )}

        {/* Copy feedback */}
        <CopyFeedback show={copied} />
      </div>
    );
  }

  /* -------------------------------------------------------------------------
     Compact Variant
     ------------------------------------------------------------------------- */
  if (variant === "compact") {
    return (
      <div
        className={className}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          ...baseStyles,
          ...getPositionStyles(position),
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 6px",
          backgroundColor: "var(--surface)",
          backdropFilter: "blur(8px)",
          border: "1px solid var(--border-primary)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Format Selector */}
        {switchable && (
          <FormatSelector
            value={format}
            onChange={setFormat}
            compact
          />
        )}

        {/* Coordinates */}
        <div
          onClick={handleCopy}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            backgroundColor: isHovered ? "var(--surface-hover)" : "transparent",
            borderRadius: "var(--radius-md)",
            cursor: copyOnClick ? "pointer" : "default",
            transition: "background-color 150ms ease",
          }}
        >
          <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
            {formattedCoords}
          </span>
          <CopyFeedback show={copied} />
        </div>

        {/* Info Pills */}
        {showZoom && (
          <InfoPill
            label="Z"
            value={zoom.toFixed(1)}
          />
        )}
        {showScale && (
          <InfoPill
            label=""
            value={getScale()}
          />
        )}
        {showElevation && elevation !== null && (
          <InfoPill
            label="↑"
            value={`${elevation.toFixed(0)}m`}
          />
        )}
      </div>
    );
  }

  /* -------------------------------------------------------------------------
     Full Variant
     ------------------------------------------------------------------------- */
  return (
    <div
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...baseStyles,
        ...getPositionStyles(position),
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "12px",
        minWidth: "240px",
        backgroundColor: "var(--surface)",
        backdropFilter: "blur(12px)",
        border: "1px solid var(--border-primary)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-tertiary)",
          }}
        >
          Coordinates
        </span>
        {switchable && (
          <FormatSelector
            value={format}
            onChange={setFormat}
          />
        )}
      </div>

      {/* Coordinates Display */}
      <div
        onClick={handleCopy}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          backgroundColor: "var(--bg-tertiary)",
          borderRadius: "var(--radius-lg)",
          cursor: copyOnClick ? "pointer" : "default",
          transition: "all 150ms ease",
          border: "1px solid transparent",
        }}
        onMouseEnter={(e) => {
          if (copyOnClick) {
            e.currentTarget.style.backgroundColor = "var(--surface-hover)";
            e.currentTarget.style.borderColor = "var(--border-hover)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
          e.currentTarget.style.borderColor = "transparent";
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {formattedCoords}
        </span>

        {copied ? (
          <CopyFeedback show={copied} />
        ) : (
          copyOnClick && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              style={{ color: "var(--text-tertiary)" }}
            >
              <rect
                x="4.5"
                y="4.5"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M2.5 9.5V3C2.5 2.17157 3.17157 1.5 4 1.5H9.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          )
        )}
      </div>

      {/* Info Grid */}
      {(showZoom || showScale || showElevation) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
          }}
        >
          {showZoom && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "8px",
                backgroundColor: "var(--bg-tertiary)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--text-tertiary)",
                  marginBottom: "2px",
                }}
              >
                Zoom
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {zoom.toFixed(1)}
              </span>
            </div>
          )}

          {showScale && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "8px",
                backgroundColor: "var(--bg-tertiary)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--text-tertiary)",
                  marginBottom: "2px",
                }}
              >
                Scale
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {getScale()}
              </span>
            </div>
          )}

          {showElevation && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "8px",
                backgroundColor: "var(--bg-tertiary)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--text-tertiary)",
                  marginBottom: "2px",
                }}
              >
                Elevation
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {elevation !== null ? `${elevation.toFixed(0)}m` : "—"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

CoordinatesDisplay.displayName = "CoordinatesDisplay";

export default CoordinatesDisplay;
