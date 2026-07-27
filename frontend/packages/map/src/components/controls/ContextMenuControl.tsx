import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { cn, useCopyToClipboard } from "@packages/ui";
import { useContextMenu } from "../../hooks/useContextMenu";
import type {
  ContextMenuControlProps,
  ContextMenuItem,
  MapCoordinates,
} from "../../types";
import useMap from "../../hooks/useMap";

// Coordinate formatting utilities
function formatDecimal(value: number, precision: number): string {
  return value.toFixed(precision);
}

function formatDMS(decimal: number, isLat: boolean): string {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(1);

  const direction = isLat
    ? decimal >= 0
      ? "N"
      : "S"
    : decimal >= 0
      ? "E"
      : "W";

  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

// Icons
const CopyIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const MarkerIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const DirectionsIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
    />
  </svg>
);

const SearchIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const RulerIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 6l12 12M6 6v4m0-4h4m8 12v-4m0 4h-4"
    />
  </svg>
);

const ZoomInIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
    />
  </svg>
);

const ZoomOutIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
    />
  </svg>
);

const CenterIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
    />
    <circle
      cx="12"
      cy="12"
      r="2"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="h-4 w-4 text-[var(--success)]"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    className="h-3 w-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 5l7 7-7 7"
    />
  </svg>
);

export const ContextMenuControl: React.FC<ContextMenuControlProps> = ({
  items = [],
  showCoordinates = true,
  coordinateFormat = "decimal",
  precision = 6,
  onCopyCoordinates,
  onWhatsHere,
  onDirectionsFrom,
  onDirectionsTo,
  onAddMarker,
  onMeasureDistance,
  className,
  disabled = false,
}) => {
  const { map, isLoaded } = useMap();
  const { isOpen, position, coordinates, menuRef, close } = useContextMenu({
    map,
    disabled,
  });

  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const { copy } = useCopyToClipboard();

  // Format coordinates
  const formattedCoords = useMemo(() => {
    if (!coordinates) return null;

    const decimal = `${formatDecimal(coordinates.lat, precision)}, ${formatDecimal(coordinates.lng, precision)}`;
    const dms = `${formatDMS(coordinates.lat, true)} ${formatDMS(coordinates.lng, false)}`;

    return { decimal, dms };
  }, [coordinates, precision]);

  // Handle copy
  const handleCopy = useCallback(
    async (format: "decimal" | "dms") => {
      if (!coordinates || !formattedCoords) return;

      const text =
        format === "decimal" ? formattedCoords.decimal : formattedCoords.dms;
      const success = await copy(text);

      if (success) {
        setCopiedFormat(format);
        onCopyCoordinates?.(coordinates, format);

        setTimeout(() => {
          setCopiedFormat(null);
        }, 2000);
      }
    },
    [coordinates, formattedCoords, copy, onCopyCoordinates]
  );

  // Handle menu item click
  const handleItemClick = useCallback(
    (item: ContextMenuItem) => {
      if (item.disabled) return;

      if (coordinates && item.onClick) {
        item.onClick(coordinates);
      }
      close();
    },
    [coordinates, close]
  );

  // Handle built-in actions
  const handleZoomIn = useCallback(() => {
    if (map && coordinates) {
      map.flyTo({
        center: [coordinates.lng, coordinates.lat],
        zoom: map.getZoom() + 2,
        duration: 500,
      });
    }
    close();
  }, [map, coordinates, close]);

  const handleZoomOut = useCallback(() => {
    if (map && coordinates) {
      map.flyTo({
        center: [coordinates.lng, coordinates.lat],
        zoom: Math.max(0, map.getZoom() - 2),
        duration: 500,
      });
    }
    close();
  }, [map, coordinates, close]);

  const handleCenterHere = useCallback(() => {
    if (map && coordinates) {
      map.flyTo({
        center: [coordinates.lng, coordinates.lat],
        duration: 500,
      });
    }
    close();
  }, [map, coordinates, close]);

  // Build menu items
  const defaultItems: ContextMenuItem[] = useMemo(() => {
    const menuItems: ContextMenuItem[] = [];

    // What's here
    if (onWhatsHere) {
      menuItems.push({
        id: "whats-here",
        label: "What's here?",
        icon: <SearchIcon />,
        onClick: onWhatsHere,
      });
    }

    // Directions
    if (onDirectionsFrom || onDirectionsTo) {
      if (onDirectionsFrom) {
        menuItems.push({
          id: "directions-from",
          label: "Directions from here",
          icon: <DirectionsIcon />,
          onClick: onDirectionsFrom,
        });
      }
      if (onDirectionsTo) {
        menuItems.push({
          id: "directions-to",
          label: "Directions to here",
          icon: <DirectionsIcon />,
          onClick: onDirectionsTo,
        });
      }
    }

    // Add marker
    if (onAddMarker) {
      menuItems.push({
        id: "add-marker",
        label: "Add marker",
        icon: <MarkerIcon />,
        onClick: onAddMarker,
      });
    }

    // Measure distance
    if (onMeasureDistance) {
      menuItems.push({
        id: "measure-distance",
        label: "Measure distance",
        icon: <RulerIcon />,
        onClick: onMeasureDistance,
      });
    }

    // Divider before zoom controls
    if (menuItems.length > 0) {
      menuItems.push({
        id: "divider-1",
        label: "",
        divider: true,
      });
    }

    // Zoom controls
    menuItems.push(
      // {
      //   id: "zoom-in",
      //   label: "Zoom in",
      //   icon: <ZoomInIcon />,
      //   shortcut: "+",
      //   onClick: () => {},
      // },
      // {
      //   id: "zoom-out",
      //   label: "Zoom out",
      //   icon: <ZoomOutIcon />,
      //   shortcut: "-",
      //   onClick: () => {},
      // },
      {
        id: "center-here",
        label: "Center map here",
        icon: <CenterIcon />,
        onClick: () => {},
      }
    );

    return menuItems;
  }, [
    onWhatsHere,
    onDirectionsFrom,
    onDirectionsTo,
    onAddMarker,
    onMeasureDistance,
  ]);

  // Merge with custom items
  const allItems = useMemo(() => {
    if (items.length === 0) return defaultItems;

    return [
      ...items,
      { id: "custom-divider", label: "", divider: true },
      ...defaultItems,
    ];
  }, [items, defaultItems]);

  // Calculate menu position to keep it in viewport
  const menuStyle = useMemo(() => {
    if (!position) return {};

    const menuWidth = 220;
    const menuHeight = 400; // Approximate max height
    const padding = 8;

    let x = position.x;
    let y = position.y;

    // Adjust for right edge
    if (x + menuWidth + padding > window.innerWidth) {
      x = window.innerWidth - menuWidth - padding;
    }

    // Adjust for bottom edge
    if (y + menuHeight + padding > window.innerHeight) {
      y = window.innerHeight - menuHeight - padding;
    }

    // Ensure not off left/top
    x = Math.max(padding, x);
    y = Math.max(padding, y);

    return {
      left: `${x}px`,
      top: `${y}px`,
    };
  }, [position]);

  if (!isOpen || !coordinates || !formattedCoords) {
    return null;
  }

  const menuContent = (
    <div
      ref={menuRef}
      style={{ ...menuStyle, zIndex: "var(--z-popover, 1060)" }}
      className={cn(
        "fixed",
        "w-56 py-1",
        "rounded-lg bg-[var(--surface)]",
        "border border-[var(--border-primary)]",
        "shadow-lg",
        "animate-scale-in origin-top-left",
        className
      )}
      role="menu"
      aria-orientation="vertical"
    >
      {/* Coordinates Section */}
      {showCoordinates && (
        <>
          <div className="px-3 py-2">
            <p className="mb-1 text-xs font-medium tracking-wider text-[var(--text-tertiary)] uppercase">
              Coordinates
            </p>

            {/* Decimal Format */}
            {(coordinateFormat === "decimal" ||
              coordinateFormat === "both") && (
              <button
                onClick={() => handleCopy("decimal")}
                className={cn(
                  "-mx-2 flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5",
                  "text-sm text-[var(--text-primary)]",
                  "hover:bg-[var(--surface-hover)]",
                  "transition-colors duration-[var(--transition-fast)]",
                  "group"
                )}
              >
                <span className="truncate font-mono text-xs">
                  {formattedCoords.decimal}
                </span>
                {copiedFormat === "decimal" ? (
                  <CheckIcon />
                ) : (
                  <span className="opacity-0 transition-opacity group-hover:opacity-100">
                    <CopyIcon />
                  </span>
                )}
              </button>
            )}

            {/* DMS Format */}
            {(coordinateFormat === "dms" || coordinateFormat === "both") && (
              <button
                onClick={() => handleCopy("dms")}
                className={cn(
                  "-mx-2 flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5",
                  "text-sm text-[var(--text-primary)]",
                  "hover:bg-[var(--surface-hover)]",
                  "transition-colors duration-[var(--transition-fast)]",
                  "group"
                )}
              >
                <span className="truncate font-mono text-xs">
                  {formattedCoords.dms}
                </span>
                {copiedFormat === "dms" ? (
                  <CheckIcon />
                ) : (
                  <span className="opacity-0 transition-opacity group-hover:opacity-100">
                    <CopyIcon />
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="my-1 h-px bg-[var(--divider)]" />
        </>
      )}

      {/* Menu Items */}
      <div className="py-1">
        {allItems.map((item) => {
          if (item.divider) {
            return (
              <div
                key={item.id}
                className="my-1 h-px bg-[var(--divider)]"
              />
            );
          }

          // Special handling for built-in zoom controls
          let onClick = () => handleItemClick(item);
          if (item.id === "zoom-in") onClick = handleZoomIn;
          if (item.id === "zoom-out") onClick = handleZoomOut;
          if (item.id === "center-here") onClick = handleCenterHere;

          return (
            <button
              key={item.id}
              onClick={onClick}
              disabled={item.disabled}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2",
                "text-left text-sm",
                "transition-colors duration-[var(--transition-fast)]",
                item.disabled
                  ? "cursor-not-allowed text-[var(--text-tertiary)]"
                  : item.danger
                    ? "text-[var(--error)] hover:bg-[var(--error-bg)]"
                    : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
              )}
              role="menuitem"
            >
              {item.icon && (
                <span className="flex-shrink-0 text-[var(--text-tertiary)]">
                  {item.icon}
                </span>
              )}
              <span className="flex-1">{item.label}</span>
              {item.shortcut && (
                <kbd
                  className={cn(
                    "rounded px-1.5 py-0.5 text-xs",
                    "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]",
                    "font-mono"
                  )}
                >
                  {item.shortcut}
                </kbd>
              )}
              {item.children && <ChevronRightIcon />}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Portal to body to avoid z-index issues
  return createPortal(menuContent, document.body);
};

// Standalone coordinate display component
export function CoordinateDisplay({
  coordinates,
  format = "decimal",
  precision = 6,
  className,
  onCopy,
}: {
  coordinates: MapCoordinates;
  format?: "decimal" | "dms";
  precision?: number;
  className?: string;
  onCopy?: () => void;
}) {
  const { copy } = useCopyToClipboard();
  const [copied, setCopied] = useState(false);

  const formatted = useMemo(() => {
    if (format === "dms") {
      return `${formatDMS(coordinates.lat, true)} ${formatDMS(coordinates.lng, false)}`;
    }
    return `${formatDecimal(coordinates.lat, precision)}, ${formatDecimal(coordinates.lng, precision)}`;
  }, [coordinates, format, precision]);

  const handleCopy = async () => {
    const success = await copy(formatted);

    if (success) {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }

    onCopy?.();
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-2 py-1",
        "bg-[var(--bg-tertiary)] hover:bg-[var(--surface-hover)]",
        "font-mono text-sm text-[var(--text-secondary)]",
        "transition-colors duration-[var(--transition-fast)]",
        "group",
        className
      )}
    >
      <span>{formatted}</span>
      {copied ? (
        <CheckIcon />
      ) : (
        <span className="opacity-0 transition-opacity group-hover:opacity-100">
          <CopyIcon />
        </span>
      )}
    </button>
  );
}
