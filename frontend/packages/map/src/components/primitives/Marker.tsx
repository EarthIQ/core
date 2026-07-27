import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import ReactDOM from "react-dom/client";
import maplibregl from "maplibre-gl";
import { useMap } from "../../hooks/useMap";

export interface MarkerProps {
  /** Longitude position */
  longitude: number;
  /** Latitude position */
  latitude: number;
  /** Custom marker element */
  children?: React.ReactNode;
  /** Marker color (if no children) */
  color?: string;
  /** Marker scale */
  scale?: number;
  /** Draggable marker */
  draggable?: boolean;
  /** Popup content */
  popup?: React.ReactNode;
  /** Popup options */
  popupOptions?: {
    offset?: number;
    closeButton?: boolean;
    closeOnClick?: boolean;
    maxWidth?: string;
  };
  /** Callback on drag end */
  onDragEnd?: (lngLat: { lng: number; lat: number }) => void;
  /** Callback on click */
  onClick?: () => void;
  /** Rotation angle */
  rotation?: number;
  /** Anchor position */
  anchor?: "center" | "top" | "bottom" | "left" | "right";
}

export const Marker: React.FC<MarkerProps> = ({
  longitude,
  latitude,
  children,
  color = "#3b82f6",
  scale = 1,
  draggable = false,
  popup,
  popupOptions = {},
  onDragEnd,
  onClick,
  rotation = 0,
  anchor = "bottom",
}) => {
  const { map } = useMap();
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const markerContainerRef = useRef<HTMLDivElement | null>(null);
  if (!markerContainerRef.current) {
    markerContainerRef.current = document.createElement("div");
  }
  const popupRootRef = useRef<ReactDOM.Root | null>(null);
  const popupContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!map) return;

    const marker = new maplibregl.Marker({
      element: children ? markerContainerRef.current : undefined,
      color: children ? undefined : color,
      scale,
      draggable,
      rotation,
      anchor,
    })
      .setLngLat([longitude, latitude])
      .addTo(map);

    markerRef.current = marker;

    // Add popup if provided
    if (popup) {
      const popupInstance = new maplibregl.Popup({
        offset: popupOptions.offset || 25,
        closeButton: popupOptions.closeButton ?? true,
        closeOnClick: popupOptions.closeOnClick ?? true,
        maxWidth: popupOptions.maxWidth || "300px",
      });

      // Create and render React content to popup
      const popupElement = document.createElement("div");
      popupContainerRef.current = popupElement;

      try {
        const root = ReactDOM.createRoot(popupElement);
        popupRootRef.current = root;
        root.render(<>{popup}</>);
      } catch (err) {
        console.error("Failed to render popup:", err);
      }

      popupInstance.setDOMContent(popupElement);
      marker.setPopup(popupInstance);
      popupRef.current = popupInstance;
    }

    // Event handlers
    const markerElement = marker.getElement();

    if (draggable && onDragEnd) {
      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        onDragEnd({ lng: lngLat.lng, lat: lngLat.lat });
      });
    }

    if (onClick) {
      markerElement.addEventListener("click", onClick);
    }

    return () => {
      // Remove event listeners first
      if (onClick && markerElement) {
        markerElement.removeEventListener("click", onClick);
      }

      // Clean up React root before removing from DOM
      if (popupRootRef.current) {
        try {
          popupRootRef.current.unmount();
        } catch (err) {
          console.error("Failed to unmount popup root:", err);
        }
        popupRootRef.current = null;
      }

      // Remove marker (which removes all its DOM elements)
      if (markerRef.current) {
        marker.remove();
        markerRef.current = null;
      }
    };
  }, [
    map,
    color,
    scale,
    draggable,
    rotation,
    anchor,
    popup,
    popupOptions,
    onDragEnd,
    onClick,
  ]);

  // Update position
  useEffect(() => {
    markerRef.current?.setLngLat([longitude, latitude]);
  }, [longitude, latitude]);

  // Use portal to render children into the marker element
  if (children) {
    return (
      <>
        {createPortal(
          <div
            style={{ cursor: "pointer" }}
            onClick={onClick}
          >
            {children}
          </div>,
          markerContainerRef.current
        )}
      </>
    );
  }

  return null;
};
