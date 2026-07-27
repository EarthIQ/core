import React, { useEffect, useId, useState, useCallback } from 'react';
import { useMap } from '../../hooks/useMap';
import { GridLayer as DeckGridLayer } from '@deck.gl/aggregation-layers';
import * as turf from '@turf/turf';

export interface GridLayerProps {
  /** Unique layer ID */
  id?: string;
  /** Point data */
  data: GeoJSON.FeatureCollection<GeoJSON.Point> | any[] | string;
  /** Cell size in meters */
  cellSize?: number;
  /** Color range */
  colorRange?: [number, number, number, number][];
  /** Color aggregation */
  colorAggregation?: 'SUM' | 'MEAN' | 'MIN' | 'MAX' | 'COUNT';
  /** Elevation range */
  elevationRange?: [number, number];
  /** Elevation aggregation */
  elevationAggregation?: 'SUM' | 'MEAN' | 'MIN' | 'MAX' | 'COUNT';
  /** Elevation scale */
  elevationScale?: number;
  /** Enable 3D extrusion */
  extruded?: boolean;
  /** Coverage (0-1) */
  coverage?: number;
  /** Get position accessor */
  getPosition?: (d: any) => [number, number];
  /** Get color weight accessor */
  getColorWeight?: (d: any) => number;
  /** Get elevation weight accessor */
  getElevationWeight?: (d: any) => number;
  /** Upper percentile */
  upperPercentile?: number;
  /** Lower percentile */
  lowerPercentile?: number;
  /** Material for 3D */
  material?: any;
  /** Opacity */
  opacity?: number;
  /** Visibility */
  visible?: boolean;
  /** Pickable */
  pickable?: boolean;
  /** Click handler */
  onClick?: (info: any) => void;
  /** Hover handler */
  onHover?: (info: any) => void;
  /** Use GPU aggregation */
  gpuAggregation?: boolean;
  /** Use Deck.gl */
  useDeckGL?: boolean;
  /** Min zoom */
  minZoom?: number;
  /** Max zoom */
  maxZoom?: number;
}

const DEFAULT_COLOR_RANGE: [number, number, number, number][] = [
  [255, 255, 178, 255],
  [254, 217, 118, 255],
  [254, 178, 76, 255],
  [253, 141, 60, 255],
  [252, 78, 42, 255],
  [227, 26, 28, 255],
  [177, 0, 38, 255]
];

export const GridLayer: React.FC<GridLayerProps> = ({
  id: propId,
  data,
  cellSize = 1000,
  colorRange = DEFAULT_COLOR_RANGE,
  colorAggregation = 'SUM',
  elevationRange = [0, 1000],
  elevationAggregation = 'SUM',
  elevationScale = 1,
  extruded = true,
  coverage = 0.9,
  getPosition = (d: any) => d.geometry?.coordinates || d.position || [d.lng || d.longitude, d.lat || d.latitude],
  getColorWeight = () => 1,
  getElevationWeight = () => 1,
  upperPercentile = 100,
  lowerPercentile = 0,
  material = true,
  opacity = 0.8,
  visible = true,
  pickable = true,
  onClick,
  onHover,
  gpuAggregation = true,
  useDeckGL = true,
  minZoom,
  maxZoom
}) => {
  const { map, deck, isLoaded } = useMap();
  const autoId = useId();
  const id = propId || `grid-layer-${autoId}`;
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [gridCells, setGridCells] = useState<GeoJSON.FeatureCollection | null>(null);

  // Process data
  useEffect(() => {
    const process = async () => {
      let rawData: any[];

      if (typeof data === 'string') {
        try {
          const response = await fetch(data);
          const json = await response.json();
          rawData = json.type === 'FeatureCollection' ? json.features : json;
        } catch (error) {
          console.error('Failed to fetch grid layer data:', error);
          return;
        }
      } else if ((data as GeoJSON.FeatureCollection).type === 'FeatureCollection') {
        rawData = (data as GeoJSON.FeatureCollection).features;
      } else {
        rawData = data as any[];
      }

      setProcessedData(rawData);
    };

    process();
  }, [data]);

  // Deck.gl rendering
  useEffect(() => {
    if (!useDeckGL || !deck || !visible || processedData.length === 0) return;

    const LayerClass = gpuAggregation ? DeckGridLayer : DeckGridLayer;

    const gridLayer = new LayerClass({
      id,
      data: processedData,
      getPosition,
      getColorWeight,
      getElevationWeight,
      cellSize,
      colorRange,
      colorAggregation,
      elevationRange,
      elevationAggregation,
      elevationScale,
      extruded,
      coverage,
      upperPercentile,
      lowerPercentile,
      material,
      opacity,
      visible,
      pickable,
      onClick: pickable ? onClick : undefined,
      onHover: pickable ? onHover : undefined,
      updateTriggers: {
        getColorWeight,
        getElevationWeight
      }
    });

    const currentLayers = deck.props.layers || [];
    const filteredLayers = currentLayers.filter((l: any) => l.id !== id);
    deck.setProps({ layers: [...filteredLayers, gridLayer] });

    return () => {
      const layers = deck.props.layers || [];
      deck.setProps({
        layers: layers.filter((l: any) => l.id !== id)
      });
    };
  }, [
    deck, useDeckGL, visible, processedData, id, cellSize, colorRange,
    colorAggregation, elevationRange, elevationAggregation, elevationScale,
    extruded, coverage, upperPercentile, lowerPercentile, opacity, pickable,
    gpuAggregation, getPosition, getColorWeight, getElevationWeight, onClick, onHover, material
  ]);

  // Native MapLibre rendering
  useEffect(() => {
    if (useDeckGL || !map || !isLoaded || processedData.length === 0) return;

    // Generate grid cells
    const generateGrid = () => {
      // Get bounds from data
      const coords = processedData.map(d => getPosition(d)).filter(c => c && c.length === 2);
      if (coords.length === 0) return;

      const lngs = coords.map(c => c[0]);
      const lats = coords.map(c => c[1]);
      const bbox: [number, number, number, number] = [
        Math.min(...lngs) - 0.01,
        Math.min(...lats) - 0.01,
        Math.max(...lngs) + 0.01,
        Math.max(...lats) + 0.01
      ];

      // Create square grid
      const cellSizeKm = cellSize / 1000;
      const grid = turf.squareGrid(bbox, cellSizeKm, { units: 'kilometers' });

      // Create points for aggregation
      const points = turf.featureCollection(
        processedData.map(d => {
          const pos = getPosition(d);
          return turf.point(pos, { 
            colorWeight: getColorWeight(d),
            elevationWeight: getElevationWeight(d),
            ...d.properties,
            ...d
          });
        })
      );

      // Aggregate points into cells
      const cellsWithData = grid.features.map(cell => {
        const pointsInCell = turf.pointsWithinPolygon(points, cell);
        const count = pointsInCell.features.length;

        if (count === 0) return null;

        let colorValue = 0;
        let elevationValue = 0;

        switch (colorAggregation) {
          case 'SUM':
            colorValue = pointsInCell.features.reduce((sum, p) => sum + (p.properties?.colorWeight || 0), 0);
            break;
          case 'MEAN':
            colorValue = pointsInCell.features.reduce((sum, p) => sum + (p.properties?.colorWeight || 0), 0) / count;
            break;
          case 'MAX':
            colorValue = Math.max(...pointsInCell.features.map(p => p.properties?.colorWeight || 0));
            break;
          case 'MIN':
            colorValue = Math.min(...pointsInCell.features.map(p => p.properties?.colorWeight || 0));
            break;
          case 'COUNT':
          default:
            colorValue = count;
        }

        switch (elevationAggregation) {
          case 'SUM':
            elevationValue = pointsInCell.features.reduce((sum, p) => sum + (p.properties?.elevationWeight || 0), 0);
            break;
          case 'MEAN':
            elevationValue = pointsInCell.features.reduce((sum, p) => sum + (p.properties?.elevationWeight || 0), 0) / count;
            break;
          case 'MAX':
            elevationValue = Math.max(...pointsInCell.features.map(p => p.properties?.elevationWeight || 0));
            break;
          case 'MIN':
            elevationValue = Math.min(...pointsInCell.features.map(p => p.properties?.elevationWeight || 0));
            break;
          case 'COUNT':
          default:
            elevationValue = count;
        }

        return {
          ...cell,
          properties: {
            count,
            colorValue,
            elevationValue
          }
        };
      }).filter(Boolean) as GeoJSON.Feature[];

      setGridCells({
        type: 'FeatureCollection',
        features: cellsWithData
      });
    };

    generateGrid();
  }, [map, isLoaded, useDeckGL, processedData, cellSize, getPosition, getColorWeight, getElevationWeight, colorAggregation, elevationAggregation]);

  // Add native grid layer
  useEffect(() => {
    if (useDeckGL || !map || !isLoaded || !gridCells) return;

    const sourceId = `${id}-source`;

    // Calculate color stops
    const colorValues = gridCells.features.map(f => f.properties?.colorValue || 0);
    const maxValue = Math.max(...colorValues);
    const minValue = Math.min(...colorValues);

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: gridCells
      });
    } else {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(gridCells);
    }

    // Generate color expression
    const colorStops: any[] = [];
    colorRange.forEach((color, i) => {
      const value = minValue + (maxValue - minValue) * (i / (colorRange.length - 1));
      colorStops.push(value, `rgba(${color.join(',')})`);
    });

    if (!map.getLayer(id)) {
      if (extruded) {
        map.addLayer({
          id,
          type: 'fill-extrusion',
          source: sourceId,
          paint: {
            'fill-extrusion-color': [
              'interpolate',
              ['linear'],
              ['get', 'colorValue'],
              ...colorStops
            ],
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['get', 'elevationValue'],
              0, elevationRange[0],
              maxValue, elevationRange[1] * elevationScale
            ],
            'fill-extrusion-opacity': opacity
          },
          layout: {
            visibility: visible ? 'visible' : 'none'
          },
          ...(minZoom !== undefined && { minzoom: minZoom }),
          ...(maxZoom !== undefined && { maxzoom: maxZoom })
        });
      } else {
        map.addLayer({
          id,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': [
              'interpolate',
              ['linear'],
              ['get', 'colorValue'],
              ...colorStops
            ],
            'fill-opacity': opacity
          },
          layout: {
            visibility: visible ? 'visible' : 'none'
          },
          ...(minZoom !== undefined && { minzoom: minZoom }),
          ...(maxZoom !== undefined && { maxzoom: maxZoom })
        });

        // Add outline
        map.addLayer({
          id: `${id}-outline`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#ffffff',
            'line-width': 0.5,
            'line-opacity': 0.3
          },
          layout: {
            visibility: visible ? 'visible' : 'none'
          }
        });
      }
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
  }, [map, isLoaded, useDeckGL, gridCells, id, colorRange, elevationRange, elevationScale, extruded, opacity, visible, minZoom, maxZoom, onClick, onHover]);

  return null;
};