import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock maplibre-gl
vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
      remove: vi.fn(),
      addControl: vi.fn(),
      removeControl: vi.fn(),
      addSource: vi.fn(),
      removeSource: vi.fn(),
      getSource: vi.fn(),
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      getLayer: vi.fn(),
      setLayoutProperty: vi.fn(),
      setPaintProperty: vi.fn(),
      getLayoutProperty: vi.fn(),
      getPaintProperty: vi.fn(),
      setFilter: vi.fn(),
      getFilter: vi.fn(),
      getCenter: vi.fn(() => ({ lng: 0, lat: 0 })),
      getZoom: vi.fn(() => 10),
      getPitch: vi.fn(() => 0),
      getBearing: vi.fn(() => 0),
      getBounds: vi.fn(() => ({
        getWest: () => -180,
        getEast: () => 180,
        getNorth: () => 90,
        getSouth: () => -90,
        getNorthWest: () => ({ lng: -180, lat: 90 }),
        getNorthEast: () => ({ lng: 180, lat: 90 }),
        getSouthWest: () => ({ lng: -180, lat: -90 }),
        getSouthEast: () => ({ lng: 180, lat: -90 }),
        getCenter: () => ({ lng: 0, lat: 0 })
      })),
      getCanvas: vi.fn(() => ({ style: {} })),
      getContainer: vi.fn(() => document.createElement('div')),
      getStyle: vi.fn(() => ({ layers: [], sources: {} })),
      setStyle: vi.fn(),
      flyTo: vi.fn(),
      easeTo: vi.fn(),
      jumpTo: vi.fn(),
      fitBounds: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      resize: vi.fn(),
      queryRenderedFeatures: vi.fn(() => []),
      querySourceFeatures: vi.fn(() => []),
      setFeatureState: vi.fn(),
      getFeatureState: vi.fn(),
      isStyleLoaded: vi.fn(() => true),
      hasImage: vi.fn(() => false),
      addImage: vi.fn(),
      removeImage: vi.fn(),
      updateImage: vi.fn(),
      setTerrain: vi.fn(),
      getTerrain: vi.fn(),
      triggerRepaint: vi.fn(),
      getPixelRatio: vi.fn(() => 1),
      setPixelRatio: vi.fn(),
      project: vi.fn(() => ({ x: 0, y: 0 })),
      unproject: vi.fn(() => ({ lng: 0, lat: 0 }))
    })),
    Marker: vi.fn(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      setPopup: vi.fn().mockReturnThis(),
      getElement: vi.fn(() => document.createElement('div')),
      getLngLat: vi.fn(() => ({ lng: 0, lat: 0 })),
      on: vi.fn()
    })),
    Popup: vi.fn(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      setHTML: vi.fn().mockReturnThis(),
      setDOMContent: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      on: vi.fn()
    })),
    NavigationControl: vi.fn(),
    ScaleControl: vi.fn(),
    GeolocateControl: vi.fn(() => ({
      on: vi.fn(),
      trigger: vi.fn()
    })),
    FullscreenControl: vi.fn(),
    AttributionControl: vi.fn(),
    LngLatBounds: vi.fn(() => ({
      extend: vi.fn().mockReturnThis(),
      getWest: vi.fn(() => -180),
      getEast: vi.fn(() => 180),
      getNorth: vi.fn(() => 90),
      getSouth: vi.fn(() => -90)
    }))
  },
  Map: vi.fn(),
  Marker: vi.fn(),
  Popup: vi.fn(),
  NavigationControl: vi.fn(),
  ScaleControl: vi.fn(),
  GeolocateControl: vi.fn(),
  FullscreenControl: vi.fn(),
  AttributionControl: vi.fn(),
  LngLatBounds: vi.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Mock navigator.geolocation
Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  value: {
    getCurrentPosition: vi.fn((success) => 
      success({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      })
    ),
    watchPosition: vi.fn(() => 1),
    clearWatch: vi.fn()
  }
});

// Mock clipboard
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve(''))
  }
});

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ type: 'FeatureCollection', features: [] }),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob())
  })
) as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();