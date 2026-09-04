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
working unchanged. Do NOT add new logic here — add it to the ``ingest`` or
``crud`` modules.
"""
from __future__ import annotations

# ── Shared helpers ─────────────────────────────────────────────────────────────
from app.api.data.ingest.common import (  # noqa: F401
    _python_type_name,
    _sample,
    _extract_attributes,
    _normalize_tags,
    _content_type_for_format,
    _geometry_to_geojson,
    _insert_features_raw,
    _create_dataset_row,
    _upload_best_effort,
)

# ── Per-format parsers ─────────────────────────────────────────────────────────
from app.api.data.ingest.geojson import parse_geojson_bytes  # noqa: F401
from app.api.data.ingest.shapefile import parse_shapefile_bytes  # noqa: F401
from app.api.data.ingest.kml import parse_kml_bytes  # noqa: F401
from app.api.data.ingest.georss import parse_georss_bytes  # noqa: F401
from app.api.data.ingest.csv import (  # noqa: F401
    detect_coord_columns,
    parse_csv_bytes,
    _coerce_scalar,
    _rows_to_features,
)

# ── Dispatcher ─────────────────────────────────────────────────────────────────
from app.api.data.ingest.dispatcher import ingest_dataset, ingest_geojson  # noqa: F401

# ── CRUD / preview / geometry ──────────────────────────────────────────────────
from app.api.data.crud import (  # noqa: F401
    list_datasets,
    get_dataset,
    update_dataset,
    get_dataset_features,
    replace_dataset_features,
    delete_dataset,
    get_preview,
    get_download,
    get_geometry_summary,
    get_geometry_summaries,
    _GEOMETRY_KINDS,
    _GEOMETRY_PROFILE_SQL,
)

__all__ = [
    # shared helpers
    "_python_type_name",
    "_sample",
    "_extract_attributes",
    "_normalize_tags",
    "_content_type_for_format",
    "_geometry_to_geojson",
    "_insert_features_raw",
    "_create_dataset_row",
    "_upload_best_effort",
    # parsers
    "parse_geojson_bytes",
    "parse_shapefile_bytes",
    "parse_kml_bytes",
    "parse_georss_bytes",
    "detect_coord_columns",
    "parse_csv_bytes",
    "_coerce_scalar",
    "_rows_to_features",
    # dispatcher
    "ingest_dataset",
    "ingest_geojson",
    # crud
    "list_datasets",
    "get_dataset",
    "update_dataset",
    "get_dataset_features",
    "replace_dataset_features",
    "delete_dataset",
    "get_preview",
    "get_download",
    "get_geometry_summary",
    "get_geometry_summaries",
]
