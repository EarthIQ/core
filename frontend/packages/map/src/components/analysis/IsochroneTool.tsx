// analysis/IsochroneTool.tsx
import React, { useState, useCallback } from 'react';
import { useMap } from '../../hooks/useMap';
import type { GeoJSON } from 'geojson';

export interface IsochroneToolProps {
  /** Center point [lng, lat] */
  center: [number, number];
  /** Time ranges in minutes */
  contours: number[];
  /** Travel profile */
  profile?: 'driving' | 'walking' | 'cycling';
  /** Isochrone service URL */
  serviceUrl?: string;
  /** Callback with isochrone result */
  onResult?: (result: GeoJSON.FeatureCollection) => void;
  /** Display on map */
  displayResult?: boolean;
  /** Color scheme for contours */
  colors?: string[];
  /** Opacity */
  opacity?: number;
}

export const IsochroneTool: React.FC<IsochroneToolProps> = ({
  center,
  contours,
  profile = 'driving',
  serviceUrl = 'https://api.openrouteservice.org/v2/isochrones',
  onResult,
  displayResult = true,
  colors = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'],
  opacity = 0.4
}) => {
  const { map, isLoaded } = useMap();
  const [result, setResult] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sourceId = 'isochrone-source';

  const calculateIsochrone = useCallback(async () => {
    if (!center || contours.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Using OpenRouteService API format
      const response = await fetch(serviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': process.env.ORS_API_KEY || ''
        },
        body: JSON.stringify({
          locations: [[center[0], center[1]]],
          range: contours.map(c => c * 60), // Convert minutes to seconds
          range_type: 'time',
          profile: profile === 'driving' ? 'driving-car' : profile
        })
      });

      if (!response.ok) {
        throw new Error(`Isochrone API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Convert to standard GeoJSON
      const features: GeoJSON.Feature[] = data.features.map((f: any, i: number) => ({
        ...f,
        properties: {
          ...f.properties,
          contour: contours[i],
          color: colors[i % colors.length]
        }
      }));

      const resultCollection: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features
      };

      setResult(resultCollection);
      onResult?.(resultCollection);

      // Display on map
      if (displayResult && map && isLoaded) {
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: resultCollection
          });
        } else {
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(resultCollection);
        }

        // Add layers for each contour (in reverse order for proper stacking)
        features.reverse().forEach((feature, i) => {
          const layerId = `isochrone-layer-${i}`;
          if (!map.getLayer(layerId)) {
            map.addLayer({
              id: layerId,
              type: 'fill',
              source: sourceId,
              filter: ['==', ['get', 'contour'], feature.properties?.contour],
              paint: {
                'fill-color': feature.properties?.color || colors[i],
                'fill-opacity': opacity
              }
            });
          }
        });
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [center, contours, profile, serviceUrl, map, isLoaded]);

  React.useEffect(() => {
    calculateIsochrone();
  }, [calculateIsochrone]);

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (map) {
        contours.forEach((_, i) => {
          const layerId = `isochrone-layer-${i}`;
          if (map.getLayer(layerId)) map.removeLayer(layerId);
        });
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [map, contours]);

  return null;
};