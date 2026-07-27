import React, { useCallback } from 'react';
import { useMap } from '../../hooks/useMap';
import { Button, Stack } from '@packages/ui';

export interface ZoomControlProps {
  /** Position on map */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Show zoom in button */
  showZoomIn?: boolean;
  /** Show zoom out button */
  showZoomOut?: boolean;
  /** Show reset button */
  showReset?: boolean;
  /** Reset view state */
  resetView?: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
  };
  /** Zoom step */
  zoomStep?: number;
  /** Animation duration */
  duration?: number;
  /** Orientation */
  orientation?: 'vertical' | 'horizontal';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Show zoom level display */
  showZoomLevel?: boolean;
  /** Custom className */
  className?: string;
  /** Callback on zoom change */
  onZoomChange?: (zoom: number) => void;
  /** Min zoom */
  minZoom?: number;
  /** Max zoom */
  maxZoom?: number;
}

export const ZoomControl: React.FC<ZoomControlProps> = ({
  position = 'top-right',
  showZoomIn = true,
  showZoomOut = true,
  showReset = false,
  resetView,
  zoomStep = 1,
  duration = 300,
  orientation = 'vertical',
  size = 'md',
  showZoomLevel = false,
  className,
  onZoomChange,
  minZoom = 0,
  maxZoom = 22
}) => {
  const { map, isLoaded } = useMap();
  const [currentZoom, setCurrentZoom] = React.useState(0);

  // Update zoom level display
  React.useEffect(() => {
    if (!map || !isLoaded) return;

    const updateZoom = () => {
      const zoom = map.getZoom();
      setCurrentZoom(zoom);
      onZoomChange?.(zoom);
    };

    updateZoom();
    map.on('zoom', updateZoom);

    return () => {
      map.off('zoom', updateZoom);
    };
  }, [map, isLoaded, onZoomChange]);

  const handleZoomIn = useCallback(() => {
    if (!map) return;
    const currentZoom = map.getZoom();
    const newZoom = Math.min(currentZoom + zoomStep, maxZoom);
    map.easeTo({ zoom: newZoom, duration });
  }, [map, zoomStep, duration, maxZoom]);

  const handleZoomOut = useCallback(() => {
    if (!map) return;
    const currentZoom = map.getZoom();
    const newZoom = Math.max(currentZoom - zoomStep, minZoom);
    map.easeTo({ zoom: newZoom, duration });
  }, [map, zoomStep, duration, minZoom]);

  const handleReset = useCallback(() => {
    if (!map || !resetView) return;
    map.flyTo({
      center: [resetView.longitude, resetView.latitude],
      zoom: resetView.zoom,
      pitch: resetView.pitch || 0,
      bearing: resetView.bearing || 0,
      duration: duration * 2
    });
  }, [map, resetView, duration]);

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 10, left: 10 },
    'top-right': { top: 10, right: 10 },
    'bottom-left': { bottom: 10, left: 10 },
    'bottom-right': { bottom: 10, right: 10 }
  };

  const sizes = {
    sm: { button: 28, font: 14 },
    md: { button: 36, font: 18 },
    lg: { button: 44, font: 22 }
  };

  const buttonStyle: React.CSSProperties = {
    width: sizes[size].button,
    height: sizes[size].button,
    fontSize: sizes[size].font,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #d1d5db',
    backgroundColor: 'white',
    cursor: 'pointer',
    borderRadius: 4,
    transition: 'background-color 0.15s'
  };

  const isAtMaxZoom = currentZoom >= maxZoom;
  const isAtMinZoom = currentZoom <= minZoom;

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        ...positionStyles[position],
        zIndex: 1000
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: orientation === 'vertical' ? 'column' : 'row',
          gap: 2,
          backgroundColor: 'white',
          borderRadius: 6,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          padding: 2
        }}
      >
        {showZoomIn && (
          <button
            onClick={handleZoomIn}
            disabled={isAtMaxZoom}
            style={{
              ...buttonStyle,
              opacity: isAtMaxZoom ? 0.5 : 1,
              cursor: isAtMaxZoom ? 'not-allowed' : 'pointer'
            }}
            title="Zoom in"
            onMouseEnter={(e) => !isAtMaxZoom && (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            +
          </button>
        )}

        {showZoomLevel && (
          <div
            style={{
              ...buttonStyle,
              cursor: 'default',
              fontSize: sizes[size].font - 6,
              fontWeight: 'bold',
              color: '#6b7280'
            }}
            title={`Zoom level: ${currentZoom.toFixed(1)}`}
          >
            {Math.round(currentZoom)}
          </div>
        )}

        {showZoomOut && (
          <button
            onClick={handleZoomOut}
            disabled={isAtMinZoom}
            style={{
              ...buttonStyle,
              opacity: isAtMinZoom ? 0.5 : 1,
              cursor: isAtMinZoom ? 'not-allowed' : 'pointer'
            }}
            title="Zoom out"
            onMouseEnter={(e) => !isAtMinZoom && (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            −
          </button>
        )}

        {showReset && resetView && (
          <button
            onClick={handleReset}
            style={buttonStyle}
            title="Reset view"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            ⌂
          </button>
        )}
      </div>
    </div>
  );
};

// Hook for zoom control
export const useZoom = () => {
  const { map, isLoaded } = useMap();
  const [zoom, setZoom] = React.useState(0);

  React.useEffect(() => {
    if (!map || !isLoaded) return;

    const updateZoom = () => setZoom(map.getZoom());
    updateZoom();
    map.on('zoom', updateZoom);
    
    return () => {
      map.off('zoom', updateZoom);
    };
  }, [map, isLoaded]);

  const zoomTo = useCallback((level: number, options?: { duration?: number }) => {
    map?.easeTo({ zoom: level, duration: options?.duration ?? 300 });
  }, [map]);

  const zoomIn = useCallback((step: number = 1) => {
    if (!map) return;
    map.easeTo({ zoom: map.getZoom() + step, duration: 300 });
  }, [map]);

  const zoomOut = useCallback((step: number = 1) => {
    if (!map) return;
    map.easeTo({ zoom: map.getZoom() - step, duration: 300 });
  }, [map]);

  return { zoom, zoomTo, zoomIn, zoomOut };
};