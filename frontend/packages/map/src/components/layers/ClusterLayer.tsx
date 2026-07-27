import React, { useEffect, useId } from 'react';
import { useMap } from '../../hooks/useMap';
import type { GeoJSON } from 'geojson';

export interface ClusterLayerProps {
  /** Unique layer ID */
  id?: string;
  /** GeoJSON point data */
  data: GeoJSON.FeatureCollection<GeoJSON.Point> | string;
  /** Cluster radius in pixels */
  clusterRadius?: number;
  /** Max zoom to cluster */
  clusterMaxZoom?: number;
  /** Cluster paint properties */
  clusterPaint?: Record<string, any>;
  /** Unclustered point paint */
  unclusteredPointPaint?: Record<string, any>;
  /** Show cluster count */
  showClusterCount?: boolean;
  /** Color stops based on count */
  colorStops?: [number, string][];
  /** Size stops based on count */
  sizeStops?: [number, number][];
  /** Click cluster to zoom */
  clusterClickToZoom?: boolean;
  /** Click handler for unclustered points */
  onPointClick?: (feature: GeoJSON.Feature, event: any) => void;
  /** Visibility */
  visible?: boolean;
}

export const ClusterLayer: React.FC<ClusterLayerProps> = ({
  id: propId,
  data,
  clusterRadius = 50,
  clusterMaxZoom = 14,
  clusterPaint,
  unclusteredPointPaint,
  showClusterCount = true,
  colorStops = [
    [0, '#51bbd6'],
    [100, '#f1f075'],
    [750, '#f28cb1']
  ],
  sizeStops = [
    [0, 20],
    [100, 30],
    [750, 40]
  ],
  clusterClickToZoom = true,
  onPointClick,
  visible = true
}) => {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId || `cluster-layer-${autoId}`;
  const sourceId = `${id}-source`;

  useEffect(() => {
    if (!map || !isLoaded) return;

    // Add source with clustering enabled
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: typeof data === 'string' ? data : data,
        cluster: true,
        clusterRadius,
        clusterMaxZoom
      });
    }

    // Cluster circles layer
    const clusterId = `${id}-clusters`;
    if (!map.getLayer(clusterId)) {
      map.addLayer({
        id: clusterId,
        type: 'circle',
        source: sourceId,
        filter: ['has', 'point_count'],
        paint: clusterPaint || {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            ...colorStops.flatMap(([count, color]) => [color, count]).slice(0, -1)
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            ...sizeStops.flatMap(([count, size]) => [size, count]).slice(0, -1)
          ]
        },
        layout: {
          visibility: visible ? 'visible' : 'none'
        }
      });
    }

    // Cluster count labels
    if (showClusterCount) {
      const countId = `${id}-cluster-count`;
      if (!map.getLayer(countId)) {
        map.addLayer({
          id: countId,
          type: 'symbol',
          source: sourceId,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['Open Sans Bold'],
            'text-size': 12,
            visibility: visible ? 'visible' : 'none'
          },
          paint: {
            'text-color': '#ffffff'
          }
        });
      }
    }

    // Unclustered points layer
    const unclusteredId = `${id}-unclustered`;
    if (!map.getLayer(unclusteredId)) {
      map.addLayer({
        id: unclusteredId,
        type: 'circle',
        source: sourceId,
        filter: ['!', ['has', 'point_count']],
        paint: unclusteredPointPaint || {
          'circle-color': '#11b4da',
          'circle-radius': 6,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff'
        },
        layout: {
          visibility: visible ? 'visible' : 'none'
        }
      });
    }

    // Click to zoom into cluster
    if (clusterClickToZoom) {
      map.on('click', clusterId, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [clusterId] });
        const clusterId2 = features[0].properties?.cluster_id;
        (map.getSource(sourceId) as any).getClusterExpansionZoom(clusterId2, (err: any, zoom: number) => {
          if (err) return;
          map.easeTo({
            center: (features[0].geometry as any).coordinates,
            zoom
          });
        });
      });
    }

    // Unclustered point click
    if (onPointClick) {
      map.on('click', unclusteredId, (e) => {
        if (e.features && e.features.length > 0) {
          onPointClick(e.features[0] as any, e);
        }
      });
    }

    // Cursor styles
    map.on('mouseenter', clusterId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', clusterId, () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', unclusteredId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', unclusteredId, () => {
      map.getCanvas().style.cursor = '';
    });

    return () => {
      if (map.getLayer(`${id}-cluster-count`)) map.removeLayer(`${id}-cluster-count`);
      if (map.getLayer(clusterId)) map.removeLayer(clusterId);
      if (map.getLayer(unclusteredId)) map.removeLayer(unclusteredId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, isLoaded]);

  return null;
};