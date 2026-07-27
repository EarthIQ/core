import React, { useEffect, useId, useState, useCallback } from 'react';
import { useMap } from '../../hooks/useMap';
import { ScatterplotLayer as DeckScatterplotLayer } from '@deck.gl/layers';
import type { GeoJSON } from 'geojson';

export interface ScatterplotLayerProps {
  /** Unique layer ID */
  id?: string;
  /** Point data */
  data: GeoJSON.FeatureCollection<GeoJSON.Point> | any[] | string;
  /** Get position accessor */
  getPosition?: (d: any) => [number, number] | [number, number, number];
  /** Get radius accessor */
  getRadius?: number | ((d: any) => number);
  /** Get fill color accessor */
  getFillColor?: [number, number, number, number] | ((d: any) => [number, number, number, number]);
  /** Get line color accessor */
  getLineColor?: [number, number, number, number] | ((d: any) => [number, number, number, number]);
  /** Radius units */
  radiusUnits?: 'pixels' | 'meters' | 'common';
  /** Radius scale */
  radiusScale?: number;
  /** Radius min pixels */
  radiusMinPixels?: number;
  /** Radius max pixels */
  radiusMaxPixels?: number;
  /** Line width */
  lineWidthUnits?: 'pixels' | 'meters' | 'common';
  /** Line width scale */
  lineWidthScale?: number;
  /** Line width min pixels */
  lineWidthMinPixels?: number;
  /** Line width max pixels */
  lineWidthMaxPixels?: number;
  /** Stroked */
  stroked?: boolean;
  /** Filled */
  filled?: boolean;
  /** Billboard mode (faces camera in 3D) */
  billboard?: boolean;
  /** Anti-aliasing */
  antialiasing?: boolean;
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
  /** Use Deck.gl */
  useDeckGL?: boolean;
  /** Hover highlight color */
  highlightColor?: [number, number, number, number];
  /** Auto highlight on hover */
  autoHighlight?: boolean;
  /** Min zoom */
  minZoom?: number;
  /** Max zoom */
  maxZoom?: number;
}

export const ScatterplotLayer: React.FC<ScatterplotLayerProps> = ({
  id: propId,
  data,
  getPosition = (d: any) => d.geometry?.coordinates || d.position || [d.lng || d.longitude, d.lat || d.latitude],
  getRadius = 5,
  getFillColor = [255, 140, 0, 200],
  getLineColor = [0, 0, 0, 255],
  radiusUnits = 'pixels',
  radiusScale = 1,
  radiusMinPixels = 1,
  radiusMaxPixels = 100,
  lineWidthUnits = 'pixels',
  lineWidthScale = 1,
  lineWidthMinPixels = 1,
  lineWidthMaxPixels = 10,
  stroked = true,
  filled = true,
  billboard = false,
  antialiasing = true,
  opacity = 0.8,
  visible = true,
  pickable = true,
  onClick,
  onHover,
  useDeckGL = true,
  highlightColor = [255, 255, 0, 255],
  autoHighlight = true,
  minZoom,
  maxZoom
}) => {
  const { map, deck, isLoaded } = useMap();
  const autoId = useId();
  const id = propId || `scatterplot-layer-${autoId}`;
  const [processedData, setProcessedData] = useState<any[]>([]);

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
          console.error('Failed to fetch scatterplot layer data:', error);
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

    const scatterLayer = new DeckScatterplotLayer({
      id,
      data: processedData,
      getPosition,
      getRadius: typeof getRadius === 'function' ? getRadius : () => getRadius,
      getFillColor: typeof getFillColor === 'function' ? getFillColor : () => getFillColor,
      getLineColor: typeof getLineColor === 'function' ? getLineColor : () => getLineColor,
      radiusUnits,
      radiusScale,
      radiusMinPixels,
      radiusMaxPixels,
      lineWidthUnits,
      lineWidthScale,
      lineWidthMinPixels,
      lineWidthMaxPixels,
      stroked,
      filled,
      billboard,
      antialiasing,
      opacity,
      visible,
      pickable,
      onClick: pickable ? onClick : undefined,
      onHover: pickable ? onHover : undefined,
      highlightColor,
      autoHighlight,
      updateTriggers: {
        getRadius,
        getFillColor,
        getLineColor
      }
    });

    const currentLayers = deck.props.layers || [];
    const filteredLayers = currentLayers.filter((l: any) => l.id !== id);
    deck.setProps({ layers: [...filteredLayers, scatterLayer] });

    return () => {
      const layers = deck.props.layers || [];
      deck.setProps({
        layers: layers.filter((l: any) => l.id !== id)
      });
    };
  }, [
    deck, useDeckGL, visible, processedData, id,
    getPosition, getRadius, getFillColor, getLineColor,
    radiusUnits, radiusScale, radiusMinPixels, radiusMaxPixels,
    lineWidthUnits, lineWidthScale, lineWidthMinPixels, lineWidthMaxPixels,
    stroked, filled, billboard, antialiasing, opacity, pickable,
    onClick, onHover, highlightColor, autoHighlight
  ]);

  // Native MapLibre rendering
  useEffect(() => {
    if (useDeckGL || !map || !isLoaded || processedData.length === 0) return;

    const sourceId = `${id}-source`;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: processedData.map((d, index) => {
        const pos = getPosition(d);
        const radius = typeof getRadius === 'function' ? getRadius(d) : getRadius;
        const fillColor = typeof getFillColor === 'function' ? getFillColor(d) : getFillColor;
        const lineColor = typeof getLineColor === 'function' ? getLineColor(d) : getLineColor;

        return {
          type: 'Feature',
          id: index,
          geometry: {
            type: 'Point',
            coordinates: pos
          },
          properties: {
            ...d.properties,
            ...d,
            radius,
            fillColor: `rgba(${fillColor.join(',')})`,
            lineColor: `rgba(${lineColor.join(',')})`
          }
        };
      })
    };

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojson,
        generateId: true
      });
    } else {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
    }

    if (!map.getLayer(id)) {
      map.addLayer({
        id,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': typeof getRadius === 'number' 
            ? getRadius 
            : ['get', 'radius'],
          'circle-color': typeof getFillColor !== 'function'
            ? `rgba(${(getFillColor as number[]).join(',')})`
            : ['get', 'fillColor'],
          'circle-opacity': filled ? opacity : 0,
          'circle-stroke-color': typeof getLineColor !== 'function'
            ? `rgba(${(getLineColor as number[]).join(',')})`
            : ['get', 'lineColor'],
          'circle-stroke-width': stroked ? 1 : 0,
          'circle-stroke-opacity': stroked ? 1 : 0
        },
        layout: {
          visibility: visible ? 'visible' : 'none'
        },
        ...(minZoom !== undefined && { minzoom: minZoom }),
        ...(maxZoom !== undefined && { maxzoom: maxZoom })
      });
    }

    // Hover handling
    let hoveredId: number | null = null;

    if (autoHighlight || onHover) {
      map.on('mousemove', id, (e) => {
        if (e.features && e.features.length > 0) {
          if (hoveredId !== null) {
            map.setFeatureState(
              { source: sourceId, id: hoveredId },
              { hover: false }
            );
          }

          hoveredId = e.features[0].id as number;
          map.setFeatureState(
            { source: sourceId, id: hoveredId },
            { hover: true }
          );

          map.getCanvas().style.cursor = 'pointer';
          
          onHover?.({
            object: e.features[0],
            coordinate: [e.lngLat.lng, e.lngLat.lat]
          });
        }
      });

      map.on('mouseleave', id, () => {
        if (hoveredId !== null) {
          map.setFeatureState(
            { source: sourceId, id: hoveredId },
            { hover: false }
          );
        }
        hoveredId = null;
        map.getCanvas().style.cursor = '';
        onHover?.({ object: null });
      });
    }

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

    return () => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, isLoaded, useDeckGL, processedData, id, getPosition, getRadius, getFillColor, getLineColor, stroked, filled, opacity, visible, minZoom, maxZoom, autoHighlight, onClick, onHover]);

  return null;
};