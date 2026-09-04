"""
Unit tests for the dataset **geometry summary** service (hermetic, no PostGIS).

The PostGIS-backed aggregation path (``ST_GeometryType``) is covered by
``test_integration_geometry_summary.py``; here we verify the pure-python
behaviours: raster short-circuit, unknown dataset, and graceful fallback on a
non-PostGIS engine (in-memory SQLite, where the aggregation query fails).
"""
from __future__ import annotations

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import app.api.data.service as data_service
from app.api.data import crud as data_crud


@pytest_asyncio.fixture
async def sqlite_session() -> AsyncSession:
    """A plain SQLite session — deliberately **without** the geo_features table."""
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        echo=False,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()


class _FakeDataset:
    def __init__(self, ds_type: str = "vector", feature_count: int = 0) -> None:
        self.id = "ds-test"
        self.name = "fake"
        self.type = ds_type
        self.feature_count = feature_count


def _patch_get_dataset(monkeypatch: pytest.MonkeyPatch, dataset: _FakeDataset) -> None:
    async def _fake(db, dataset_id: str):
        return dataset

    monkeypatch.setattr(data_crud, "get_dataset", _fake)


async def test_unknown_dataset_returns_none(sqlite_session: AsyncSession, monkeypatch) -> None:
    async def _missing(db, dataset_id: str):
        return None

    monkeypatch.setattr(data_crud, "get_dataset", _missing)
    assert await data_service.get_geometry_summary(sqlite_session, "nope") is None


async def test_raster_dataset_short_circuits(sqlite_session: AsyncSession, monkeypatch) -> None:
    _patch_get_dataset(monkeypatch, _FakeDataset("raster", feature_count=7))
    summary = await data_service.get_geometry_summary(sqlite_session, "ds-test")
    assert summary == {
        "dataset_id": "ds-test",
        "kind": "raster",
        "dominant": None,
        "counts": {},
        "total": 7,
    }


async def test_fallback_without_postgis(sqlite_session: AsyncSession, monkeypatch) -> None:
    """Non-PostGIS engines must degrade to an empty profile, not raise."""
    _patch_get_dataset(monkeypatch, _FakeDataset("vector"))
    summary = await data_service.get_geometry_summary(sqlite_session, "ds-test")
    assert summary == {
        "dataset_id": "ds-test",
        "kind": "vector",
        "dominant": None,
        "counts": {},
        "total": 0,
    }


async def test_batch_omits_unknown_ids(sqlite_session: AsyncSession, monkeypatch) -> None:
    async def _only_known(db, dataset_id: str):
        if dataset_id == "known":
            ds = _FakeDataset("vector")
            ds.id = "known"  # reflect the requested id
            return ds
        return None

    monkeypatch.setattr(data_crud, "get_dataset", _only_known)
    out = await data_service.get_geometry_summaries(sqlite_session, ["known", "unknown"])
    assert set(out.keys()) == {"known"}
    assert out["known"]["dataset_id"] == "known"


def test_dominant_picks_majority_kind() -> None:
    """Pure logic: dominant selection prefers the highest-count geometry kind."""
    counts = {"other": 9, "point": 2, "polygon": 5, "line": 1}
    candidates = {k: v for k, v in counts.items() if k in data_service._GEOMETRY_KINDS}
    dominant = max(candidates.items(), key=lambda kv: kv[1])[0]
    assert dominant == "polygon"