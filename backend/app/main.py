from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.db import engine
from app.core import storage as object_storage
from app.core.errors import register_error_handlers
from app.core.guardrail import validate_production_settings
from app.core.health import run_health_checks
from app.core.rate_limit import RateLimitMiddleware, SlidingWindowLimiter
from app.module_loader import load_modules

# ── Core API routers ──────────────────────────────────────────────────────────
from app.api.auth.router import router as auth_router
from app.api.data.router import router as data_router
from app.api.viz.router import router as viz_router
from app.api.modules.router import router as modules_router
from app.api.maps.router import router as maps_router
from app.api.projects.router import router as projects_router
from app.api.storage.router import router as storage_router
from app.api.collab.router import router as collab_router
from app.api.notifications.router import router as notifications_router
from app.api.profile.router import router as profile_router
from app.api.geocode.router import router as geocode_router
from app.api.maps.share.router import router as share_util_router
from app.api.maps.share.router import entity_share_router

# ── Ensure all ORM models are registered with Base.metadata ──────────────────
import app.api.auth.models  # noqa: F401 — registers User, Group, Permission
import app.api.data.models  # noqa: F401 — registers GeoDataset, GeoFeature
import app.api.projects.models  # noqa: F401
import app.api.maps.models  # noqa: F401 — registers MapModel, MapGroupAccess, MapUserAccess
import app.api.maps.share.models  # noqa: F401 — registers AccessRequest
import app.api.notifications.models  # noqa: F401 — registers notification tables
import app.api.profile.models  # noqa: F401 — registers organizations, memberships, prefs


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail fast on insecure default secrets in production (ticket T-04).
    validate_production_settings()
    # Ensure default permissions for core components & installed modules
    from app.core.db import AsyncSessionLocal
    from app.api.auth.service import ensure_default_component_permissions
    async with AsyncSessionLocal() as db:
        await ensure_default_component_permissions(db)
        await db.commit()
    # Ensure the object-storage bucket exists in RustFS
    await object_storage.ensure_bucket()
    yield
    await engine.dispose()


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ── Uniform error envelope (ticket T-06) ──────────────────────────────────────
register_error_handlers(app)

# ── Rate limiting for heavy/sensitive endpoints (ticket T-05) ─────────────────
# Added before CORS so CORS stays the outermost middleware (preflight OPTIONS
# are short-circuited before the limiter).
_rate_limiter = SlidingWindowLimiter(
    limit=settings.rate_limit_requests,
    window_seconds=settings.rate_limit_window_seconds,
)
app.add_middleware(
    RateLimitMiddleware,
    limiter=_rate_limiter,
    sensitive_prefixes=(
        "/api/v1/data/datasets/upload",
        "/api/v1/ai/",
        "/api/v1/storage/upload",
    ),
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health (liveness + readiness; ticket T-10) ────────────────────────────────
async def health():
    """Liveness + component status. Always 200 so it is safe as a liveness probe."""
    return await run_health_checks()


async def health_ready():
    """Readiness gate. 200 only when every dependency is healthy, else 503."""
    report = await run_health_checks()
    if report["status"] != "ok":
        raise HTTPException(
            status_code=503,
            detail="One or more dependencies are unavailable.",
        )
    return report


@app.get("/api/v1/health", tags=["platform"])
async def health_liveness():
    return await health()


@app.get("/api/v1/health/ready", tags=["platform"])
async def health_readiness():
    return await health_ready()


# ── Core routers ──────────────────────────────────────────────────────────────
# All core + module routes are served under a single versioned root,
# ``/api/v1``. (The previous bare ``/api`` mount was a 1:1 alias — ticket
# T-06 — and has been retired so ``/api/v1`` is the one and only API prefix.)
_CORE_ROUTERS = [
    (auth_router, "/auth"),
    (data_router, "/data"),
    (viz_router, "/viz"),
    (modules_router, "/modules"),
    (maps_router, "/maps"),
    (projects_router, "/projects"),
    (storage_router, "/storage"),
    (collab_router, "/collab"),
    (notifications_router, "/notifications"),
    (profile_router, "/profile"),
    (geocode_router, "/geocode"),
]

for _router, _sub in _CORE_ROUTERS:
    app.include_router(_router, prefix=f"/api/v1{_sub}")

# ── Share utility routes (people search & invite accept) ─────────────────────
app.include_router(share_util_router, prefix="/api/v1")

# ── Per-entity share routes (maps AND projects) ───────────────────────────────
# NOTE: the prefix placeholder must be named `entity_id` to match the handler
# signature (FastAPI binds path params by name).
app.include_router(entity_share_router, prefix="/api/v1/maps/{entity_id}/share")
app.include_router(entity_share_router, prefix="/api/v1/projects/{entity_id}/share")

# ── Pluggable module routers (from modules.lock.yaml) ─────────────────────────
load_modules(app, prefix="/api/v1")  # → /api/v1/<module-prefix>