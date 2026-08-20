import { describe, it, expect } from "vitest";
import { FormatUtils } from "../spatial";

describe("FormatUtils", () => {
  describe("formatCoordinates", () => {
    it('formats decimal coordinates as "lat, lng"', () => {
      // signature: formatCoordinates(lng, lat)
      expect(
        FormatUtils.formatCoordinates(12.345678, 55.987654, "decimal", 2)
      ).toBe("55.99, 12.35");
    });

    it("respects precision", () => {
      expect(
        FormatUtils.formatCoordinates(0.1234567, 1.9876543, "decimal", 1)
      ).toBe("2.0, 0.1");
    });

    it("formats DMS with correct hemisphere letters (N/E)", () => {
      const out = FormatUtils.formatCoordinates(12, 55, "dms");
      expect(out).toContain("N");
      expect(out).toContain("E");
      expect(out).toContain("55°");
    });

    it("formats DMS with S/W for negative coordinates", () => {
      const out = FormatUtils.formatCoordinates(-70, -33, "dms");
      expect(out).toContain("S");
      expect(out).toContain("W");
    });
  });

  describe("formatDistance", () => {
    it("uses meters for small distances (metric)", () => {
      expect(FormatUtils.formatDistance(250, "metric")).toBe("250 m");
    });

    it("switches to km above 1000 m (metric)", () => {
      expect(FormatUtils.formatDistance(1500, "metric")).toBe("1.50 km");
    });

    it("uses feet for small distances (imperial)", () => {
      // 100 m = 328.084 ft
      expect(FormatUtils.formatDistance(100, "imperial")).toBe("328 ft");
    });

    it("switches to miles above 5280 ft (imperial)", () => {
      // 2000 m = 6561.68 ft → > 5280 → 1.24 mi
      const out = FormatUtils.formatDistance(2000, "imperial");
      expect(out).toBe("1.24 mi");
    });
  });

  describe("formatArea", () => {
    it("uses m² for small areas (metric)", () => {
      expect(FormatUtils.formatArea(5000, "metric")).toBe("5000 m²");
    });

    it("uses ha for mid-sized areas (metric)", () => {
      // 250000 m² = 25 ha
      expect(FormatUtils.formatArea(250000, "metric")).toBe("25.00 ha");
    });

    it("uses km² for large areas (metric)", () => {
      // 2_000_000 m² = 2 km²
      expect(FormatUtils.formatArea(2000000, "metric")).toBe("2.00 km²");
    });

    it("uses ft² for small areas (imperial)", () => {
      // 1000 m² = 10763.9 ft²
      expect(FormatUtils.formatArea(1000, "imperial")).toBe("10764 ft²");
    });

    it("uses acres for large areas (imperial)", () => {
      // 100000 m² = 1_076_390 ft² = 24.71 acres
      const out = FormatUtils.formatArea(100000, "imperial");
      expect(out).toBe("24.71 acres");
    });
  });

  describe("csvToGeoJSON", () => {
    // csvToGeoJSON returns GeoJSON.FeatureCollection whose runtime shape is
    // Feature<Point> rows, but the type is generic — cast for test ergonomics.
    type PointFeature = {
      type: "Feature";
      geometry: { type: "Point"; coordinates: [number, number] };
      properties: Record<string, unknown>;
    };
    type PointFC = { type: "FeatureCollection"; features: PointFeature[] };
    const parse = (
      csv: string,
      opts: Parameters<typeof FormatUtils.csvToGeoJSON>[1]
    ) => FormatUtils.csvToGeoJSON(csv, opts) as unknown as PointFC;

    it("parses CSV rows with lat/lng columns into Point features", () => {
      const csv = [
        "name,lat,lng,value",
        "alpha,55.0,12.0,10",
        "beta,56.0,13.0,20",
      ].join("\n");

      const fc = parse(csv, { latColumn: "lat", lngColumn: "lng" });

      expect(fc.type).toBe("FeatureCollection");
      expect(fc.features).toHaveLength(2);

      const [first, second] = [fc.features[0]!, fc.features[1]!];
      expect(first.geometry.coordinates).toEqual([12.0, 55.0]);
      expect(first.properties["name"]).toBe("alpha");
      expect(first.properties["value"]).toBe(10);
      // lat/lng columns must not leak into properties
      expect("lat" in first.properties).toBe(false);
      expect("lng" in first.properties).toBe(false);
      expect(second.properties["name"]).toBe("beta");
    });

    it("throws when lat/lng columns are missing", () => {
      const csv = "a,b\n1,2";
      expect(() =>
        FormatUtils.csvToGeoJSON(csv, { latColumn: "lat", lngColumn: "lng" })
      ).toThrow("Lat/Lng columns not found");
    });

    it("honors a custom delimiter", () => {
      const csv = "name;lat;lng\nfoo;50.5;7.1";
      const fc = parse(csv, {
        latColumn: "lat",
        lngColumn: "lng",
        delimiter: ";",
      });
      expect(fc.features).toHaveLength(1);
      expect(fc.features[0]!.geometry.coordinates).toEqual([7.1, 50.5]);
    });
  });
});
