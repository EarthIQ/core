import React, { useEffect, useId, useState, useCallback } from 'react';
import { useMap } from '../../hooks/useMap';
import { HexagonLayer as DeckHexagonLayer } from '@deck.gl/aggregation-layers';
import * as turf from '@turf/turf';

export interface HexagonLayerProps {
  /** Unique layer ID */
  id?: string;
  /** GeoJSON point data or URL */
  data: GeoJSON.FeatureCollection<GeoJSON.Point> | string | any[];
  /** Hexagon radius in meters */
  radius?: number;
  /** Elevation scale */
  elevationScale?: number;
  /** Enable 3D extrusion */
  extruded?: boolean;
  /** Coverage (0-1) */
  coverage?: number;
  /** Upper percentile for color scale */
  upperPercentile?: number;
  /** Lower percentile for color scale */
  lowerPercentile?: number;
  /** Color range */
  colorRange?: [number, number, number, number][];
  /** Color aggregation method */
  colorAggregation?: 'SUM' | 'MEAN' | 'MIN' | 'MAX';
  /** Elevation range [min, max] */
  elevationRange?: [number, number];
  /** Elevation aggregation method */
  elevationAggregation?: 'SUM' | 'MEAN' | 'MIN' | 'MAX';
  /** Get position accessor */
  getPosition?: (d: any) => [number, number];
  /** Get color weight accessor */
  getColorWeight?: (d: any) => number;
  /** Get elevation weight accessor */
  getElevationWeight?: (d: any) => number;
  /** Material for 3D rendering */
  material?: any;
  /** Opacity */
  opacity?: number;
  /** Visibility */
  visible?: boolean;
  /** Enable picking */
  pickable?: boolean;
  /** Click handler */
  onClick?: (info: any) => void;
  /** Hover handler */
  onHover?: (info: any) => void;
  /** Use Deck.gl (recommended for large datasets) */
  useDeckGL?: boolean;
  /** Fallback: use MapLibre native rendering */
  /** This creates a hex grid and aggregates points into it */
  nativeHexSize?: number; // Size in km for native rendering
  /** Color property for native mode */
  colorProperty?: string;
  /** Min zoom */
  minZoom?: number;
  /** Max zoom */
  maxZoom?: number;
}

// Default color range (viridis-like)
const DEFAULT_COLOR_RANGE: [number, number, number, number][] = [
  [65, 182, 196, 255],
  [127, 205, 187, 255],
  [199, 233, 180, 255],
  [237, 248, 177, 255],
  [255, 255, 204, 255],
  [255, 237, 160, 255],
  [254, 217, 118, 255],
  [254, 178, 76, 255],
  [253, 141, 60, 255],
  [252, 78, 42, 255],
  [227, 26, 28, 255],
  [189, 0, 38, 255]
];

export const HexagonLayer: React.FC<HexagonLayerProps> = ({
  id: propId,
  data,
  radius = 1000,
  elevationScale = 4,
  extruded = true,
  coverage = 0.8,
  upperPercentile = 100,
  lowerPercentile = 0,
  colorRange = DEFAULT_COLOR_RANGE,
  colorAggregation = 'SUM',
  elevationRange = [0, 1000],
  elevationAggregation = 'SUM',
  getPosition = (d: any) => d.geometry?.coordinates || d.position || [d.lng || d.longitude, d.lat || d.latitude],
  getColorWeight = () => 1,
  getElevationWeight = () => 1,
  material = true,
  opacity = 0.8,
  visible = true,
  pickable = true,
  onClick,
  onHover,
  useDeckGL = true,
  nativeHexSize = 1,
  colorProperty,
  minZoom,
  maxZoom
}) => {
  const { map, deck, isLoaded } = useMap();
  const autoId = useId();
  const id = propId || `hexagon-layer-${autoId}`;
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [hexGrid, setHexGrid] = useState<GeoJSON.FeatureCollection | null>(null);

  // Process data
  useEffect(() => {
    const processData = async () => {
      let rawData: any[];

      if (typeof data === 'string') {
        try {
          const response = await fetch(data);
          const json = await response.json();
          rawData = json.type === 'FeatureCollection' ? json.features : json;
        } catch (error) {
          console.error('Failed to fetch hexagon layer data:', error);
          return;
        }
      } else if ((data as GeoJSON.FeatureCollection).type === 'FeatureCollection') {
        rawData = (data as GeoJSON.FeatureCollection).features;
      } else {
        rawData = data as any[];
      }

      setProcessedData(rawData);
    };

    processData();
  }, [data]);

  // Deck.gl rendering
  useEffect(() => {
    if (!useDeckGL || !deck || !visible || processedData.length === 0) return;

    const hexLayer = new DeckHexagonLayer({
      id,
      data: processedData,
      getPosition,
      getColorWeight,
      getElevationWeight,
      radius,
      elevationScale,
      extruded,
      coverage,
      upperPercentile,
      lowerPercentile,
      colorRange,
      colorAggregation,
      elevationRange,
      elevationAggregation,
      material,
      opacity,
      pickable,
      visible,
      onClick: pickable ? onClick : undefined,
      onHover: pickable ? onHover : undefined,
      updateTriggers: {
        getColorWeight,
        getElevationWeight
      }
    });

    // Update deck layers
    const currentLayers = deck.props.layers || [];
    const filteredLayers = currentLayers.filter((l: any) => l.id !== id);
    deck.setProps({ layers: [...filteredLayers, hexLayer] });

    return () => {
      const layers = deck.props.layers || [];
      deck.setProps({
        layers: layers.filter((l: any) => l.id !== id)
      });
    };
  }, [
    deck, useDeckGL, visible, processedData, id, radius, elevationScale,
    extruded, coverage, upperPercentile, lowerPercentile, colorRange,
    colorAggregation, elevationRange, elevationAggregation, opacity, pickable,
    getPosition, getColorWeight, getElevationWeight, onClick, onHover, material
  ]);

  // Native MapLibre rendering (fallback)
  useEffect(() => {
    if (useDeckGL || !map || !isLoaded || processedData.length === 0) return;

    // Generate hex grid
    const generateHexGrid = () => {
      // Get bounds from data
      const coords = processedData.map(d => getPosition(d)).filter(c => c && c.length === 2);
      if (coords.length === 0) return;

      const lngs = coords.map(c => c[0]);
      const lats = coords.map(c => c[1]);
      const bbox: [number, number, number, number] = [
        Math.min(...lngs) - 0.1,
        Math.min(...lats) - 0.1,
        Math.max(...lngs) + 0.1,
        Math.max(...lats) + 0.1
      ];

      // Create hex grid
      const hexgrid = turf.hexGrid(bbox, nativeHexSize, { units: 'kilometers' });

      // Aggregate points into hexagons
      const points = turf.featureCollection(
        processedData.map(d => {
          const pos = getPosition(d);
          return turf.point(pos, d.properties || d);
        })
      );

      // Count points in each hexagon
      const hexagonsWithCounts = hexgrid.features.map(hex => {
        const pointsInHex = turf.pointsWithinPolygon(points, hex);
        const count = pointsInHex.features.length;

        let weight = count;
        if (colorProperty) {
          weight = pointsInHex.features.reduce((sum, p) => {
            return sum + (p.properties?.[colorProperty] || 0);
          }, 0);
        }

        return {
          ...hex,
          properties: {
            ...hex.properties,
            count,
            weight,
            density: count / turf.area(hex) * 1000000 // per km²
          }
        };
      }).filter(hex => hex.properties.count > 0);

      setHexGrid({
        type: 'FeatureCollection',
        features: hexagonsWithCounts
      });
    };

    generateHexGrid();
  }, [map, isLoaded, useDeckGL, processedData, nativeHexSize, colorProperty, getPosition]);

  // Add native hex layer
  useEffect(() => {
    if (useDeckGL || !map || !isLoaded || !hexGrid) return;

    const sourceId = `${id}-source`;

    // Add source
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: hexGrid
      });
    } else {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(hexGrid);
    }

    // Calculate color stops
    const weights = hexGrid.features.map(f => f.properties?.weight || 0);
    const maxWeight = Math.max(...weights);
    const minWeight = Math.min(...weights);

    // Add fill layer
    if (!map.getLayer(id)) {
      map.addLayer({
        id,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'weight'],
            minWeight, `rgba(${colorRange[0].join(',')})`,
            maxWeight * 0.25, `rgba(${colorRange[3].join(',')})`,
            maxWeight * 0.5, `rgba(${colorRange[6].join(',')})`,
            maxWeight * 0.75, `rgba(${colorRange[9].join(',')})`,
            maxWeight, `rgba(${colorRange[11].join(',')})`
          ],
          'fill-opacity': opacity
        },
        layout: {
          visibility: visible ? 'visible' : 'none'
        },
        ...(minZoom !== undefined && { minzoom: minZoom }),
        ...(maxZoom !== undefined && { maxzoom: maxZoom })
      });
    }

    // Add outline layer
    if (!map.getLayer(`${id}-outline`)) {
      map.addLayer({
        id: `${id}-outline`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#ffffff',
          'line-width': 0.5,
          'line-opacity': 0.5
        },
        layout: {
          visibility: visible ? 'visible' : 'none'
        }
      });
    }

    // Event handlers
    if (onClick) {
      map.on('click', id, (e) => {
        if (e.features && e.features.length > 0) {
          onClick({
            object: e.features[0],
            coordinate: [e.lngLat.lng, e.lngLat.lat]
          });
        }
      });
    }

    if (onHover) {
      map.on('mousemove', id, (e) => {
        if (e.features && e.features.length > 0) {
          map.getCanvas().style.cursor = 'pointer';
          onHover({
            object: e.features[0],
            coordinate: [e.lngLat.lng, e.lngLat.lat]
          });
        }
      });

      map.on('mouseleave', id, () => {
        map.getCanvas().style.cursor = '';
        onHover({ object: null });
      });
    }

    return () => {
      if (map.getLayer(`${id}-outline`)) map.removeLayer(`${id}-outline`);
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, isLoaded, useDeckGL, hexGrid, id, colorRange, opacity, visible, minZoom, maxZoom, onClick, onHover]);

  // Update visibility
  useEffect(() => {
    if (!map || !isLoaded || useDeckGL) return;
    
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    }
    if (map.getLayer(`${id}-outline`)) {
      map.setLayoutProperty(`${id}-outline`, 'visibility', visible ? 'visible' : 'none');
    }
  }, [map, isLoaded, id, visible, useDeckGL]);

  return null;
};

// Hook for hexagon layer
export const useHexagonLayer = (id: string) => {
  const { map, deck, isLoaded } = useMap();

  const getStats = useCallback(() => {
    // Get statistics from hexagon layer
    // This would need access to the aggregated data
    return null;
  }, []);

  const setRadius = useCallback((radius: number) => {
    if (deck) {
      const layers = deck.props.layers || [];
      const updatedLayers = layers.map((layer: any) => {
        if (layer.id === id) {
          return layer.clone({ radius });
        }
        return layer;
      });
      deck.setProps({ layers: updatedLayers });
    }
  }, [deck, id]);

  return {
    getStats,
    setRadius
  };
};