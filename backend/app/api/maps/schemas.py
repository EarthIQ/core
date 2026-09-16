from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

PermissionLevel = Literal["read", "write", "admin"]

# The kinds of published content a ``maps`` row can hold.
MapKind = Literal["map", "story_map", "presentation"]


class MapLayerItem(BaseModel):
    """One entry of ``layers_config``.

    An entry is either a renderable *layer* (``type`` of ``vector`` /
    ``raster``, usually with a ``url``) or a *folder* node of the layer
    panel tree (``kind == "folder"`` with ``parentId`` / ``order`` and no
    ``type``). Frontend-only metadata (``datasetId``, ``geometryType``,
    ``source``, ...) is declared / allowed so it survives save-and-load
    round-trips untouched.
    """

    model_config = ConfigDict(extra="allow")

    id: str
    name: str
    type: Literal["vector", "raster"] | None = None
    visible: bool = False
    url: str | None = None
    style: dict[str, Any] | None = None
    # Folder-tree / dataset metadata (round-tripped verbatim)
    kind: str | None = None
    parentId: str | None = None
    order: int | None = None
    collapsed: bool | None = None
    datasetId: str | None = None
    geometryType: str | None = None
    source: str | None = None


class GroupAccessSchema(BaseModel):
    group_id: str
    group_name: str | None = None
    permission: PermissionLevel = "read"


class MapCreate(BaseModel):
    title: str = Field(
        ..., min_length=1, max_length=255, examples=["Global Environmental Dashboard"]
    )
    description: str | None = Field(
        None, examples=["Interactive multi-layer map for environmental monitoring"]
    )
    center_lng: float = Field(default=0.0, ge=-180.0, le=180.0)
    center_lat: float = Field(default=20.0, ge=-90.0, le=90.0)
    zoom: float = Field(default=2.5, ge=0.0, le=24.0)
    bearing: float = Field(default=0.0, ge=-180.0, le=180.0)
    pitch: float = Field(default=0.0, ge=0.0, le=85.0)
    basemap: str = Field(default="opentopomap", examples=["osm", "esri-satellite", "opentopomap"])
    layers_config: list[MapLayerItem] = Field(default_factory=list)
    is_public: bool = False
    project_id: str | None = None
    widgets_config: dict[str, Any] = Field(default_factory=dict)
    group_access: list[GroupAccessSchema] = Field(default_factory=list)
    # Published-content kind + rich payload (story map / presentation)
    kind: MapKind = "map"
    content: dict[str, Any] | None = None


class MapUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    center_lng: float | None = Field(None, ge=-180.0, le=180.0)
    center_lat: float | None = Field(None, ge=-90.0, le=90.0)
    zoom: float | None = Field(None, ge=0.0, le=24.0)
    bearing: float | None = Field(None, ge=-180.0, le=180.0)
    pitch: float | None = Field(None, ge=0.0, le=85.0)
    basemap: str | None = None
    layers_config: list[MapLayerItem] | None = None
    is_public: bool | None = None
    widgets_config: dict[str, Any] | None = None
    # ``kind`` is immutable after creation - only the payload updates
    content: dict[str, Any] | None = None


class MapShareUpdate(BaseModel):
    is_public: bool | None = None
    group_access: list[GroupAccessSchema] = Field(default_factory=list)


class MapOwnerRead(BaseModel):
    id: str
    email: str
    full_name: str | None = None

    model_config = {"from_attributes": True}


class MapRead(BaseModel):
    id: str
    title: str
    description: str | None
    center_lng: float
    center_lat: float
    zoom: float
    bearing: float = 0.0
    pitch: float = 0.0
    basemap: str
    layers_config: list[MapLayerItem]
    is_public: bool
    project_id: str | None = None
    widgets_config: dict[str, Any] = {}
    # Published-content kind + rich payload (story map / presentation)
    kind: MapKind = "map"
    content: dict[str, Any] | None = None
    owner_id: str
    owner: MapOwnerRead | None = None
    group_access: list[GroupAccessSchema] = []
    user_permission: PermissionLevel = "read"  # computed for current user
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
