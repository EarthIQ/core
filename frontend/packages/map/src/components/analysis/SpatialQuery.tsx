import React, { useState, useCallback } from 'react';
import { useMap } from '../../hooks/useMap';
import * as turf from '@turf/turf';
import type { GeoJSON } from 'geojson';

export type SpatialOperation = 
  | 'intersects'
  | 'within'
  | 'contains'
  | 'overlaps'
  | 'crosses'
  | 'touches'
  | 'disjoint';

export interface SpatialQueryProps {
  /** Target features to query */
  target: GeoJSON.FeatureCollection;
  /** Query geometry */
  queryGeometry: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
  /** Spatial operation */
  operation?: SpatialOperation;
  /** Callback with query results */
  onResult?: (results: GeoJSON.FeatureCollection) => void;
  /** Highlight matching features */
  highlightResults?: boolean;
  /** Highlight style */
  highlightStyle?: {
    color?: string;
    width?: number;
  };
}

export const SpatialQuery: React.FC<SpatialQueryProps> = ({
  target,
  queryGeometry,
  operation = 'intersects',
  onResult,
  highlightResults = true,
  highlightStyle = { color: '#ef4444', width: 3 }
}) => {
  const { map, isLoaded } = useMap();
  const [results, setResults] = useState<GeoJSON.FeatureCollection | null>(null);

  const executeQuery = useCallback(() => {
    if (!target || !queryGeometry) return;

    const matchingFeatures = target.features.filter(feature => {
      try {
        switch (operation) {
          case 'intersects':
            return turf.booleanIntersects(feature, queryGeometry);
          case 'within':
            return turf.booleanWithin(feature, queryGeometry);
          case 'contains':
            return turf.booleanContains(queryGeometry, feature);
          case 'overlaps':
            return turf.booleanOverlap(feature, queryGeometry);
          case 'crosses':
            return turf.booleanCrosses(feature, queryGeometry);
          case 'touches':
            return turf.booleanTouches(feature, queryGeometry);
          case 'disjoint':
            return turf.booleanDisjoint(feature, queryGeometry);
          default:
            return false;
        }
      } catch {
        return false;
      }
    });

    const resultCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: matchingFeatures
    };

    setResults(resultCollection);
    onResult?.(resultCollection);

    // Highlight results on map
    if (highlightResults && map && isLoaded) {
      const sourceId = 'spatial-query-results';
      const layerId = 'spatial-query-highlight';

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: resultCollection
        });
      } else {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(resultCollection);
      }

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': highlightStyle.color,
            'line-width': highlightStyle.width
          }
        });
      }
    }
  }, [target, queryGeometry, operation, map, isLoaded, highlightResults]);

  React.useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  return null;
};