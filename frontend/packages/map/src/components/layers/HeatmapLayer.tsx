import React, { useEffect, useId } from 'react';
import { useMap } from '../../hooks/useMap';
import { HeatmapLayer as DeckHeatmapLayer } from '@deck.gl/aggregation-layers';
import type { GeoJSON } from 'geojson';

export interface HeatmapLayerProps {
  /** Unique layer ID */
  id?: string;
  /** GeoJSON point data */
  data: GeoJSON.FeatureCollection<GeoJSON.Point> | string;
  /** Weight property name or accessor */
  weight?: string | ((d: any) => number);
  /** Intensity multiplier */
  intensity?: number;
  /** Radius in pixels */
  radius?: number;
  /** Opacity */
  opacity?: number;
  /** Color range */
  colorRange?: [number, number, number, number][];
  /** Threshold value */
  threshold?: number;
  /** Visibility */
  visible?: boolean;
  /** Use Deck.gl (better performance for large datasets) */
  useDeckGL?: boolean;
}

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({
  id: propId,
  data,
  weight = 1,
  intensity = 1,
  radius = 30,
  opacity = 0.8,
  colorRange,
  threshold = 0,
  visible = true,
  useDeckGL = false
}) => {
  const { map, deck, isLoaded } = useMap();
  const autoId = useId();
  const id = propId || `heatmap-layer-${autoId}`;

  useEffect(() => {
    if (!isLoaded) return;

    if (useDeckGL && deck) {
      // Use Deck.gl HeatmapLayer for better performance
      const layer = new DeckHeatmapLayer({
        id,
        data: typeof data === 'string' ? data : (data as any).features,
        getPosition: (d: any) => d.geometry?.coordinates || d.coordinates,
        getWeight: typeof weight === 'function' ? weight : (d: any) => d.properties?.[weight] || 1,
        intensity,
        radiusPixels: radius,
        opacity,
        colorRange: colorRange || [
          [255, 255, 178, 255],
          [254, 217, 118, 255],
          [254, 178, 76, 255],
          [253, 141, 60, 255],
          [252, 78, 42, 255],
          [227, 26, 28, 255],
          [177, 0, 38, 255]
        ],
        threshold,
        visible
      });

      deck.setProps({
        layers: [...(deck.props.layers || []).filter((l: any) => l.id !== id), layer]
      });

      return () => {
        deck.setProps({
          layers: (deck.props.layers || []).filter((l: any) => l.id !== id)
        });
      };
    } else if (map) {
      // Use MapLibre native heatmap
      const sourceId = `${id}-source`;

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: typeof data === 'string' ? data : data
        });
      }

      if (!map.getLayer(id)) {
        map.addLayer({
          id,
          type: 'heatmap',
          source: sourceId,
          paint: {
            'heatmap-weight': typeof weight === 'string' 
              ? ['get', weight] 
              : weight,
            'heatmap-intensity': intensity,
            'heatmap-radius': radius,
            'heatmap-opacity': opacity
          },
          layout: {
            visibility: visible ? 'visible' : 'none'
          }
        });
      }

      return () => {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      };
    }
  }, [map, deck, isLoaded, useDeckGL]);

  return null;
};