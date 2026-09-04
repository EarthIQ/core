"""
app/api/data/ingest/dispatcher.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
The public :func:`ingest_dataset` entry point. It inspects the declared
``format`` and routes to the appropriate per-format strategy (see sibling
modules), persists metadata + (where applicable) features, and keeps the raw
upload in object storage.
"""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.data.models import GeoDataset
from app.api.data.schemas import INGESTED_VECTOR_FORMATS, TABULAR_FORMATS
from app.api.data.ingest.common import (
    _content_type_for_format,
    _create_dataset_row,
    _extract_attributes,
    _insert_features_raw,
    _normalize_tags,
    _sample,
    _upload_best_effort,
)
from app.api.data.ingest.geojson import parse_geojson_bytes
from app.api.data.ingest.shapefile import parse_shapefile_bytes
from app.api.data.ingest.kml import parse_kml_bytes
from app.api.data.ingest.georss import parse_georss_bytes
from app.api.data.ingest.csv import (
    detect_coord_columns,
    parse_csv_bytes,
    _rows_to_features,
)


async def ingest_dataset(
    *,
    file_bytes: bytes,
    filename: str,
    format: str,
    type: str,
    crs: str,
    tags: list[str],
    description: str | None = None,
    source: str | None = None,
    db: AsyncSession,
) -> GeoDataset:
    """
    Register an uploaded file as a spatial dataset.

    Dispatches on ``format`` (GeoJSON / Shapefile / CSV / GeoTIFF / COG /
    GeoPackage) and persists metadata + (where applicable) features. Returns
    the newly created :class:`GeoDataset` row.
    """
    tags = _normalize_tags(tags)
    dataset_id = str(uuid.uuid4())
    storage_key = f"geodata/{dataset_id}/{filename}"
    meta: dict[str, Any] = {"ingested": False, "format": format}
    attributes: list[dict[str, Any]] = []
    feature_count: int | None = None

    fmt = (format or "").strip()

    if fmt in INGESTED_VECTOR_FORMATS:
        if fmt == "GeoJSON":
            features = parse_geojson_bytes(file_bytes)
        elif fmt == "Shapefile":
            features, sf_info = parse_shapefile_bytes(file_bytes)
            if sf_info.get("prj"):
                meta["shapefile_prj"] = sf_info["prj"]
        elif fmt == "KML":
            features = parse_kml_bytes(file_bytes)
        elif fmt == "GeoRSS":
            features = parse_georss_bytes(file_bytes)
        else:  # pragma: no cover - defensive
            raise ValueError(f"No parser available for format '{fmt}'.")
        feature_count = len(features)
        attributes = _extract_attributes(
            [f.get("properties") or {} for f in features]
        )
        meta["ingested"] = True
        ingested = True
    elif fmt in TABULAR_FORMATS:
        rows, header = parse_csv_bytes(file_bytes)
        feature_count = len(rows)
        attributes = _extract_attributes(rows)
        attributes = [
            {"field": h, "type": "String", "sample": _sample(rows[0].get(h)) if rows else "null"}
            for h in header
        ] if header else attributes
        lon, lat = detect_coord_columns(rows)
        meta["ingested"] = bool(lon and lat)
        meta["coordinate_columns"] = {"lon": lon, "lat": lat} if lon and lat else None
        ingested = bool(lon and lat)
        # Persist CSV as tabular + optional point features
        dataset = await _create_dataset_row(
            db,
            dataset_id=dataset_id,
            name=filename,
            format=fmt,
            type=type,
            crs=crs,
            tags=tags,
            feature_count=feature_count,
            file_size_bytes=len(file_bytes),
            storage_key=storage_key,
            attributes=attributes,
            description=description,
            source=source,
            meta=meta,
        )
        if ingested:
            await _insert_features_raw(
                db, dataset_id, _rows_to_features(rows, lon, lat)
            )
        await _upload_best_effort(file_bytes, storage_key, _content_type_for_format(fmt))
        return dataset
    else:
        # Stored asset (GeoTIFF / COG / GeoPackage / GeoParquet) — no parse.
        # Register metadata + keep the raw file; nothing is inserted into the
        # feature store (there is no server-side geometry to tile).
        meta["ingested"] = False
        meta["stored_asset"] = True
        dataset = await _create_dataset_row(
            db,
            dataset_id=dataset_id,
            name=filename,
            format=fmt,
            type=type,
            crs=crs,
            tags=tags,
            feature_count=None,
            file_size_bytes=len(file_bytes),
            storage_key=storage_key,
            attributes=[],
            description=description,
            source=source,
            meta=meta,
        )
        await _upload_best_effort(file_bytes, storage_key, _content_type_for_format(fmt))
        return dataset

    # ── Vector (GeoJSON / Shapefile / KML / GeoRSS) path ─────────────────────
    dataset = await _create_dataset_row(
        db,
        dataset_id=dataset_id,
        name=filename,
        format=fmt,
        type=type,
        crs=crs,
        tags=tags,
        feature_count=feature_count,
        file_size_bytes=len(file_bytes),
        storage_key=storage_key,
        attributes=attributes,
        description=description,
        source=source,
        meta=meta,
    )
    await _insert_features_raw(db, dataset_id, features)
    await _upload_best_effort(file_bytes, storage_key, _content_type_for_format(fmt))
    return dataset


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
    """Backwards-compatible alias (GeoJSON-only) for existing callers."""
    return await ingest_dataset(
        file_bytes=file_bytes,
        filename=filename,
        format=format or "GeoJSON",
        type=type or "vector",
        crs=crs or "EPSG:4326 (WGS 84)",
        tags=tags,
        db=db,
    )


__all__ = ["ingest_dataset", "ingest_geojson"]
