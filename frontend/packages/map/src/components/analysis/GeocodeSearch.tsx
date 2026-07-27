import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useMap } from '../../hooks/useMap';

export interface GeocodeResult {
  id: string;
  name: string;
  displayName: string;
  coordinates: [number, number];
  bbox?: [number, number, number, number];
  type: string;
  properties?: Record<string, any>;
}

export interface GeocodeSearchProps {
  /** Geocoding service URL */
  serviceUrl?: string;
  /** API key for geocoding service */
  apiKey?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Minimum characters to search */
  minChars?: number;
  /** Maximum results */
  maxResults?: number;
  /** Zoom level when selecting result */
  zoomLevel?: number;
  /** Show marker at result */
  showMarker?: boolean;
  /** Callback on result select */
  onSelect?: (result: GeocodeResult) => void;
  /** Callback on search */
  onSearch?: (query: string, results: GeocodeResult[]) => void;
  /** Custom className */
  className?: string;
  /** Position */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Collapsed by default */
  collapsed?: boolean;
  /** Custom geocoder function */
  customGeocoder?: (query: string) => Promise<GeocodeResult[]>;
  /** Bias search to current map view */
  viewportBias?: boolean;
}

export const GeocodeSearch: React.FC<GeocodeSearchProps> = ({
  serviceUrl = 'https://nominatim.openstreetmap.org/search',
  apiKey,
  placeholder = 'Search location...',
  debounceMs = 300,
  minChars = 3,
  maxResults = 5,
  zoomLevel = 14,
  showMarker = true,
  onSelect,
  onSearch,
  className,
  position = 'top-left',
  collapsed = false,
  customGeocoder,
  viewportBias = true
}) => {
  const { map, isLoaded } = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const markerLayerId = 'geocode-marker';

  // Default Nominatim geocoder
  const nominatimGeocoder = useCallback(async (searchQuery: string): Promise<GeocodeResult[]> => {
    const params = new URLSearchParams({
      q: searchQuery,
      format: 'json',
      limit: maxResults.toString(),
      addressdetails: '1'
    });

    if (viewportBias && map) {
      const bounds = map.getBounds();
      params.append('viewbox', `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`);
      params.append('bounded', '0');
    }

    const response = await fetch(`${serviceUrl}?${params}`, {
      headers: {
        'Accept': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
      }
    });

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    return data.map((item: any) => ({
      id: item.place_id?.toString() || item.osm_id?.toString(),
      name: item.name || item.display_name?.split(',')[0],
      displayName: item.display_name,
      coordinates: [parseFloat(item.lon), parseFloat(item.lat)] as [number, number],
      bbox: item.boundingbox ? [
        parseFloat(item.boundingbox[2]),
        parseFloat(item.boundingbox[0]),
        parseFloat(item.boundingbox[3]),
        parseFloat(item.boundingbox[1])
      ] as [number, number, number, number] : undefined,
      type: item.type || item.class,
      properties: item.address
    }));
  }, [serviceUrl, apiKey, maxResults, viewportBias, map]);

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minChars) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const geocoder = customGeocoder || nominatimGeocoder;
      const searchResults = await geocoder(searchQuery);
      setResults(searchResults);
      onSearch?.(searchQuery, searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [minChars, customGeocoder, nominatimGeocoder, onSearch]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, debounceMs, performSearch]);

  // Handle result selection
  const handleSelect = useCallback((result: GeocodeResult) => {
    if (!map) return;

    // Fly to location
    if (result.bbox) {
      map.fitBounds(result.bbox as [number, number, number, number], {
        padding: 50,
        maxZoom: zoomLevel
      });
    } else {
      map.flyTo({
        center: result.coordinates,
        zoom: zoomLevel
      });
    }

    // Add marker
    if (showMarker) {
      const markerGeoJson = {
        type: 'FeatureCollection' as const,
        features: [{
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: result.coordinates
          },
          properties: {
            name: result.name,
            displayName: result.displayName
          }
        }]
      };

      if (map.getSource(markerLayerId)) {
        (map.getSource(markerLayerId) as any).setData(markerGeoJson);
      } else {
        map.addSource(markerLayerId, {
          type: 'geojson',
          data: markerGeoJson
        });

        map.addLayer({
          id: markerLayerId,
          type: 'circle',
          source: markerLayerId,
          paint: {
            'circle-radius': 8,
            'circle-color': '#e74c3c',
            'circle-stroke-width': 2,
            'circle-stroke-color': 'white'
          }
        });

        map.addLayer({
          id: `${markerLayerId}-label`,
          type: 'symbol',
          source: markerLayerId,
          layout: {
            'text-field': ['get', 'name'],
            'text-offset': [0, 1.5],
            'text-size': 12
          },
          paint: {
            'text-color': '#333',
            'text-halo-color': 'white',
            'text-halo-width': 1
          }
        });
      }
    }

    setQuery(result.name);
    setResults([]);
    onSelect?.(result);
  }, [map, zoomLevel, showMarker, onSelect]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setResults([]);
        setSelectedIndex(-1);
        break;
    }
  }, [results, selectedIndex, handleSelect]);

  // Clear marker
  const clearMarker = useCallback(() => {
    if (map) {
      if (map.getLayer(`${markerLayerId}-label`)) {
        map.removeLayer(`${markerLayerId}-label`);
      }
      if (map.getLayer(markerLayerId)) {
        map.removeLayer(markerLayerId);
      }
      if (map.getSource(markerLayerId)) {
        map.removeSource(markerLayerId);
      }
    }
  }, [map]);

  // Position styles
  const positionStyles = useMemo(() => {
    const base = { position: 'absolute' as const, zIndex: 1000 };
    const offset = 10;
    
    switch (position) {
      case 'top-left': return { ...base, top: offset, left: offset };
      case 'top-right': return { ...base, top: offset, right: offset };
      case 'bottom-left': return { ...base, bottom: offset, left: offset };
      case 'bottom-right': return { ...base, bottom: offset, right: offset };
      default: return { ...base, top: offset, left: offset };
    }
  }, [position]);

  if (!isLoaded) return null;

  return (
    <div
      className={className}
      style={{
        ...positionStyles,
        width: isExpanded ? 300 : 40
      }}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => {
              setIsExpanded(!isExpanded);
              if (!isExpanded) {
                setTimeout(() => inputRef.current?.focus(), 100);
              }
            }}
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer'
            }}
            aria-label="Search"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {isExpanded && (
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              style={{
                flex: 1,
                height: 40,
                border: 'none',
                outline: 'none',
                fontSize: 14,
                paddingRight: 40
              }}
            />
          )}

          {isExpanded && query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                clearMarker();
              }}
              style={{
                position: 'absolute',
                right: 8,
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                backgroundColor: '#eee',
                borderRadius: '50%',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Loading indicator */}
        {isLoading && isExpanded && (
          <div style={{ padding: '8px 12px', fontSize: 12, color: '#666' }}>
            Searching...
          </div>
        )}

        {/* Error message */}
        {error && isExpanded && (
          <div style={{ padding: '8px 12px', fontSize: 12, color: '#e74c3c' }}>
            {error}
          </div>
        )}

        {/* Results list */}
        {results.length > 0 && isExpanded && (
          <div style={{
            borderTop: '1px solid #eee',
            maxHeight: 300,
            overflowY: 'auto'
          }}>
            {results.map((result, index) => (
              <div
                key={result.id}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(index)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor: selectedIndex === index ? '#f0f7ff' : 'transparent',
                  borderBottom: '1px solid #f0f0f0'
                }}
              >
                <div style={{ fontWeight: 500, fontSize: 13 }}>{result.name}</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                  {result.displayName}
                </div>
                <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                  {result.type}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GeocodeSearch;