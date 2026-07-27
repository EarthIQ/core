// utils/projections.ts

export interface ProjectedCoordinate {
  x: number;
  y: number;
}

export interface GeographicCoordinate {
  lng: number;
  lat: number;
}

// WGS84 ellipsoid parameters
const WGS84 = {
  a: 6378137.0,              // Semi-major axis
  b: 6356752.314245,         // Semi-minor axis
  f: 1 / 298.257223563,      // Flattening
  e: 0.0818191908426,        // Eccentricity
  e2: 0.00669437999014       // Eccentricity squared
};

export const ProjectionUtils = {
  /**
   * Convert degrees to radians
   */
  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  /**
   * Convert radians to degrees
   */
  toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  },

  /**
   * Project WGS84 coordinates to Web Mercator (EPSG:3857)
   */
  toWebMercator(lng: number, lat: number): ProjectedCoordinate {
    const x = lng * 20037508.34 / 180;
    let y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
    y = y * 20037508.34 / 180;
    return { x, y };
  },

  /**
   * Unproject Web Mercator (EPSG:3857) to WGS84
   */
  fromWebMercator(x: number, y: number): GeographicCoordinate {
    const lng = x * 180 / 20037508.34;
    let lat = y * 180 / 20037508.34;
    lat = 180 / Math.PI * (2 * Math.atan(Math.exp(lat * Math.PI / 180)) - Math.PI / 2);
    return { lng, lat };
  },

  /**
   * Convert WGS84 to UTM
   */
  toUTM(lng: number, lat: number): {
    zone: number;
    hemisphere: 'N' | 'S';
    easting: number;
    northing: number;
  } {
    const zone = Math.floor((lng + 180) / 6) + 1;
    const centralMeridian = (zone - 1) * 6 - 180 + 3;
    
    const k0 = 0.9996;
    const e = WGS84.e;
    const e2 = WGS84.e2;
    const a = WGS84.a;

    const latRad = ProjectionUtils.toRadians(lat);
    const lngRad = ProjectionUtils.toRadians(lng);
    const lng0Rad = ProjectionUtils.toRadians(centralMeridian);

    const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
    const T = Math.tan(latRad) * Math.tan(latRad);
    const C = e2 / (1 - e2) * Math.cos(latRad) * Math.cos(latRad);
    const A = Math.cos(latRad) * (lngRad - lng0Rad);

    const M = a * (
      (1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256) * latRad -
      (3*e2/8 + 3*e2*e2/32 + 45*e2*e2*e2/1024) * Math.sin(2*latRad) +
      (15*e2*e2/256 + 45*e2*e2*e2/1024) * Math.sin(4*latRad) -
      (35*e2*e2*e2/3072) * Math.sin(6*latRad)
    );

    const easting = k0 * N * (
      A + (1-T+C) * A*A*A / 6 +
      (5 - 18*T + T*T + 72*C - 58*e2/(1-e2)) * A*A*A*A*A / 120
    ) + 500000;

    let northing = k0 * (
      M + N * Math.tan(latRad) * (
        A*A / 2 +
        (5 - T + 9*C + 4*C*C) * A*A*A*A / 24 +
        (61 - 58*T + T*T + 600*C - 330*e2/(1-e2)) * A*A*A*A*A*A / 720
      )
    );

    if (lat < 0) {
      northing += 10000000;
    }

    return {
      zone,
      hemisphere: lat >= 0 ? 'N' : 'S',
      easting,
      northing
    };
  },

  /**
   * Convert UTM to WGS84
   */
  fromUTM(
    zone: number,
    hemisphere: 'N' | 'S',
    easting: number,
    northing: number
  ): GeographicCoordinate {
    const k0 = 0.9996;
    const e = WGS84.e;
    const e2 = WGS84.e2;
    const a = WGS84.a;
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

    const x = easting - 500000;
    const y = hemisphere === 'S' ? northing - 10000000 : northing;

    const centralMeridian = (zone - 1) * 6 - 180 + 3;

    const M = y / k0;
    const mu = M / (a * (1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256));

    const phi1 = mu +
      (3*e1/2 - 27*e1*e1*e1/32) * Math.sin(2*mu) +
      (21*e1*e1/16 - 55*e1*e1*e1*e1/32) * Math.sin(4*mu) +
      (151*e1*e1*e1/96) * Math.sin(6*mu) +
      (1097*e1*e1*e1*e1/512) * Math.sin(8*mu);

    const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) * Math.sin(phi1));
    const R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(phi1) * Math.sin(phi1), 1.5);
    const D = x / (N1 * k0);
    const T1 = Math.tan(phi1) * Math.tan(phi1);
    const C1 = e2 / (1 - e2) * Math.cos(phi1) * Math.cos(phi1);

    const lat = phi1 - (N1 * Math.tan(phi1) / R1) * (
      D*D / 2 -
      (5 + 3*T1 + 10*C1 - 4*C1*C1 - 9*e2/(1-e2)) * D*D*D*D / 24 +
      (61 + 90*T1 + 298*C1 + 45*T1*T1 - 252*e2/(1-e2) - 3*C1*C1) * D*D*D*D*D*D / 720
    );

    const lng = centralMeridian + ProjectionUtils.toDegrees(
      (D - (1 + 2*T1 + C1) * D*D*D / 6 +
        (5 - 2*C1 + 28*T1 - 3*C1*C1 + 8*e2/(1-e2) + 24*T1*T1) * D*D*D*D*D / 120
      ) / Math.cos(phi1)
    );

    return {
      lng,
      lat: ProjectionUtils.toDegrees(lat)
    };
  },

  /**
   * Get UTM zone from longitude
   */
  getUTMZone(lng: number): number {
    return Math.floor((lng + 180) / 6) + 1;
  },

  /**
   * Get UTM band letter from latitude
   */
  getUTMBand(lat: number): string {
    const bands = 'CDEFGHJKLMNPQRSTUVWX';
    if (lat < -80) return 'A';
    if (lat > 84) return 'Z';
    return bands[Math.floor((lat + 80) / 8)];
  },

  /**
   * Format UTM coordinates as string
   */
  formatUTM(
    zone: number,
    hemisphere: 'N' | 'S',
    easting: number,
    northing: number
  ): string {
    return `${zone}${hemisphere} ${Math.round(easting)}E ${Math.round(northing)}N`;
  },

  /**
   * Parse UTM string to components
   */
  parseUTM(utmString: string): {
    zone: number;
    hemisphere: 'N' | 'S';
    easting: number;
    northing: number;
  } | null {
    const match = utmString.match(/(\d+)([NS])\s*(\d+\.?\d*)E?\s*(\d+\.?\d*)N?/i);
    if (!match) return null;

    return {
      zone: parseInt(match[1]),
      hemisphere: match[2].toUpperCase() as 'N' | 'S',
      easting: parseFloat(match[3]),
      northing: parseFloat(match[4])
    };
  },

  /**
   * Calculate geodesic distance between two points (Haversine formula)
   */
  haversineDistance(
    lng1: number,
    lat1: number,
    lng2: number,
    lat2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ProjectionUtils.toRadians(lat2 - lat1);
    const dLng = ProjectionUtils.toRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(ProjectionUtils.toRadians(lat1)) * 
      Math.cos(ProjectionUtils.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  },

  /**
   * Calculate geodesic distance using Vincenty formula (more accurate)
   */
  vincentyDistance(
    lng1: number,
    lat1: number,
    lng2: number,
    lat2: number
  ): number {
    const a = WGS84.a;
    const b = WGS84.b;
    const f = WGS84.f;

    const L = ProjectionUtils.toRadians(lng2 - lng1);
    const U1 = Math.atan((1 - f) * Math.tan(ProjectionUtils.toRadians(lat1)));
    const U2 = Math.atan((1 - f) * Math.tan(ProjectionUtils.toRadians(lat2)));
    
    const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
    const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

    let lambda = L;
    let lambdaP: number;
    let iterLimit = 100;
    let cosSqAlpha: number, sinSigma: number, cos2SigmaM: number;
    let cosSigma: number, sigma: number;

    do {
      const sinLambda = Math.sin(lambda);
      const cosLambda = Math.cos(lambda);
      
      sinSigma = Math.sqrt(
        (cosU2 * sinLambda) * (cosU2 * sinLambda) +
        (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) *
        (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda)
      );
      
      if (sinSigma === 0) return 0;
      
      cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
      sigma = Math.atan2(sinSigma, cosSigma);
      
      const sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
      cosSqAlpha = 1 - sinAlpha * sinAlpha;
      
      cos2SigmaM = cosSqAlpha !== 0 
        ? cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha 
        : 0;
      
      const C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
      
      lambdaP = lambda;
      lambda = L + (1 - C) * f * sinAlpha * (
        sigma + C * sinSigma * (
          cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)
        )
      );
    } while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0);

    if (iterLimit === 0) {
      return this.haversineDistance(lng1, lat1, lng2, lat2);
    }

    const uSq = cosSqAlpha! * (a * a - b * b) / (b * b);
    const A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
    const B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
    
    const deltaSigma = B * sinSigma! * (
      cos2SigmaM! + B / 4 * (
        cosSigma! * (-1 + 2 * cos2SigmaM! * cos2SigmaM!) -
        B / 6 * cos2SigmaM! * (-3 + 4 * sinSigma! * sinSigma!) *
        (-3 + 4 * cos2SigmaM! * cos2SigmaM!)
      )
    );

    return b * A * (sigma! - deltaSigma);
  },

  /**
   * Calculate initial bearing from point 1 to point 2
   */
  bearing(lng1: number, lat1: number, lng2: number, lat2: number): number {
    const dLng = ProjectionUtils.toRadians(lng2 - lng1);
    const lat1Rad = ProjectionUtils.toRadians(lat1);
    const lat2Rad = ProjectionUtils.toRadians(lat2);

    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

    const bearing = ProjectionUtils.toDegrees(Math.atan2(y, x));
    return (bearing + 360) % 360;
  },

  /**
   * Calculate destination point given start, bearing, and distance
   */
  destination(
    lng: number,
    lat: number,
    bearing: number,
    distance: number
  ): GeographicCoordinate {
    const R = 6371000; // Earth's radius in meters
    const d = distance / R;
    const brng = ProjectionUtils.toRadians(bearing);
    const lat1 = ProjectionUtils.toRadians(lat);
    const lng1 = ProjectionUtils.toRadians(lng);

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
    );

    const lng2 = lng1 + Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

    return {
      lng: ProjectionUtils.toDegrees(lng2),
      lat: ProjectionUtils.toDegrees(lat2)
    };
  },

  /**
   * Calculate midpoint between two coordinates
   */
  midpoint(
    lng1: number,
    lat1: number,
    lng2: number,
    lat2: number
  ): GeographicCoordinate {
    const dLng = ProjectionUtils.toRadians(lng2 - lng1);
    const lat1Rad = ProjectionUtils.toRadians(lat1);
    const lat2Rad = ProjectionUtils.toRadians(lat2);
    const lng1Rad = ProjectionUtils.toRadians(lng1);

    const Bx = Math.cos(lat2Rad) * Math.cos(dLng);
    const By = Math.cos(lat2Rad) * Math.sin(dLng);

    const lat3 = Math.atan2(
      Math.sin(lat1Rad) + Math.sin(lat2Rad),
      Math.sqrt((Math.cos(lat1Rad) + Bx) * (Math.cos(lat1Rad) + Bx) + By * By)
    );

    const lng3 = lng1Rad + Math.atan2(By, Math.cos(lat1Rad) + Bx);

    return {
      lng: ProjectionUtils.toDegrees(lng3),
      lat: ProjectionUtils.toDegrees(lat3)
    };
  },

  /**
   * Calculate the area of a polygon on a sphere (in square meters)
   */
  sphericalArea(coordinates: number[][]): number {
    const earthRadius = 6371000;
    
    if (coordinates.length < 3) return 0;

    let total = 0;
    const n = coordinates.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const xi = ProjectionUtils.toRadians(coordinates[i][0]);
      const yi = ProjectionUtils.toRadians(coordinates[i][1]);
      const xj = ProjectionUtils.toRadians(coordinates[j][0]);
      const yj = ProjectionUtils.toRadians(coordinates[j][1]);

      total += (xj - xi) * (2 + Math.sin(yi) + Math.sin(yj));
    }

    total = Math.abs(total / 2);
    return total * earthRadius * earthRadius;
  },

  /**
   * Get scale at a given latitude (meters per pixel)
   */
  getScale(lat: number, zoom: number): number {
    const earthCircumference = 40075016.686;
    const tileSize = 512;
    const metersPerPixel = earthCircumference * Math.cos(ProjectionUtils.toRadians(lat)) / 
                           (tileSize * Math.pow(2, zoom));
    return metersPerPixel;
  },

  /**
   * Convert scale denominator to zoom level
   */
  scaleToZoom(scaleDenominator: number, latitude: number = 0): number {
    const earthCircumference = 40075016.686;
    const tileSize = 512;
    const dpi = 96;
    const inchesPerMeter = 39.3701;
    
    const metersPerPixel = scaleDenominator / (dpi * inchesPerMeter);
    const zoom = Math.log2(
      earthCircumference * Math.cos(ProjectionUtils.toRadians(latitude)) / 
      (tileSize * metersPerPixel)
    );
    
    return Math.max(0, Math.min(22, zoom));
  },

  /**
   * Convert zoom level to scale denominator
   */
  zoomToScale(zoom: number, latitude: number = 0): number {
    const earthCircumference = 40075016.686;
    const tileSize = 512;
    const dpi = 96;
    const inchesPerMeter = 39.3701;
    
    const metersPerPixel = earthCircumference * Math.cos(ProjectionUtils.toRadians(latitude)) / 
                           (tileSize * Math.pow(2, zoom));
    
    return metersPerPixel * dpi * inchesPerMeter;
  },

  /**
   * Project coordinates using a custom projection definition
   * This is a simplified version - for full support, use proj4js
   */
  project(
    coords: [number, number],
    fromProj: string,
    toProj: string
  ): [number, number] {
    // Handle common cases without proj4
    if (fromProj === 'EPSG:4326' && toProj === 'EPSG:3857') {
      const result = ProjectionUtils.toWebMercator(coords[0], coords[1]);
      return [result.x, result.y];
    }
    
    if (fromProj === 'EPSG:3857' && toProj === 'EPSG:4326') {
      const result = ProjectionUtils.fromWebMercator(coords[0], coords[1]);
      return [result.lng, result.lat];
    }

    // For other projections, proj4 would be needed
    console.warn(`Projection from ${fromProj} to ${toProj} requires proj4js`);
    return coords;
  },

  /**
   * Get EPSG code from common projection names
   */
  getEPSGCode(projectionName: string): string | null {
    const projections: Record<string, string> = {
      'WGS84': 'EPSG:4326',
      'WGS 84': 'EPSG:4326',
      'WebMercator': 'EPSG:3857',
      'Web Mercator': 'EPSG:3857',
      'Pseudo-Mercator': 'EPSG:3857',
      'Google': 'EPSG:3857',
      'Mercator': 'EPSG:3395',
      'PlateCarree': 'EPSG:4326',
      'Plate Carree': 'EPSG:4326'
    };

    return projections[projectionName] || null;
  }
};

export default ProjectionUtils;