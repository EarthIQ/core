from __future__ import annotations
from typing import List, Optional, Dict, Any
from datetime import datetime

from pydantic import BaseModel, Field


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


# ── Supported format / type vocabularies ──────────────────────────────────────
# `format`   = the file/container format of the uploaded asset.
# `type`     = the semantic category of the data.
#
# "ingested"  formats are parsed server-side into PostGIS (vector) or the
#             tabular feature store (CSV-with-coordinates) and are queryable
#             via the MVT tile endpoint.
# "stored"    formats are registered as downloadable assets (metadata + the
#             raw file in object storage) without server-side geometry parsing.

DATA_FORMATS: List[str] = [
    "GeoJSON",
    "Shapefile",
    "KML",
    "GeoRSS",
    "GeoTIFF",
    "COG",
    "GeoPackage",
    "GeoParquet",
    "CSV",
]

DATA_TYPES: List[str] = [
    "vector",
    "raster",
    "tabular",
    "remote-sensing",
    "points",
]

# Formats that are parsed into the feature store (vector).
INGESTED_VECTOR_FORMATS: List[str] = ["GeoJSON", "Shapefile", "KML", "GeoRSS"]

# Formats that are tabular (CSV / TSV / delimited).
TABULAR_FORMATS: List[str] = ["CSV"]

# Formats that are registered as stored assets (not geometry-parsed).
STORED_ASSET_FORMATS: List[str] = [
    "GeoTIFF",
    "COG",
    "GeoPackage",
    "GeoParquet",
]

# Suggested (format, type) pairing used as a default when the client does not
# specify a type. Used only for client-side guidance; the server accepts any.
DEFAULT_TYPE_FOR_FORMAT: Dict[str, str] = {
    "GeoJSON": "vector",
    "Shapefile": "vector",
    "KML": "vector",
    "GeoRSS": "vector",
    "GeoTIFF": "raster",
    "COG": "remote-sensing",
    "GeoPackage": "vector",
    "GeoParquet": "vector",
    "CSV": "tabular",
}


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
    description: Optional[str] = None
    source: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)
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


class GeometrySummary(BaseModel):
    """Geometry-type profile of a dataset (point / line / polygon mix).

    ``dominant`` is the most common geometry kind among the dataset's
    features (``None`` when the dataset is raster or has no geometries).
    """
    dataset_id: str
    kind: str  # "vector" | "raster"
    dominant: Optional[str] = None  # "point" | "line" | "polygon"
    counts: Dict[str, int] = Field(default_factory=dict)
    total: int = 0


class GeoDatasetUpdate(BaseModel):
    """Partial metadata update payload (PATCH /datasets/{id})."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=512)
    description: Optional[str] = Field(default=None, max_length=4000)
    source: Optional[str] = Field(default=None, max_length=512)
    tags: Optional[List[str]] = None
    meta: Optional[Dict[str, Any]] = None
    crs: Optional[str] = Field(default=None, max_length=128)


class GeoDatasetListResponse(BaseModel):
    items: List[GeoDatasetOut]
    total: int


# ── Preview ───────────────────────────────────────────────────────────────────

class PreviewRow(BaseModel):
    """A single tabular/feature preview row (column -> value)."""
    values: Dict[str, Any]


class DatasetPreview(BaseModel):
    """Lightweight, bounded preview of a dataset's contents.

    For vector/tabular data this returns up to ``max_rows`` sample rows and the
    inferred column schema. For stored assets it returns asset metadata only.
    """
    dataset_id: str
    name: str
    format: str
    type: str
    ingested: bool
    row_count: Optional[int] = None
    columns: List[AttributeField] = []
    rows: List[PreviewRow] = []
    # Asset-specific metadata (dimensions, bands, etc.) when available.
    asset_meta: Dict[str, Any] = Field(default_factory=dict)