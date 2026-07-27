import React, { useState, useCallback, useEffect } from 'react';
import { useMap } from '../../hooks/useMap';
import type { GeoJSON } from 'geojson';

export interface RoutingToolProps {
  /** Waypoints as [lng, lat] arrays */
  waypoints: [number, number][];
  /** Routing profile */
  profile?: 'driving' | 'walking' | 'cycling';
  /** Routing service URL */
  serviceUrl?: string;
  /** Show turn-by-turn instructions */
  showInstructions?: boolean;
  /** Optimize waypoint order */
  optimize?: boolean;
  /** Alternative routes count */
  alternatives?: number;
  /** Route style */
  routeStyle?: {
    color?: string;
    width?: number;
    alternativeColor?: string;
  };
  /** Callback with route result */
  onResult?: (result: RouteResult) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface RouteResult {
  geometry: GeoJSON.LineString;
  distance: number; // meters
  duration: number; // seconds
  instructions?: RouteInstruction[];
  alternatives?: {
    geometry: GeoJSON.LineString;
    distance: number;
    duration: number;
  }[];
}

export interface RouteInstruction {
  text: string;
  distance: number;
  duration: number;
  type: string;
  modifier?: string;
  coordinates: [number, number];
}

export const RoutingTool: React.FC<RoutingToolProps> = ({
  waypoints,
  profile = 'driving',
  serviceUrl = 'https://router.project-osrm.org/route/v1',
  showInstructions = true,
  optimize = false,
  alternatives = 0,
  routeStyle = {
    color: '#3b82f6',
    width: 5,
    alternativeColor: '#94a3b8'
  },
  onResult,
  onError
}) => {
  const { map, isLoaded } = useMap();
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);

  const sourceId = 'route-source';
  const layerId = 'route-layer';
  const altLayerId = 'route-alternatives-layer';
  const waypointsLayerId = 'route-waypoints-layer';

  const calculateRoute = useCallback(async () => {
    if (waypoints.length < 2) return;

    setLoading(true);

    try {
      // Format coordinates for OSRM
      const coordinates = waypoints.map(wp => `${wp[0]},${wp[1]}`).join(';');
      
      const params = new URLSearchParams({
        overview: 'full',
        geometries: 'geojson',
        steps: showInstructions ? 'true' : 'false',
        alternatives: alternatives > 0 ? 'true' : 'false'
      });

      const url = `${serviceUrl}/${profile}/${coordinates}?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Routing API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== 'Ok') {
        throw new Error(data.message || 'Routing failed');
      }

      const primaryRoute = data.routes[0];
      
      const result: RouteResult = {
        geometry: primaryRoute.geometry,
        distance: primaryRoute.distance,
        duration: primaryRoute.duration,
        instructions: showInstructions ? parseInstructions(primaryRoute.legs) : undefined,
        alternatives: data.routes.slice(1).map((alt: any) => ({
          geometry: alt.geometry,
          distance: alt.distance,
          duration: alt.duration
        }))
      };

      setRoute(result);
      onResult?.(result);

      // Display on map
      if (map && isLoaded) {
        const routeData: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: [
            // Alternatives first (rendered below)
            ...result.alternatives?.map((alt, i) => ({
              type: 'Feature' as const,
              properties: { type: 'alternative', index: i },
              geometry: alt.geometry
            })) || [],
            // Primary route
            {
              type: 'Feature' as const,
              properties: { type: 'primary' },
              geometry: result.geometry
            },
            // Waypoints
            ...waypoints.map((wp, i) => ({
              type: 'Feature' as const,
              properties: { 
                type: 'waypoint',
                index: i,
                isStart: i === 0,
                isEnd: i === waypoints.length - 1
              },
              geometry: { type: 'Point' as const, coordinates: wp }
            }))
          ]
        };

        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, { type: 'geojson', data: routeData });
        } else {
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(routeData);
        }

        // Alternative routes layer
        if (!map.getLayer(altLayerId)) {
          map.addLayer({
            id: altLayerId,
            type: 'line',
            source: sourceId,
            filter: ['==', ['get', 'type'], 'alternative'],
            paint: {
              'line-color': routeStyle.alternativeColor,
              'line-width': routeStyle.width! - 1,
              'line-opacity': 0.6
            }
          });
        }

        // Primary route layer
        if (!map.getLayer(layerId)) {
          map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            filter: ['==', ['get', 'type'], 'primary'],
            paint: {
              'line-color': routeStyle.color,
              'line-width': routeStyle.width
            }
          });
        }

        // Waypoints layer
        if (!map.getLayer(waypointsLayerId)) {
          map.addLayer({
            id: waypointsLayerId,
            type: 'circle',
            source: sourceId,
            filter: ['==', ['get', 'type'], 'waypoint'],
            paint: {
              'circle-radius': [
                'case',
                ['any', ['get', 'isStart'], ['get', 'isEnd']],
                8,
                6
              ],
              'circle-color': [
                'case',
                ['get', 'isStart'], '#22c55e',
                ['get', 'isEnd'], '#ef4444',
                '#ffffff'
              ],
              'circle-stroke-color': '#1f2937',
              'circle-stroke-width': 2
            }
          });
        }

        // Fit map to route
        const coords = result.geometry.coordinates as [number, number][];
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(coords[0], coords[0])
        );
        map.fitBounds(bounds, { padding: 50 });
      }
    } catch (err) {
      onError?.(err as Error);
    } finally {
      setLoading(false);
    }
  }, [waypoints, profile, serviceUrl, showInstructions, alternatives, map, isLoaded]);

  useEffect(() => {
    calculateRoute();
  }, [calculateRoute]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (map) {
        if (map.getLayer(waypointsLayerId)) map.removeLayer(waypointsLayerId);
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getLayer(altLayerId)) map.removeLayer(altLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [map]);

  return null;
};

function parseInstructions(legs: any[]): RouteInstruction[] {
  const instructions: RouteInstruction[] = [];
  
  legs.forEach(leg => {
    leg.steps?.forEach((step: any) => {
      instructions.push({
        text: step.maneuver?.instruction || '',
        distance: step.distance,
        duration: step.duration,
        type: step.maneuver?.type || '',
        modifier: step.maneuver?.modifier,
        coordinates: step.maneuver?.location
      });
    });
  });

  return instructions;
}