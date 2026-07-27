import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGeoJSON } from '../useGeoJSON';

describe('useGeoJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useGeoJSON('/test.geojson'));
    
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
  });

  it('loads data successfully', async () => {
    const mockData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { name: 'Test' }
        }
      ]
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData)
      })
    ) as any;

    const { result } = renderHook(() => useGeoJSON('/test.geojson'));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.data).toEqual(mockData);
    expect(result.current.featureCount).toBe(1);
  });

  it('handles errors', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404
      })
    ) as any;

    const { result } = renderHook(() => 
      useGeoJSON('/notfound.geojson', { retries: 0 })
    );
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBe(null);
  });

  it('applies filter function', async () => {
    const mockData = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { active: true }, geometry: { type: 'Point', coordinates: [0, 0] } },
        { type: 'Feature', properties: { active: false }, geometry: { type: 'Point', coordinates: [1, 1] } }
      ]
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData)
      })
    ) as any;

    const { result } = renderHook(() => 
      useGeoJSON('/test.geojson', {
        filter: (f) => f.properties?.active === true
      })
    );
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.featureCount).toBe(1);
    expect(result.current.data?.features[0].properties?.active).toBe(true);
  });
});