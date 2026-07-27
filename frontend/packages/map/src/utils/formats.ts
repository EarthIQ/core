import type { GeoJSON } from 'geojson';

export const FormatUtils = {
  /**
   * Convert WKT (Well-Known Text) to GeoJSON geometry
   */
  wktToGeoJSON(wkt: string): GeoJSON.Geometry | null {
    if (!wkt) return null;

    const wktUpper = wkt.trim().toUpperCase();
    
    try {
      // Point
      if (wktUpper.startsWith('POINT')) {
        const match = wkt.match(/POINT\s*\(\s*([^\)]+)\s*\)/i);
        if (match) {
          const coords = match[1].trim().split(/\s+/).map(Number);
          return { type: 'Point', coordinates: coords };
        }
      }

      // MultiPoint
      if (wktUpper.startsWith('MULTIPOINT')) {
        const match = wkt.match(/MULTIPOINT\s*\(\s*(.+)\s*\)/i);
        if (match) {
          const points = match[1].split(',').map(p => {
            const coords = p.trim().replace(/[()]/g, '').split(/\s+/).map(Number);
            return coords;
          });
          return { type: 'MultiPoint', coordinates: points };
        }
      }

      // LineString
      if (wktUpper.startsWith('LINESTRING')) {
        const match = wkt.match(/LINESTRING\s*\(\s*(.+)\s*\)/i);
        if (match) {
          const coords = match[1].split(',').map(p => 
            p.trim().split(/\s+/).map(Number)
          );
          return { type: 'LineString', coordinates: coords };
        }
      }

      // MultiLineString
      if (wktUpper.startsWith('MULTILINESTRING')) {
        const match = wkt.match(/MULTILINESTRING\s*\(\s*(.+)\s*\)/i);
        if (match) {
          const lines = match[1].split(/\),\s*\(/).map(line => {
            return line.replace(/[()]/g, '').split(',').map(p =>
              p.trim().split(/\s+/).map(Number)
            );
          });
          return { type: 'MultiLineString', coordinates: lines };
        }
      }

      // Polygon
      if (wktUpper.startsWith('POLYGON')) {
        const match = wkt.match(/POLYGON\s*\(\s*(.+)\s*\)/i);
        if (match) {
          const rings = match[1].split(/\),\s*\(/).map(ring => {
            return ring.replace(/[()]/g, '').split(',').map(p =>
              p.trim().split(/\s+/).map(Number)
            );
          });
          return { type: 'Polygon', coordinates: rings };
        }
      }

      // MultiPolygon
      if (wktUpper.startsWith('MULTIPOLYGON')) {
        const match = wkt.match(/MULTIPOLYGON\s*\(\s*(.+)\s*\)/i);
        if (match) {
          const polygons = match[1].split(/\)\s*\),\s*\(\s*\(/).map(poly => {
            return poly.replace(/[()]/g, '').split(/\),\s*\(/).map(ring =>
              ring.split(',').map(p => p.trim().split(/\s+/).map(Number))
            );
          });
          return { type: 'MultiPolygon', coordinates: polygons };
        }
      }

      // GeometryCollection
      if (wktUpper.startsWith('GEOMETRYCOLLECTION')) {
        // This would require recursive parsing
        console.warn('GeometryCollection parsing not fully implemented');
        return null;
      }

      return null;
    } catch (error) {
      console.error('Failed to parse WKT:', error);
      return null;
    }
  },

  /**
   * Convert GeoJSON geometry to WKT
   */
  geoJSONToWKT(geometry: GeoJSON.Geometry): string {
    const formatCoords = (coords: number[]): string => coords.join(' ');
    const formatRing = (ring: number[][]): string => ring.map(formatCoords).join(', ');

    switch (geometry.type) {
      case 'Point':
        return `POINT (${formatCoords(geometry.coordinates as number[])})`;
      
      case 'MultiPoint':
        const points = (geometry.coordinates as number[][])
          .map(c => `(${formatCoords(c)})`).join(', ');
        return `MULTIPOINT (${points})`;
      
      case 'LineString':
        return `LINESTRING (${formatRing(geometry.coordinates as number[][])})`;
      
      case 'MultiLineString':
        const lines = (geometry.coordinates as number[][][])
          .map(line => `(${formatRing(line)})`).join(', ');
        return `MULTILINESTRING (${lines})`;
      
      case 'Polygon':
        const rings = (geometry.coordinates as number[][][])
          .map(ring => `(${formatRing(ring)})`).join(', ');
        return `POLYGON (${rings})`;
      
      case 'MultiPolygon':
        const polygons = (geometry.coordinates as number[][][][])
          .map(poly => `(${poly.map(ring => `(${formatRing(ring)})`).join(', ')})`).join(', ');
        return `MULTIPOLYGON (${polygons})`;
      
      case 'GeometryCollection':
        const geometries = geometry.geometries
          .map(g => FormatUtils.geoJSONToWKT(g)).join(', ');
        return `GEOMETRYCOLLECTION (${geometries})`;
      
      default:
        throw new Error(`Unsupported geometry type: ${(geometry as any).type}`);
    }
  },

  /**
   * Parse CSV with lat/lng columns to GeoJSON FeatureCollection
   */
  csvToGeoJSON(
    csvData: string,
    options: {
      latColumn: string;
      lngColumn: string;
      delimiter?: string;
      hasHeader?: boolean;
      parseNumbers?: boolean;
      skipEmptyRows?: boolean;
    }
  ): GeoJSON.FeatureCollection {
    const {
      latColumn,
      lngColumn,
      delimiter = ',',
      hasHeader = true,
      parseNumbers = true,
      skipEmptyRows = true
    } = options;

    const lines = csvData.trim().split('\n');
    if (lines.length === 0) {
      return { type: 'FeatureCollection', features: [] };
    }

    // Parse header
    let headers: string[];
    let dataStartIndex: number;

    if (hasHeader) {
      headers = parseCSVLine(lines[0], delimiter);
      dataStartIndex = 1;
    } else {
      // Generate column names
      const firstLine = parseCSVLine(lines[0], delimiter);
      headers = firstLine.map((_, i) => `column_${i}`);
      dataStartIndex = 0;
    }

    const latIdx = headers.indexOf(latColumn);
    const lngIdx = headers.indexOf(lngColumn);

    if (latIdx === -1) {
      throw new Error(`Latitude column "${latColumn}" not found. Available columns: ${headers.join(', ')}`);
    }
    if (lngIdx === -1) {
      throw new Error(`Longitude column "${lngColumn}" not found. Available columns: ${headers.join(', ')}`);
    }

    const features: GeoJSON.Feature[] = [];

    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (skipEmptyRows && !line) continue;

      const values = parseCSVLine(line, delimiter);
      
      const lat = parseFloat(values[latIdx]);
      const lng = parseFloat(values[lngIdx]);

      if (isNaN(lat) || isNaN(lng)) continue;

      const properties: Record<string, any> = {};
      headers.forEach((header, idx) => {
        if (idx !== latIdx && idx !== lngIdx) {
          let value: any = values[idx];
          
          if (parseNumbers && value !== '' && !isNaN(Number(value))) {
            value = Number(value);
          }
          
          properties[header] = value;
        }
      });

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties
      });
    }

    return { type: 'FeatureCollection', features };
  },

  /**
   * Convert GeoJSON to CSV
   */
  geoJSONToCSV(
    geojson: GeoJSON.FeatureCollection,
    options: {
      includeGeometry?: boolean;
      geometryFormat?: 'wkt' | 'latlng' | 'geojson';
      delimiter?: string;
      properties?: string[];
    } = {}
  ): string {
    const {
      includeGeometry = true,
      geometryFormat = 'latlng',
      delimiter = ',',
      properties
    } = options;

    if (geojson.features.length === 0) return '';

    // Collect all property names
    const allProps = new Set<string>();
    geojson.features.forEach(f => {
      Object.keys(f.properties || {}).forEach(key => allProps.add(key));
    });

    const propColumns = properties || Array.from(allProps);

    // Build header
    const headers: string[] = [...propColumns];
    if (includeGeometry) {
      if (geometryFormat === 'latlng') {
        headers.push('latitude', 'longitude');
      } else if (geometryFormat === 'wkt') {
        headers.push('geometry_wkt');
      } else {
        headers.push('geometry');
      }
    }

    const rows: string[] = [headers.join(delimiter)];

    // Build data rows
    geojson.features.forEach(feature => {
      const values: string[] = propColumns.map(prop => {
        const value = feature.properties?.[prop];
        return formatCSVValue(value, delimiter);
      });

      if (includeGeometry && feature.geometry) {
        if (geometryFormat === 'latlng') {
          const coords = getCentroidCoordinates(feature.geometry);
          values.push(String(coords[1]), String(coords[0]));
        } else if (geometryFormat === 'wkt') {
          values.push(formatCSVValue(FormatUtils.geoJSONToWKT(feature.geometry), delimiter));
        } else {
          values.push(formatCSVValue(JSON.stringify(feature.geometry), delimiter));
        }
      }

      rows.push(values.join(delimiter));
    });

    return rows.join('\n');
  },

  /**
   * Format coordinates for display
   */
  formatCoordinates(
    lng: number,
    lat: number,
    format: 'decimal' | 'dms' | 'ddm' = 'decimal',
    precision: number = 6
  ): string {
    if (format === 'decimal') {
      return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
    }

    const formatDMS = (value: number, isLat: boolean): string => {
      const absolute = Math.abs(value);
      const degrees = Math.floor(absolute);
      const minutesFloat = (absolute - degrees) * 60;
      const minutes = Math.floor(minutesFloat);
      const seconds = (minutesFloat - minutes) * 60;
      
      const direction = isLat
        ? value >= 0 ? 'N' : 'S'
        : value >= 0 ? 'E' : 'W';

      if (format === 'dms') {
        return `${degrees}°${minutes}'${seconds.toFixed(2)}"${direction}`;
      } else {
        // DDM format
        return `${degrees}°${minutesFloat.toFixed(4)}'${direction}`;
      }
    };

    return `${formatDMS(lat, true)} ${formatDMS(lng, false)}`;
  },

  /**
   * Parse coordinate string to [lng, lat]
   */
  parseCoordinates(input: string): [number, number] | null {
    // Try decimal format: "lat, lng" or "lat lng"
    const decimalMatch = input.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
    if (decimalMatch) {
      const lat = parseFloat(decimalMatch[1]);
      const lng = parseFloat(decimalMatch[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return [lng, lat];
      }
      // Try swapped order
      if (Math.abs(lng) <= 90 && Math.abs(lat) <= 180) {
        return [lat, lng];
      }
    }

    // Try DMS format
    const dmsPattern = /(\d+)°\s*(\d+)'\s*([\d.]+)"?\s*([NSEW])/gi;
    const matches = [...input.matchAll(dmsPattern)];
    
    if (matches.length >= 2) {
      const coords: number[] = [];
      const isLats: boolean[] = [];

      matches.forEach(match => {
        const degrees = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseFloat(match[3]);
        const direction = match[4].toUpperCase();

        let value = degrees + minutes / 60 + seconds / 3600;
        if (direction === 'S' || direction === 'W') {
          value = -value;
        }

        coords.push(value);
        isLats.push(direction === 'N' || direction === 'S');
      });

      const latIdx = isLats.findIndex(v => v);
      const lngIdx = isLats.findIndex(v => !v);

      if (latIdx !== -1 && lngIdx !== -1) {
        return [coords[lngIdx], coords[latIdx]];
      }
    }

    return null;
  },

  /**
   * Format distance for display
   */
  formatDistance(meters: number, units: 'metric' | 'imperial' = 'metric'): string {
    if (units === 'metric') {
      if (meters < 1) {
        return `${(meters * 100).toFixed(0)} cm`;
      }
      if (meters < 1000) {
        return `${meters.toFixed(meters < 10 ? 1 : 0)} m`;
      }
      return `${(meters / 1000).toFixed(2)} km`;
    } else {
      const feet = meters * 3.28084;
      if (feet < 1000) {
        return `${feet.toFixed(0)} ft`;
      }
      const miles = feet / 5280;
      return `${miles.toFixed(2)} mi`;
    }
  },

  /**
   * Format area for display
   */
  formatArea(sqMeters: number, units: 'metric' | 'imperial' = 'metric'): string {
    if (units === 'metric') {
      if (sqMeters < 10000) {
        return `${sqMeters.toFixed(sqMeters < 100 ? 1 : 0)} m²`;
      }
      if (sqMeters < 1000000) {
        return `${(sqMeters / 10000).toFixed(2)} ha`;
      }
      return `${(sqMeters / 1000000).toFixed(2)} km²`;
    } else {
      const sqFeet = sqMeters * 10.7639;
      if (sqFeet < 43560) {
        return `${sqFeet.toFixed(0)} ft²`;
      }
      const acres = sqFeet / 43560;
      if (acres < 640) {
        return `${acres.toFixed(2)} acres`;
      }
      return `${(acres / 640).toFixed(2)} mi²`;
    }
  },

  /**
   * Format bearing/heading for display
   */
  formatBearing(degrees: number, format: 'degrees' | 'cardinal' = 'degrees'): string {
    // Normalize to 0-360
    const normalized = ((degrees % 360) + 360) % 360;

    if (format === 'degrees') {
      return `${normalized.toFixed(1)}°`;
    }

    // Cardinal direction
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(normalized / 22.5) % 16;
    return directions[index];
  },

  /**
   * Format scale denominator
   */
  formatScale(scaleDenominator: number): string {
    if (scaleDenominator >= 1000000) {
      return `1:${(scaleDenominator / 1000000).toFixed(1)}M`;
    }
    if (scaleDenominator >= 1000) {
      return `1:${(scaleDenominator / 1000).toFixed(0)}K`;
    }
    return `1:${scaleDenominator.toFixed(0)}`;
  },

  /**
   * Parse scale string to denominator
   */
  parseScale(scaleString: string): number | null {
    const match = scaleString.match(/1:(\d+\.?\d*)([KkMm])?/);
    if (!match) return null;

    let value = parseFloat(match[1]);
    const suffix = match[2]?.toUpperCase();

    if (suffix === 'K') value *= 1000;
    if (suffix === 'M') value *= 1000000;

    return value;
  },

  /**
   * Convert between different geometry formats
   */
  convertGeometry(
    input: any,
    fromFormat: 'geojson' | 'wkt' | 'wkb',
    toFormat: 'geojson' | 'wkt'
  ): any {
    let geometry: GeoJSON.Geometry;

    // Parse input
    if (fromFormat === 'geojson') {
      geometry = typeof input === 'string' ? JSON.parse(input) : input;
    } else if (fromFormat === 'wkt') {
      const parsed = FormatUtils.wktToGeoJSON(input);
      if (!parsed) throw new Error('Failed to parse WKT');
      geometry = parsed;
    } else if (fromFormat === 'wkb') {
      throw new Error('WKB parsing not implemented');
    } else {
      throw new Error(`Unknown format: ${fromFormat}`);
    }

    // Convert output
    if (toFormat === 'geojson') {
      return geometry;
    } else if (toFormat === 'wkt') {
      return FormatUtils.geoJSONToWKT(geometry);
    }

    throw new Error(`Unknown format: ${toFormat}`);
  }
};

// Helper functions
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}

function formatCSVValue(value: any, delimiter: string): string {
  if (value === null || value === undefined) return '';
  
  const str = String(value);
  
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

function getCentroidCoordinates(geometry: GeoJSON.Geometry): [number, number] {
  switch (geometry.type) {
    case 'Point':
      return geometry.coordinates as [number, number];
    case 'LineString':
      const mid = Math.floor(geometry.coordinates.length / 2);
      return geometry.coordinates[mid] as [number, number];
    case 'Polygon':
      // Simple centroid calculation
      const ring = geometry.coordinates[0];
      const n = ring.length - 1;
      let cx = 0, cy = 0;
      ring.slice(0, n).forEach(coord => {
        cx += coord[0];
        cy += coord[1];
      });
      return [cx / n, cy / n];
    default:
      return [0, 0];
  }
}

export default FormatUtils;