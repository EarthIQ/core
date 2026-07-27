import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMap } from '../../hooks/useMap';
import type { GeoJSON } from 'geojson';

export interface EditInteractionProps {
  /** Feature to edit */
  feature: GeoJSON.Feature | null;
  /** Callback when feature is modified */
  onEdit?: (feature: GeoJSON.Feature) => void;
  /** Callback when editing is complete */
  onComplete?: (feature: GeoJSON.Feature) => void;
  /** Callback when editing is cancelled */
  onCancel?: () => void;
  /** Enable vertex editing */
  vertexEdit?: boolean;
  /** Enable shape dragging */
  dragEnabled?: boolean;
  /** Enable vertex deletion (click on vertex) */
  deleteVertex?: boolean;
  /** Enable adding vertices (click on edge) */
  addVertex?: boolean;
  /** Edit style */
  style?: {
    vertexColor?: string;
    vertexRadius?: number;
    midpointColor?: string;
    midpointRadius?: number;
    lineColor?: string;
    lineWidth?: number;
    fillColor?: string;
    fillOpacity?: number;
  };
  /** Snap to other features */
  snap?: boolean;
  /** Snap tolerance */
  snapTolerance?: number;
  /** Snap layers */
  snapLayers?: string[];
}

export const EditInteraction: React.FC<EditInteractionProps> = ({
  feature,
  onEdit,
  onComplete,
  onCancel,
  vertexEdit = true,
  dragEnabled = true,
  deleteVertex = true,
  addVertex = true,
  style = {
    vertexColor: '#3b82f6',
    vertexRadius: 6,
    midpointColor: '#93c5fd',
    midpointRadius: 4,
    lineColor: '#3b82f6',
    lineWidth: 2,
    fillColor: '#3b82f6',
    fillOpacity: 0.2
  },
  snap = false,
  snapTolerance = 10,
  snapLayers = []
}) => {
  const { map, isLoaded } = useMap();
  const [editedFeature, setEditedFeature] = useState<GeoJSON.Feature | null>(null);
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [hoveredVertex, setHoveredVertex] = useState<number[] | null>(null);
  const [hoveredMidpoint, setHoveredMidpoint] = useState<number[] | null>(null);

  const sourceId = 'edit-interaction-source';
  const vertexLayerId = 'edit-interaction-vertices';
  const midpointLayerId = 'edit-interaction-midpoints';
  const lineLayerId = 'edit-interaction-line';
  const fillLayerId = 'edit-interaction-fill';

  // Initialize edit layers
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
    }

    // Fill layer
    if (!map.getLayer(fillLayerId)) {
      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': style.fillColor,
          'fill-opacity': style.fillOpacity
        }
      });
    }

    // Line layer
    if (!map.getLayer(lineLayerId)) {
      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        filter: ['any', ['==', '$type', 'LineString'], ['==', '$type', 'Polygon']],
        paint: {
          'line-color': style.lineColor,
          'line-width': style.lineWidth
        }
      });
    }

    // Midpoint layer
    if (addVertex && !map.getLayer(midpointLayerId)) {
      map.addLayer({
        id: midpointLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['==', ['get', 'type'], 'midpoint'],
        paint: {
          'circle-color': style.midpointColor,
          'circle-radius': style.midpointRadius,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1
        }
      });
    }

    // Vertex layer
    if (!map.getLayer(vertexLayerId)) {
      map.addLayer({
        id: vertexLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['==', ['get', 'type'], 'vertex'],
        paint: {
          'circle-color': [
            'case',
            ['boolean', ['get', 'selected'], false],
            '#ef4444',
            ['boolean', ['get', 'hovered'], false],
            '#60a5fa',
            style.vertexColor
          ],
          'circle-radius': [
            'case',
            ['boolean', ['get', 'selected'], false],
            style.vertexRadius! + 2,
            style.vertexRadius
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2
        }
      });
    }

    return () => {
      if (map.getLayer(vertexLayerId)) map.removeLayer(vertexLayerId);
      if (map.getLayer(midpointLayerId)) map.removeLayer(midpointLayerId);
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, isLoaded, style, addVertex]);

  // Initialize feature for editing
  useEffect(() => {
    if (feature) {
      setEditedFeature(JSON.parse(JSON.stringify(feature)));
    } else {
      setEditedFeature(null);
    }
    setSelectedVertexIndex(null);
  }, [feature]);

  // Update preview
  const updatePreview = useCallback(() => {
    if (!map || !isLoaded || !editedFeature) return;

    const features: GeoJSON.Feature[] = [editedFeature];
    const vertices = getVertices(editedFeature.geometry);
    
    // Add vertex points
    vertices.forEach((vertex, index) => {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: vertex.coords },
        properties: {
          type: 'vertex',
          index: vertex.index,
          selected: selectedVertexIndex && arraysEqual(vertex.index, selectedVertexIndex),
          hovered: hoveredVertex && arraysEqual(vertex.index, hoveredVertex)
        }
      });
    });

    // Add midpoints
    if (addVertex) {
      const midpoints = getMidpoints(editedFeature.geometry);
      midpoints.forEach(midpoint => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: midpoint.coords },
          properties: {
            type: 'midpoint',
            index: midpoint.index,
            hovered: hoveredMidpoint && arraysEqual(midpoint.index, hoveredMidpoint)
          }
        });
      });
    }

    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({ type: 'FeatureCollection', features });
    }
  }, [map, isLoaded, editedFeature, selectedVertexIndex, hoveredVertex, hoveredMidpoint, addVertex]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  // Get vertices from geometry
  const getVertices = (geometry: GeoJSON.Geometry): { coords: number[]; index: number[] }[] => {
    const vertices: { coords: number[]; index: number[] }[] = [];

    switch (geometry.type) {
      case 'Point':
        vertices.push({ coords: geometry.coordinates as number[], index: [0] });
        break;
      case 'LineString':
        (geometry.coordinates as number[][]).forEach((coord, i) => {
          vertices.push({ coords: coord, index: [i] });
        });
        break;
      case 'Polygon':
        (geometry.coordinates as number[][][]).forEach((ring, ringIndex) => {
          ring.forEach((coord, coordIndex) => {
            // Skip the closing coordinate
            if (coordIndex < ring.length - 1) {
              vertices.push({ coords: coord, index: [ringIndex, coordIndex] });
            }
          });
        });
        break;
      case 'MultiPoint':
        (geometry.coordinates as number[][]).forEach((coord, i) => {
          vertices.push({ coords: coord, index: [i] });
        });
        break;
      case 'MultiLineString':
        (geometry.coordinates as number[][][]).forEach((line, lineIndex) => {
          line.forEach((coord, coordIndex) => {
            vertices.push({ coords: coord, index: [lineIndex, coordIndex] });
          });
        });
        break;
      case 'MultiPolygon':
        (geometry.coordinates as number[][][][]).forEach((polygon, polyIndex) => {
          polygon.forEach((ring, ringIndex) => {
            ring.forEach((coord, coordIndex) => {
              if (coordIndex < ring.length - 1) {
                vertices.push({ coords: coord, index: [polyIndex, ringIndex, coordIndex] });
              }
            });
          });
        });
        break;
    }

    return vertices;
  };

  // Get midpoints between vertices
  const getMidpoints = (geometry: GeoJSON.Geometry): { coords: number[]; index: number[] }[] => {
    const midpoints: { coords: number[]; index: number[] }[] = [];

    const addMidpoints = (coords: number[][], indexPrefix: number[] = []) => {
      for (let i = 0; i < coords.length - 1; i++) {
        midpoints.push({
          coords: [
            (coords[i][0] + coords[i + 1][0]) / 2,
            (coords[i][1] + coords[i + 1][1]) / 2
          ],
          index: [...indexPrefix, i]
        });
      }
    };

    switch (geometry.type) {
      case 'LineString':
        addMidpoints(geometry.coordinates as number[][]);
        break;
      case 'Polygon':
        (geometry.coordinates as number[][][]).forEach((ring, ringIndex) => {
          addMidpoints(ring, [ringIndex]);
        });
        break;
    }

    return midpoints;
  };

  // Update vertex position
  const updateVertex = useCallback((index: number[], newCoords: number[]) => {
    if (!editedFeature) return;

    const updated = JSON.parse(JSON.stringify(editedFeature));
    let coords = updated.geometry.coordinates;

    // Navigate to the right position in the coordinates array
    for (let i = 0; i < index.length - 1; i++) {
      coords = coords[index[i]];
    }

    coords[index[index.length - 1]] = newCoords;

    // For polygons, update closing coordinate if first vertex changed
    if (updated.geometry.type === 'Polygon' || updated.geometry.type === 'MultiPolygon') {
      const lastIdx = index[index.length - 1];
      const ring = updated.geometry.type === 'Polygon' 
        ? updated.geometry.coordinates[index[0]]
        : updated.geometry.coordinates[index[0]][index[1]];
      
      if (lastIdx === 0) {
        ring[ring.length - 1] = [...newCoords];
      }
    }

    setEditedFeature(updated);
    onEdit?.(updated);
  }, [editedFeature, onEdit]);

  // Add vertex at midpoint
  const addVertexAtMidpoint = useCallback((index: number[]) => {
    if (!editedFeature) return;

    const updated = JSON.parse(JSON.stringify(editedFeature));
    let coords = updated.geometry.coordinates;

    // Navigate to the right ring/line
    for (let i = 0; i < index.length - 1; i++) {
      coords = coords[index[i]];
    }

    const insertIndex = index[index.length - 1] + 1;
    const midpoint = [
      (coords[insertIndex - 1][0] + coords[insertIndex][0]) / 2,
      (coords[insertIndex - 1][1] + coords[insertIndex][1]) / 2
    ];

    coords.splice(insertIndex, 0, midpoint);

    setEditedFeature(updated);
    onEdit?.(updated);
  }, [editedFeature, onEdit]);

  // Delete vertex
  const removeVertex = useCallback((index: number[]) => {
    if (!editedFeature) return;

    const updated = JSON.parse(JSON.stringify(editedFeature));
    let coords = updated.geometry.coordinates;

    // Check minimum vertices
    const minVertices = updated.geometry.type === 'Polygon' ? 4 : 2;
    
    // Navigate to the right ring/line
    for (let i = 0; i < index.length - 1; i++) {
      coords = coords[index[i]];
    }

    if (coords.length <= minVertices) return;

    const deleteIndex = index[index.length - 1];
    coords.splice(deleteIndex, 1);

    // Update closing coordinate for polygons
    if (updated.geometry.type === 'Polygon' && deleteIndex === 0) {
      coords[coords.length - 1] = [...coords[0]];
    }

    setEditedFeature(updated);
    setSelectedVertexIndex(null);
    onEdit?.(updated);
  }, [editedFeature, onEdit]);

  // Handle mouse down on vertex
  const handleVertexMouseDown = useCallback((e: any) => {
    if (!vertexEdit || !editedFeature) return;

    const features = map?.queryRenderedFeatures(e.point, { layers: [vertexLayerId] });
    
    if (features && features.length > 0) {
      const vertexIndex = features[0].properties?.index;
      if (vertexIndex) {
        const index = JSON.parse(vertexIndex);
        setSelectedVertexIndex(index);
        setIsDragging(true);
        map?.dragPan.disable();
        e.preventDefault();
      }
    }
  }, [map, vertexEdit, editedFeature]);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: any) => {
    if (!editedFeature || !map) return;

    // Check hover on vertices
    const vertexFeatures = map.queryRenderedFeatures(e.point, { layers: [vertexLayerId] });
    if (vertexFeatures && vertexFeatures.length > 0) {
      const index = JSON.parse(vertexFeatures[0].properties?.index || '[]');
      setHoveredVertex(index);
      map.getCanvas().style.cursor = 'move';
    } else {
      setHoveredVertex(null);
      
      // Check hover on midpoints
      if (addVertex) {
        const midpointFeatures = map.queryRenderedFeatures(e.point, { layers: [midpointLayerId] });
        if (midpointFeatures && midpointFeatures.length > 0) {
          const index = JSON.parse(midpointFeatures[0].properties?.index || '[]');
          setHoveredMidpoint(index);
          map.getCanvas().style.cursor = 'copy';
        } else {
          setHoveredMidpoint(null);
          map.getCanvas().style.cursor = dragEnabled ? 'grab' : '';
        }
      }
    }

    // Handle vertex dragging
    if (isDragging && selectedVertexIndex) {
      let newCoords = [e.lngLat.lng, e.lngLat.lat];
      
      // Apply snapping
      if (snap && snapLayers.length > 0) {
        newCoords = snapToFeatures(newCoords, e.point);
      }

      updateVertex(selectedVertexIndex, newCoords);
    }
  }, [map, editedFeature, isDragging, selectedVertexIndex, addVertex, dragEnabled, snap, snapLayers, updateVertex]);

  const snapToFeatures = (coords: number[], point: { x: number; y: number }): number[] => {
    if (!map) return coords;

    const bbox: [[number, number], [number, number]] = [
      [point.x - snapTolerance, point.y - snapTolerance],
      [point.x + snapTolerance, point.y + snapTolerance]
    ];

    const features = map.queryRenderedFeatures(bbox, { layers: snapLayers });
    
    let closestPoint = coords;
    let closestDistance = Infinity;

    features.forEach(feature => {
      const featureCoords = getCoordinatesFromGeometry(feature.geometry as GeoJSON.Geometry);
      featureCoords.forEach(coord => {
        const d = Math.sqrt(
          Math.pow(coords[0] - coord[0], 2) + 
          Math.pow(coords[1] - coord[1], 2)
        );
        if (d < closestDistance) {
          closestDistance = d;
          closestPoint = coord;
        }
      });
    });

    return closestPoint;
  };

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      map?.dragPan.enable();
    }
  }, [map, isDragging]);

  // Handle click on midpoint
  const handleMidpointClick = useCallback((e: any) => {
    if (!addVertex) return;

    const features = map?.queryRenderedFeatures(e.point, { layers: [midpointLayerId] });
    
    if (features && features.length > 0) {
      const index = JSON.parse(features[0].properties?.index || '[]');
      addVertexAtMidpoint(index);
    }
  }, [map, addVertex, addVertexAtMidpoint]);

  // Handle vertex right-click (delete)
  const handleContextMenu = useCallback((e: any) => {
    if (!deleteVertex) return;

    const features = map?.queryRenderedFeatures(e.point, { layers: [vertexLayerId] });
    
    if (features && features.length > 0) {
      e.preventDefault();
      const index = JSON.parse(features[0].properties?.index || '[]');
      removeVertex(index);
    }
  }, [map, deleteVertex, removeVertex]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel?.();
    } else if (e.key === 'Enter' && editedFeature) {
      onComplete?.(editedFeature);
    } else if (e.key === 'Delete' && selectedVertexIndex && deleteVertex) {
      removeVertex(selectedVertexIndex);
    }
  }, [editedFeature, selectedVertexIndex, deleteVertex, onComplete, onCancel, removeVertex]);

  // Setup event listeners
  useEffect(() => {
    if (!map || !isLoaded || !editedFeature) return;

    map.on('mousedown', handleVertexMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);
    map.on('click', handleMidpointClick);
    map.on('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      map.off('mousedown', handleVertexMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
      map.off('click', handleMidpointClick);
      map.off('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      
      map.getCanvas().style.cursor = '';
      map.dragPan.enable();
    };
  }, [map, isLoaded, editedFeature, handleVertexMouseDown, handleMouseMove, handleMouseUp, handleMidpointClick, handleContextMenu, handleKeyDown]);

  return null;
};

// Helper functions
function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((val, i) => val === b[i]);
}

function getCoordinatesFromGeometry(geometry: GeoJSON.Geometry): number[][] {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates as number[]];
    case 'LineString':
    case 'MultiPoint':
      return geometry.coordinates as number[][];
    case 'Polygon':
    case 'MultiLineString':
      return (geometry.coordinates as number[][][]).flat();
    case 'MultiPolygon':
      return (geometry.coordinates as number[][][][]).flat(2);
    default:
      return [];
  }
}