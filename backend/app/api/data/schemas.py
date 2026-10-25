from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

# ── Existing layer schemas (used by legacy stub endpoints) ────────────────────


class LayerInfo(BaseModel):
    id: str
    name: str
    description: str | None = None
    type: str  # "vector" | "raster"
    source_url: str | None = None
    available: bool = True


class VectorFeature(BaseModel):
    type: str = "Feature"
    geometry: dict[str, Any]
    properties: dict[str, Any] = {}


class VectorFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    layer_id: str
    features: list[VectorFeature] = []


class RasterLayerMeta(BaseModel):
    layer_id: str
    name: str
    tile_url: str  # e.g. https://tiles.example.com/{z}/{x}/{y}.png
    min_zoom: int = 0
    max_zoom: int = 22
    attribution: str = ""
    bounds: list[float] | None = None  # [west, south, east, north]


# ── Supported format / type vocabularies ──────────────────────────────────────
# `format`   = the file/container format of the uploaded asset.
# `type`     = the semantic category of the data.
#
# "ingested"  formats are parsed server-side into PostGIS (vector) or the
#             tabular feature store (CSV-with-coordinates) and are queryable
#             via the MVT tile endpoint.
# "stored"    formats are registered as downloadable assets (metadata + the
#             raw file in object storage) without server-side geometry parsing.

DATA_FORMATS: list[str] = [
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

DATA_TYPES: list[str] = [
    "vector",
    "raster",
    "tabular",
    "remote-sensing",
    "points",
]

# Formats that are parsed into the feature store (vector).
INGESTED_VECTOR_FORMATS: list[str] = ["GeoJSON", "Shapefile", "KML", "GeoRSS"]

# Formats that are tabular (CSV / TSV / delimited).
TABULAR_FORMATS: list[str] = ["CSV"]

# Formats that are registered as stored assets (not geometry-parsed).
STORED_ASSET_FORMATS: list[str] = [
    "GeoTIFF",
    "COG",
    "GeoPackage",
    "GeoParquet",
]

# Suggested (format, type) pairing used as a default when the client does not
# specify a type. Used only for client-side guidance; the server accepts any.
DEFAULT_TYPE_FOR_FORMAT: dict[str, str] = {
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
    tags: list[str]
    feature_count: int | None = None
    file_size_bytes: int
    storage_key: str | None = None
    folder_id: str | None = None
    attributes: list[AttributeField] = []
    description: str | None = None
    source: str | None = None
    meta: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    # Computed helper: human-readable size
    @property
    def size_label(self) -> str:
        if self.file_size_bytes < 1024:
            return f"{self.file_size_bytes} B"
        if self.file_size_bytes < 1024**2:
            return f"{self.file_size_bytes / 1024:.1f} KB"
        if self.file_size_bytes < 1024**3:
            return f"{self.file_size_bytes / (1024**2):.1f} MB"
        return f"{self.file_size_bytes / (1024**3):.1f} GB"

    model_config = {"from_attributes": True}


class GeometrySummary(BaseModel):
    """Geometry-type profile of a dataset (point / line / polygon mix).

    ``dominant`` is the most common geometry kind among the dataset's
    features (``None`` when the dataset is raster or has no geometries).
    """

    dataset_id: str
    kind: str  # "vector" | "raster"
    dominant: str | None = None  # "point" | "line" | "polygon"
    counts: dict[str, int] = Field(default_factory=dict)
    total: int = 0


class GeoDatasetUpdate(BaseModel):
    """Partial metadata update payload (PATCH /datasets/{id})."""

    name: str | None = Field(default=None, min_length=1, max_length=512)
    description: str | None = Field(default=None, max_length=4000)
    source: str | None = Field(default=None, max_length=512)
    tags: list[str] | None = None
    meta: dict[str, Any] | None = None
    crs: str | None = Field(default=None, max_length=128)


class FeaturesIn(BaseModel):
    """Payload for replacing a dataset's features (in-app map editor)."""

    features: list[dict[str, Any]] = Field(
        default_factory=list,
        description="GeoJSON features (id / geometry / properties) to store.",
    )


class GeoDatasetListResponse(BaseModel):
    items: list[GeoDatasetOut]
    total: int


# ── Data folders (catalog tree) ──────────────────────────────────────────────


class DataFolderIn(BaseModel):
    """Payload for creating a folder (POST /folders)."""

    name: str = Field(min_length=1, max_length=256)
    parent_id: str | None = None


class DataFolderRename(BaseModel):
    """Payload for renaming a folder (PATCH /folders/{id})."""

    name: str = Field(min_length=1, max_length=256)


class DataFolderMove(BaseModel):
    """Payload for re-parenting a folder (POST /folders/{id}/move).

    ``parent_id`` of ``None`` moves the folder to the root level.
    """

    parent_id: str | None = None


class DataFolderOut(BaseModel):
    """API response shape for a catalog folder."""

    id: str
    name: str
    parent_id: str | None = None
    dataset_count: int = 0
    child_folder_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DatasetMoveIn(BaseModel):
    """Payload for moving a dataset into a folder (POST /datasets/{id}/move).

    ``folder_id`` of ``None`` moves the dataset back to the root level.
    """

    folder_id: str | None = None


# ── Preview ───────────────────────────────────────────────────────────────────


class PreviewRow(BaseModel):
    """A single tabular/feature preview row (column -> value)."""

    values: dict[str, Any]


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
    row_count: int | None = None
    columns: list[AttributeField] = []
    rows: list[PreviewRow] = []
    # Asset-specific metadata (dimensions, bands, etc.) when available.
    asset_meta: dict[str, Any] = Field(default_factory=dict)
