from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field

from app.api.maps.schemas import MapLayerItem, PermissionLevel, GroupAccessSchema, MapRead

class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, examples=["Global Environmental Dashboard"])
    description: Optional[str] = Field(None, examples=["Interactive multi-layer map for environmental monitoring"])
    center_lng: float = Field(default=0.0, ge=-180.0, le=180.0)
    center_lat: float = Field(default=20.0, ge=-90.0, le=90.0)
    zoom: float = Field(default=2.5, ge=0.0, le=24.0)
    basemap: str = Field(default="dataviz-dark")
    layers_config: List[MapLayerItem] = Field(default_factory=list)
    annotations: List[Any] = Field(default_factory=list)
    bookmarks: List[Any] = Field(default_factory=list)
    comments: List[Any] = Field(default_factory=list)
    group_access: List[GroupAccessSchema] = Field(default_factory=list)

class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    center_lng: Optional[float] = Field(None, ge=-180.0, le=180.0)
    center_lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    zoom: Optional[float] = Field(None, ge=0.0, le=24.0)
    basemap: Optional[str] = None
    layers_config: Optional[List[MapLayerItem]] = None
    annotations: Optional[List[Any]] = None
    bookmarks: Optional[List[Any]] = None
    comments: Optional[List[Any]] = None

class ProjectOwnerRead(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None

    model_config = {"from_attributes": True}

class ProjectRead(BaseModel):
    id: str
    title: str
    description: Optional[str]
    center_lng: float
    center_lat: float
    zoom: float
    basemap: str
    layers_config: List[MapLayerItem]
    annotations: List[Any] = []
    bookmarks: List[Any] = []
    comments: List[Any] = []
    owner_id: str
    owner: Optional[ProjectOwnerRead] = None
    group_access: List[GroupAccessSchema] = []
    user_permission: PermissionLevel = "read"   # computed for current user
    created_at: datetime
    updated_at: datetime
    maps: List[MapRead] = []

    model_config = {"from_attributes": True}
