"""
L4 — Integration test for the **geometry summary** endpoint against real PostGIS.

Requires a running PostgreSQL + PostGIS (e.g. the Compose ``db`` service).
Skipped automatically when the database is unreachable.

    cd backend && python -m pytest tests/test_integration_geometry_summary.py -ra
"""
from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings
from app.api.data.models import GeoDataset
from app.api.auth.models import User
from app.api.data import service as data_service
from app.api.data.schemas import GeometrySummary

pytestmark = pytest.mark.integration

# ── Fixtures (same shape as test_integration_data.py) ────────────────────────


@pytest_asyncio.fixture
async def engine():
    settings = get_settings()
    eng = create_async_engine(settings.database_url, echo=False)
    try:
        yield eng
    finally:
        await eng.dispose()


@pytest_asyncio.fixture
async def db(engine) -> AsyncSession:
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        try:
            await session.execute(select(User.id).limit(1))
        except Exception as e:
            pytest.skip(f"PostGIS database not reachable: {e}")
        yield session
        await session.rollback()


# ── Tests ─────────────────────────────────────────────────────────────────────


async def test_geometry_summary_counts_and_dominant(db: AsyncSession):
    """ST_GeometryType aggregation: 2 points, 1 line, 3 polygons → polygon wins."""
    ds = GeoDataset(
        name="geo-summary-test",
        format="GeoJSON",
        type="vector",
        crs="EPSG:4326 (WGS 84)",
        tags=[],
        file_size_bytes=0,
        attributes=[],
    )
    db.add(ds)
    await db.flush()
    await db.refresh(ds)

    geoms = [
        {"type": "Point", "coordinates": [0, 0]},
        {"type": "Point", "coordinates": [1, 1]},
        {"type": "LineString", "coordinates": [[0, 0], [1, 1]]},
        {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]},
        {"type": "MultiPolygon", "coordinates": [[[[0, 0], [1, 0], [1, 1], [0, 0]]]]},
        {"type": "Polygon", "coordinates": [[[2, 2], [3, 2], [3, 3], [2, 2]]]},
    ]
    insert = text(
        "INSERT INTO geo_features (id, dataset_id, geom, properties) "
        "VALUES (:id, :dsid, ST_GeomFromGeoJSON(:geom), CAST(:props AS jsonb))"
    )
    try:
        for i, geom in enumerate(geoms):
            await db.execute(
                insert,
                {
                    "id": str(uuid.uuid4()),
                    "dsid": ds.id,
                    "geom": str(geom),
                    "props": "{}",
                },
            )
        await db.flush()

        summary = await data_service.get_geometry_summary(db, ds.id)
        assert summary is not None
        assert summary["kind"] == "vector"
        assert summary["dominant"] == "polygon"
        assert summary["total"] == 6
        assert summary["counts"] == {"point": 2, "line": 1, "polygon": 3}

        # The public schema validates the same shape.
        out = GeometrySummary.model_validate(summary)
        assert out.dominant == "polygon"

        # Batch endpoint shape: keyed by id, unknown ids omitted.
        batch = await data_service.get_geometry_summaries(db, [ds.id, "unknown"])
        assert set(batch.keys()) == {ds.id}
        assert batch[ds.id]["dominant"] == "polygon"
    finally:
        await db.execute(
            text("DELETE FROM geo_features WHERE dataset_id = :id"), {"id": ds.id}
        )
        await db.delete(ds)