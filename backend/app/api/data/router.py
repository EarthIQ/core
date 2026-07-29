from __future__ import annotations

import json
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.api.data.schemas import (
    GeoDatasetListResponse,
    GeoDatasetOut,
    LayerInfo,
    RasterLayerMeta,
    VectorFeatureCollection,
)
from app.api.data import service as data_service

router = APIRouter(tags=["data"])

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


# ── GeoDataset endpoints ──────────────────────────────────────────────────────


@router.get("/datasets", response_model=GeoDatasetListResponse, summary="List spatial datasets")
async def list_datasets(
    type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """
    Return all uploaded spatial datasets.

    - **type**: filter by `vector` | `raster` | `tabular` | `remote-sensing`
    - **search**: partial name search
    """
    items = await data_service.list_datasets(
        db, type_filter=type, search=search, limit=limit, offset=offset
    )
    return GeoDatasetListResponse(
        items=[GeoDatasetOut.model_validate(ds) for ds in items],
        total=len(items),
    )


@router.post(
    "/datasets/upload",
    response_model=GeoDatasetOut,
    status_code=201,
    summary="Upload a GeoJSON dataset",
)
async def upload_dataset(
    file: UploadFile = File(..., description="GeoJSON file (.geojson or .json)"),
    format: str = Form("GeoJSON"),
    type: str = Form("vector"),
    crs: str = Form("EPSG:4326 (WGS 84)"),
    tags: str = Form("", description="Comma-separated tags"),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a GeoJSON file, ingest all features into PostGIS, and register the
    dataset in the catalog.

    Returns the newly created dataset record.
    """
    # Validate content type loosely
    allowed_types = {
        "application/geo+json",
        "application/json",
        "text/plain",
        "application/octet-stream",
    }
    if file.content_type and file.content_type not in allowed_types:
        # Only strict-enforce for clearly wrong MIME types
        if not file.content_type.startswith("text/"):
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported content type '{file.content_type}'. Upload a GeoJSON file.",
            )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(file_bytes) > 500 * 1024 * 1024:  # 500 MB hard cap
        raise HTTPException(status_code=413, detail="File exceeds 500 MB limit.")

    tag_list = [t.strip() for t in tags.split(",") if t.strip()] or ["uploaded"]
    filename = file.filename or "dataset.geojson"

    try:
        dataset = await data_service.ingest_geojson(
            file_bytes=file_bytes,
            filename=filename,
            format=format,
            type=type,
            crs=crs,
            tags=tag_list,
            db=db,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return GeoDatasetOut.model_validate(dataset)


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
    # Validate dataset exists
    dataset = await data_service.get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")

    # --- MVT tile query using PostGIS ---
    # ST_TileEnvelope(z, x, y) gives the web-mercator bbox for the tile.
    # We transform geometries to EPSG:3857 for MVT.
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
        SELECT ST_AsMVT(mvt_features.*, :layer_name, 4096, 'geom') AS tile
        FROM mvt_features
    """)

    result = await db.execute(
        sql,
        {
            "z": z,
            "x": x,
            "y": y,
            "dataset_id": dataset_id,
            "layer_name": dataset.name[:64],
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
