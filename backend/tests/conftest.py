"""
Shared pytest fixtures for the EarthIQ Core backend test suite.

Design decisions
----------------
• We do NOT import ``app.main`` because it pulls in GeoAlchemy ``Geometry``
  columns (data model) that are incompatible with SQLite, and it triggers
  RustFS bucket creation in the lifespan.
• Instead we build a minimal FastAPI app with only the **auth** router,
  override ``get_db`` to point at an in-memory SQLite engine, and use
  ``httpx.ASGITransport`` (which skips the ASGI lifespan).
• This keeps tests fast (< 2 s) and fully hermetic.
"""
from __future__ import annotations

from typing import AsyncGenerator

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

from app.core.db import Base, get_db
from app.api.auth.router import router as auth_router
from app.api.notifications.router import router as notifications_router
from app.api.profile.router import router as profile_router
import app.api.auth.models  # noqa: F401 — registers users, groups, permissions
import app.api.notifications.models  # noqa: F401 — registers notification tables
import app.api.profile.models  # noqa: F401 — registers organizations, memberships, prefs


# Tables the hermetic test app actually uses. We deliberately do **not** create
# the full ``Base.metadata``: other core models (e.g. ``app.api.data.models``)
# use Postgres-only types (JSONB, GeoAlchemy ``Geometry``) that SQLite cannot
# compile, and importing them anywhere in the process would pollute
# ``Base.metadata`` and break ``create_all`` in SQLite.
_TEST_TABLE_NAMES = [
    # auth
    "permissions",
    "groups",
    "user_groups",
    "group_permissions",
    "users",
    # notifications
    "notification_messages",
    "notification_recipients",
    "notification_preferences",
    # profile / organizations / preferences
    "organizations",
    "user_organizations",
    "user_preferences",
]


def _test_tables():
    """The Table objects this harness creates (order resolved by create_all)."""
    return [Base.metadata.tables[name] for name in _TEST_TABLE_NAMES]


# ── Build a hermetic test app ─────────────────────────────────────────────────

def _make_test_app() -> FastAPI:
    """Create a minimal FastAPI app with the auth + notifications routers."""
    test_app = FastAPI()
    test_app.include_router(auth_router, prefix="/api/auth")
    test_app.include_router(notifications_router, prefix="/api/notifications")
    test_app.include_router(profile_router, prefix="/api/profile")

    # Simple health endpoint for smoke tests
    @test_app.get("/api/health")
    async def health():
        return {"status": "ok"}

    return test_app


# ── DB fixtures (in-memory SQLite, shared connection) ────────────────────────
#
# IMPORTANT: the engine is **function-scoped** (one fresh in-memory DB per test).
# pytest-asyncio (>=0.23) gives each async test its own event loop; a single
# session-scoped engine would keep one aiosqlite connection (StaticPool) bound
# to the *first* loop, and every later test would fail with cross-loop errors
# (surfacing as 500s → KeyError: 'access_token' in the login helpers). Creating
# a small engine per test is cheap (<10 ms) and gives perfect isolation.

@pytest.fixture
async def test_engine():
    """Create an async in-memory SQLite engine (fresh per test, loop-safe)."""
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        echo=False,
        poolclass=StaticPool,  # single shared in-memory connection
        connect_args={"check_same_thread": False},
    )

    # Ensure FK enforcement in SQLite
    @event.listens_for(engine.sync_engine, "connect")
    def _fk_on(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    yield engine
    await engine.dispose()


@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Yield a fresh DB session per test (tables created once per engine)."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, tables=_test_tables())

    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()
        # Clean all rows between tests
        async with test_engine.begin() as conn:
            for table in reversed(Base.metadata.sorted_tables):
                if table.name in _TEST_TABLE_NAMES:
                    await conn.execute(table.delete())


# ── HTTP client fixture ──────────────────────────────────────────────────────

@pytest.fixture
async def client(db_session, test_engine) -> AsyncGenerator[AsyncClient, None]:
    """
    Async HTTP client wired to the test app.
    ``get_db`` is overridden so the app uses *our* SQLite session.
    """
    app = _make_test_app()

    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)

    async def _override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ── Helper: register + login, return auth headers ────────────────────────────

async def _register_and_login(
    client: AsyncClient,
    email: str = "admin@test.com",
    password: str = "S3curePass!2024",
    full_name: str = "Test Admin",
    is_superuser: bool = True,
) -> dict:
    """Register a user and return auth headers for subsequent requests."""
    await client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "full_name": full_name,
        "is_superuser": is_superuser,
    })
    resp = await client.post("/api/auth/token", json={"email": email, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _register_login_with_id(
    client: AsyncClient,
    email: str,
    password: str = "S3curePass!2024",
    full_name: str = "Test User",
    is_superuser: bool = False,
) -> tuple[dict, str, str]:
    """Register + login, returning ``(headers, user_id, token)``."""
    await client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "full_name": full_name,
        "is_superuser": is_superuser,
    })
    resp = await client.post("/api/auth/token", json={"email": email, "password": password})
    token = resp.json()["access_token"]
    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    user_id = me.json()["id"]
    return {"Authorization": f"Bearer {token}"}, user_id, token


@pytest.fixture
async def admin_headers(client: AsyncClient) -> dict:
    """Pre-registered superuser with auth headers."""
    return await _register_and_login(client, email="admin@test.com")


@pytest.fixture
async def user_headers(client: AsyncClient) -> dict:
    """Pre-registered regular user with auth headers."""
    return await _register_and_login(
        client, email="user@test.com", full_name="Regular User", is_superuser=False,
    )


@pytest.fixture
async def admin(client: AsyncClient):
    headers, user_id, token = await _register_login_with_id(
        client, email="admin@eqcorp.com", full_name="Admin", is_superuser=True
    )
    return {"headers": headers, "id": user_id, "token": token}


@pytest.fixture
async def user_a(client: AsyncClient):
    headers, user_id, token = await _register_login_with_id(
        client, email="alice@eqcorp.com", full_name="Alice"
    )
    return {"headers": headers, "id": user_id, "token": token}


@pytest.fixture
async def user_b(client: AsyncClient):
    headers, user_id, token = await _register_login_with_id(
        client, email="bob@eqcorp.com", full_name="Bob"
    )
    return {"headers": headers, "id": user_id, "token": token}
