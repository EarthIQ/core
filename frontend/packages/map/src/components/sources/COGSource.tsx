import React, { useEffect, useId, useState } from 'react';
import { useMap } from '../../hooks/useMap';
import GeoTIFF, { fromUrl, Pool } from 'geotiff';

export interface COGSourceProps {
  /** Unique source ID */
  id?: string;
  /** COG URL */
  url: string;
  /** Band indices to render [R, G, B] */
  bands?: [number, number, number] | [number];
  /** Color ramp for single band */
  colorRamp?: 'viridis' | 'magma' | 'inferno' | 'plasma' | 'turbo' | 'greys';
  /** Min/max values for normalization */
  range?: [number, number];
  /** No data value */
  noData?: number;
  /** Opacity */
  opacity?: number;
  /** Visibility */
  visible?: boolean;
  /** Callback when loaded */
  onLoad?: (metadata: COGMetadata) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface COGMetadata {
  width: number;
  height: number;
  bounds: [number, number, number, number];
  bandCount: number;
  resolution: [number, number];
  crs: string;
}

export const COGSource: React.FC<COGSourceProps> = ({
  id: propId,
  url,
  bands = [1],
  colorRamp = 'viridis',
  range,
  noData,
  opacity = 1,
  visible = true,
  onLoad,
  onError
}) => {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId || `cog-source-${autoId}`;
  const [metadata, setMetadata] = useState<COGMetadata | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;

    let cancelled = false;
    const pool = new Pool();

    const loadCOG = async () => {
      try {
        const tiff = await fromUrl(url);
        const image = await tiff.getImage();
        
        const bbox = image.getBoundingBox();
        const width = image.getWidth();
        const height = image.getHeight();
        const resolution = image.getResolution();
        
        const meta: COGMetadata = {
          width,
          height,
          bounds: bbox as [number, number, number, number],
          bandCount: image.getSamplesPerPixel(),
          resolution: resolution as [number, number],
          crs: 'EPSG:4326' // Simplified, would need proper CRS detection
        };

        if (cancelled) return;
        
        setMetadata(meta);
        onLoad?.(meta);

        // Create tile source for COG
        // Using titiler or similar backend for tile serving
        const tileUrl = `${url.replace('.tif', '')}/tiles/{z}/{x}/{y}.png`;
        
        if (!map.getSource(id)) {
          map.addSource(id, {
            type: 'raster',
            tiles: [tileUrl],
            bounds: bbox,
            tileSize: 256
          });
        }

        if (!map.getLayer(`${id}-layer`)) {
          map.addLayer({
            id: `${id}-layer`,
            type: 'raster',
            source: id,
            paint: {
              'raster-opacity': opacity
            },
            layout: {
              visibility: visible ? 'visible' : 'none'
            }
          });
        }

      } catch (error) {
        if (!cancelled) {
          onError?.(error as Error);
        }
      }
    };

    loadCOG();

    return () => {
      cancelled = true;
      pool.destroy();
      if (map.getLayer(`${id}-layer`)) map.removeLayer(`${id}-layer`);
      if (map.getSource(id)) map.removeSource(id);
    };
  }, [map, isLoaded, url]);

  return null;
};