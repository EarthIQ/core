"""
app/api/storage/router.py
~~~~~~~~~~~~~~~~~~~~~~~~~
Object-storage REST endpoints backed by RustFS via the core storage service.

Endpoints
---------
POST   /api/v1/storage/upload            Multipart upload → UploadResponse
GET    /api/v1/storage/download/{key}    Presigned-URL redirect
DELETE /api/v1/storage/{key}             Delete object
GET    /api/v1/storage/list              List objects (optional ?prefix=)
"""
from __future__ import annotations

import mimetypes
import uuid
from typing import Optional

from botocore.exceptions import ClientError
from fastapi import APIRouter, HTTPException, Query, UploadFile, status
from fastapi.responses import RedirectResponse

from app.core.config import get_settings
from app.core import storage
from app.api.storage.schemas import (
    DeleteResponse,
    ListResponse,
    ObjectInfo,
    UploadResponse,
)

router = APIRouter(tags=["storage"])


# ── Upload ────────────────────────────────────────────────────────────────────

@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file to object storage",
)
async def upload_file(file: UploadFile):
    """
    Accept a multipart file upload, store it under a UUID-namespaced key, and
    return a presigned download URL.

    The object key is: ``<uuid4>/<original_filename>``
    """
    # Build a unique, collision-free key
    original_name = file.filename or "upload"
    key = f"{uuid.uuid4()}/{original_name}"

    # Determine content type (fall back to file header, then octet-stream)
    content_type = (
        file.content_type
        or mimetypes.guess_type(original_name)[0]
        or "application/octet-stream"
    )

    data = await file.read()

    try:
        url = await storage.upload_file(key, data, content_type)
        presigned = await storage.presign_url(key)
    except ClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Storage error: {exc.response['Error']['Message']}",
        ) from exc

    return UploadResponse(
        key=key,
        url=url,
        presigned_url=presigned,
        size=len(data),
        content_type=content_type,
    )


# ── Download (presigned redirect) ─────────────────────────────────────────────

@router.get(
    "/download/{key:path}",
    summary="Get a presigned download URL and redirect to it",
    response_class=RedirectResponse,
)
async def download_file(
    key: str,
    expires_in: int = Query(default=3600, ge=60, le=86400, description="URL TTL in seconds"),
):
    """
    Generate a presigned GET URL for *key* and return a 307 redirect so the
    client fetches the object directly from RustFS.
    """
    try:
        url = await storage.presign_url(key, expires_in=expires_in)
    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        if code in ("NoSuchKey", "404"):
            raise HTTPException(status_code=404, detail=f"Object '{key}' not found")
        raise HTTPException(status_code=502, detail=str(exc))

    return RedirectResponse(url=url, status_code=307)


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete(
    "/{key:path}",
    response_model=DeleteResponse,
    summary="Delete an object from storage",
)
async def delete_file(key: str):
    """Delete the object identified by *key*.  Idempotent — returns 200 even if the key did not exist."""
    try:
        await storage.delete_file(key)
    except ClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return DeleteResponse(key=key, deleted=True)


# ── List ──────────────────────────────────────────────────────────────────────

@router.get(
    "/list",
    response_model=ListResponse,
    summary="List objects in the storage bucket",
)
async def list_objects(
    prefix: Optional[str] = Query(default="", description="Filter by key prefix"),
    presign: bool = Query(default=False, description="Include presigned URLs in response"),
):
    """
    List all objects in the configured bucket, optionally filtered by a key
    prefix.  Set ``presign=true`` to include one-hour download URLs for every
    object (slower for large buckets).
    """
    settings = get_settings()
    try:
        raw = await storage.list_objects(prefix or "")
    except ClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    objects: list[ObjectInfo] = []
    for obj in raw:
        presigned_url = None
        if presign:
            try:
                presigned_url = await storage.presign_url(obj["key"])
            except ClientError:
                pass  # Best-effort; don't fail the whole listing
        objects.append(
            ObjectInfo(
                key=obj["key"],
                size=obj["size"],
                last_modified=obj["last_modified"],
                presigned_url=presigned_url,
            )
        )

    return ListResponse(
        bucket=settings.storage_bucket,
        prefix=prefix or "",
        objects=objects,
        count=len(objects),
    )
