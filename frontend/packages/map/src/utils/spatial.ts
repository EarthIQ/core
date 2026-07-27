import * as turf from "@turf/turf";
import type { BBox } from "geojson";

export const SpatialUtils = {
  /**
   * Calculate bounding box for features
   */
  getBounds(geojson: GeoJSON.GeoJSON): BBox {
    return turf.bbox(geojson);
  },

  /**
   * Calculate centroid
   */
  getCentroid(geojson: GeoJSON.Feature): [number, number] {
    const centroid = turf.centroid(geojson);
    return centroid.geometry.coordinates as [number, number];
  },

  /**
   * Calculate area in square meters
   */
  getArea(
    polygon: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
  ): number {
    return turf.area(polygon);
  },

  /**
   * Calculate length in meters
   */
  getLength(
    line: GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>
  ): number {
    return turf.length(line, { units: "meters" });
  },

  /**
   * Simplify geometry
   */
  simplify(
    geojson: GeoJSON.GeoJSON,
    tolerance: number = 0.01
  ): GeoJSON.GeoJSON {
    return turf.simplify(geojson, { tolerance, highQuality: true });
  },

  /**
   * Buffer features
   */
  buffer(
    geojson: GeoJSON.Feature,
    distance: number,
    units: turf.Units = "kilometers"
  ): GeoJSON.Feature<GeoJSON.Polygon> | null {
    return turf.buffer(geojson, distance, { units }) as any;
  },

  /**
   * Dissolve overlapping polygons
   */
  dissolve(
    fc: GeoJSON.FeatureCollection<GeoJSON.Polygon>
  ): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> {
    return turf.dissolve(fc) as any;
  },

  /**
   * Point in polygon test
   */
  pointInPolygon(
    point: [number, number],
    polygon: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
  ): boolean {
    return turf.booleanPointInPolygon(point, polygon);
  },

  /**
   * Find nearest point
   */
  nearestPoint(
    targetPoint: [number, number],
    points: GeoJSON.FeatureCollection<GeoJSON.Point>
  ): GeoJSON.Feature<GeoJSON.Point> {
    return turf.nearestPoint(turf.point(targetPoint), points);
  },

  /**
   * Create Voronoi diagram
   */
  voronoi(
    points: GeoJSON.FeatureCollection<GeoJSON.Point>,
    bbox?: BBox
  ): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
    const options = bbox ? { bbox: bbox } : {};
    return turf.voronoi(points, options) as any;
  },

  /**
   * Create hex grid
   */
  hexGrid(
    bbox: BBox,
    cellSide: number,
    units: turf.Units = "kilometers"
  ): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
    return turf.hexGrid(bbox, cellSide, { units });
  },

  /**
   * Transform coordinates (reproject)
   */
  reproject(
    geojson: GeoJSON.GeoJSON,
    fromCRS: string,
    toCRS: string
  ): GeoJSON.GeoJSON {
    // Use proj4 for coordinate transformation
    const proj4 = require("proj4");

    const transform = proj4(fromCRS, toCRS);

    return turf.transformRotate(geojson, 0); // Placeholder - implement proper reprojection
  },
};

// utils/formats.ts
export const FormatUtils = {
  /**
   * Convert WKT to GeoJSON
   */
  wktToGeoJSON(wkt: string): GeoJSON.Geometry {
    const wellknown = require("wellknown");
    return wellknown.parse(wkt);
  },

  /**
   * Convert GeoJSON to WKT
   */
  geoJSONToWKT(geojson: GeoJSON.Geometry): string {
    const wellknown = require("wellknown");
    return wellknown.stringify(geojson);
  },

  /**
   * Parse CSV with lat/lng columns to GeoJSON
   */
  csvToGeoJSON(
    csvData: string,
    options: {
      latColumn: string;
      lngColumn: string;
      delimiter?: string;
    }
  ): GeoJSON.FeatureCollection {
    const { latColumn, lngColumn, delimiter = "," } = options;
    const lines = csvData.trim().split("\n");
    const headers = lines[0].split(delimiter).map((h) => h.trim());

    const latIdx = headers.indexOf(latColumn);
    const lngIdx = headers.indexOf(lngColumn);

    if (latIdx === -1 || lngIdx === -1) {
      throw new Error("Lat/Lng columns not found");
    }

    const features: GeoJSON.Feature[] = lines.slice(1).map((line) => {
      const values = line.split(delimiter).map((v) => v.trim());
      const properties: Record<string, any> = {};

      headers.forEach((header, i) => {
        if (i !== latIdx && i !== lngIdx) {
          properties[header] = isNaN(Number(values[i]))
            ? values[i]
            : Number(values[i]);
        }
      });

      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [parseFloat(values[lngIdx]), parseFloat(values[latIdx])],
        },
        properties,
      };
    });

    return { type: "FeatureCollection", features };
  },

  /**
   * Format coordinates for display
   */
  formatCoordinates(
    lng: number,
    lat: number,
    format: "decimal" | "dms" = "decimal",
    precision: number = 6
  ): string {
    if (format === "decimal") {
      return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
    }

    const toDMS = (coord: number, isLat: boolean) => {
      const absolute = Math.abs(coord);
      const degrees = Math.floor(absolute);
      const minutes = Math.floor((absolute - degrees) * 60);
      const seconds = ((absolute - degrees) * 60 - minutes) * 60;
      const direction = isLat
        ? coord >= 0
          ? "N"
          : "S"
        : coord >= 0
          ? "E"
          : "W";
      return `${degrees}°${minutes}'${seconds.toFixed(2)}"${direction}`;
    };

    return `${toDMS(lat, true)} ${toDMS(lng, false)}`;
  },

  /**
   * Format distance for display
   */
  formatDistance(
    meters: number,
    units: "metric" | "imperial" = "metric"
  ): string {
    if (units === "metric") {
      if (meters < 1000) {
        return `${meters.toFixed(0)} m`;
      }
      return `${(meters / 1000).toFixed(2)} km`;
    }

    const feet = meters * 3.28084;
    if (feet < 5280) {
      return `${feet.toFixed(0)} ft`;
    }
    return `${(feet / 5280).toFixed(2)} mi`;
  },

  /**
   * Format area for display
   */
  formatArea(
    sqMeters: number,
    units: "metric" | "imperial" = "metric"
  ): string {
    if (units === "metric") {
      if (sqMeters < 10000) {
        return `${sqMeters.toFixed(0)} m²`;
      }
      if (sqMeters < 1000000) {
        return `${(sqMeters / 10000).toFixed(2)} ha`;
      }
      return `${(sqMeters / 1000000).toFixed(2)} km²`;
    }

    const sqFeet = sqMeters * 10.7639;
    if (sqFeet < 43560) {
      return `${sqFeet.toFixed(0)} ft²`;
    }
    return `${(sqFeet / 43560).toFixed(2)} acres`;
  },
};
