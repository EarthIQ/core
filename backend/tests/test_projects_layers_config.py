"""
Regression test: folder nodes in ``layers_config`` must be accepted and
round-trip through project create/update/read.

Previously ``MapLayerItem`` required ``type: Literal["vector", "raster"]``,
so any ``PUT /api/projects/{id}`` payload containing a folder entry
(``{id, name, parentId, order, kind: "folder", collapsed}``) failed
Pydantic validation with a 422 — the frontend swallowed that error and the
whole layer tree (folders AND layers) was silently lost.

Hermetic: in-memory SQLite + ASGITransport, no external services.
"""
from __future__ import annotations

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

from app.core.db import Base, get_db
from app.api.auth.router import router as auth_router
from app.api.projects.router import router as projects_router

import app.api.auth.models  # noqa: F401 — registers users/groups/permissions
import app.api.profile.models  # noqa: F401 — organizations (User selectin rel.)
import app.api.projects.models  # noqa: F401 — registers projects tables
import app.api.maps.models  # noqa: F401 — registers maps tables (related)

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
    # maps (ProjectModel.maps relationship)
    "maps",
    "map_group_access",
    "map_user_access",
]

# Payloads exactly as frontend/apps/web/src/components/map/layer-panel/
# serialize.ts → toMapLayerItems() emits them.
FOLDER = {
    "id": "folder_1",
    "name": "Hydro",
    "parentId": None,
    "order": 0,
    "kind": "folder",
    "collapsed": False,
}
LAYER = {
    "id": "layer_1",
    "name": "Rivers",
    "parentId": "folder_1",
    "order": 0,
    "kind": "layer",
    "type": "vector",
    "visible": True,
    "datasetId": "ds_rivers",
    "geometryType": "line",
    "style": {"color": "#3b82f6", "opacity": 0.8, "lineWidth": 2},
}


@pytest.fixture
async def client():
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

    tables = [Base.metadata.tables[name] for name in _TEST_TABLE_NAMES]
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, tables=tables)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def _override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app = FastAPI()
    app.include_router(auth_router, prefix="/api/auth")
    app.include_router(projects_router, prefix="/api/projects")
    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    await engine.dispose()


async def _auth(client: AsyncClient) -> dict:
    await client.post("/api/auth/register", json={
        "email": "owner@test.com",
        "password": "S3curePass!2024",
        "full_name": "Owner",
        "is_superuser": False,
    })
    resp = await client.post(
        "/api/auth/token",
        json={"email": "owner@test.com", "password": "S3curePass!2024"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_create_project_with_folder_in_layers_config(client: AsyncClient):
    headers = await _auth(client)
    resp = await client.post(
        "/api/projects",
        headers=headers,
        json={"title": "Hydro workspace", "layers_config": [FOLDER, LAYER]},
    )
    assert resp.status_code == 201, resp.text
    items = {i["id"]: i for i in resp.json()["layers_config"]}

    # Folder node survives the round-trip with its tree metadata intact.
    assert items["folder_1"]["kind"] == "folder"
    assert items["folder_1"]["collapsed"] is False
    assert items["folder_1"]["order"] == 0
    # Layer keeps its dataset/style metadata.
    assert items["layer_1"]["type"] == "vector"
    assert items["layer_1"]["parentId"] == "folder_1"
    assert items["layer_1"]["datasetId"] == "ds_rivers"
    assert items["layer_1"]["style"]["color"] == "#3b82f6"


async def test_update_project_folder_structure_roundtrip(client: AsyncClient):
    headers = await _auth(client)

    # Start with the layer at root.
    root_layer = {**LAYER, "parentId": None}
    resp = await client.post(
        "/api/projects",
        headers=headers,
        json={"title": "Hydro workspace", "layers_config": [FOLDER, root_layer]},
    )
    assert resp.status_code == 201, resp.text
    project_id = resp.json()["id"]

    # Now move the layer into the folder (the exact failing path: a PUT whose
    # layers_config contains a folder entry) and bump the viewport.
    resp = await client.put(
        f"/api/projects/{project_id}",
        headers=headers,
        json={
            "zoom": 5.5,
            "center_lng": 75.8,
            "center_lat": 20.1,
            "layers_config": [
                {**FOLDER, "collapsed": True},
                LAYER,
            ],
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    items = {i["id"]: i for i in body["layers_config"]}
    assert items["folder_1"]["collapsed"] is True
    assert items["layer_1"]["parentId"] == "folder_1"
    assert body["zoom"] == 5.5

    # Read it back through GET — the read model must validate the stored
    # folder entry as well.
    resp = await client.get(f"/api/projects/{project_id}", headers=headers)
    assert resp.status_code == 200, resp.text
    items = {i["id"]: i for i in resp.json()["layers_config"]}
    assert items["folder_1"]["kind"] == "folder"
    assert items["layer_1"]["parentId"] == "folder_1"
    assert items["layer_1"]["datasetId"] == "ds_rivers"

