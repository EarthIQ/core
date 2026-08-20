from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.api.data.schemas import (
    DATA_FORMATS,
    DATA_TYPES,
    DEFAULT_TYPE_FOR_FORMAT,
    DatasetPreview,
    GeoDatasetListResponse,
    GeoDatasetOut,
    GeoDatasetUpdate,
    LayerInfo,
    RasterLayerMeta,
    VectorFeatureCollection,
)
from app.api.data import service as data_service

router = APIRouter(tags=["data"])

# ── Upload constraints ────────────────────────────────────────────────────────
MAX_UPLOAD_BYTES = 500 * 1024 * 1024  # 500 MB hard cap

# Permitted (format -> accepted extensions). Used for client-side validation;
# the authoritative check happens in the service dispatcher.
FORMAT_EXTENSIONS: dict[str, set[str]] = {
    "GeoJSON": {"geojson", "json"},
    "Shapefile": {"zip", "shp", "shp.zip"},
    "KML": {"kml", "kmz"},
    "GeoRSS": {"xml", "geojson", "json"},
    "GeoTIFF": {"tif", "tiff"},
    "COG": {"tif", "tiff", "cog.tif", "cog"},
    "GeoPackage": {"gpkg"},
    "GeoParquet": {"parquet"},
    "CSV": {"csv", "tsv", "txt"},
}


def _file_ext(filename: str) -> str:
    name = (filename or "").lower()
    # strip a trailing .zip from e.g. "layer.shp.zip"
    if name.endswith(".zip"):
        return name.rsplit(".", 2)[-2] if name.count(".") >= 2 else "zip"
    return name.rsplit(".", 1)[-1] if "." in name else ""


def _validate_format(filename: str, fmt: str) -> None:
    """Raise a 422 if the declared format does not plausibly match the file."""
    if fmt not in DATA_FORMATS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Unsupported format '{fmt}'. "
                f"Supported formats: {', '.join(DATA_FORMATS)}."
            ),
        )
    ext = _file_ext(filename)
    if ext in {"shp", "zip"}:
        # Shapefile archives may be labelled .shp.zip — accept either.
        return
    allowed = FORMAT_EXTENSIONS.get(fmt, set())
    if allowed and ext and ext not in allowed:
        raise HTTPException(
            status_code=422,
            detail=(
                f"File extension '.{ext}' does not match the declared format "
                f"'{fmt}'. Expected one of: {', '.join('.' + a for a in sorted(allowed))}."
            ),
        )


# ── Legacy layer catalogue (in-memory stub) ───────────────────────────────────

_VECTOR_LAYERS: List[LayerInfo] = [
    LayerInfo(id="admin-boundaries", name="Administrative Boundaries", type="vector"),
    LayerInfo(id="land-use", name="Land Use / Land Cover", type="vector"),
    LayerInfo(id="elevation-contours", name="Elevation Contours", type="vector"),
]

_RASTER_LAYERS: List[LayerInfo] = [
    LayerInfo(id="sentinel-2-rgb", name="Sentinel-2 True Colour", type="raster"),
    LayerInfo(id="ndvi-2024", name="NDVI 2024 Composite", type="raster"),
    LayerInfo(id="dem-30m", name="Digital Elevation Model 30m", type="raster"),
]


@router.get("/vector", response_model=List[LayerInfo])
def list_vector_layers():
    """List all available vector layers."""
    return _VECTOR_LAYERS


@router.get("/vector/{layer_id}", response_model=VectorFeatureCollection)
def get_vector_layer(layer_id: str):
    """Return a GeoJSON FeatureCollection for a vector layer (stub)."""
    layer = next((l for l in _VECTOR_LAYERS if l.id == layer_id), None)
    if not layer:
        raise HTTPException(status_code=404, detail=f"Vector layer '{layer_id}' not found")
    return VectorFeatureCollection(layer_id=layer_id, features=[])


@router.get("/raster", response_model=List[LayerInfo])
def list_raster_layers():
    """List all available raster layers."""
    return _RASTER_LAYERS


@router.get("/raster/{layer_id}", response_model=RasterLayerMeta)
def get_raster_layer(layer_id: str):
    """Return tile URL and metadata for a raster layer (stub)."""
    layer = next((l for l in _RASTER_LAYERS if l.id == layer_id), None)
    if not layer:
        raise HTTPException(status_code=404, detail=f"Raster layer '{layer_id}' not found")
    return RasterLayerMeta(
        layer_id=layer_id,
        name=layer.name,
        tile_url=f"https://tiles.earthiq.example/{layer_id}/{{z}}/{{x}}/{{y}}.png",
        attribution="© EarthIQ",
    )


# ── Metadata + vocabulary ─────────────────────────────────────────────────────

@router.get(
    "/datasets/meta",
    summary="Supported data types and formats",
)
def dataset_vocabulary():
    """Return the supported format/type vocabulary for client UIs."""
    return {
        "formats": DATA_FORMATS,
        "types": DATA_TYPES,
        "default_type_for_format": DEFAULT_TYPE_FOR_FORMAT,
    }


# ── GeoDataset endpoints ──────────────────────────────────────────────────────


@router.get("/datasets", response_model=GeoDatasetListResponse, summary="List spatial datasets")
async def list_datasets(
    type: Optional[str] = None,
    format: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """
    Return all uploaded spatial datasets.

    - **type**: filter by `vector` | `raster` | `tabular` | `remote-sensing`
    - **format**: filter by `GeoJSON` | `Shapefile` | `GeoTIFF` | `COG` | `GeoPackage` | `CSV`
    - **search**: partial match on name, description, or source
    """
    items = await data_service.list_datasets(
        db,
        type_filter=type,
        format_filter=format,
        search=search,
        limit=limit,
        offset=offset,
    )
    return GeoDatasetListResponse(
        items=[GeoDatasetOut.model_validate(ds) for ds in items],
        total=len(items),
    )


@router.post(
    "/datasets/upload",
    response_model=GeoDatasetOut,
    status_code=201,
    summary="Upload a spatial dataset (GeoJSON / Shapefile / CSV / GeoTIFF / COG / GeoPackage)",
)
async def upload_dataset(
    file: UploadFile = File(..., description="Dataset file"),
    format: str = Form("GeoJSON"),
    type: str = Form("vector"),
    crs: str = Form("EPSG:4326 (WGS 84)"),
    tags: str = Form("", description="Comma-separated tags"),
    description: str = Form("", description="Optional human description"),
    source: str = Form("", description="Optional source / provenance"),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a spatial file, ingest (or register) it, and register the dataset
    in the catalog.

    Behaviour by **format**:

    * `GeoJSON` / `Shapefile` — features are parsed into PostGIS and tiled via MVT.
    * `CSV` — column schema is captured; if a lat/lon pair is detected, rows
      are also ingested as point features.
    * `GeoTIFF` / `COG` / `GeoPackage` — registered as a downloadable asset.

    Returns the newly created dataset record.
    """
    fmt = (format or "").strip()
    filename = file.filename or "dataset"

    if not fmt:
        raise HTTPException(status_code=422, detail="A 'format' must be provided.")

    _validate_format(filename, fmt)

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 500 MB limit.")

    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    # Sensible default type when the client didn't specify one.
    resolved_type = (type or "").strip() or DEFAULT_TYPE_FOR_FORMAT.get(fmt, "vector")

    try:
        dataset = await data_service.ingest_dataset(
            file_bytes=file_bytes,
            filename=filename,
            format=fmt,
            type=resolved_type,
            crs=crs or "EPSG:4326 (WGS 84)",
            tags=tag_list,
            description=(description or None),
            source=(source or None),
            db=db,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return GeoDatasetOut.model_validate(dataset)


@router.get("/datasets/{dataset_id}", response_model=GeoDatasetOut, summary="Get a dataset")
async def get_dataset(
    dataset_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return a single dataset record by ID."""
    ds = await data_service.get_dataset(db, dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")
    return GeoDatasetOut.model_validate(ds)


@router.patch(
    "/datasets/{dataset_id}",
    response_model=GeoDatasetOut,
    summary="Update dataset metadata",
)
async def update_dataset(
    dataset_id: str,
    payload: GeoDatasetUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update editable metadata (name, description, source, tags, crs, meta)."""
    updates = payload.model_dump(exclude_unset=True)
    # `meta` is merged rather than replaced so clients can patch a single key.
    if payload.meta is not None:
        existing = (await data_service.get_dataset(db, dataset_id)) or None
        if existing and existing.meta:
            merged = dict(existing.meta)
            merged.update(payload.meta)
            updates["meta"] = merged
        else:
            updates["meta"] = payload.meta

    try:
        ds = await data_service.update_dataset(db, dataset_id, updates)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=f"Update failed: {exc}")

    if not ds:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")

    return GeoDatasetOut.model_validate(ds)


@router.get(
    "/datasets/{dataset_id}/preview",
    response_model=DatasetPreview,
    summary="Preview a dataset's rows / schema",
)
async def preview_dataset(
    dataset_id: str,
    max_rows: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Return a bounded preview (schema + up to ``max_rows`` sample rows)."""
    max_rows = max(1, min(max_rows, 100))
    preview = await data_service.get_preview(db, dataset_id, max_rows=max_rows)
    if preview is None:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")
    return preview


@router.get(
    "/datasets/{dataset_id}/download",
    summary="Download the original uploaded file",
    responses={200: {"content": {"application/octet-stream": {}}}},
)
async def download_dataset(
    dataset_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Stream the original uploaded file back to the client."""
    dl = await data_service.get_download(db, dataset_id)
    if dl is None:
        raise HTTPException(
            status_code=404,
            detail=f"Dataset '{dataset_id}' not found or has no stored file.",
        )
    data, filename, content_type = dl
    return Response(
        content=data,
        media_type=content_type.split(";")[0],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/datasets/{dataset_id}", status_code=204, summary="Delete a dataset")
async def delete_dataset(
    dataset_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a dataset record (and all its features) from the DB and object storage."""
    deleted = await data_service.delete_dataset(db, dataset_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")
    return Response(status_code=204)


# ── Vector Tile (MVT) endpoint ────────────────────────────────────────────────


@router.get(
    "/tiles/{dataset_id}/{z}/{x}/{y}.mvt",
    summary="Vector tile (MVT) for a GeoDataset",
    response_class=Response,
    responses={200: {"content": {"application/vnd.mapbox-vector-tile": {}}}},
)
async def get_mvt_tile(
    dataset_id: str,
    z: int,
    x: int,
    y: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Serve a Mapbox Vector Tile for the specified dataset tile coordinates.

    Uses PostGIS `ST_AsMVT` + `ST_TileEnvelope` for efficient server-side
    tile generation directly from the `geo_features` table.
    """
    dataset = await data_service.get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")

    sql = text("""
        WITH
        bounds AS (
            SELECT ST_TileEnvelope(:z, :x, :y) AS geom
        ),
        mvt_features AS (
            SELECT
                ST_AsMVTGeom(
                    ST_Transform(f.geom, 3857),
                    bounds.geom,
                    4096,
                    256,
                    true
                ) AS geom,
                f.properties
            FROM geo_features f, bounds
            WHERE
                f.dataset_id = :dataset_id
                AND f.geom IS NOT NULL
                AND ST_Intersects(
                    ST_Transform(f.geom, 3857),
                    bounds.geom
                )
        )
        SELECT ST_AsMVT(mvt_features.*, 'default', 4096, 'geom') AS tile
        FROM mvt_features
    """)

    result = await db.execute(
        sql,
        {
            "z": z,
            "x": x,
            "y": y,
            "dataset_id": dataset_id,
        },
    )
    row = result.one_or_none()
    tile_bytes: bytes = row[0] if row and row[0] else b""

    return Response(
        content=tile_bytes,
        media_type="application/vnd.mapbox-vector-tile",
        headers={
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
        },
    )