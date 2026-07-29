from __future__ import annotations
from typing import List, Optional, Dict, Any
from datetime import datetime

from pydantic import BaseModel


# ── Existing layer schemas (used by legacy stub endpoints) ────────────────────

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


# ── GeoDataset schemas ────────────────────────────────────────────────────────

class AttributeField(BaseModel):
    field: str
    type: str
    sample: str


class GeoDatasetOut(BaseModel):
    """API response shape for a spatial dataset record."""
    id: str
    name: str
    format: str
    type: str
    crs: str
    tags: List[str]
    feature_count: Optional[int] = None
    file_size_bytes: int
    storage_key: Optional[str] = None
    attributes: List[AttributeField] = []
    created_at: datetime
    updated_at: datetime

    # Computed helper: human-readable size
    @property
    def size_label(self) -> str:
        if self.file_size_bytes < 1024:
            return f"{self.file_size_bytes} B"
        if self.file_size_bytes < 1024 ** 2:
            return f"{self.file_size_bytes / 1024:.1f} KB"
        if self.file_size_bytes < 1024 ** 3:
            return f"{self.file_size_bytes / (1024 ** 2):.1f} MB"
        return f"{self.file_size_bytes / (1024 ** 3):.1f} GB"

    model_config = {"from_attributes": True}


class GeoDatasetListResponse(BaseModel):
    items: List[GeoDatasetOut]
    total: int
