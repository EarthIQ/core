import React, { useState, useCallback } from 'react';
import { useMap } from '../../hooks/useMap';
import * as turf from '@turf/turf';
import type { GeoJSON } from 'geojson';

export interface BufferToolProps {
  /** Input feature(s) */
  input: GeoJSON.Feature | GeoJSON.FeatureCollection;
  /** Buffer distance */
  distance: number;
  /** Distance units */
  units?: 'kilometers' | 'miles' | 'meters' | 'feet';
  /** Number of steps for curved buffers */
  steps?: number;
  /** Auto-display result on map */
  displayResult?: boolean;
  /** Result layer style */
  resultStyle?: {
    fillColor?: string;
    fillOpacity?: number;
    outlineColor?: string;
  };
  /** Callback with buffer result */
  onResult?: (result: GeoJSON.FeatureCollection) => void;
}

export const BufferTool: React.FC<BufferToolProps> = ({
  input,
  distance,
  units = 'kilometers',
  steps = 64,
  displayResult = true,
  resultStyle = {
    fillColor: '#3b82f6',
    fillOpacity: 0.3,
    outlineColor: '#1d4ed8'
  },
  onResult
}) => {
  const { map, isLoaded } = useMap();
  const [result, setResult] = useState<GeoJSON.FeatureCollection | null>(null);
  
  const layerId = 'buffer-result-layer';
  const sourceId = 'buffer-result-source';

  const calculateBuffer = useCallback(() => {
    if (!input) return;

    const features = input.type === 'FeatureCollection' 
      ? input.features 
      : [input];

    const bufferedFeatures = features.map(feature => {
      return turf.buffer(feature, distance, { units, steps });
    }).filter(Boolean) as GeoJSON.Feature[];

    const resultCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: bufferedFeatures
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

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': resultStyle.fillColor,
            'fill-opacity': resultStyle.fillOpacity
          }
        });
        
        map.addLayer({
          id: `${layerId}-outline`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': resultStyle.outlineColor,
            'line-width': 2
          }
        });
      }
    }
  }, [input, distance, units, steps, map, isLoaded, displayResult]);

  // Auto-calculate when inputs change
  React.useEffect(() => {
    calculateBuffer();
  }, [calculateBuffer]);

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (map) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getLayer(`${layerId}-outline`)) map.removeLayer(`${layerId}-outline`);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [map]);

  return null;
};