from __future__ import annotations
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class LayerInfo(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    type: str  # "vector" | "raster"
    source_url: Optional[str] = None
    available: bool = True


class VectorFeature(BaseModel):
    type: str = "Feature"
    geometry: Dict[str, Any]
    properties: Dict[str, Any] = {}


class VectorFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    layer_id: str
    features: List[VectorFeature] = []


class RasterLayerMeta(BaseModel):
    layer_id: str
    name: str
    tile_url: str   # e.g. https://tiles.example.com/{z}/{x}/{y}.png
    min_zoom: int = 0
    max_zoom: int = 22
    attribution: str = ""
    bounds: Optional[List[float]] = None  # [west, south, east, north]
