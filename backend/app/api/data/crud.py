"""
app/api/data/crud.py
~~~~~~~~~~~~~~~~~~~~
Dataset CRUD + preview/download + geometry profiling. Split out of the old
single-file ``service.py`` (ticket T-09). All functions keep the same
signatures/behaviour as before; :mod:`app.api.data.service` re-exports them.
"""
from __future__ import annotations

import json
from typing import Any, Tuple

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.data.models import GeoDataset
from app.api.data.ingest.common import (
    _content_type_for_format,
    _extract_attributes,
    _insert_features_raw,
)
from app.core import storage as object_storage


# ---------------------------------------------------------------------------
# CRUD helpers
# ---------------------------------------------------------------------------

async def list_datasets(
    db: AsyncSession,
    *,
    type_filter: str | None = None,
    format_filter: str | None = None,
    search: str | None = None,
    limit: int = 200,
    offset: int = 0,
) -> list[GeoDataset]:
    """Return all GeoDataset rows, optionally filtered."""
    from sqlalchemy import func, or_

    q = select(GeoDataset).order_by(GeoDataset.updated_at.desc())
    if type_filter:
        q = q.where(GeoDataset.type == type_filter)
    if format_filter:
        q = q.where(GeoDataset.format == format_filter)
    if search:
        term = f"%{search.lower()}%"
        q = q.where(
            or_(
                func.lower(GeoDataset.name).like(term),
                func.coalesce(func.lower(GeoDataset.description), "").like(term),
                func.coalesce(func.lower(GeoDataset.source), "").like(term),
            )
        )
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_dataset(db: AsyncSession, dataset_id: str) -> GeoDataset | None:
    result = await db.execute(
        select(GeoDataset).where(GeoDataset.id == dataset_id)
    )
    return result.scalar_one_or_none()


async def update_dataset(
    db: AsyncSession, dataset_id: str, updates: dict[str, Any]
) -> GeoDataset | None:
    """Apply a partial metadata update. Returns the updated row (or None)."""
    dataset = await get_dataset(db, dataset_id)
    if not dataset:
        return None
    for key, value in updates.items():
        if value is not None:
            setattr(dataset, key, value)
    await db.flush()
    await db.refresh(dataset)
    return dataset


async def get_dataset_features(
    db: AsyncSession, dataset_id: str
) -> list[dict[str, Any]] | None:
    """Return a dataset's stored features as GeoJSON feature dicts.

    Returns ``None`` when the dataset does not exist (distinct from an
    empty feature list).
    """
    dataset = await get_dataset(db, dataset_id)
    if dataset is None:
        return None

    rows = (
        await db.execute(
            text(
                "SELECT id, ST_AsGeoJSON(geom) AS geom, properties "
                "FROM geo_features WHERE dataset_id = :dsid"
            ),
            {"dsid": dataset_id},
        )
    ).all()

    features: list[dict[str, Any]] = []
    for row in rows:
        geom: Any = None
        if row.geom:
            try:
                geom = json.loads(row.geom)
            except (TypeError, ValueError):
                geom = None
        features.append(
            {
                "id": row.id,
                "type": "Feature",
                "geometry": geom,
                "properties": row.properties or {},
            }
        )
    return features


async def replace_dataset_features(
    db: AsyncSession, dataset_id: str, features: list[dict[str, Any]]
) -> GeoDataset | None:
    """Replace a vector dataset's stored features with the given GeoJSON.

    This backs the in-app map editor: shapes are drawn/edited with TerraDraw
    and persisted back to the same dataset. Metadata (feature count,
    attribute schema) is refreshed to match the new features.

    Returns ``None`` when the dataset does not exist; raises ``ValueError``
    when the dataset type does not support feature edits.
    """
    dataset = await get_dataset(db, dataset_id)
    if not dataset:
        return None
    if dataset.type != "vector":
        raise ValueError("Only vector datasets support feature edits.")

    sanitized = [
        {
            "geometry": (f or {}).get("geometry"),
            "properties": (f or {}).get("properties") or {},
        }
        for f in features
    ]

    await db.execute(
        text("DELETE FROM geo_features WHERE dataset_id = :dsid"),
        {"dsid": dataset_id},
    )
    if sanitized:
        await _insert_features_raw(db, dataset_id, sanitized)

    dataset.feature_count = len(sanitized)
    dataset.attributes = _extract_attributes(
        [f["properties"] for f in sanitized]
    )
    await db.flush()
    await db.refresh(dataset)
    return dataset


async def delete_dataset(db: AsyncSession, dataset_id: str) -> bool:
    """Delete a dataset and all its features.  Returns True if found."""
    dataset = await get_dataset(db, dataset_id)
    if not dataset:
        return False

    if dataset.storage_key:
        try:
            await object_storage.delete_file(dataset.storage_key)
        except Exception:
            pass

    await db.delete(dataset)
    return True


# ---------------------------------------------------------------------------
# Preview + download
# ---------------------------------------------------------------------------

async def get_preview(
    db: AsyncSession, dataset_id: str, max_rows: int = 20
) -> dict[str, Any] | None:
    """Build a bounded preview payload for a dataset."""
    dataset = await get_dataset(db, dataset_id)
    if not dataset:
        return None

    meta = dataset.meta or {}
    ingested = bool(meta.get("ingested"))

    columns = [
        {"field": a.get("field", ""), "type": a.get("type", "String"), "sample": a.get("sample", "")}
        for a in (dataset.attributes or [])
    ]

    rows_out: list[dict[str, Any]] = []
    if ingested:
        result = await db.execute(
            text("SELECT properties FROM geo_features WHERE dataset_id = :dsid LIMIT :n"),
            {"dsid": dataset_id, "n": max_rows},
        )
        for row in result:
            props = row[0] if row[0] else {}
            rows_out.append({"values": props})

    return {
        "dataset_id": dataset.id,
        "name": dataset.name,
        "format": dataset.format,
        "type": dataset.type,
        "ingested": ingested,
        "row_count": dataset.feature_count,
        "columns": columns,
        "rows": rows_out,
        "asset_meta": {k: v for k, v in meta.items() if k != "ingested"},
    }


async def get_download(
    db: AsyncSession, dataset_id: str
) -> Tuple[bytes, str, str] | None:
    """Return ``(bytes, filename, content_type)`` for a stored dataset file."""
    dataset = await get_dataset(db, dataset_id)
    if not dataset or not dataset.storage_key:
        return None
    data = await object_storage.download_file(dataset.storage_key)
    filename = dataset.storage_key.rsplit("/", 1)[-1]
    return data, filename, _content_type_for_format(dataset.format)


# ---------------------------------------------------------------------------
# Geometry summary (point / line / polygon profile of a dataset)
# ---------------------------------------------------------------------------

_GEOMETRY_PROFILE_SQL = text(
    """
    WITH feats AS (
        SELECT ST_AsText(f.geom) AS wkt
        FROM geo_features f
        WHERE f.dataset_id = :dsid AND f.geom IS NOT NULL
    )
    SELECT
        COALESCE(SUM(
            (length(wkt) - length(replace(wkt, 'POINT (', '')))  / length('POINT (')
          + (length(wkt) - length(replace(wkt, 'POINT(', '')))   / length('POINT(')
        ), 0) AS points,
        COALESCE(SUM(
            (length(wkt) - length(replace(wkt, 'LINESTRING (', ''))) / length('LINESTRING (')
          + (length(wkt) - length(replace(wkt, 'LINESTRING(', '')))  / length('LINESTRING(')
        ), 0) AS lines,
        COALESCE(SUM(
            (length(wkt) - length(replace(wkt, 'POLYGON (', ''))) / length('POLYGON (')
          + (length(wkt) - length(replace(wkt, 'POLYGON(', '')))  / length('POLYGON(')
        ), 0) AS polygons
    FROM feats
    """
)

_GEOMETRY_KINDS = ("point", "line", "polygon")


async def get_geometry_summary(
    db: AsyncSession, dataset_id: str
) -> dict[str, Any] | None:
    """Compute the geometry-type profile of a dataset's features.

    Returns a dict (shaped like ``GeometrySummary``) with:
      - ``kind``     — ``"vector"`` or ``"raster"``
      - ``dominant`` — ``"point"`` | ``"line"`` | ``"polygon"`` | None
      - ``counts``   — per-kind feature counts
      - ``total``    — total features with a geometry

    Degrades gracefully on non-PostGIS engines (e.g. in-memory SQLite) by
    returning an empty profile instead of raising.
    """
    dataset = await get_dataset(db, dataset_id)
    if dataset is None:
        return None

    if dataset.type in ("raster", "remote-sensing"):
        return {
            "dataset_id": dataset.id,
            "kind": "raster",
            "dominant": None,
            "counts": {},
            "total": dataset.feature_count or 0,
        }

    counts: dict[str, int] = {}
    try:
        row = (
            await db.execute(_GEOMETRY_PROFILE_SQL, {"dsid": dataset_id})
        ).first()
        if row is not None:
            for attr, label in (
                ("points", "point"),
                ("lines", "line"),
                ("polygons", "polygon"),
            ):
                value = int(getattr(row, attr))
                if value:
                    counts[label] = value
    except Exception:
        # Non-PostGIS engine (no ST_AsText/replace) or missing feature table.
        return {
            "dataset_id": dataset.id,
            "kind": "vector",
            "dominant": None,
            "counts": {},
            "total": 0,
        }

    total = sum(counts.values())
    dominant: str | None = None
    candidates = {k: v for k, v in counts.items() if k in _GEOMETRY_KINDS}
    if candidates:
        dominant = max(candidates.items(), key=lambda kv: kv[1])[0]

    return {
        "dataset_id": dataset.id,
        "kind": "vector",
        "dominant": dominant,
        "counts": counts,
        "total": total,
    }


async def get_geometry_summaries(
    db: AsyncSession, dataset_ids: list[str]
) -> dict[str, dict[str, Any]]:
    """Batch variant of :func:`get_geometry_summary` keyed by dataset id.

    Unknown dataset ids are simply omitted from the result.
    """
    out: dict[str, dict[str, Any]] = {}
    for dataset_id in dataset_ids:
        summary = await get_geometry_summary(db, dataset_id)
        if summary is not None:
            out[dataset_id] = summary
    return out


__all__ = [
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
