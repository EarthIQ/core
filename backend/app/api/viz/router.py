from __future__ import annotations

import json
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter

from app.core.config import get_settings

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


# ── Basemaps (data-driven) ────────────────────────────────────────────────────
# The built-in catalogue is the fallback. It can be fully overridden at runtime
# via the ``BASEMAPS_CONFIG`` env var (a JSON list of BasemapStyle dicts), and
# an optional MapTiler basemap is appended when ``MAPTILER_KEY`` is set. This
# removes the previous hard-coding (ticket T-07).

_DEFAULT_BASEMAPS: List[BasemapStyle] = [
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


def get_basemaps() -> List[BasemapStyle]:
    """Return the active basemap catalogue.

    Resolution order:
      1. ``settings.basemaps_config`` (JSON list) if present and valid — full override.
      2. the built-in :data:`_DEFAULT_BASEMAPS`, plus a MapTiler entry when a key is set.
    """
    settings = get_settings()
    override = (settings.basemaps_config or "").strip()
    if override:
        try:
            data = json.loads(override)
            if isinstance(data, list):
                basemaps = [
                    BasemapStyle(**item) for item in data if isinstance(item, dict)
                ]
                if basemaps:
                    return basemaps
        except (json.JSONDecodeError, ValueError):
            # Invalid override JSON — fall back to defaults rather than 500.
            pass

    basemaps = list(_DEFAULT_BASEMAPS)
    if settings.maptiler_key:
        basemaps.append(
            BasemapStyle(
                id="maptiler-streets",
                name="MapTiler Streets",
                style_url=(
                    f"https://api.maptiler.com/maps/streets/style.json"
                    f"?key={settings.maptiler_key}"
                ),
                dark=False,
            )
        )
    return basemaps


# ── Routes ────────────────────────────────────────────────────────────────────


@router.get("/basemaps", response_model=List[BasemapStyle])
def list_basemaps():
    """Return available basemap styles."""
    return get_basemaps()


@router.get("/config", response_model=MapConfig)
def get_map_config():
    """Return default map configuration for the platform."""
    return MapConfig(basemaps=get_basemaps())
