"""
app/api/data/service.py
~~~~~~~~~~~~~~~~~~~~~~~
Business logic for GeoJSON upload ingestion and dataset management.
Geometries are inserted via raw SQL using PostGIS ST_GeomFromGeoJSON so
that we never need to depend on geoalchemy2's WKT/WKB serialization helpers
at runtime — only the column type declaration in models.py uses it.
"""
from __future__ import annotations

import json
import uuid
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.data.models import GeoDataset
from app.core import storage as object_storage


# ---------------------------------------------------------------------------
# Schema extraction helpers
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


def _extract_attributes(features: list[dict[str, Any]]) -> list[dict[str, str]]:
    """
    Scan the first few features and build an attribute schema list of the form:
    [{"field": "name", "type": "String", "sample": "London"}]
    """
    seen: dict[str, dict[str, str]] = {}
    for feat in features[:20]:  # sample up to 20 features
        props: dict[str, Any] = feat.get("properties") or {}
        for field, value in props.items():
            if field not in seen:
                sample = str(value)[:64] if value is not None else "null"
                seen[field] = {
                    "field": field,
                    "type": _python_type_name(value),
                    "sample": sample,
                }
    return list(seen.values())[:30]  # cap at 30 attributes


# ---------------------------------------------------------------------------
# Ingestion
# ---------------------------------------------------------------------------

async def ingest_geojson(
    *,
    file_bytes: bytes,
    filename: str,
    format: str,
    type: str,
    crs: str,
    tags: list[str],
    db: AsyncSession,
) -> GeoDataset:
    """
    Parse a GeoJSON file, persist metadata + features to the database,
    and upload the raw file to object storage.

    Returns the newly-created :class:`GeoDataset` row.
    """
    # -- Parse GeoJSON -------------------------------------------------------
    try:
        geojson = json.loads(file_bytes.decode("utf-8"))
    except Exception as exc:
        raise ValueError(f"Invalid GeoJSON: {exc}") from exc

    geo_type = geojson.get("type", "")
    if geo_type == "FeatureCollection":
        features_raw: list[dict] = geojson.get("features") or []
    elif geo_type == "Feature":
        features_raw = [geojson]
    else:
        # Bare geometry — wrap it
        features_raw = [{"type": "Feature", "geometry": geojson, "properties": {}}]

    feature_count = len(features_raw)
    attributes = _extract_attributes(features_raw)

    # -- Persist dataset metadata row ----------------------------------------
    dataset_id = str(uuid.uuid4())
    storage_key = f"geodata/{dataset_id}/{filename}"

    dataset = GeoDataset(
        id=dataset_id,
        name=filename,
        format=format,
        type=type,
        crs=crs,
        tags=tags,
        feature_count=feature_count,
        file_size_bytes=len(file_bytes),
        storage_key=storage_key,
        attributes=attributes,
    )
    db.add(dataset)
    await db.flush()  # write the parent row before inserting children

    # -- Bulk-insert GeoFeatures via raw SQL (ST_GeomFromGeoJSON) ------------
    await _insert_features_raw(db, dataset_id, features_raw)

    # -- Upload raw file to object storage (best-effort) ---------------------
    try:
        await object_storage.upload_file(
            key=storage_key,
            data=file_bytes,
            content_type="application/geo+json",
        )
    except Exception:
        # Storage failure is non-fatal for the DB record
        pass

    return dataset


async def _insert_features_raw(
    db: AsyncSession,
    dataset_id: str,
    features_raw: list[dict],
) -> None:
    """
    Bulk-insert geo_features rows using PostGIS ST_GeomFromGeoJSON so that
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
# CRUD helpers
# ---------------------------------------------------------------------------

async def list_datasets(
    db: AsyncSession,
    *,
    type_filter: str | None = None,
    search: str | None = None,
    limit: int = 200,
    offset: int = 0,
) -> list[GeoDataset]:
    """Return all GeoDataset rows, optionally filtered."""
    from sqlalchemy import func, or_

    q = select(GeoDataset).order_by(GeoDataset.updated_at.desc())
    if type_filter:
        q = q.where(GeoDataset.type == type_filter)
    if search:
        q = q.where(
            or_(
                func.lower(GeoDataset.name).contains(search.lower()),
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


async def delete_dataset(db: AsyncSession, dataset_id: str) -> bool:
    """Delete a dataset and all its features.  Returns True if found."""
    dataset = await get_dataset(db, dataset_id)
    if not dataset:
        return False

    # Remove from object storage (best-effort)
    if dataset.storage_key:
        try:
            await object_storage.delete_file(dataset.storage_key)
        except Exception:
            pass

    await db.delete(dataset)
    return True
