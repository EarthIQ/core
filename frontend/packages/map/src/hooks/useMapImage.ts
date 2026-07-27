import { useState, useEffect, useCallback } from 'react';
import { useMap } from './useMap';

export interface UseMapImageOptions {
  /** Image ID */
  id: string;
  /** Image URL or HTMLImageElement */
  image: string | HTMLImageElement | ImageBitmap;
  /** Pixel ratio */
  pixelRatio?: number;
  /** SDF (signed distance field) */
  sdf?: boolean;
  /** Stretch areas */
  stretchX?: [[number, number]];
  stretchY?: [[number, number]];
  /** Content area */
  content?: [number, number, number, number];
}

export const useMapImage = (options: UseMapImageOptions | UseMapImageOptions[]) => {
  const { map, isLoaded } = useMap();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const images = Array.isArray(options) ? options : [options];

  const loadImages = useCallback(async () => {
    if (!map || !isLoaded) return;

    setLoaded(false);
    setError(null);

    try {
      for (const img of images) {
        // Skip if already loaded
        if (map.hasImage(img.id)) continue;

        let imageData: HTMLImageElement | ImageBitmap;

        if (typeof img.image === 'string') {
          // Load from URL
          imageData = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = img.image as string;
          });
        } else {
          imageData = img.image;
        }

        map.addImage(img.id, imageData, {
          pixelRatio: img.pixelRatio,
          sdf: img.sdf,
          stretchX: img.stretchX,
          stretchY: img.stretchY,
          content: img.content
        });
      }

      setLoaded(true);
    } catch (err) {
      setError(err as Error);
    }
  }, [map, isLoaded, images]);

  useEffect(() => {
    loadImages();

    return () => {
      if (map) {
        images.forEach(img => {
          if (map.hasImage(img.id)) {
            map.removeImage(img.id);
          }
        });
      }
    };
  }, [loadImages]);

  const removeImage = useCallback((id: string) => {
    if (map?.hasImage(id)) {
      map.removeImage(id);
    }
  }, [map]);

  const updateImage = useCallback((
    id: string,
    image: HTMLImageElement | ImageBitmap | ImageData
  ) => {
    if (map?.hasImage(id)) {
      map.updateImage(id, image);
    }
  }, [map]);

  return { loaded, error, removeImage, updateImage };
};