import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { useMap } from '../../hooks/useMap';

export interface MiniMapProps {
  /** Position on map */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Zoom offset from main map */
  zoomOffset?: number;
  /** Style URL (defaults to simplified version of main map) */
  style?: string;
  /** Show viewport indicator */
  showViewport?: boolean;
  /** Viewport indicator color */
  viewportColor?: string;
  /** Collapsible */
  collapsible?: boolean;
  /** Initially collapsed */
  defaultCollapsed?: boolean;
  /** Border style */
  borderStyle?: 'solid' | 'shadow' | 'none';
  /** Border radius */
  borderRadius?: number;
  /** Enable interaction on minimap */
  interactive?: boolean;
  /** Sync main map on minimap click */
  syncOnClick?: boolean;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  position = 'bottom-right',
  width = 150,
  height = 150,
  zoomOffset = -5,
  style,
  showViewport = true,
  viewportColor = 'rgba(59, 130, 246, 0.5)',
  collapsible = true,
  defaultCollapsed = false,
  borderStyle = 'shadow',
  borderRadius = 8,
  interactive = false,
  syncOnClick = true
}) => {
  const { map: mainMap, isLoaded } = useMap();
  const containerRef = useRef<HTMLDivElement>(null);
  const miniMapRef = useRef<maplibregl.Map | null>(null);
  const viewportLayerRef = useRef<string>('minimap-viewport');
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Initialize minimap
  useEffect(() => {
    if (!containerRef.current || !mainMap || !isLoaded || isCollapsed) return;

    // Use main map style if not specified
    const miniMapStyle = style || mainMap.getStyle();

    const miniMap = new maplibregl.Map({
      container: containerRef.current,
      style: miniMapStyle,
      center: mainMap.getCenter(),
      zoom: mainMap.getZoom() + zoomOffset,
      interactive,
      attributionControl: false
    });

    miniMapRef.current = miniMap;

    miniMap.on('load', () => {
      if (showViewport) {
        // Add viewport indicator source and layer
        miniMap.addSource(viewportLayerRef.current, {
          type: 'geojson',
          data: getViewportGeoJSON(mainMap)
        });

        miniMap.addLayer({
          id: `${viewportLayerRef.current}-fill`,
          type: 'fill',
          source: viewportLayerRef.current,
          paint: {
            'fill-color': viewportColor,
            'fill-opacity': 0.3
          }
        });

        miniMap.addLayer({
          id: `${viewportLayerRef.current}-line`,
          type: 'line',
          source: viewportLayerRef.current,
          paint: {
            'line-color': viewportColor.replace('0.5', '1'),
            'line-width': 2
          }
        });
      }
    });

    // Sync minimap with main map
    const syncMiniMap = () => {
      if (!miniMapRef.current) return;
      
      miniMapRef.current.jumpTo({
        center: mainMap.getCenter(),
        zoom: mainMap.getZoom() + zoomOffset
      });

      // Update viewport indicator
      if (showViewport) {
        const source = miniMapRef.current.getSource(viewportLayerRef.current) as maplibregl.GeoJSONSource;
        if (source) {
          source.setData(getViewportGeoJSON(mainMap));
        }
      }
    };

    mainMap.on('move', syncMiniMap);

    // Sync main map on minimap click
    if (syncOnClick) {
      miniMap.on('click', (e) => {
        mainMap.flyTo({
          center: e.lngLat
        });
      });
    }

    return () => {
      mainMap.off('move', syncMiniMap);
      miniMap.remove();
      miniMapRef.current = null;
    };
  }, [mainMap, isLoaded, isCollapsed, style, zoomOffset, showViewport, viewportColor, interactive, syncOnClick]);

  // Get viewport bounds as GeoJSON polygon
  const getViewportGeoJSON = (map: maplibregl.Map): GeoJSON.Feature => {
    const bounds = map.getBounds();
    const nw = bounds.getNorthWest();
    const ne = bounds.getNorthEast();
    const se = bounds.getSouthEast();
    const sw = bounds.getSouthWest();

    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [nw.lng, nw.lat],
          [ne.lng, ne.lat],
          [se.lng, se.lat],
          [sw.lng, sw.lat],
          [nw.lng, nw.lat]
        ]]
      }
    };
  };

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 10, left: 10 },
    'top-right': { top: 10, right: 10 },
    'bottom-left': { bottom: 10, left: 10 },
    'bottom-right': { bottom: 10, right: 10 }
  };

  const borderStyles: Record<string, React.CSSProperties> = {
    solid: { border: '2px solid #d1d5db' },
    shadow: { boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
    none: {}
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        style={{
          position: 'absolute',
          ...positionStyles[position],
          zIndex: 1000,
          width: 36,
          height: 36,
          borderRadius: 6,
          border: 'none',
          backgroundColor: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Show minimap"
      >
        🗺️
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        ...positionStyles[position],
        zIndex: 1000,
        width,
        height,
        borderRadius,
        overflow: 'hidden',
        backgroundColor: 'white',
        ...borderStyles[borderStyle]
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      
      {collapsible && (
        <button
          onClick={() => setIsCollapsed(true)}
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 20,
            height: 20,
            borderRadius: 4,
            border: 'none',
            backgroundColor: 'rgba(255,255,255,0.8)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};