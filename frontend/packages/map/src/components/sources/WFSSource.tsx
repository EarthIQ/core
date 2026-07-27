import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMap } from '../../hooks/useMap';
import type { GeoJSON } from 'geojson';

export interface WFSSourceProps {
  /** Unique source ID */
  id: string;
  /** WFS base URL */
  url: string;
  /** WFS type name (layer) */
  typeName: string;
  /** WFS version */
  version?: '1.0.0' | '1.1.0' | '2.0.0';
  /** Output format */
  outputFormat?: 'application/json' | 'GML2' | 'GML3' | 'json';
  /** Maximum features to fetch */
  maxFeatures?: number;
  /** CRS/SRS for output */
  srsName?: string;
  /** CQL filter */
  cqlFilter?: string;
  /** OGC filter XML */
  filter?: string;
  /** Property names to retrieve */
  propertyName?: string[];
  /** Sort by */
  sortBy?: string;
  /** Bounding box filter [minX, minY, maxX, maxY] */
  bbox?: [number, number, number, number];
  /** Fetch data on viewport change */
  fetchOnViewportChange?: boolean;
  /** Debounce delay for viewport fetch (ms) */
  viewportDebounce?: number;
  /** Additional WFS parameters */
  params?: Record<string, string>;
  /** Callback when data is loaded */
  onLoad?: (data: GeoJSON.FeatureCollection, count: number) => void;
  /** Callback during loading */
  onLoading?: (loading: boolean) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Fetch capabilities on mount */
  fetchCapabilities?: boolean;
  /** Callback with capabilities */
  onCapabilities?: (capabilities: WFSCapabilities) => void;
  /** Transform response data */
  transformResponse?: (data: any) => GeoJSON.FeatureCollection;
  /** Generate feature IDs */
  generateId?: boolean;
  /** Children (layers) */
  children?: React.ReactNode;
}

export interface WFSCapabilities {
  version: string;
  title?: string;
  abstract?: string;
  featureTypes: WFSFeatureType[];
  outputFormats: string[];
  constraints?: Record<string, any>;
}

export interface WFSFeatureType {
  name: string;
  title?: string;
  abstract?: string;
  defaultCRS?: string;
  otherCRS?: string[];
  bbox?: [number, number, number, number];
  keywords?: string[];
}

export const WFSSource: React.FC<WFSSourceProps> = ({
  id,
  url,
  typeName,
  version = '2.0.0',
  outputFormat = 'application/json',
  maxFeatures = 1000,
  srsName = 'EPSG:4326',
  cqlFilter,
  filter,
  propertyName,
  sortBy,
  bbox,
  fetchOnViewportChange = false,
  viewportDebounce = 500,
  params = {},
  onLoad,
  onLoading,
  onError,
  fetchCapabilities = false,
  onCapabilities,
  transformResponse,
  generateId = true,
  children
}) => {
  const { map, isLoaded } = useMap();
  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<WFSCapabilities | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Build WFS GetFeature URL
  const buildGetFeatureUrl = useCallback((currentBbox?: [number, number, number, number]) => {
    const baseParams: Record<string, string> = {
      SERVICE: 'WFS',
      VERSION: version,
      REQUEST: 'GetFeature',
      TYPENAMES: version === '2.0.0' ? typeName : '',
      TYPENAME: version !== '2.0.0' ? typeName : '',
      OUTPUTFORMAT: outputFormat,
      SRSNAME: srsName,
      ...params
    };

    // Clean up empty params
    Object.keys(baseParams).forEach(key => {
      if (!baseParams[key]) delete baseParams[key];
    });

    // Max features
    if (maxFeatures) {
      if (version === '2.0.0') {
        baseParams.COUNT = String(maxFeatures);
      } else {
        baseParams.MAXFEATURES = String(maxFeatures);
      }
    }

    // Property names
    if (propertyName && propertyName.length > 0) {
      baseParams.PROPERTYNAME = propertyName.join(',');
    }

    // Sort by
    if (sortBy) {
      baseParams.SORTBY = sortBy;
    }

    // Bounding box
    const effectiveBbox = currentBbox || bbox;
    if (effectiveBbox) {
      if (version === '2.0.0') {
        baseParams.BBOX = `${effectiveBbox.join(',')},${srsName}`;
      } else {
        baseParams.BBOX = effectiveBbox.join(',');
      }
    }

    // CQL filter
    if (cqlFilter) {
      baseParams.CQL_FILTER = cqlFilter;
    }

    // OGC filter
    if (filter) {
      baseParams.FILTER = filter;
    }

    const queryString = Object.entries(baseParams)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${queryString}`;
  }, [url, typeName, version, outputFormat, maxFeatures, srsName, propertyName, sortBy, bbox, cqlFilter, filter, params]);

  // Fetch WFS capabilities
  const fetchWFSCapabilities = useCallback(async (): Promise<WFSCapabilities | null> => {
    try {
      const capUrl = `${url}?SERVICE=WFS&VERSION=${version}&REQUEST=GetCapabilities`;
      const response = await fetch(capUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch WFS capabilities: ${response.status}`);
      }

      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');

      // Parse capabilities
      const capabilities: WFSCapabilities = {
        version,
        title: xml.querySelector('ServiceIdentification > Title, Service > Title')?.textContent || undefined,
        abstract: xml.querySelector('ServiceIdentification > Abstract, Service > Abstract')?.textContent || undefined,
        featureTypes: [],
        outputFormats: []
      };

      // Parse feature types
      const featureTypeNodes = xml.querySelectorAll('FeatureType');
      featureTypeNodes.forEach(node => {
        const featureType: WFSFeatureType = {
          name: node.querySelector('Name')?.textContent || '',
          title: node.querySelector('Title')?.textContent || undefined,
          abstract: node.querySelector('Abstract')?.textContent || undefined,
          defaultCRS: node.querySelector('DefaultCRS, DefaultSRS')?.textContent || undefined
        };

        // Parse other CRS
        const otherCRSNodes = node.querySelectorAll('OtherCRS, OtherSRS');
        if (otherCRSNodes.length > 0) {
          featureType.otherCRS = Array.from(otherCRSNodes).map(n => n.textContent || '').filter(Boolean);
        }

        // Parse bounding box
        const bboxNode = node.querySelector('WGS84BoundingBox, LatLongBoundingBox');
        if (bboxNode) {
          const lowerCorner = bboxNode.querySelector('LowerCorner')?.textContent?.split(' ');
          const upperCorner = bboxNode.querySelector('UpperCorner')?.textContent?.split(' ');
          
          if (lowerCorner && upperCorner) {
            featureType.bbox = [
              parseFloat(lowerCorner[0]),
              parseFloat(lowerCorner[1]),
              parseFloat(upperCorner[0]),
              parseFloat(upperCorner[1])
            ];
          }
        }

        // Parse keywords
        const keywordNodes = node.querySelectorAll('Keywords > Keyword');
        if (keywordNodes.length > 0) {
          featureType.keywords = Array.from(keywordNodes).map(n => n.textContent || '').filter(Boolean);
        }

        capabilities.featureTypes.push(featureType);
      });

      // Parse output formats
      const formatNodes = xml.querySelectorAll('OutputFormat, Parameter[name="outputFormat"] Value');
      capabilities.outputFormats = Array.from(new Set(
        Array.from(formatNodes).map(n => n.textContent || '').filter(Boolean)
      ));

      return capabilities;
    } catch (error) {
      onError?.(error as Error);
      return null;
    }
  }, [url, version, onError]);

  // Fetch WFS data
  const fetchData = useCallback(async (currentBbox?: [number, number, number, number]) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    onLoading?.(true);

    try {
      const fetchUrl = buildGetFeatureUrl(currentBbox);
      const response = await fetch(fetchUrl, {
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`WFS request failed: ${response.status} ${response.statusText}`);
      }

      let responseData: any;
      
      if (outputFormat.includes('json')) {
        responseData = await response.json();
      } else {
        // GML response - would need GML parser
        const text = await response.text();
        // For now, throw error for non-JSON formats
        throw new Error('GML parsing not implemented. Use application/json outputFormat.');
      }

      // Transform response if needed
      let featureCollection: GeoJSON.FeatureCollection;
      
      if (transformResponse) {
        featureCollection = transformResponse(responseData);
      } else if (responseData.type === 'FeatureCollection') {
        featureCollection = responseData;
      } else if (responseData.features) {
        featureCollection = {
          type: 'FeatureCollection',
          features: responseData.features
        };
      } else {
        throw new Error('Invalid WFS response format');
      }

      // Generate IDs if needed
      if (generateId) {
        featureCollection.features = featureCollection.features.map((feature, index) => ({
          ...feature,
          id: feature.id ?? feature.properties?.id ?? `${typeName}-${index}`
        }));
      }

      setData(featureCollection);
      onLoad?.(featureCollection, featureCollection.features.length);

      // Update map source
      if (map && isLoaded && map.getSource(id)) {
        const source = map.getSource(id) as maplibregl.GeoJSONSource;
        source.setData(featureCollection);
      }

    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        onError?.(error as Error);
      }
    } finally {
      setLoading(false);
      onLoading?.(false);
    }
  }, [map, isLoaded, id, buildGetFeatureUrl, outputFormat, transformResponse, generateId, typeName, onLoad, onLoading, onError]);

  // Fetch capabilities if requested
  useEffect(() => {
    if (fetchCapabilities) {
      fetchWFSCapabilities().then(caps => {
        if (caps) {
          setCapabilities(caps);
          onCapabilities?.(caps);
        }
      });
    }
  }, [fetchCapabilities, fetchWFSCapabilities, onCapabilities]);

  // Initialize source
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (!map.getSource(id)) {
      map.addSource(id, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        generateId
      });

      // Initial data fetch
      fetchData();
    }

    return () => {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Remove layers and source
      if (map.getSource(id)) {
        const style = map.getStyle();
        const layersToRemove = style?.layers?.filter(
          (layer: any) => layer.source === id
        ) || [];

        layersToRemove.forEach((layer: any) => {
          if (map.getLayer(layer.id)) {
            map.removeLayer(layer.id);
          }
        });

        map.removeSource(id);
      }
    };
  }, [map, isLoaded, id, generateId]);

  // Fetch on viewport change
  useEffect(() => {
    if (!map || !isLoaded || !fetchOnViewportChange) return;

    const handleMoveEnd = () => {
      clearTimeout(debounceTimerRef.current);
      
      debounceTimerRef.current = setTimeout(() => {
        const bounds = map.getBounds();
        const viewportBbox: [number, number, number, number] = [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth()
        ];
        fetchData(viewportBbox);
      }, viewportDebounce);
    };

    map.on('moveend', handleMoveEnd);

    return () => {
      clearTimeout(debounceTimerRef.current);
      map.off('moveend', handleMoveEnd);
    };
  }, [map, isLoaded, fetchOnViewportChange, viewportDebounce, fetchData]);

  // Refetch when filter/params change
  useEffect(() => {
    if (map && isLoaded && map.getSource(id)) {
      fetchData();
    }
  }, [cqlFilter, filter, bbox, maxFeatures, propertyName, sortBy]);

  return <>{children}</>;
};

// Hook for WFS source
export const useWFSSource = (id: string) => {
  const { map, isLoaded } = useMap();

  const getSource = useCallback(() => {
    if (!map || !isLoaded) return null;
    return map.getSource(id) as maplibregl.GeoJSONSource | undefined;
  }, [map, isLoaded, id]);

  const getData = useCallback((): GeoJSON.FeatureCollection | null => {
    const source = getSource();
    if (!source) return null;
    
    // Note: There's no direct way to get data from a GeoJSONSource
    // You would need to store it in state or query rendered features
    return null;
  }, [getSource]);

  const refresh = useCallback(() => {
    // Trigger refetch by dispatching custom event
    window.dispatchEvent(new CustomEvent(`wfs-refresh-${id}`));
  }, [id]);

  return {
    source: getSource(),
    getData,
    refresh
  };
};

// Transactional WFS operations
export interface WFSTransactionOptions {
  url: string;
  version?: '1.0.0' | '1.1.0' | '2.0.0';
  typeName: string;
  srsName?: string;
}

export const useWFSTransaction = (options: WFSTransactionOptions) => {
  const { url, version = '1.1.0', typeName, srsName = 'EPSG:4326' } = options;

  const buildTransactionXML = useCallback((
    operation: 'Insert' | 'Update' | 'Delete',
    features: GeoJSON.Feature[],
    updateProperties?: Record<string, any>,
    filterXML?: string
  ): string => {
    const ns = version === '2.0.0'
      ? 'xmlns:wfs="http://www.opengis.net/wfs/2.0"'
      : 'xmlns:wfs="http://www.opengis.net/wfs"';

    let operationXML = '';

    if (operation === 'Insert') {
      operationXML = features.map(feature => {
        const gml = featureToGML(feature, typeName, srsName);
        return `<wfs:Insert>${gml}</wfs:Insert>`;
      }).join('');
    } else if (operation === 'Update' && updateProperties) {
      const propertyXML = Object.entries(updateProperties).map(([name, value]) => 
        `<wfs:Property><wfs:Name>${name}</wfs:Name><wfs:Value>${value}</wfs:Value></wfs:Property>`
      ).join('');
      operationXML = `<wfs:Update typeName="${typeName}">${propertyXML}${filterXML || ''}</wfs:Update>`;
    } else if (operation === 'Delete' && filterXML) {
      operationXML = `<wfs:Delete typeName="${typeName}">${filterXML}</wfs:Delete>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
      <wfs:Transaction ${ns} version="${version}" service="WFS">
        ${operationXML}
      </wfs:Transaction>`;
  }, [version, typeName, srsName]);

  const executeTransaction = useCallback(async (xml: string): Promise<{
    success: boolean;
    totalInserted?: number;
    totalUpdated?: number;
    totalDeleted?: number;
    insertedFeatureIds?: string[];
    error?: string;
  }> => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml'
        },
        body: xml
      });

      if (!response.ok) {
        throw new Error(`WFS Transaction failed: ${response.status}`);
      }

      const text = await response.text();
      const parser = new DOMParser();
      const responseXML = parser.parseFromString(text, 'text/xml');

      // Check for exception
      const exception = responseXML.querySelector('ExceptionReport, ServiceException');
      if (exception) {
        return {
          success: false,
          error: exception.textContent || 'Unknown error'
        };
      }

      // Parse transaction response
      const summary = responseXML.querySelector('TransactionSummary, TransactionResult');
      
      return {
        success: true,
        totalInserted: parseInt(summary?.querySelector('totalInserted, InsertResults')?.textContent || '0'),
        totalUpdated: parseInt(summary?.querySelector('totalUpdated')?.textContent || '0'),
        totalDeleted: parseInt(summary?.querySelector('totalDeleted')?.textContent || '0'),
        insertedFeatureIds: Array.from(responseXML.querySelectorAll('InsertResult FeatureId, InsertResults Feature'))
          .map(node => node.getAttribute('fid') || node.getAttribute('gml:id') || '')
          .filter(Boolean)
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }, [url]);

  const insertFeatures = useCallback(async (features: GeoJSON.Feature[]) => {
    const xml = buildTransactionXML('Insert', features);
    return executeTransaction(xml);
  }, [buildTransactionXML, executeTransaction]);

  const updateFeatures = useCallback(async (
    properties: Record<string, any>,
    filterXML: string
  ) => {
    const xml = buildTransactionXML('Update', [], properties, filterXML);
    return executeTransaction(xml);
  }, [buildTransactionXML, executeTransaction]);

  const deleteFeatures = useCallback(async (filterXML: string) => {
    const xml = buildTransactionXML('Delete', [], undefined, filterXML);
    return executeTransaction(xml);
  }, [buildTransactionXML, executeTransaction]);

  return {
    insertFeatures,
    updateFeatures,
    deleteFeatures,
    executeTransaction
  };
};

// Helper: Convert GeoJSON feature to GML
function featureToGML(
  feature: GeoJSON.Feature,
  typeName: string,
  srsName: string
): string {
  const geometryGML = geometryToGML(feature.geometry, srsName);
  
  const propertiesXML = Object.entries(feature.properties || {})
    .map(([key, value]) => `<${key}>${escapeXML(String(value))}</${key}>`)
    .join('');

  return `<${typeName}>${propertiesXML}<geometry>${geometryGML}</geometry></${typeName}>`;
}

function geometryToGML(geometry: GeoJSON.Geometry, srsName: string): string {
  const gmlNs = 'xmlns:gml="http://www.opengis.net/gml"';
  
  switch (geometry.type) {
    case 'Point':
      return `<gml:Point ${gmlNs} srsName="${srsName}">
        <gml:coordinates>${geometry.coordinates.join(',')}</gml:coordinates>
      </gml:Point>`;
    
    case 'LineString':
      return `<gml:LineString ${gmlNs} srsName="${srsName}">
        <gml:coordinates>${geometry.coordinates.map(c => c.join(',')).join(' ')}</gml:coordinates>
      </gml:LineString>`;
    
    case 'Polygon':
      const exterior = geometry.coordinates[0].map(c => c.join(',')).join(' ');
      const interiors = geometry.coordinates.slice(1).map(ring => 
        `<gml:innerBoundaryIs><gml:LinearRing><gml:coordinates>${ring.map(c => c.join(',')).join(' ')}</gml:coordinates></gml:LinearRing></gml:innerBoundaryIs>`
      ).join('');
      
      return `<gml:Polygon ${gmlNs} srsName="${srsName}">
        <gml:outerBoundaryIs>
          <gml:LinearRing>
            <gml:coordinates>${exterior}</gml:coordinates>
          </gml:LinearRing>
        </gml:outerBoundaryIs>
        ${interiors}
      </gml:Polygon>`;
    
    default:
      throw new Error(`Unsupported geometry type: ${geometry.type}`);
  }
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}