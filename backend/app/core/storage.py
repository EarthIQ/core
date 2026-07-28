"""
app/core/storage.py
~~~~~~~~~~~~~~~~~~~
Async object-storage service backed by RustFS (S3-compatible).
All public helpers are coroutines so they integrate cleanly with FastAPI's
async request cycle.
"""
from __future__ import annotations

import io
from contextlib import asynccontextmanager
from typing import AsyncGenerator, BinaryIO, List

import aioboto3
from botocore.exceptions import ClientError

from app.core.config import get_settings

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _session():
    """Return a fresh aioboto3 Session (cheap, not a connection)."""
    return aioboto3.Session()


@asynccontextmanager
async def _client() -> AsyncGenerator:
    """Yield an async S3 client configured to talk to RustFS."""
    settings = get_settings()
    session = _session()
    async with session.client(
        "s3",
        endpoint_url=settings.storage_endpoint,
        aws_access_key_id=settings.storage_access_key,
        aws_secret_access_key=settings.storage_secret_key,
        region_name=settings.storage_region,
    ) as client:
        yield client


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def ensure_bucket() -> None:
    """
    Idempotently create the configured bucket.
    Called once during FastAPI lifespan startup.
    """
    settings = get_settings()
    bucket = settings.storage_bucket
    async with _client() as s3:
        try:
            await s3.head_bucket(Bucket=bucket)
        except ClientError as exc:
            code = exc.response["Error"]["Code"]
            if code in ("404", "NoSuchBucket"):
                await s3.create_bucket(Bucket=bucket)
            else:
                raise


async def upload_file(
    key: str,
    data: bytes | BinaryIO,
    content_type: str = "application/octet-stream",
) -> str:
    """
    Upload *data* to *key* inside the configured bucket.

    Returns the internal S3 URL (endpoint + bucket + key).
    Use :func:`presign_url` to generate a time-limited public URL.
    """
    settings = get_settings()
    body = data if isinstance(data, bytes) else data.read()
    async with _client() as s3:
        await s3.put_object(
            Bucket=settings.storage_bucket,
            Key=key,
            Body=body,
            ContentType=content_type,
        )
    return f"{settings.storage_endpoint}/{settings.storage_bucket}/{key}"


async def download_file(key: str) -> bytes:
    """Download an object and return its raw bytes."""
    settings = get_settings()
    async with _client() as s3:
        response = await s3.get_object(
            Bucket=settings.storage_bucket,
            Key=key,
        )
        return await response["Body"].read()


async def delete_file(key: str) -> None:
    """Delete an object.  No-ops silently if the key does not exist."""
    settings = get_settings()
    async with _client() as s3:
        await s3.delete_object(
            Bucket=settings.storage_bucket,
            Key=key,
        )


async def presign_url(key: str, expires_in: int = 3600) -> str:
    """
    Generate a presigned GET URL valid for *expires_in* seconds (default 1 h).
    Clients can fetch the object directly from RustFS without going through
    FastAPI.
    """
    settings = get_settings()
    async with _client() as s3:
        url = await s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.storage_bucket, "Key": key},
            ExpiresIn=expires_in,
        )
    return url


async def list_objects(prefix: str = "") -> List[dict]:
    """
    List objects in the configured bucket, optionally filtered by *prefix*.

    Returns a list of dicts with keys: ``key``, ``size``, ``last_modified``.
    """
    settings = get_settings()
    async with _client() as s3:
        kwargs: dict = {"Bucket": settings.storage_bucket}
        if prefix:
            kwargs["Prefix"] = prefix

        objects: list[dict] = []
        paginator = s3.get_paginator("list_objects_v2")
        async for page in paginator.paginate(**kwargs):
            for obj in page.get("Contents", []):
                objects.append(
                    {
                        "key": obj["Key"],
                        "size": obj["Size"],
                        "last_modified": obj["LastModified"].isoformat(),
                    }
                )
        return objects
