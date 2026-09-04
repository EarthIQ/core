"""
Tests for the Phase 0 foundation work (CI and GeoAI excluded per scope).

Covers:
  * T-03 presigned-URL host rewrite            (app.core.storage)
  * T-04 production secret guardrail           (app.core.guardrail)
  * T-05 rate limiting                         (app.core.rate_limit)
  * T-06 /api/v1 alias + uniform error envelope (app.core.errors, app.main)
  * T-07 basemaps data-driven                  (app.api.viz.router)
  * T-10 component health (db/redis/storage)   (app.core.health)

Hermetic: in-memory SQLite where needed, an in-process fake Redis server for
the socket probe, and monkeypatched settings. No external services required.
"""
from __future__ import annotations

import asyncio
import json

import pytest
from fastapi import APIRouter, FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient

from app.core import storage as object_storage
from app.core.config import Settings
from app.core.errors import register_error_handlers
from app.core.guardrail import (
    find_default_secrets,
    is_production,
    validate_production_settings,
)
from app.core.rate_limit import RateLimitMiddleware, SlidingWindowLimiter
import app.core.health as health_mod
import app.api.viz.router as viz_router


# ────────────────────────────────────────────────────────────────────────────
# T-04 — production secret guardrail
# ────────────────────────────────────────────────────────────────────────────

def _settings(**overrides) -> Settings:
    base = dict(
        app_env="prod",
        jwt_secret="super-secret-value",
        storage_access_key="prodkey",
        storage_secret_key="prodsecret",
        database_url="postgresql+asyncpg://prod:supersecret@db:5432/prod",
    )
    base.update(overrides)
    return Settings(**base)


def test_guardrail_passes_with_real_secrets():
    validate_production_settings(_settings())  # must not raise


def test_guardrail_blocks_default_secrets_in_prod():
    bad = _settings(
        jwt_secret="change-me-in-production",
        storage_access_key="earthiq",
        storage_secret_key="earthiq",
        database_url="postgresql+asyncpg://earthiq:earthiq@db:5432/prod",
    )
    with pytest.raises(RuntimeError) as exc:
        validate_production_settings(bad)
    msg = str(exc.value)
    assert "JWT_SECRET" in msg
    assert "STORAGE_ACCESS_KEY" in msg
    assert "DATABASE_URL" in msg


def test_guardrail_noop_in_dev():
    dev = _settings(
        app_env="dev",
        jwt_secret="change-me-in-production",
        storage_secret_key="earthiq",
        database_url="postgresql+asyncpg://earthiq:earthiq@db:5432/prod",
    )
    validate_production_settings(dev)  # dev mode must not raise


def test_find_default_secrets_lists_only_offenders():
    bad = _settings(jwt_secret="change-me-in-production")
    probs = find_default_secrets(bad)
    assert any("JWT_SECRET" in p for p in probs)
    assert not any("STORAGE_ACCESS_KEY" in p for p in probs)


def test_is_production_variants():
    assert is_production(_settings(app_env="prod"))
    assert is_production(_settings(app_env="PRODUCTION"))
    assert not is_production(_settings(app_env="dev"))


# ────────────────────────────────────────────────────────────────────────────
# T-05 — rate limiting
# ────────────────────────────────────────────────────────────────────────────

def test_sliding_window_limiter_basic():
    lim = SlidingWindowLimiter(limit=3, window_seconds=60)
    assert all(lim.allow("k") for _ in range(3))
    assert not lim.allow("k")
    assert lim.allow("other")  # different key unaffected


def test_sliding_window_limiter_reset():
    lim = SlidingWindowLimiter(limit=1, window_seconds=60)
    assert lim.allow("k")
    assert not lim.allow("k")
    lim.reset("k")
    assert lim.allow("k")


@pytest.fixture
async def rate_client():
    app = FastAPI()

    @app.post("/api/data/datasets/upload")
    async def upload():
        return {"ok": True}

    @app.get("/api/other")
    async def other():
        return {"ok": True}

    app.add_middleware(
        RateLimitMiddleware,
        limiter=SlidingWindowLimiter(limit=3, window_seconds=60),
        sensitive_prefixes=("/api/data/datasets/upload",),
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as ac:
        yield ac


async def test_rate_limit_enforces_429(rate_client):
    for _ in range(3):
        r = await rate_client.post("/api/data/datasets/upload")
        assert r.status_code == 200
    r = await rate_client.post("/api/data/datasets/upload")
    assert r.status_code == 429
    assert "Retry-After" in r.headers
    assert r.json()["error"]["code"] == "rate_limited"


async def test_rate_limit_does_not_affect_other_paths(rate_client):
    for _ in range(10):
        r = await rate_client.get("/api/other")
        assert r.status_code == 200


# ────────────────────────────────────────────────────────────────────────────
# T-06 — uniform error envelope
# ────────────────────────────────────────────────────────────────────────────

def _error_app() -> FastAPI:
    app = FastAPI()
    register_error_handlers(app)

    @app.get("/missing")
    async def missing():
        raise HTTPException(status_code=404, detail="not here")

    @app.post("/validate")
    async def validate(name: str):
        return name

    @app.get("/boom")
    async def boom():
        raise RuntimeError("kaboom")

    return app


async def test_error_envelope_not_found():
    app = _error_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as ac:
        r = await ac.get("/missing")
    assert r.status_code == 404
    body = r.json()
    assert body["error"]["code"] == "not_found"
    assert body["error"]["message"] == "not here"
    assert body["detail"] == "not here"


async def test_error_envelope_validation():
    app = _error_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as ac:
        r = await ac.post("/validate")  # missing required 'name'
    assert r.status_code == 422
    body = r.json()
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["details"]
    assert body["detail"]


async def test_error_envelope_internal():
    app = _error_app()
    # ASGITransport re-raises unhandled app exceptions by default; turn that
    # off so we receive the server's 500 envelope (matching real uvicorn).
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://t") as ac:
        r = await ac.get("/boom")
    assert r.status_code == 500
    body = r.json()
    assert body["error"]["code"] == "internal_error"
    assert "kaboom" not in json.dumps(body)  # do not leak internals


# ────────────────────────────────────────────────────────────────────────────
# T-03 — presigned-URL host rewrite
# ────────────────────────────────────────────────────────────────────────────

def test_apply_public_base_rewrites_host(monkeypatch):
    monkeypatch.setattr(
        object_storage, "get_settings",
        lambda: Settings(storage_public_base_url="https://storage.example.com"),
    )
    url = "http://rustfs:9000/earthiq/a/b.geojson?X-Amz-Signature=abc"
    out = object_storage._apply_public_base(url)
    assert out.startswith("https://storage.example.com/earthiq/a/b.geojson")
    assert "X-Amz-Signature=abc" in out


def test_apply_public_base_with_basepath(monkeypatch):
    monkeypatch.setattr(
        object_storage, "get_settings",
        lambda: Settings(storage_public_base_url="https://cdn.example.com/geodata"),
    )
    out = object_storage._apply_public_base("http://rustfs:9000/bucket/key.tif?sig=1")
    assert out.startswith("https://cdn.example.com/geodata/bucket/key.tif")


def test_apply_public_base_noop_when_unset(monkeypatch):
    monkeypatch.setattr(
        object_storage, "get_settings",
        lambda: Settings(storage_public_base_url=""),
    )
    url = "http://rustfs:9000/bucket/key.tif?sig=1"
    assert object_storage._apply_public_base(url) == url


# ────────────────────────────────────────────────────────────────────────────
# T-07 — basemaps data-driven
# ────────────────────────────────────────────────────────────────────────────

def test_basemaps_override(monkeypatch):
    cfg = json.dumps(
        [{"id": "custom", "name": "Custom", "style_url": "https://x/{z}/{x}/{y}.png", "dark": True}]
    )
    monkeypatch.setattr(viz_router, "get_settings", lambda: Settings(basemaps_config=cfg))
    bm = viz_router.get_basemaps()
    assert [b.id for b in bm] == ["custom"]
    assert bm[0].dark is True


def test_basemaps_maptiler_appended(monkeypatch):
    monkeypatch.setattr(viz_router, "get_settings", lambda: Settings(maptiler_key="K"))
    bm = viz_router.get_basemaps()
    ids = [b.id for b in bm]
    assert "maptiler-streets" in ids
    assert any("K" in b.style_url for b in bm if b.id == "maptiler-streets")


def test_basemaps_invalid_json_falls_back(monkeypatch):
    monkeypatch.setattr(viz_router, "get_settings", lambda: Settings(basemaps_config="{not json"))
    bm = viz_router.get_basemaps()
    assert [b.id for b in bm] == ["osm", "esri-satellite", "opentopomap"]


# ────────────────────────────────────────────────────────────────────────────
# T-10 — component health (db / redis / storage)
# ────────────────────────────────────────────────────────────────────────────

def test_parse_redis_url():
    assert health_mod._parse_redis_url("redis://10.0.0.5:6380/2") == ("10.0.0.5", 6380)
    assert health_mod._parse_redis_url("redis://localhost/0") == ("localhost", 6379)


async def test_check_redis_against_fake_server(monkeypatch):
    async def handle(reader, writer):
        await reader.read(32)
        writer.write(b"+PONG\r\n")
        await writer.drain()
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass

    server = await asyncio.start_server(handle, "127.0.0.1", 0)
    port = server.sockets[0].getsockname()[1]
    try:
        monkeypatch.setattr(
            health_mod, "get_settings",
            lambda: Settings(redis_url=f"redis://127.0.0.1:{port}/0"),
        )
        res = await health_mod.check_redis()
        assert res["status"] == "ok"
    finally:
        server.close()
        await server.wait_closed()


async def test_check_redis_down(monkeypatch):
    # Port 1 is virtually never listening → connection refused → error.
    monkeypatch.setattr(
        health_mod, "get_settings",
        lambda: Settings(redis_url="redis://127.0.0.1:1/0"),
    )
    res = await health_mod.check_redis()
    assert res["status"] == "error"
    assert res["error"]


async def test_run_health_checks_ok(monkeypatch):
    async def ok():
        return {"status": "ok"}
    monkeypatch.setattr(health_mod, "check_database", ok)
    monkeypatch.setattr(health_mod, "check_storage", ok)
    monkeypatch.setattr(health_mod, "check_redis", ok)
    report = await health_mod.run_health_checks()
    assert report["status"] == "ok"
    assert set(report["components"]) == {"database", "storage", "redis"}


async def test_run_health_checks_degraded(monkeypatch):
    async def ok():
        return {"status": "ok"}
    async def bad():
        return {"status": "error", "error": "down"}
    monkeypatch.setattr(health_mod, "check_database", ok)
    monkeypatch.setattr(health_mod, "check_storage", ok)
    monkeypatch.setattr(health_mod, "check_redis", bad)
    report = await health_mod.run_health_checks()
    assert report["status"] == "degraded"
    assert report["components"]["redis"]["status"] == "error"


@pytest.fixture
async def health_client(monkeypatch):
    app = FastAPI()
    register_error_handlers(app)

    async def health():
        return await health_mod.run_health_checks()

    async def ready():
        report = await health_mod.run_health_checks()
        if report["status"] != "ok":
            raise HTTPException(status_code=503, detail="not ready")
        return report

    app.add_api_route("/api/health", health, methods=["GET"])
    app.add_api_route("/api/health/ready", ready, methods=["GET"])
    app.add_api_route("/api/v1/health", health, methods=["GET"])
    app.add_api_route("/api/v1/health/ready", ready, methods=["GET"])

    async def ok():
        return {"status": "ok"}
    monkeypatch.setattr(health_mod, "check_database", ok)
    monkeypatch.setattr(health_mod, "check_storage", ok)
    monkeypatch.setattr(health_mod, "check_redis", ok)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as ac:
        yield ac


async def test_health_and_ready_ok(health_client):
    assert (await health_client.get("/api/health")).json()["status"] == "ok"
    assert (await health_client.get("/api/health/ready")).status_code == 200
    # v1 alias mirrors liveness
    r = await health_client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


async def test_ready_503_when_degraded(health_client, monkeypatch):
    async def bad():
        return {"status": "error", "error": "down"}
    monkeypatch.setattr(health_mod, "check_redis", bad)
    # Liveness stays 200 but reports degraded…
    r = await health_client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "degraded"
    # …while the readiness gate returns 503 with the uniform envelope.
    r = await health_client.get("/api/health/ready")
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "service_unavailable"


# ────────────────────────────────────────────────────────────────────────────
# T-06 — /api/v1 alias (mirror mechanism + real app routes)
# ────────────────────────────────────────────────────────────────────────────

async def test_v1_alias_mirrors_routes():
    core = APIRouter()

    @core.get("/ping")
    async def ping():
        return {"pong": True}

    app = FastAPI()
    app.include_router(core, prefix="/api/core")
    v1 = APIRouter(prefix="/api/v1")
    v1.include_router(core, prefix="/core")
    app.include_router(v1)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as ac:
        r1 = await ac.get("/api/core/ping")
        r2 = await ac.get("/api/v1/core/ping")
    assert r1.json() == r2.json() == {"pong": True}


def test_main_app_exposes_v1_alias():
    """Import the real app and assert both /api and /api/v1 routes exist.

    Uses the OpenAPI schema (``app.openapi()["paths"]``) as the source of
    truth — this reliably reflects every mounted route regardless of how
    FastAPI wraps included sub-routers internally.
    """
    import app.main as m

    paths = set(m.app.openapi().get("paths", {}).keys())
    for p in (
        "/api/health",
        "/api/auth/register",
        "/api/data/datasets/upload",
        "/api/v1/health",
        "/api/v1/auth/register",
        "/api/v1/data/datasets/upload",
    ):
        assert p in paths, f"missing OpenAPI path {p}"



