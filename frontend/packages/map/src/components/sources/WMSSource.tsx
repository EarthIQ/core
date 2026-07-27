import React, { useEffect, useState, useCallback } from 'react';
import { useMap } from '../../hooks/useMap';

export interface WMSSourceProps {
  /** Unique source ID */
  id: string;
  /** WMS base URL */
  url: string;
  /** WMS layer names */
  layers: string | string[];
  /** WMS version */
  version?: '1.1.1' | '1.3.0';
  /** Output format */
  format?: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/png8';
  /** Transparent background */
  transparent?: boolean;
  /** Style names */
  styles?: string | string[];
  /** CRS/SRS */
  crs?: string;
  /** Tile size */
  tileSize?: number;
  /** Minimum zoom */
  minzoom?: number;
  /** Maximum zoom */
  maxzoom?: number;
  /** Attribution */
  attribution?: string;
  /** Additional WMS parameters */
  params?: Record<string, string>;
  /** Bounds [west, south, east, north] */
  bounds?: [number, number, number, number];
  /** Callback when loaded */
  onLoad?: (capabilities: WMSCapabilities | null) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Fetch capabilities on load */
  fetchCapabilities?: boolean;
  /** Children (for custom layer rendering) */
  children?: React.ReactNode;
  /** Auto-add raster layer */
  autoAddLayer?: boolean;
  /** Raster layer options */
  layerOptions?: {
    opacity?: number;
    beforeId?: string;
  };
}

export interface WMSCapabilities {
  version: string;
  title?: string;
  abstract?: string;
  layers: WMSLayerInfo[];
  formats: string[];
  crs: string[];
}

export interface WMSLayerInfo {
  name: string;
  title: string;
  abstract?: string;
  queryable: boolean;
  opaque: boolean;
  bbox?: [number, number, number, number];
  styles?: { name: string; title: string }[];
  minScale?: number;
  maxScale?: number;
}

export const WMSSource: React.FC<WMSSourceProps> = ({
  id,
  url,
  layers,
  version = '1.1.1',
  format = 'image/png',
  transparent = true,
  styles = '',
  crs = 'EPSG:3857',
  tileSize = 256,
  minzoom = 0,
  maxzoom = 22,
  attribution,
  params = {},
  bounds,
  onLoad,
  onError,
  fetchCapabilities = false,
  children,
  autoAddLayer = true,
  layerOptions = {}
}) => {
  const { map, isLoaded } = useMap();
  const [capabilities, setCapabilities] = useState<WMSCapabilities | null>(null);

  // Build WMS tile URL
  const buildTileUrl = useCallback(() => {
    const layerString = Array.isArray(layers) ? layers.join(',') : layers;
    const styleString = Array.isArray(styles) ? styles.join(',') : styles;

    const baseParams: Record<string, string> = {
      SERVICE: 'WMS',
      VERSION: version,
      REQUEST: 'GetMap',
      LAYERS: layerString,
      STYLES: styleString,
      FORMAT: format,
      TRANSPARENT: transparent ? 'TRUE' : 'FALSE',
      WIDTH: String(tileSize),
      HEIGHT: String(tileSize),
      ...params
    };

    // CRS parameter name differs between versions
    if (version === '1.3.0') {
      baseParams.CRS = crs;
      baseParams.BBOX = '{bbox-epsg-3857}';
    } else {
      baseParams.SRS = crs;
      baseParams.BBOX = '{bbox-epsg-3857}';
    }

    const queryString = Object.entries(baseParams)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${queryString}`;
  }, [url, layers, version, format, transparent, styles, crs, tileSize, params]);

  // Fetch WMS capabilities
  const fetchWMSCapabilities = useCallback(async (): Promise<WMSCapabilities | null> => {
    try {
      const capUrl = `${url}?SERVICE=WMS&VERSION=${version}&REQUEST=GetCapabilities`;
      const response = await fetch(capUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch WMS capabilities: ${response.status}`);
      }

      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');

      // Parse capabilities
      const capabilitiesNode = xml.querySelector('WMS_Capabilities, WMT_MS_Capabilities');
      if (!capabilitiesNode) {
        throw new Error('Invalid WMS capabilities response');
      }

      const parsedCapabilities: WMSCapabilities = {
        version: capabilitiesNode.getAttribute('version') || version,
        title: xml.querySelector('Service > Title')?.textContent || undefined,
        abstract: xml.querySelector('Service > Abstract')?.textContent || undefined,
        layers: [],
        formats: [],
        crs: []
      };

      // Parse layers
      const layerNodes = xml.querySelectorAll('Layer > Layer');
      layerNodes.forEach(layerNode => {
        const layerInfo: WMSLayerInfo = {
          name: layerNode.querySelector('Name')?.textContent || '',
          title: layerNode.querySelector('Title')?.textContent || '',
          abstract: layerNode.querySelector('Abstract')?.textContent || undefined,
          queryable: layerNode.getAttribute('queryable') === '1',
          opaque: layerNode.getAttribute('opaque') === '1'
        };

        // Parse bounding box
        const bboxNode = layerNode.querySelector('BoundingBox, LatLonBoundingBox');
        if (bboxNode) {
          layerInfo.bbox = [
            parseFloat(bboxNode.getAttribute('minx') || '0'),
            parseFloat(bboxNode.getAttribute('miny') || '0'),
            parseFloat(bboxNode.getAttribute('maxx') || '0'),
            parseFloat(bboxNode.getAttribute('maxy') || '0')
          ];
        }

        // Parse styles
        const styleNodes = layerNode.querySelectorAll('Style');
        if (styleNodes.length > 0) {
          layerInfo.styles = Array.from(styleNodes).map(styleNode => ({
            name: styleNode.querySelector('Name')?.textContent || '',
            title: styleNode.querySelector('Title')?.textContent || ''
          }));
        }

        parsedCapabilities.layers.push(layerInfo);
      });

      // Parse formats
      const formatNodes = xml.querySelectorAll('GetMap > Format');
      parsedCapabilities.formats = Array.from(formatNodes).map(
        node => node.textContent || ''
      ).filter(Boolean);

      // Parse CRS
      const crsNodes = xml.querySelectorAll('Layer > CRS, Layer > SRS');
      parsedCapabilities.crs = Array.from(new Set(
        Array.from(crsNodes).map(node => node.textContent || '').filter(Boolean)
      ));

      return parsedCapabilities;
    } catch (error) {
      onError?.(error as Error);
      return null;
    }
  }, [url, version, onError]);

  // Fetch capabilities if requested
  useEffect(() => {
    if (fetchCapabilities) {
      fetchWMSCapabilities().then(caps => {
        setCapabilities(caps);
      });
    }
  }, [fetchCapabilities, fetchWMSCapabilities]);

  // Initialize source and layer
  useEffect(() => {
    if (!map || !isLoaded) return;

    try {
      const tileUrl = buildTileUrl();

      if (!map.getSource(id)) {
        map.addSource(id, {
          type: 'raster',
          tiles: [tileUrl],
          tileSize,
          minzoom,
          maxzoom,
          attribution,
          bounds
        });

        // Auto-add raster layer
        if (autoAddLayer && !map.getLayer(`${id}-layer`)) {
          map.addLayer({
            id: `${id}-layer`,
            type: 'raster',
            source: id,
            paint: {
              'raster-opacity': layerOptions.opacity ?? 1
            }
          }, layerOptions.beforeId);
        }

        onLoad?.(capabilities);
      }
    } catch (error) {
      onError?.(error as Error);
    }

    return () => {
      if (map.getLayer(`${id}-layer`)) {
        map.removeLayer(`${id}-layer`);
      }
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    };
  }, [map, isLoaded, id, buildTileUrl, tileSize, minzoom, maxzoom, attribution, bounds, autoAddLayer, layerOptions, capabilities, onLoad, onError]);

  return <>{children}</>;
};

// Hook for WMS source
export const useWMSSource = (id: string) => {
  const { map, isLoaded } = useMap();

  const getSource = useCallback(() => {
    if (!map || !isLoaded) return null;
    return map.getSource(id) as maplibregl.RasterTileSource | undefined;
  }, [map, isLoaded, id]);

  const setOpacity = useCallback((opacity: number) => {
    if (!map || !isLoaded) return;
    
    const layerId = `${id}-layer`;
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'raster-opacity', opacity);
    }
  }, [map, isLoaded, id]);

  const getFeatureInfo = useCallback(async (
    lngLat: { lng: number; lat: number },
    options: {
      layers?: string[];
      infoFormat?: string;
      featureCount?: number;
    } = {}
  ): Promise<any> => {
    // Implementation would require the WMS URL and parameters
    // This is a placeholder for the GetFeatureInfo request
    console.warn('getFeatureInfo requires WMS URL context');
    return null;
  }, []);

  return {
    source: getSource(),
    setOpacity,
    getFeatureInfo
  };
};

// Helper component for WMS GetFeatureInfo
export interface WMSFeatureInfoProps {
  sourceId: string;
  url: string;
  layers: string | string[];
  version?: '1.1.1' | '1.3.0';
  infoFormat?: string;
  featureCount?: number;
  enabled?: boolean;
  onFeatureInfo?: (info: any, lngLat: { lng: number; lat: number }) => void;
  onError?: (error: Error) => void;
}

export const WMSFeatureInfo: React.FC<WMSFeatureInfoProps> = ({
  sourceId,
  url,
  layers,
  version = '1.1.1',
  infoFormat = 'application/json',
  featureCount = 10,
  enabled = true,
  onFeatureInfo,
  onError
}) => {
  const { map, isLoaded } = useMap();

  const handleClick = useCallback(async (e: any) => {
    if (!enabled) return;

    try {
      const { lngLat, point } = e;
      const layerString = Array.isArray(layers) ? layers.join(',') : layers;
      
      // Get map size
      const canvas = map!.getCanvas();
      const width = canvas.width;
      const height = canvas.height;

      // Get map bounds
      const bounds = map!.getBounds();

      // Build GetFeatureInfo URL
      const params: Record<string, string> = {
        SERVICE: 'WMS',
        VERSION: version,
        REQUEST: 'GetFeatureInfo',
        LAYERS: layerString,
        QUERY_LAYERS: layerString,
        INFO_FORMAT: infoFormat,
        FEATURE_COUNT: String(featureCount),
        WIDTH: String(width),
        HEIGHT: String(height),
        X: String(Math.round(point.x)),
        Y: String(Math.round(point.y))
      };

      if (version === '1.3.0') {
        params.CRS = 'EPSG:4326';
        params.BBOX = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
        params.I = params.X;
        params.J = params.Y;
        delete params.X;
        delete params.Y;
      } else {
        params.SRS = 'EPSG:4326';
        params.BBOX = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
      }

      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      const separator = url.includes('?') ? '&' : '?';
      const infoUrl = `${url}${separator}${queryString}`;

      const response = await fetch(infoUrl);
      
      if (!response.ok) {
        throw new Error(`GetFeatureInfo failed: ${response.status}`);
      }

      let info;
      if (infoFormat.includes('json')) {
        info = await response.json();
      } else {
        info = await response.text();
      }

      onFeatureInfo?.(info, lngLat);
    } catch (error) {
      onError?.(error as Error);
    }
  }, [map, enabled, url, layers, version, infoFormat, featureCount, onFeatureInfo, onError]);

  useEffect(() => {
    if (!map || !isLoaded || !enabled) return;

    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
    };
  }, [map, isLoaded, enabled, handleClick]);

  return null;
};