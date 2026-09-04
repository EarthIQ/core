"""GeoJSON parser (FeatureCollection / Feature / bare geometry)."""
from __future__ import annotations

import json
from typing import Any


def parse_geojson_bytes(file_bytes: bytes) -> list[dict[str, Any]]:
    """Parse GeoJSON (FeatureCollection / Feature / bare geometry) to features."""
    try:
        geojson = json.loads(file_bytes.decode("utf-8"))
    except Exception as exc:  # pragma: no cover - defensive
        raise ValueError(f"Invalid GeoJSON: {exc}") from exc

    geo_type = geojson.get("type", "")
    if geo_type == "FeatureCollection":
        return list(geojson.get("features") or [])
    if geo_type == "Feature":
        return [geojson]
    return [{"type": "Feature", "geometry": geojson, "properties": {}}]


__all__ = ["parse_geojson_bytes"]
