from __future__ import annotations

from datetime import datetime
from typing import Any, List, Literal, Optional
from pydantic import BaseModel, Field


PermissionLevel = Literal["read", "write", "admin"]


class MapLayerItem(BaseModel):
    id: str
    name: str
    type: Literal["vector", "raster"]
    visible: bool = False
    url: Optional[str] = None
    style: Optional[dict[str, Any]] = None


class GroupAccessSchema(BaseModel):
    group_id: str
    group_name: Optional[str] = None
    permission: PermissionLevel = "read"


class MapCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, examples=["Global Environmental Dashboard"])
    description: Optional[str] = Field(None, examples=["Interactive multi-layer map for environmental monitoring"])
    center_lng: float = Field(default=0.0, ge=-180.0, le=180.0)
    center_lat: float = Field(default=20.0, ge=-90.0, le=90.0)
    zoom: float = Field(default=2.5, ge=0.0, le=24.0)
    bearing: float = Field(default=0.0, ge=-180.0, le=180.0)
    pitch: float = Field(default=0.0, ge=0.0, le=85.0)
    basemap: str = Field(default="opentopomap", examples=["osm", "esri-satellite", "opentopomap"])
    layers_config: List[MapLayerItem] = Field(default_factory=list)
    is_public: bool = False
    project_id: Optional[str] = None
    widgets_config: dict[str, Any] = Field(default_factory=dict)
    group_access: List[GroupAccessSchema] = Field(default_factory=list)


class MapUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    center_lng: Optional[float] = Field(None, ge=-180.0, le=180.0)
    center_lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    zoom: Optional[float] = Field(None, ge=0.0, le=24.0)
    bearing: Optional[float] = Field(None, ge=-180.0, le=180.0)
    pitch: Optional[float] = Field(None, ge=0.0, le=85.0)
    basemap: Optional[str] = None
    layers_config: Optional[List[MapLayerItem]] = None
    is_public: Optional[bool] = None
    widgets_config: Optional[dict[str, Any]] = None


class MapShareUpdate(BaseModel):
    is_public: Optional[bool] = None
    group_access: List[GroupAccessSchema] = Field(default_factory=list)


class MapOwnerRead(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None

    model_config = {"from_attributes": True}


class MapRead(BaseModel):
    id: str
    title: str
    description: Optional[str]
    center_lng: float
    center_lat: float
    zoom: float
    bearing: float = 0.0
    pitch: float = 0.0
    basemap: str
    layers_config: List[MapLayerItem]
    is_public: bool
    project_id: Optional[str] = None
    widgets_config: dict[str, Any] = {}
    owner_id: str
    owner: Optional[MapOwnerRead] = None
    group_access: List[GroupAccessSchema] = []
    user_permission: PermissionLevel = "read"   # computed for current user
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
