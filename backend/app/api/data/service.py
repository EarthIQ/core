"""
app/api/data/service.py
~~~~~~~~~~~~~~~~~~~~~~~
Business logic for spatial dataset ingestion and management.

Design
------
A single :func:`ingest_dataset` dispatcher inspects the declared ``format``
and routes to the appro
priate strategy:

* **GeoJSON / Shapefile** — parsed server-side into PostGIS ``geo_features``
  (EPSG:4326) so they can be tiled with ``ST_AsMVT``. Shapefiles are parsed
  with pure-python ``pyshp`` (no GDAL required).
* **CSV** — parsed into a bounded column schema, and if a lat/lon column pair
  is detected, features are also ingested into PostGIS so the dataset can be
  tiled as points. Either way the dataset is fully registered and downloadable.
* **GeoTIFF / COG / GeoPackage** — registered as *stored assets*: the raw file
  is kept in object storage with metadata (and any cheaply-available raster
  properties) and is downloadable, without requiring GDAL at request time.

All strategies store the raw upload to object storage so the original file is
always retrievable.
"""
from __future__ import annotations

import csv
import io
import json
import os
import uuid
from typing import Any, Tuple

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.data.models import GeoDataset
from app.api.data.schemas import (
    INGESTED_VECTOR_FORMATS,
    TABULAR_FORMATS,
)
from app.core import storage as object_storage


# ---------------------------------------------------------------------------
# Shared helpers
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
# Format parsers -> list of GeoJSON-like feature dicts
# ---------------------------------------------------------------------------

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


def parse_shapefile_bytes(file_bytes: bytes) -> Tuple[list[dict[str, Any]], dict[str, str]]:
    """Parse a zipped Shapefile into GeoJSON-style features + a CRS hint.

    Uses pure-python ``pyshp`` (imported as ``shapefile``) — no GDAL required.
    Returns ``(features, info)`` where ``info`` may contain a detected CRS.
    """
    import tempfile

    import zipfile

    import shapefile

    info: dict[str, str] = {}

    try:
        zf = zipfile.ZipFile(io.BytesIO(file_bytes))
    except zipfile.BadZipFile as exc:
        raise ValueError(
            "Shapefile upload is not a valid ZIP archive. "
            "Ensure the .shp is zipped together with its .shx/.dbf side files."
        ) from exc

    # Identify the primary .shp inside the archive (search recursively).
    shp_name = next(
        (n for n in zf.namelist() if n.lower().endswith(".shp")), None
    )
    if not shp_name:
        raise ValueError("No .shp file found inside the uploaded Shapefile archive.")

    # Read an optional .prj (WKT) for a CRS hint.
    prj_name = next(
        (
            n
            for n in zf.namelist()
            if n.lower().endswith(".prj")
            and n.rsplit("/", 1)[0] == shp_name.rsplit("/", 1)[0]
        ),
        None,
    )
    if prj_name:
        try:
            prj_wkt = zf.read(prj_name).decode("utf-8", errors="ignore").strip()
            if prj_wkt:
                info["prj"] = prj_wkt[:256]
        except Exception:
            pass

    # pyshp needs the shapefile's sibling files (.shp/.shx/.dbf) on a local
    # filesystem. Extract the whole archive to a temp dir and open by path.
    features: list[dict[str, Any]] = []
    with tempfile.TemporaryDirectory() as tmpdir:
        zf.extractall(tmpdir)
        shp_path = os.path.join(tmpdir, shp_name)
        reader = shapefile.Reader(
            shp_path, encoding="utf-8", encodingErrors="ignore"
        )
        # `reader.fields[0]` is the "DeletionFlag" pseudo-field; the real
        # attribute fields follow it.
        field_names = [f["name"] for f in reader.fields[1:]]
        for shape, rec in zip(reader.shapes(), reader.records()):
            geo_json = _geometry_to_geojson(shape)
            if geo_json is None:
                continue
            props = dict(zip(field_names, rec))
            features.append(
                {"type": "Feature", "geometry": geo_json, "properties": props}
            )

    if not features:
        raise ValueError("Shapefile contained no usable geometries.")
    return features, info


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


def parse_georss_bytes(file_bytes: bytes) -> list[dict[str, Any]]:
    """Parse a GeoRSS feed into GeoJSON point features.

    GeoRSS (RSS/Atom) carries point geometry via ``georss:point``
    ("lat lon") and linearring/polygon via ``georss:linearring``.
    """
    import xml.etree.ElementTree as ET

    try:
        tree = ET.fromstring(file_bytes)
    except ET.ParseError as exc:
        raise ValueError(f"Invalid GeoRSS/XML: {exc}") from exc

    def _local(tag: str) -> str:
        return tag.rsplit("}", 1)[-1]

    features: list[dict[str, Any]] = []
    # Each item/entry element holds a title, description and geo info.
    for item in tree.iter():
        if _local(item.tag) not in ("item", "entry", "event", "kml:Placemark"):
            continue
        props: dict[str, Any] = {}
        point = None
        linearring = None
        for child in item.iter():
            ctag = _local(child.tag)
            if ctag in ("title", "description", "link"):
                if child.text is not None and ctag != "link":
                    props.setdefault(ctag, child.text.strip())
            elif ctag == "point":
                txt = (child.text or "").strip().split()
                if len(txt) >= 2:
                    try:
                        lat = float(txt[0])
                        lon = float(txt[1])
                        point = {"type": "Point", "coordinates": [lon, lat]}
                    except ValueError:
                        pass
            elif ctag in ("linearring", "polygon"):
                coords = []
                for token in (child.text or "").replace("\n", ",").split(","):
                    parts = token.strip().split()
                    if len(parts) >= 2:
                        try:
                            coords.append([float(parts[1]), float(parts[0])])
                        except ValueError:
                            continue
                if coords:
                    linearring = {
                        "type": "LineString",
                        "coordinates": coords,
                    }
        geom = point or linearring
        if geom is None:
            continue
        features.append(
            {"type": "Feature", "geometry": geom, "properties": props}
        )

    if not features:
        raise ValueError("GeoRSS feed contained no usable point geometry.")
    return features


def detect_coord_columns(rows: list[dict[str, Any]]) -> Tuple[str | None, str | None]:
    """Heuristically find (lon, lat) column names from a header row."""
    if not rows:
        return None, None
    headers = [str(h).strip().lower() for h in rows[0].keys()]

    def find(candidates: list[str]) -> str | None:
        for cand in candidates:
            if cand in headers:
                return cand
        return None

    lon = find(["lon", "lng", "longitude", "x"])
    lat = find(["lat", "latitude", "y"])
    # Disambiguate the x/y shortcut (only if lon/lat weren't explicitly present)
    if lon in ("x",) and lat in ("y",):
        if not any(h in ("lon", "lng", "longitude", "lat", "latitude") for h in headers):
            pass  # keep x/y
    return lon, lat


def parse_csv_bytes(file_bytes: bytes) -> Tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Parse a CSV file into ``(rows, header)``.

    ``rows`` is a list of ``{column: value}`` dicts (values kept as strings,
    except obviously numeric ones). ``header`` is the ordered column list.
    """
    try:
        decoded = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        decoded = file_bytes.decode("latin-1")

    dialect = csv.Sniffer().sniff(decoded[:4096], delimiters=",;\t|")
    reader = csv.DictReader(io.StringIO(decoded), dialect=dialect)
    rows: list[dict[str, Any]] = []
    for raw in reader:
        row: dict[str, Any] = {}
        for k, v in raw.items():
            if k is None:
                continue
            row[str(k)] = _coerce_scalar(v)
        rows.append(row)
    header = [str(c) for c in (reader.fieldnames or [])]
    return rows, header


def _coerce_scalar(v: Any) -> Any:
    if v is None or (isinstance(v, str) and v.strip() == ""):
        return None
    if isinstance(v, (int, float, bool)):
        return v
    s = v.strip()
    try:
        if any(ch in s for ch in ".eE") and all(ch in "0123456789.+-eE" for ch in s):
            return float(s)
        return int(s)
    except ValueError:
        return v


def _rows_to_features(
    rows: list[dict[str, Any]], lon: str | None, lat: str | None
) -> list[dict[str, Any]]:
    """Turn tabular rows into point features (when a coordinate pair exists)."""
    if not lon or not lat:
        return []
    features: list[dict[str, Any]] = []
    for row in rows:
        try:
            x = float(row.get(lon))
            y = float(row.get(lat))
        except (TypeError, ValueError):
            continue
        props = {k: v for k, v in row.items() if k not in (lon, lat)}
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [x, y]},
                "properties": props,
            }
        )
    return features


# ---------------------------------------------------------------------------
# Public ingestion dispatcher
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Backwards-compatible alias (GeoJSON-only) — kept for any existing callers.
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
    return await ingest_dataset(
        file_bytes=file_bytes,
        filename=filename,
        format=format or "GeoJSON",
        type=type or "vector",
        crs=crs or "EPSG:4326 (WGS 84)",
        tags=tags,
        db=db,
    )


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