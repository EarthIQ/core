"""
app/core/health.py
~~~~~~~~~~~~~~~~~~
Component-level health checks (database, object storage, Redis) so the
platform can report *which* dependency is down rather than a bare ok/fail.

Redis is probed with a raw RESP ``PING`` over a TCP socket so we do not add a
``redis`` client dependency just for liveness; the data plane still uses Redis
for its real work (pub/sub, job queue) elsewhere.

Exposes two endpoints (wired in ``app.main``):
* ``GET /api/v1/health``       — liveness: always 200, reports component status.
* ``GET /api/v1/health/ready`` — readiness: 200 only when every dep is healthy.

Ticket: T-10 (health expands to db/storage/redis).
"""
from __future__ import annotations

import asyncio
from typing import Any
from urllib.parse import urlsplit

from sqlalchemy import text

from app.core.config import get_settings
from app.core import storage as object_storage


def _short(exc: Exception) -> str:
    return f"{type(exc).__name__}: {exc}"[:200]


def _parse_redis_url(url: str) -> tuple[str, int]:
    parts = urlsplit(url or "")
    return (parts.hostname or "localhost"), (parts.port or 6379)


async def _db_ping() -> None:
    from app.core.db import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        await session.execute(text("SELECT 1"))


async def check_database() -> dict[str, Any]:
    try:
        await asyncio.wait_for(_db_ping(), timeout=3)
        return {"status": "ok"}
    except Exception as exc:
        return {"status": "error", "error": _short(exc)}


async def check_storage() -> dict[str, Any]:
    try:
        ok = await object_storage.head_bucket()
        return {
            "status": "ok" if ok else "error",
            "error": None if ok else "bucket unreachable",
        }
    except Exception as exc:
        return {"status": "error", "error": _short(exc)}


async def _redis_ping(host: str, port: int) -> str:
    reader, writer = await asyncio.open_connection(host, port)
    try:
        writer.write(b"PING\r\n")
        await writer.drain()
        data = await reader.read(512)
        return data.decode("utf-8", errors="replace").strip()
    finally:
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:  # pragma: no cover - defensive
            pass


async def check_redis() -> dict[str, Any]:
    host, port = _parse_redis_url(get_settings().redis_url)
    try:
        reply = await asyncio.wait_for(_redis_ping(host, port), timeout=3)
        ok = reply == "+PONG"
        return {
            "status": "ok" if ok else "error",
            "error": None if ok else f"unexpected reply: {reply!r}",
        }
    except Exception as exc:
        return {"status": "error", "error": _short(exc)}


async def run_health_checks() -> dict[str, Any]:
    """Run all dependency checks and return an aggregate report."""
    settings = get_settings()
    db = await check_database()
    storage = await check_storage()
    redis = await check_redis()
    healthy = all(c["status"] == "ok" for c in (db, storage, redis))
    return {
        "status": "ok" if healthy else "degraded",
        "version": settings.app_version,
        "app_env": settings.app_env,
        "components": {"database": db, "storage": storage, "redis": redis},
    }
