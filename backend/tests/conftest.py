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

import asyncio
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

from app.core.db import Base, get_db
from app.api.auth.router import router as auth_router


# ── Build a hermetic test app ─────────────────────────────────────────────────

def _make_test_app() -> FastAPI:
    """Create a minimal FastAPI app with only the auth router."""
    test_app = FastAPI()
    test_app.include_router(auth_router, prefix="/api/auth")

    # Simple health endpoint for smoke tests
    @test_app.get("/api/health")
    async def health():
        return {"status": "ok"}

    return test_app


# ── DB fixtures (in-memory SQLite, shared connection) ────────────────────────

@pytest.fixture(scope="session")
def test_engine():
    """Create an async in-memory SQLite engine (shared across tests)."""
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        echo=False,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )

    # Ensure FK enforcement in SQLite
    @event.listens_for(engine.sync_engine, "connect")
    def _fk_on(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    yield engine
    # Dispose of the engine after the session ends
    asyncio.new_event_loop().run_until_complete(engine.dispose())


@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Yield a fresh DB session per test (tables created once per session)."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()
        # Clean all rows between tests
        async with test_engine.begin() as conn:
            for table in reversed(Base.metadata.sorted_tables):
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