from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter

router = APIRouter(tags=["viz"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class BasemapStyle(BaseModel):
    id: str
    name: str
    style_url: str         # Tile URL (XYZ) or MapLibre style JSON URL
    preview_url: Optional[str] = None
    dark: bool = False


class MapConfig(BaseModel):
    default_center: List[float] = [0.0, 20.0]   # [lng, lat]
    default_zoom: float = 2.5
    default_basemap: str = "opentopomap"
    basemaps: List[BasemapStyle] = []


# ── Routes ────────────────────────────────────────────────────────────────────

_BASEMAPS: List[BasemapStyle] = [
    BasemapStyle(
        id="osm",
        name="OpenStreetMap",
        style_url="https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        dark=False,
    ),
    BasemapStyle(
        id="esri-satellite",
        name="ESRI Satellite",
        style_url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        dark=False,
    ),
    BasemapStyle(
        id="opentopomap",
        name="OpenTopoMap",
        style_url="https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
        dark=False,
    ),
]


@router.get("/basemaps", response_model=List[BasemapStyle])
def list_basemaps():
    """Return available basemap styles."""
    return _BASEMAPS


@router.get("/config", response_model=MapConfig)
def get_map_config():
    """Return default map configuration for the platform."""
    return MapConfig(basemaps=_BASEMAPS)
