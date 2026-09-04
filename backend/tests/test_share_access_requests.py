"""
L3 — API integration tests for the map/project "access request" flow:
requester posts a request → owner opens the token link → owner grants/denies.

Regression coverage for a real bug: the router called
``svc.grant_access(db, token, body.role, actor)`` while the service signature
is ``grant_access(db, token, actor: User, role: str)`` — the role string was
treated as the actor and blew up with
``AttributeError: 'str' object has no attribute 'is_superuser'`` (HTTP 500)
on ``POST /api/v1/access/request/grant``.

Hermetic: in-memory SQLite (StaticPool), FastAPI over ASGITransport,
``get_db`` overridden. No venv, no network, no real SMTP (email no-ops).
"""
from __future__ import annotations

from typing import AsyncGenerator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

from app.core.db import Base, get_db
from app.api.auth.router import router as auth_router
from app.api.maps.share.router import (
    router as share_util_router,
    entity_share_router,
)
import app.api.auth.models  # noqa: F401 — users, groups, permissions
import app.api.profile.models  # noqa: F401 — organizations (FK target of users)
import app.api.maps.models  # noqa: F401 — maps, map access tables
import app.api.projects.models  # noqa: F401 — projects, project access tables
import app.api.maps.share.models  # noqa: F401 — access_requests

# Tables this flow touches (FK targets included so SQLite FK enforcement is clean).
_TEST_TABLE_NAMES = [
    "permissions",
    "groups",
    "user_groups",
    "group_permissions",
    "users",
    "organizations",
    "user_organizations",
    "projects",
    "project_group_access",
    "project_user_access",
    "maps",
    "map_group_access",
    "map_user_access",
    "access_requests",
]


# ── Hermetic app + engine (share router, not in the shared conftest app) ──────

def _make_share_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(auth_router, prefix="/api/v1/auth")
    app.include_router(share_util_router, prefix="/api/v1")
    app.include_router(entity_share_router, prefix="/api/v1/maps/{entity_id}/share")
    app.include_router(entity_share_router, prefix="/api/v1/projects/{entity_id}/share")
    return app


@pytest.fixture
async def share_engine():
    """Fresh in-memory SQLite engine per test (loop-safe StaticPool)."""
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        echo=False,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine.sync_engine, "connect")
    def _fk_on(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    yield engine
    await engine.dispose()


@pytest.fixture
async def share_client(
    share_engine,
) -> AsyncGenerator[AsyncClient, None]:
    tables = [Base.metadata.tables[name] for name in _TEST_TABLE_NAMES]
    async with share_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, tables=tables)

    app = _make_share_test_app()
    session_factory = async_sessionmaker(share_engine, expire_on_commit=False)

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


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _register(
    client: AsyncClient,
    email: str,
    password: str = "S3curePass!2024",
    full_name: str = "Test User",
    is_superuser: bool = False,
) -> dict:
    resp = await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": full_name,
        "is_superuser": is_superuser,
    })
    assert resp.status_code == 201, resp.text
    resp = await client.post("/api/v1/auth/token", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200, me.text
    return {"headers": {"Authorization": f"Bearer {token}"}, "id": me.json()["id"]}


async def _create_map(session_factory, owner_id: str, title: str = "Test Map") -> str:
    from app.api.maps.models import MapModel

    map_id = "map-0001"
    async with session_factory() as session:
        session.add(MapModel(id=map_id, title=title, owner_id=owner_id))
        await session.commit()
    return map_id


async def _approval_token(share_engine, map_id: str, requester_id: str) -> str:
    from app.api.maps.share.models import AccessRequest

    factory = async_sessionmaker(share_engine, expire_on_commit=False)
    async with factory() as session:
        result = await session.execute(
            select(AccessRequest).where(
                AccessRequest.entity_id == map_id,
                AccessRequest.user_id == requester_id,
            )
        )
        return result.scalar_one().approval_token


async def _map_access_rows(share_engine, map_id: str):
    from app.api.maps.models import MapUserAccess

    factory = async_sessionmaker(share_engine, expire_on_commit=False)
    async with factory() as session:
        result = await session.execute(
            select(MapUserAccess).where(MapUserAccess.map_id == map_id)
        )
        return result.scalars().all()


# ── Tests ─────────────────────────────────────────────────────────────────────

async def test_owner_can_grant_access_request(share_client: AsyncClient, share_engine):
    """The exact flow that used to 500: POST /api/v1/access/request/grant."""
    session_factory = async_sessionmaker(share_engine, expire_on_commit=False)

    owner = await _register(share_client, "owner@eqcorp.com", full_name="Owner")
    alice = await _register(share_client, "alice@eqcorp.com", full_name="Alice")
    map_id = await _create_map(session_factory, owner["id"])

    # 1. Requester asks for access (owner would receive an email with the token).
    resp = await share_client.post(
        f"/api/v1/maps/{map_id}/share/request",
        json={"message": "I need this map", "requested_role": "editor"},
        headers=alice["headers"],
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "pending"
    assert body["requested_role"] == "editor"
    assert body["requester_email"] == "alice@eqcorp.com"

    token = await _approval_token(share_engine, map_id, alice["id"])

    # 2. Owner (token link) fetches the request.
    resp = await share_client.get(
        "/api/v1/access/request", params={"token": token}, headers=owner["headers"]
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "pending"

    # 3. Owner grants with a chosen role — regression: this was
    #    AttributeError: 'str' object has no attribute 'is_superuser' (500).
    resp = await share_client.post(
        "/api/v1/access/request/grant",
        params={"token": token},
        json={"role": "editor"},
        headers=owner["headers"],
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "granted"
    assert body["granted_role"] == "editor"

    # 4. A non-pending access entry now exists for the requester.
    rows = await _map_access_rows(share_engine, map_id)
    entry = next((r for r in rows if r.user_id == alice["id"]), None)
    assert entry is not None
    assert entry.role == "editor"
    assert entry.pending is False


async def test_non_owner_cannot_grant_access_request(share_client: AsyncClient, share_engine):
    """A logged-in user who is neither owner nor superuser gets 403 (not 500)."""
    session_factory = async_sessionmaker(share_engine, expire_on_commit=False)

    owner = await _register(share_client, "owner@eqcorp.com", full_name="Owner")
    alice = await _register(share_client, "alice@eqcorp.com", full_name="Alice")
    bob = await _register(share_client, "bob@eqcorp.com", full_name="Bob")
    map_id = await _create_map(session_factory, owner["id"])

    resp = await share_client.post(
        f"/api/v1/maps/{map_id}/share/request",
        json={"message": "please", "requested_role": "viewer"},
        headers=alice["headers"],
    )
    assert resp.status_code == 201, resp.text
    token = await _approval_token(share_engine, map_id, alice["id"])

    resp = await share_client.post(
        "/api/v1/access/request/grant",
        params={"token": token},
        json={"role": "editor"},
        headers=bob["headers"],
    )
    assert resp.status_code == 403, resp.text

    # And the request is untouched.
    resp = await share_client.get(
        "/api/v1/access/request", params={"token": token}, headers=owner["headers"]
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending"


async def test_grant_requires_authentication(share_client: AsyncClient, share_engine):
    resp = await share_client.post(
        "/api/v1/access/request/grant",
        params={"token": "whatever"},
        json={"role": "editor"},
    )
    assert resp.status_code == 401


async def test_owner_can_deny_access_request(share_client: AsyncClient, share_engine):
    session_factory = async_sessionmaker(share_engine, expire_on_commit=False)

    owner = await _register(share_client, "owner@eqcorp.com", full_name="Owner")
    alice = await _register(share_client, "alice@eqcorp.com", full_name="Alice")
    map_id = await _create_map(session_factory, owner["id"])

    resp = await share_client.post(
        f"/api/v1/maps/{map_id}/share/request",
        json={"message": "please", "requested_role": "viewer"},
        headers=alice["headers"],
    )
    assert resp.status_code == 201, resp.text
    token = await _approval_token(share_engine, map_id, alice["id"])

    resp = await share_client.post(
        "/api/v1/access/request/deny", params={"token": token}, headers=owner["headers"]
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "denied"

    # No access entry was created.
    rows = await _map_access_rows(share_engine, map_id)
    assert not any(r.user_id == alice["id"] for r in rows)


async def test_grant_twice_is_rejected(share_client: AsyncClient, share_engine):
    session_factory = async_sessionmaker(share_engine, expire_on_commit=False)

    owner = await _register(share_client, "owner@eqcorp.com", full_name="Owner")
    alice = await _register(share_client, "alice@eqcorp.com", full_name="Alice")
    map_id = await _create_map(session_factory, owner["id"])

    resp = await share_client.post(
        f"/api/v1/maps/{map_id}/share/request",
        json={"message": "please", "requested_role": "viewer"},
        headers=alice["headers"],
    )
    assert resp.status_code == 201, resp.text
    token = await _approval_token(share_engine, map_id, alice["id"])

    first = await share_client.post(
        "/api/v1/access/request/grant",
        params={"token": token},
        json={"role": "editor"},
        headers=owner["headers"],
    )
    assert first.status_code == 200, first.text
    assert first.json()["status"] == "granted"

    second = await share_client.post(
        "/api/v1/access/request/grant",
        params={"token": token},
        json={"role": "commenter"},
        headers=owner["headers"],
    )
    assert second.status_code == 400
    assert "already been handled" in second.json()["detail"]


async def test_grant_unknown_token_404(share_client: AsyncClient, share_engine):
    owner = await _register(share_client, "owner@eqcorp.com", full_name="Owner")
    resp = await share_client.post(
        "/api/v1/access/request/grant",
        params={"token": "does-not-exist"},
        json={"role": "editor"},
        headers=owner["headers"],
    )
    assert resp.status_code == 404

