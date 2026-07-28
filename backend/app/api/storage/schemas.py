"""
app/api/storage/schemas.py
~~~~~~~~~~~~~~~~~~~~~~~~~~
Pydantic models for the storage API.
"""
from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    """Returned after a successful file upload."""

    key: str = Field(..., description="Object key inside the storage bucket")
    url: str = Field(..., description="Internal S3 URL of the uploaded object")
    presigned_url: str = Field(
        ..., description="Time-limited URL for direct browser download"
    )
    size: int = Field(..., description="Size of the uploaded file in bytes")
    content_type: str


class ObjectInfo(BaseModel):
    """Metadata for a single stored object."""

    key: str
    size: int = Field(..., description="Size in bytes")
    last_modified: str = Field(..., description="ISO-8601 timestamp")
    presigned_url: str | None = Field(
        None, description="Optional presigned download URL"
    )


class ListResponse(BaseModel):
    """Response for the object listing endpoint."""

    bucket: str
    prefix: str
    objects: List[ObjectInfo]
    count: int


class DeleteResponse(BaseModel):
    key: str
    deleted: bool = True
