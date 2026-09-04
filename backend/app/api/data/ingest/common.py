"""
app/api/data/ingest/common.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Shared, format-agnostic ingestion helpers.

These are the low-level building blocks used by the per-format parsers
(see :mod:`app.api.data.ingest.geojson` … ``csv``) and the dispatcher
(:func:`app.api.data.ingest.dispatcher.ingest_dataset`). Extracted from the
old single ``service.py`` god-file so each concern lives in a focused module
(ticket T-09).
"""
from __future__ import annotations

import json
import uuid
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.data.models import GeoDataset
from app.core import storage as object_storage


# ---------------------------------------------------------------------------
# Attribute / type helpers
# ---------------------------------------------------------------------------

def _python_type_name(value: Any) -> str:
    """Map a Python value to a GIS-friendly type label."""
    if isinstance(value, bool):
        return "Boolean"
    if isinstance(value, int):
        return "Integer"
    if isinstance(value, float):
        return "Float"
    return "String"


def _sample(value: Any, limit: int = 64) -> str:
    if value is None:
        return "null"
    s = str(value)
    return s[:limit]


def _extract_attributes(rows: list[dict[str, Any]], sample_n: int = 20) -> list[dict[str, str]]:
    """
    Build an attribute schema list of the form
    ``[{"field": "name", "type": "String", "sample": "London"}]``
    from a list of flat property dictionaries.
    """
    seen: dict[str, dict[str, str]] = {}
    for row in rows[:sample_n]:
        for field, value in row.items():
            if field not in seen:
                seen[field] = {
                    "field": field,
                    "type": _python_type_name(value),
                    "sample": _sample(value),
                }
    return list(seen.values())[:40]


def _normalize_tags(tags: list[str]) -> list[str]:
    cleaned = [t.strip() for t in tags if t and t.strip()]
    return cleaned or ["uploaded"]


def _content_type_for_format(fmt: str) -> str:
    return {
        "GeoJSON": "application/geo+json",
        "Shapefile": "application/zip",
        "KML": "application/vnd.google-earth.kml+xml",
        "GeoRSS": "application/rss+xml",
        "GeoTIFF": "image/tiff; application=geotiff",
        "COG": "image/tiff; application=geotiff",
        "GeoPackage": "application/octet-stream",
        "GeoParquet": "application/octet-stream",
        "CSV": "text/csv",
    }.get(fmt, "application/octet-stream")


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def _geometry_to_geojson(obj: Any) -> dict[str, Any] | None:
    """Convert an object exposing ``__geo_interface__`` (e.g. a pyshp Shape)
    to a GeoJSON geometry dict. Returns ``None`` when not representable."""
    if obj is None:
        return None
    iface = getattr(obj, "__geo_interface__", None)
    if not isinstance(iface, dict):
        return None
    if iface.get("type") == "None":
        return None
    try:
        return json.loads(json.dumps(iface))
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Feature store insertion (raw SQL, PostGIS ST_GeomFromGeoJSON)
# ---------------------------------------------------------------------------

async def _insert_features_raw(
    db: AsyncSession,
    dataset_id: str,
    features_raw: list[dict[str, Any]],
) -> None:
    """
    Bulk-insert geo_features rows using PostGIS ``ST_GeomFromGeoJSON`` so that
    geometry strings are parsed server-side without any Python geometry libs.
    """
    for feat in features_raw:
        geom_json = feat.get("geometry")
        props = feat.get("properties") or {}
        feat_id = str(uuid.uuid4())

        if geom_json:
            await db.execute(
                text(
                    "INSERT INTO geo_features (id, dataset_id, geom, properties) "
                    "VALUES (:id, :dsid, ST_GeomFromGeoJSON(:geom), CAST(:props AS jsonb))"
                ),
                {
                    "id": feat_id,
                    "dsid": dataset_id,
                    "geom": json.dumps(geom_json),
                    "props": json.dumps(props),
                },
            )
        else:
            await db.execute(
                text(
                    "INSERT INTO geo_features (id, dataset_id, geom, properties) "
                    "VALUES (:id, :dsid, NULL, CAST(:props AS jsonb))"
                ),
                {
                    "id": feat_id,
                    "dsid": dataset_id,
                    "props": json.dumps(props),
                },
            )


# ---------------------------------------------------------------------------
# Dataset row + object storage helpers
# ---------------------------------------------------------------------------

async def _create_dataset_row(
    db: AsyncSession,
    *,
    dataset_id: str,
    name: str,
    format: str,
    type: str,
    crs: str,
    tags: list[str],
    feature_count: int | None,
    file_size_bytes: int,
    storage_key: str | None,
    attributes: list[dict[str, Any]],
    description: str | None,
    source: str | None,
    meta: dict[str, Any],
) -> GeoDataset:
    dataset = GeoDataset(
        id=dataset_id,
        name=name,
        format=format,
        type=type,
        crs=crs,
        tags=tags,
        feature_count=feature_count,
        file_size_bytes=file_size_bytes,
        storage_key=storage_key,
        attributes=attributes,
        description=description,
        source=source,
        meta=meta,
    )
    db.add(dataset)
    await db.flush()
    return dataset


async def _upload_best_effort(
    file_bytes: bytes, storage_key: str, content_type: str
) -> None:
    try:
        await object_storage.upload_file(
            key=storage_key, data=file_bytes, content_type=content_type
        )
    except Exception:
        # Storage failure is non-fatal for the DB record
        pass


__all__ = [
    "_python_type_name",
    "_sample",
    "_extract_attributes",
    "_normalize_tags",
    "_content_type_for_format",
    "_geometry_to_geojson",
    "_insert_features_raw",
    "_create_dataset_row",
    "_upload_best_effort",
]
