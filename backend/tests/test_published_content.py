"""Published content kinds: story maps + presentations as `maps` rows.

Covers the ``kind`` / ``content`` columns added for the unified published
content system (story maps, map presentations) - they reuse the maps entity
so the full share system applies to them unchanged.

Hermetic: in-memory SQLite + ASGITransport, no external services.
Follows the per-file app pattern of ``test_projects_layers_config.py``.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

import app.api.auth.models
import app.api.maps.models
import app.api.maps.share.models
import app.api.profile.models
import app.api.projects.models  # noqa: F401 - registers projects tables
from app.api.auth.router import router as auth_router
from app.api.maps.router import router as maps_router
from app.api.maps.share.router import entity_share_router
from app.api.projects.router import router as projects_router
from app.core.db import Base, get_db

_TEST_TABLE_NAMES = [
    # auth
    "permissions",
    "groups",
    "user_groups",
    "group_permissions",
    "users",
    # profile (User.organizations selectin relationship)
    "organizations",
    "user_organizations",
    "user_preferences",
    # projects
    "projects",
    "project_group_access",
    "project_user_access",
    # maps
    "maps",
    "map_group_access",
    "map_user_access",
    # share
    "access_requests",
]


def _test_tables():
    return [Base.metadata.tables[name] for name in _TEST_TABLE_NAMES]


def _make_test_app() -> FastAPI:
    test_app = FastAPI()
    test_app.include_router(auth_router, prefix="/api/v1/auth")
    test_app.include_router(maps_router, prefix="/api/v1/maps")
    test_app.include_router(projects_router, prefix="/api/v1/projects")
    # NOTE: prefix placeholder must be named `entity_id` (FastAPI binds by name)
    test_app.include_router(entity_share_router, prefix="/api/v1/maps/{entity_id}/share")
    return test_app


@pytest.fixture
async def engine():
    eng = create_async_engine(
        "sqlite+aiosqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(eng.sync_engine, "connect")
    def _fk_on(dbapi_conn, _record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, tables=_test_tables())
    yield eng
    await eng.dispose()


@pytest.fixture
async def client(engine) -> AsyncGenerator[AsyncClient, None]:
    app = _make_test_app()
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

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


async def _login(client: AsyncClient, email: str, superuser: bool = False) -> dict:
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "S3curePass!2024",
            "full_name": email.split("@")[0],
            "is_superuser": superuser,
        },
    )
    resp = await client.post(
        "/api/v1/auth/token", json={"email": email, "password": "S3curePass!2024"}
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


STORY_CONTENT = {
    "story": {
        "id": "story-1",
        "title": "Flood story",
        "scenes": [
            {
                "id": "scene-1",
                "name": "Intro",
                "title": "Why it matters",
                "layout": "split-left",
                "blocks": [{"id": "blk-1", "type": "text", "text": "hello"}],
            }
        ],
        "updatedAt": "2026-09-15T00:00:00Z",
    }
}

DECK_CONTENT = {
    "deck": {
        "id": "deck-1",
        "title": "Deck",
        "theme": "light",
        "slides": [
            {
                "id": "slide-1",
                "name": "Title",
                "title": "Start",
                "background": "light",
                "blocks": [{"id": "blk-1", "type": "text", "text": "hi", "span": 2}],
            }
        ],
    },
    "context": {"maps": [], "previews": {}, "project": None},
}


async def _new_project(client: AsyncClient, headers: dict) -> str:
    resp = await client.post(
        "/api/v1/projects",
        json={
            "title": "Proj",
            "description": "p",
            "center_lng": 0.0,
            "center_lat": 0.0,
            "zoom": 3.0,
            "basemap": "osm",
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


# ── Create / read ─────────────────────────────────────────────────────────────


async def test_create_story_map_and_roundtrip(client: AsyncClient):
    headers = await _login(client, "owner@test.com")
    resp = await client.post(
        "/api/v1/maps",
        json={
            "title": "Flood story",
            "kind": "story_map",
            "content": STORY_CONTENT,
            "is_public": False,
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["kind"] == "story_map"
    assert body["content"]["story"]["title"] == "Flood story"
    assert body["user_permission"] == "admin"

    # Read back verbatim
    got = await client.get(f"/api/v1/maps/{body['id']}", headers=headers)
    assert got.status_code == 200
    assert got.json()["content"] == STORY_CONTENT


async def test_create_presentation_and_default_kind(client: AsyncClient):
    headers = await _login(client, "owner2@test.com")
    resp = await client.post(
        "/api/v1/maps",
        json={"title": "Deck", "kind": "presentation", "content": DECK_CONTENT},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["kind"] == "presentation"

    # Omitted kind defaults to the classic map kind
    resp2 = await client.post("/api/v1/maps", json={"title": "Plain map"}, headers=headers)
    assert resp2.status_code == 201, resp2.text
    assert resp2.json()["kind"] == "map"
    assert resp2.json()["content"] is None


# ── List filters ──────────────────────────────────────────────────────────────


async def test_list_filters_by_project_and_kind(client: AsyncClient):
    headers = await _login(client, "owner3@test.com")
    pid = await _new_project(client, headers)

    await client.post(
        "/api/v1/maps",
        json={
            "title": "S",
            "kind": "story_map",
            "content": STORY_CONTENT,
            "project_id": pid,
        },
        headers=headers,
    )
    await client.post(
        "/api/v1/maps",
        json={
            "title": "D",
            "kind": "presentation",
            "content": DECK_CONTENT,
            "project_id": pid,
        },
        headers=headers,
    )
    await client.post("/api/v1/maps", json={"title": "M", "project_id": pid}, headers=headers)

    all_in_proj = await client.get(f"/api/v1/maps?project_id={pid}", headers=headers)
    assert all_in_proj.status_code == 200
    assert {m["kind"] for m in all_in_proj.json()} == {
        "map",
        "story_map",
        "presentation",
    }

    stories = await client.get(f"/api/v1/maps?project_id={pid}&kind=story_map", headers=headers)
    assert [m["title"] for m in stories.json()] == ["S"]

    decks = await client.get(f"/api/v1/maps?project_id={pid}&kind=presentation", headers=headers)
    assert [m["title"] for m in decks.json()] == ["D"]


# ── Update ────────────────────────────────────────────────────────────────────


async def test_update_content_and_title(client: AsyncClient):
    headers = await _login(client, "owner4@test.com")
    created = (
        await client.post(
            "/api/v1/maps",
            json={"title": "S", "kind": "story_map", "content": STORY_CONTENT},
            headers=headers,
        )
    ).json()

    updated_story = {
        "story": {
            **STORY_CONTENT["story"],
            "title": "Renamed",
            "scenes": STORY_CONTENT["story"]["scenes"]
            + [
                {
                    "id": "scene-2",
                    "name": "More",
                    "title": "More",
                    "layout": "stacked",
                    "blocks": [],
                }
            ],
        }
    }
    resp = await client.put(
        f"/api/v1/maps/{created['id']}",
        json={"title": "Renamed story", "content": updated_story},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["title"] == "Renamed story"
    assert body["content"]["story"]["title"] == "Renamed"
    assert len(body["content"]["story"]["scenes"]) == 2
    assert body["kind"] == "story_map"


# ── Access control ────────────────────────────────────────────────────────────


async def test_anonymous_access_rules(client: AsyncClient):
    owner = await _login(client, "owner5@test.com")
    private = (
        await client.post(
            "/api/v1/maps",
            json={
                "title": "Private story",
                "kind": "story_map",
                "content": STORY_CONTENT,
                "is_public": False,
            },
            headers=owner,
        )
    ).json()
    public = (
        await client.post(
            "/api/v1/maps",
            json={
                "title": "Public deck",
                "kind": "presentation",
                "content": DECK_CONTENT,
                "is_public": True,
            },
            headers=owner,
        )
    ).json()

    # Anonymous: public visible in list + readable; private hidden + 403
    listing = await client.get("/api/v1/maps")
    ids = [m["id"] for m in listing.json()]
    assert public["id"] in ids
    assert private["id"] not in ids

    anon_read = await client.get(f"/api/v1/maps/{public['id']}")
    assert anon_read.status_code == 200
    assert anon_read.json()["kind"] == "presentation"

    anon_denied = await client.get(f"/api/v1/maps/{private['id']}")
    assert anon_denied.status_code == 403


async def test_stranger_cannot_modify_owner_can_delete(client: AsyncClient):
    owner = await _login(client, "owner6@test.com")
    stranger = await _login(client, "stranger@test.com")
    item = (
        await client.post(
            "/api/v1/maps",
            json={"title": "S", "kind": "story_map", "content": STORY_CONTENT},
            headers=owner,
        )
    ).json()

    assert (await client.get(f"/api/v1/maps/{item['id']}", headers=stranger)).status_code == 403
    assert (
        await client.put(f"/api/v1/maps/{item['id']}", json={"title": "hacked"}, headers=stranger)
    ).status_code == 403
    assert (await client.delete(f"/api/v1/maps/{item['id']}", headers=stranger)).status_code == 403

    deleted = await client.delete(f"/api/v1/maps/{item['id']}", headers=owner)
    assert deleted.status_code == 204
    assert (await client.get(f"/api/v1/maps/{item['id']}", headers=owner)).status_code == 404


# ── Share system applies to new kinds ────────────────────────────────────────


async def test_share_state_for_story_map(client: AsyncClient):
    owner = await _login(client, "owner7@test.com")
    item = (
        await client.post(
            "/api/v1/maps",
            json={"title": "S", "kind": "story_map", "content": STORY_CONTENT},
            headers=owner,
        )
    ).json()

    resp = await client.get(f"/api/v1/maps/{item['id']}/share", headers=owner)
    assert resp.status_code == 200, resp.text
    state = resp.json()
    owner_entries = [e for e in state["entries"] if e["role"] == "owner"]
    assert len(owner_entries) == 1
    assert owner_entries[0]["email"] == "owner7@test.com"


# ── Project-scoped publish endpoint ──────────────────────────────────────────


async def test_publish_story_from_project_endpoint(client: AsyncClient):
    owner = await _login(client, "owner8@test.com")
    pid = await _new_project(client, owner)

    resp = await client.post(
        f"/api/v1/projects/{pid}/maps",
        json={
            "title": "Story from project",
            "kind": "story_map",
            "content": STORY_CONTENT,
        },
        headers=owner,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["project_id"] == pid
    assert body["kind"] == "story_map"
    assert body["content"] == STORY_CONTENT
