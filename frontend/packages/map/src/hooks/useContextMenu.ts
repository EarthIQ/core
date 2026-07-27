import { useState, useEffect, useCallback, useRef } from "react";
import type {
  MapCoordinates,
  ContextMenuPosition,
  ContextMenuState,
} from "../types";

interface UseContextMenuOptions {
  map: maplibregl.Map | null;
  disabled?: boolean;
  onOpen?: (coords: MapCoordinates, position: ContextMenuPosition) => void;
  onClose?: () => void;
}

export function useContextMenu({
  map,
  disabled = false,
  onOpen,
  onClose,
}: UseContextMenuOptions) {
  const [state, setState] = useState<ContextMenuState>({
    isOpen: false,
    position: null,
    coordinates: null,
  });

  const menuRef = useRef<HTMLDivElement>(null);

  const open = useCallback(
    (coordinates: MapCoordinates, position: ContextMenuPosition) => {
      setState({
        isOpen: true,
        position,
        coordinates,
      });
      onOpen?.(coordinates, position);
    },
    [onOpen]
  );

  const close = useCallback(() => {
    setState({
      isOpen: false,
      position: null,
      coordinates: null,
    });
    onClose?.();
  }, [onClose]);

  // Handle right-click on map
  useEffect(() => {
    if (!map || disabled) return;

    const handleContextMenu = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault();

      const { lngLat, point } = e;
      const coordinates: MapCoordinates = {
        lat: lngLat.lat,
        lng: lngLat.lng,
        zoom: map.getZoom(),
      };

      // Get the map container's position
      const container = map.getContainer();
      const rect = container.getBoundingClientRect();

      const position: ContextMenuPosition = {
        x: point.x + rect.left,
        y: point.y + rect.top,
      };

      open(coordinates, position);
    };

    map.on("contextmenu", handleContextMenu);

    return () => {
      map.off("contextmenu", handleContextMenu);
    };
  }, [map, disabled, open]);

  // Close on click outside
  useEffect(() => {
    if (!state.isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };

    const handleScroll = () => {
      close();
    };

    // Close on map move
    const handleMapMove = () => {
      close();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("scroll", handleScroll, true);

    if (map) {
      map.on("move", handleMapMove);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("scroll", handleScroll, true);

      if (map) {
        map.off("move", handleMapMove);
      }
    };
  }, [state.isOpen, map, close]);

  return {
    ...state,
    menuRef,
    open,
    close,
  };
}
