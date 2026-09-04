"""KML parser (Placemark point/line geometry → GeoJSON features)."""
from __future__ import annotations

from typing import Any


def parse_kml_bytes(file_bytes: bytes) -> list[dict[str, Any]]:
    """Parse a KML file into GeoJSON-style point features.

    Uses the standard-library XML parser (no external deps). Extracts each
    ``<Placemark>`` with a ``<Point>`` into a GeoJSON feature. Nested
    document / folder structure is flattened. Non-point geometries (LineString,
    Polygon) are supported when their coordinates are simple.
    """
    import xml.etree.ElementTree as ET

    try:
        tree = ET.fromstring(file_bytes)
    except ET.ParseError as exc:
        raise ValueError(f"Invalid KML/XML: {exc}") from exc

    def _local(tag: str) -> str:
        return tag.rsplit("}", 1)[-1]

    def _parse_geometry(geom_el: ET.Element) -> dict[str, Any] | None:
        gtype = _local(geom_el.tag)
        # KML orders coordinates as lon,lat,alt — geojson wants [lon, lat]
        coords_el = geom_el.find("./*")
        if coords_el is None or _local(coords_el.tag) != "coordinates":
            return None
        raw = (coords_el.text or "").strip()
        if not raw:
            return None
        # KML coordinate string = whitespace-separated tuples, each tuple is
        # "lon,lat,alt" (comma-separated). Collect [lon, lat] per tuple.
        pts = []
        for piece in raw.replace("\n", " ").split():
            nums = []
            for n in piece.split(","):
                n = n.strip()
                if not n:
                    continue
                try:
                    nums.append(float(n))
                except ValueError:
                    continue
            if len(nums) >= 2:
                pts.append([nums[0], nums[1]])
        if not pts:
            return None
        if gtype == "Point" and len(pts) == 1:
            return {"type": "Point", "coordinates": pts[0]}
        if gtype == "LineString":
            return {"type": "LineString", "coordinates": pts}
        if gtype == "LinearRing":
            return {"type": "LinearRing", "coordinates": pts}
        return None

    features: list[dict[str, Any]] = []
    for pm in tree.iter():
        if _local(pm.tag) != "Placemark":
            continue
        props: dict[str, Any] = {}
        for child in pm:
            ctag = _local(child.tag)
            if ctag in ("name", "description", "id"):
                if child.text is not None:
                    props[ctag] = child.text.strip()
        geom = None
        for child in pm.iter():
            if _local(child.tag) in ("Point", "LineString", "LinearRing", "Polygon", "MultiGeometry"):
                g = _parse_geometry(child)
                if g:
                    geom = g
                    break
        if geom is None:
            continue
        features.append(
            {"type": "Feature", "geometry": geom, "properties": props}
        )

    if not features:
        raise ValueError("KML contained no usable point/line geometries.")
    return features


__all__ = ["parse_kml_bytes"]
