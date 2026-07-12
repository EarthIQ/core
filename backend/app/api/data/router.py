from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException

from app.api.data.schemas import (
    LayerInfo,
    RasterLayerMeta,
    VectorFeatureCollection,
)

router = APIRouter(tags=["data"])

# ── Layer catalogue (in-memory stub — replace with DB queries) ────────────────

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
    # Stub — modules inject real feature queries via their own routers
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
