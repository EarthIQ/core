from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.api.maps.schemas import GroupAccessSchema, MapLayerItem, MapRead, PermissionLevel


class ProjectCreate(BaseModel):
    title: str = Field(
        ..., min_length=1, max_length=255, examples=["Global Environmental Dashboard"]
    )
    description: str | None = Field(
        None, examples=["Interactive multi-layer map for environmental monitoring"]
    )
    center_lng: float = Field(default=0.0, ge=-180.0, le=180.0)
    center_lat: float = Field(default=20.0, ge=-90.0, le=90.0)
    zoom: float = Field(default=2.5, ge=0.0, le=24.0)
    basemap: str = Field(default="opentopomap")
    layers_config: list[MapLayerItem] = Field(default_factory=list)
    annotations: list[Any] = Field(default_factory=list)
    bookmarks: list[Any] = Field(default_factory=list)
    comments: list[Any] = Field(default_factory=list)
    group_access: list[GroupAccessSchema] = Field(default_factory=list)


class ProjectUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    center_lng: float | None = Field(None, ge=-180.0, le=180.0)
    center_lat: float | None = Field(None, ge=-90.0, le=90.0)
    zoom: float | None = Field(None, ge=0.0, le=24.0)
    basemap: str | None = None
    layers_config: list[MapLayerItem] | None = None
    annotations: list[Any] | None = None
    bookmarks: list[Any] | None = None
    comments: list[Any] | None = None


class ProjectOwnerRead(BaseModel):
    id: str
    email: str
    full_name: str | None = None

    model_config = {"from_attributes": True}


class ProjectRead(BaseModel):
    id: str
    title: str
    description: str | None
    center_lng: float
    center_lat: float
    zoom: float
    basemap: str
    layers_config: list[MapLayerItem]
    annotations: list[Any] = []
    bookmarks: list[Any] = []
    comments: list[Any] = []
    owner_id: str
    owner: ProjectOwnerRead | None = None
    group_access: list[GroupAccessSchema] = []
    user_permission: PermissionLevel = "read"  # computed for current user
    created_at: datetime
    updated_at: datetime
    maps: list[MapRead] = []

    model_config = {"from_attributes": True}
