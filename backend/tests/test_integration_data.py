"""
L4 — Integration tests for the **data** module against a real PostGIS database.

These tests are marked ``integration`` and require a running PostgreSQL
instance with PostGIS (e.g. ``docker compose up -d postgres``). They use the
real ``settings.database_url`` — NOT SQLite.

Run with:
    cd backend && docker compose up -d postgres
    uv run --project . pytest tests/test_integration_data.py -v

They will be skipped automatically if the database is unreachable.
"""
from __future__ import annotations

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings
from app.core.db import Base
from app.api.data.models import GeoDataset, GeoFeature
from app.api.auth.models import User, UserGroup, GroupPermission
from app.api.maps.models import MapModel, MapGroupAccess, MapUserAccess
from app.api.projects.models import ProjectModel, ProjectGroupAccess, ProjectUserAccess

# Import all models so Base.metadata is fully populated
# (main.py already does this, but we're not importing main)
# ───────────────────────────────────────────────────────────────────────────────

pytestmark = pytest.mark.integration


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def engine():
    """Use the real PostGIS engine from settings."""
    settings = get_settings()
    eng = create_async_engine(
        settings.database_url,
        echo=False,
        pool_pre_ping=True,
    )
    yield eng

    async def _dispose():
        await eng.dispose()
    import asyncio
    try:
        asyncio.get_event_loop().run_until_complete(_dispose())
    except RuntimeError:
        loop = asyncio.new_event_loop()
        loop.run_until_complete(_dispose())
        loop.close()


@pytest_asyncio.fixture
async def db(engine) -> AsyncSession:
    """Create a fresh session with tables present (uses Alembic-managed schema)."""
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        # Verify we can reach the DB; skip if not
        try:
            await session.execute(select(User.id).limit(1))
        except Exception as e:
            pytest.skip(f"PostGIS database not reachable: {e}")
        yield session
        await session.rollback()


# ── Tests ─────────────────────────────────────────────────────────────────────

async def test_can_create_geo_dataset(db: AsyncSession):
    """Smoke test: create a dataset row, read it back, delete it."""
    user = User(
        email="integration-test@example.com",
        hashed_password="x" * 60,
        full_name="Integration",
    )
    db.add(user)
    await db.flush()

    ds = GeoDataset(
        name="test-dataset",
        format="GeoJSON",
        type="vector",
        crs="EPSG:4326",
        tags=["test"],
        file_size_bytes=0,
        attributes=[],
    )
    db.add(ds)
    await db.flush()
    await db.refresh(ds)

    assert ds.id is not None
    assert ds.name == "test-dataset"
    assert ds.crs == "EPSG:4326"

    # Clean up
    await db.delete(ds)
    await db.delete(user)


async def test_create_geo_feature_with_geometry(db: AsyncSession):
    """Verify PostGIS accepts a Point geometry (EPSG:4326)."""
    user = User(
        email="integration-geo@example.com",
        hashed_password="x" * 60,
    )
    db.add(user)
    await db.flush()

    ds = GeoDataset(
        name="geo-test",
        format="GeoJSON",
        type="vector",
        crs="EPSG:4326",
        tags=[],
        file_size_bytes=0,
        attributes=[],
    )
    db.add(ds)
    await db.flush()

    # Use GeoAlchemy2's WKT to create a point geometry
    from geoalchemy2 import WKTElement
    point = WKTElement("POINT(12.5 55.7)", srid=4326)

    feature = GeoFeature(
        dataset_id=ds.id,
        geom=point,
        properties={"name": "Amsterdam"},
    )
    db.add(feature)
    await db.flush()
    await db.refresh(feature)

    # Read the geometry back
    assert feature.geom is not None
    # GeoAlchemy2 exposes .ST_AsText() or .as_shape()
    geom_str = str(feature.geom)
    assert "POINT" in geom_str.upper()

    # Clean up
    await db.delete(feature)
    await db.delete(ds)
    await db.delete(user)


async def test_maps_table_foreign_keys(db: AsyncSession):
    """Verify map→project→user FK chain works on PostGIS."""
    owner = User(
        email="map-owner@example.com",
        hashed_password="x" * 60,
    )
    db.add(owner)
    await db.flush()

    proj = ProjectModel(
        title="Integration Project",
        center_lng=12.0,
        center_lat=52.0,
        zoom=5.0,
        basemap="dataviz-dark",
        layers_config=[],
        owner_id=owner.id,
        share_settings={"editorsCanShare": True, "viewersCanDownload": True},
    )
    db.add(proj)
    await db.flush()

    m = MapModel(
        title="Integration Map",
        center_lng=12.0,
        center_lat=52.0,
        zoom=5.0,
        basemap="dataviz-dark",
        layers_config=[],
        project_id=proj.id,
        owner_id=owner.id,
        share_settings={"editorsCanShare": True, "viewersCanDownload": True},
    )
    db.add(m)
    await db.flush()
    await db.refresh(m)

    assert m.id is not None
    assert m.project_id == proj.id

    # Clean up (order matters for FK cascade)
    await db.delete(m)
    await db.delete(proj)
    await db.delete(owner)