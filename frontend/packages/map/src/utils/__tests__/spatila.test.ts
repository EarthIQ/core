import { describe, it, expect } from 'vitest';
import { SpatialUtils } from '../spatial';

describe('SpatialUtils', () => {
  describe('getBounds', () => {
    it('calculates bounds for a point', () => {
      const point = {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [10, 20] },
        properties: {}
      };
      
      const bounds = SpatialUtils.getBounds(point);
      
      expect(bounds).toEqual([10, 20, 10, 20]);
    });

    it('calculates bounds for a polygon', () => {
      const polygon = {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
        },
        properties: {}
      };
      
      const bounds = SpatialUtils.getBounds(polygon);
      
      expect(bounds).toEqual([0, 0, 10, 10]);
    });
  });

  describe('getCentroid', () => {
    it('returns center of polygon', () => {
      const polygon = {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
        },
        properties: {}
      };
      
      const centroid = SpatialUtils.getCentroid(polygon);
      
      expect(centroid[0]).toBeCloseTo(5, 5);
      expect(centroid[1]).toBeCloseTo(5, 5);
    });
  });

  describe('buffer', () => {
    it('creates buffer around point', () => {
      const point = {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [0, 0] },
        properties: {}
      };
      
      const buffered = SpatialUtils.buffer(point, 1, 'kilometers');
      
      expect(buffered).not.toBeNull();
      expect(buffered?.geometry.type).toBe('Polygon');
    });
  });

  describe('pointInPolygon', () => {
    it('detects point inside polygon', () => {
      const polygon = {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
        },
        properties: {}
      };
      
      expect(SpatialUtils.pointInPolygon([5, 5], polygon)).toBe(true);
      expect(SpatialUtils.pointInPolygon([15, 15], polygon)).toBe(false);
    });
  });
});