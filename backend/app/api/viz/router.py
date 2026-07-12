from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter

router = APIRouter(tags=["viz"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class BasemapStyle(BaseModel):
    id: str
    name: str
    style_url: str         # MapLibre style JSON URL
    preview_url: Optional[str] = None
    dark: bool = False


class MapConfig(BaseModel):
    default_center: List[float] = [0.0, 20.0]   # [lng, lat]
    default_zoom: float = 2.5
    default_basemap: str = "dataviz-dark"
    basemaps: List[BasemapStyle] = []


# ── Routes ────────────────────────────────────────────────────────────────────

_BASEMAPS: List[BasemapStyle] = [
    BasemapStyle(
        id="dataviz-dark",
        name="DataViz Dark",
        style_url="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        dark=True,
    ),
    BasemapStyle(
        id="dataviz-light",
        name="DataViz Light",
        style_url="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        dark=False,
    ),
    BasemapStyle(
        id="satellite",
        name="Satellite",
        style_url="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
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
