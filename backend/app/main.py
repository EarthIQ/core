from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import get_settings
from app.core.db import Base, engine
from app.core import storage as object_storage
from app.module_loader import load_modules

# ── Core API routers ──────────────────────────────────────────────────────────
from app.api.auth.router import router as auth_router
from app.api.data.router import router as data_router
from app.api.viz.router import router as viz_router
from app.api.modules.router import router as modules_router
from app.api.maps.router import router as maps_router
from app.api.storage.router import router as storage_router

# ── Ensure all ORM models are registered with Base.metadata ──────────────────
import app.api.auth.models  # noqa: F401 — registers User, Group, Permission
import app.api.data.models  # noqa: F401 — registers GeoDataset, GeoFeature


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup (use Alembic for production migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["platform"])
async def health():
    return {"status": "ok", "version": settings.app_version}


# ── Core routers ──────────────────────────────────────────────────────────────
app.include_router(auth_router, prefix="/api/auth")
app.include_router(data_router, prefix="/api/data")
app.include_router(viz_router, prefix="/api/viz")
app.include_router(modules_router, prefix="/api/modules")
app.include_router(maps_router, prefix="/api/maps")
app.include_router(storage_router, prefix="/api/storage")

# ── Pluggable module routers (from modules.lock.yaml) ─────────────────────────
load_modules(app)