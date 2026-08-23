import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import { createPortal } from 'react-dom';
import { useMap } from '../../hooks/useMap';

export interface PopupProps {
  /** Longitude position */
  longitude: number;
  /** Latitude position */
  latitude: number;
  /** Popup content */
  children: React.ReactNode;
  /** Close button */
  closeButton?: boolean;
  /** Close on click outside */
  closeOnClick?: boolean;
  /** Callback on close */
  onClose?: () => void;
  /** Anchor position */
  anchor?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  /** Offset from anchor */
  offset?: number | [number, number];
  /** Max width */
  maxWidth?: string;
  /** Custom className */
  className?: string;
}

export const Popup: React.FC<PopupProps> = ({
  longitude,
  latitude,
  children,
  closeButton = true,
  closeOnClick = true,
  onClose,
  anchor = 'bottom',
  offset = 0,
  maxWidth = '300px',
  className
}) => {
  const { map } = useMap();
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const containerRef = useRef<HTMLDivElement>(document.createElement('div'));

  useEffect(() => {
    if (!map) return;

    const popup = new maplibregl.Popup({
      closeButton,
      closeOnClick,
      anchor,
      offset,
      maxWidth,
      className
    })
      .setLngLat([longitude, latitude])
      .setDOMContent(containerRef.current)
      .addTo(map);

    popupRef.current = popup;

    popup.on('close', () => {
      onClose?.();
    });

    return () => {
      popup.remove();
    };
  }, [map]);

  // Update position
  useEffect(() => {
    popupRef.current?.setLngLat([longitude, latitude]);
  }, [longitude, latitude]);

  return createPortal(children, containerRef.current);
};