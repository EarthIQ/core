"""
app/api/data/service.py
~~~~~~~~~~~~~~~~~~~~~~~
Stable public facade for spatial-dataset ingestion and management.

Historically this was a ~1000-line "god file". It has been decomposed into a
focused :mod:`app.api.data.ingest` package (per-format parsers + the dispatcher)
and :mod:`app.api.data.crud` (CRUD / preview / geometry profiling). See ticket
T-09.

This module now **only** re-exports the previous public (and test-used) names so
that existing imports such as ``from app.api.data import service as svc`` keep
working unchanged. Do NOT add new logic here - add it to the ``ingest`` or
``crud`` modules.
"""

from __future__ import annotations

# ── CRUD / preview / geometry ──────────────────────────────────────────────────
from app.api.data.crud import (  # noqa: F401
    _GEOMETRY_KINDS,
    _GEOMETRY_PROFILE_SQL,
    delete_dataset,
    get_dataset,
    get_dataset_features,
    get_download,
    get_geometry_summaries,
    get_geometry_summary,
    get_preview,
    list_datasets,
    replace_dataset_features,
    update_dataset,
)

# ── Shared helpers ─────────────────────────────────────────────────────────────
from app.api.data.ingest.common import (
    _content_type_for_format,
    _create_dataset_row,
    _extract_attributes,
    _geometry_to_geojson,
    _insert_features_raw,
    _normalize_tags,
    _python_type_name,
    _sample,
    _upload_best_effort,
)
from app.api.data.ingest.csv import (
    _coerce_scalar,
    _rows_to_features,
    detect_coord_columns,
    parse_csv_bytes,
)

# ── Dispatcher ─────────────────────────────────────────────────────────────────
from app.api.data.ingest.dispatcher import ingest_dataset, ingest_geojson

# ── Per-format parsers ─────────────────────────────────────────────────────────
from app.api.data.ingest.geojson import parse_geojson_bytes
from app.api.data.ingest.georss import parse_georss_bytes
from app.api.data.ingest.kml import parse_kml_bytes
from app.api.data.ingest.shapefile import parse_shapefile_bytes

__all__ = [
    "_coerce_scalar",
    "_content_type_for_format",
    "_create_dataset_row",
    "_extract_attributes",
    "_geometry_to_geojson",
    "_insert_features_raw",
    "_normalize_tags",
    # shared helpers
    "_python_type_name",
    "_rows_to_features",
    "_sample",
    "_upload_best_effort",
    "delete_dataset",
    "detect_coord_columns",
    "get_dataset",
    "get_dataset_features",
    "get_download",
    "get_geometry_summaries",
    "get_geometry_summary",
    "get_preview",
    # dispatcher
    "ingest_dataset",
    "ingest_geojson",
    # crud
    "list_datasets",
    "parse_csv_bytes",
    # parsers
    "parse_geojson_bytes",
    "parse_georss_bytes",
    "parse_kml_bytes",
    "parse_shapefile_bytes",
    "replace_dataset_features",
    "update_dataset",
]
