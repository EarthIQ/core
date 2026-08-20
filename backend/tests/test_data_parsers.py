"""
Unit tests for the pure ingestion/parsing helpers in the data service.

These tests exercise the format parsers (GeoJSON, CSV, coordinate detection,
scalar coercion) WITHOUT requiring a PostGIS database — they only touch the
Python-side logic. Run with:

    cd backend && uv run pytest tests/test_data_parsers.py -v
"""
from __future__ import annotations

import pytest

from app.api.data import service as svc


# ── GeoJSON parsing ───────────────────────────────────────────────────────────

def test_parse_geojson_feature_collection():
    payload = b'{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[12,52]},"properties":{"name":"Amsterdam"}}]}'
    feats = svc.parse_geojson_bytes(payload)
    assert len(feats) == 1
    assert feats[0]["properties"] == {"name": "Amsterdam"}
    assert feats[0]["geometry"]["type"] == "Point"


def test_parse_geojson_single_feature():
    payload = b'{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]},"properties":{"a":1}}'
    feats = svc.parse_geojson_bytes(payload)
    assert len(feats) == 1
    assert feats[0]["properties"]["a"] == 1


def test_parse_geojson_bare_geometry():
    payload = b'{"type":"Point","coordinates":[1,2]}'
    feats = svc.parse_geojson_bytes(payload)
    assert len(feats) == 1
    assert feats[0]["geometry"]["coordinates"] == [1, 2]


def test_parse_geojson_invalid_raises():
    with pytest.raises(ValueError):
        svc.parse_geojson_bytes(b"not json at all")


# ── CSV parsing ───────────────────────────────────────────────────────────────

def test_parse_csv_basic():
    payload = b"name,age\nAlice,30\nBob,41\n"
    rows, header = svc.parse_csv_bytes(payload)
    assert header == ["name", "age"]
    assert len(rows) == 2
    assert rows[0]["name"] == "Alice"
    assert rows[0]["age"] == 30  # coerced to int
    assert rows[1]["age"] == 41


def test_parse_csv_float_coercion():
    payload = b"lat,lon\n52.3,4.8\n"
    rows, _ = svc.parse_csv_bytes(payload)
    assert rows[0]["lat"] == 52.3
    assert rows[0]["lon"] == 4.8


def test_parse_csv_empty_values_become_none():
    payload = b"a,b\n1,\n"
    rows, _ = svc.parse_csv_bytes(payload)
    assert rows[0]["a"] == 1
    assert rows[0]["b"] is None


def test_parse_csv_semicolon_delimiter():
    payload = b"col1;col2\nx;y\n"
    rows, header = svc.parse_csv_bytes(payload)
    assert header == ["col1", "col2"]
    assert rows[0]["col1"] == "x"


# ── Coordinate column detection ───────────────────────────────────────────────

def test_detect_coord_columns_lat_lon():
    rows = [{"lat": 52.3, "lon": 4.8, "name": "Amsterdam"}]
    lon, lat = svc.detect_coord_columns(rows)
    assert lon == "lon"
    assert lat == "lat"


def test_detect_coord_columns_lng_latitude():
    rows = [{"latitude": 52.3, "longitude": 4.8}]
    lon, lat = svc.detect_coord_columns(rows)
    assert lon == "longitude"
    assert lat == "latitude"


def test_detect_coord_columns_none_when_missing():
    rows = [{"a": 1, "b": 2}]
    lon, lat = svc.detect_coord_columns(rows)
    assert lon is None
    assert lat is None


def test_detect_coord_columns_empty_rows():
    assert svc.detect_coord_columns([]) == (None, None)


# ── Rows -> features ──────────────────────────────────────────────────────────

def test_rows_to_features_with_coords():
    rows = [
        {"lat": 52.3, "lon": 4.8, "name": "Amsterdam"},
        {"lat": 40.7, "lon": -74.0, "name": "NYC"},
    ]
    feats = svc._rows_to_features(rows, "lon", "lat")
    assert len(feats) == 2
    assert feats[0]["geometry"]["coordinates"] == [4.8, 52.3]
    # coordinate columns excluded from properties
    assert "lat" not in feats[0]["properties"]
    assert "lon" not in feats[0]["properties"]
    assert feats[0]["properties"]["name"] == "Amsterdam"


def test_rows_to_features_bad_coords_skipped():
    rows = [
        {"lat": "bad", "lon": "bad", "name": "x"},
        {"lat": 1.0, "lon": 2.0, "name": "y"},
    ]
    feats = svc._rows_to_features(rows, "lon", "lat")
    assert len(feats) == 1
    assert feats[0]["properties"]["name"] == "y"


def test_rows_to_features_no_coords_returns_empty():
    rows = [{"a": 1, "b": 2}]
    assert svc._rows_to_features(rows, None, None) == []


# ── Type name helper ──────────────────────────────────────────────────────────

def test_python_type_name():
    assert svc._python_type_name(True) == "Boolean"
    assert svc._python_type_name(5) == "Integer"
    assert svc._python_type_name(5.5) == "Float"
    assert svc._python_type_name("hi") == "String"


def test_extract_attributes_order_and_cap():
    rows = [{"a": 1, "b": "x", "c": 1.5}] * 3
    attrs = svc._extract_attributes(rows)
    fields = [a["field"] for a in attrs]
    assert fields[:3] == ["a", "b", "c"]
    assert attrs[0]["type"] == "Integer"
    assert attrs[2]["type"] == "Float"


# ── Content type mapping ──────────────────────────────────────────────────────

def test_content_type_for_format():
    assert svc._content_type_for_format("GeoJSON").startswith("application/geo+json")
    assert svc._content_type_for_format("CSV").startswith("text/csv")
    assert svc._content_type_for_format("unknown") == "application/octet-stream"
    assert "kml" in svc._content_type_for_format("KML").lower()


# ── KML parsing ───────────────────────────────────────────────────────────────

def test_parse_kml_points():
    kml = (
        b'<?xml version="1.0"?>'
        b'<kml xmlns="http://www.opengis.net/kml/2.2"><Document>'
        b'<Placemark><name>Amsterdam</name><Point>'
        b'<coordinates>4.8952,52.3702,0</coordinates></Point></Placemark>'
        b'<Placemark><name>NYC</name><Point>'
        b'<coordinates>-74.006,40.7128,0</coordinates></Point></Placemark>'
        b'</Document></kml>'
    )
    feats = svc.parse_kml_bytes(kml)
    assert len(feats) == 2
    assert feats[0]["geometry"]["coordinates"] == [4.8952, 52.3702]
    assert feats[0]["properties"]["name"] == "Amsterdam"


def test_parse_kml_invalid_raises():
    with pytest.raises(ValueError):
        svc.parse_kml_bytes(b"not xml at all")


def test_parse_kml_no_geometry_raises():
    kml = b'<?xml version="1.0"?><kml><Placemark><name>no geom</name></Placemark></kml>'
    with pytest.raises(ValueError):
        svc.parse_kml_bytes(kml)


# ── GeoRSS parsing ────────────────────────────────────────────────────────────

def test_parse_georss_points():
    rss = (
        b'<?xml version="1.0"?>'
        b'<rss xmlns:georss="http://www.georss.org/georss"><channel>'
        b'<item><title>Amsterdam</title>'
        b'<georss:point>52.3702 4.8952</georss:point></item>'
        b'<item><title>NYC</title>'
        b'<georss:point>40.7128 -74.006</georss:point></item>'
        b'</channel></rss>'
    )
    feats = svc.parse_georss_bytes(rss)
    assert len(feats) == 2
    assert feats[0]["geometry"]["coordinates"] == [4.8952, 52.3702]
    assert feats[0]["properties"]["title"] == "Amsterdam"


def test_parse_georss_invalid_raises():
    with pytest.raises(ValueError):
        svc.parse_georss_bytes(b"not xml at all")


def test_vocabulary_includes_new_formats():
    from app.api.data import schemas
    assert "KML" in schemas.DATA_FORMATS
    assert "GeoRSS" in schemas.DATA_FORMATS
    assert "GeoParquet" in schemas.DATA_FORMATS
    assert "KML" in schemas.INGESTED_VECTOR_FORMATS
    assert "GeoRSS" in schemas.INGESTED_VECTOR_FORMATS
    assert "GeoParquet" in schemas.STORED_ASSET_FORMATS
    assert schemas.DEFAULT_TYPE_FOR_FORMAT["KML"] == "vector"
    assert "points" in schemas.DATA_TYPES
