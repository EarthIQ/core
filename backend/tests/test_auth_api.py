"""
L3 — API integration tests for the auth router (register / login / RBAC).

These exercise the real FastAPI endpoints over an ASGI transport backed by an
in-memory SQLite database. They cover the full user lifecycle and the
admin-privilege gating (401 vs 403) that protects the management routes.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient
# ── Health / smoke ───────────────────────────────────────────────────────────

async def test_health_endpoint(client: AsyncClient):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ── Registration ─────────────────────────────────────────────────────────────

async def test_register_creates_user(client: AsyncClient):
    resp = await client.post("/api/auth/register", json={
        "email": "new@example.com",
        "password": "strongPass1",
        "full_name": "New Person",
    })
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["email"] == "new@example.com"
    assert body["full_name"] == "New Person"
    assert body["is_superuser"] is False
    # Password must never be exposed
    assert "password" not in body
    assert "hashed_password" not in body


async def test_register_duplicate_email_conflict(client: AsyncClient):
    payload = {"email": "dup@example.com", "password": "pass12345"}
    first = await client.post("/api/auth/register", json=payload)
    assert first.status_code == 201
    second = await client.post("/api/auth/register", json=payload)
    assert second.status_code == 409


async def test_register_rejects_invalid_email(client: AsyncClient):
    resp = await client.post("/api/auth/register", json={
        "email": "not-an-email",
        "password": "pass12345",
    })
    assert resp.status_code == 422


# ── Login / token ────────────────────────────────────────────────────────────

async def test_login_returns_bearer_token(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "login@example.com", "password": "pass12345",
    })
    resp = await client.post("/api/auth/token", json={
        "email": "login@example.com", "password": "pass12345",
    })
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


async def test_login_wrong_password_unauthorized(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "secure@example.com", "password": "rightPass1",
    })
    resp = await client.post("/api/auth/token", json={
        "email": "secure@example.com", "password": "wrongPass99",
    })
    assert resp.status_code == 401
    assert resp.headers.get("WWW-Authenticate") == "Bearer"


async def test_login_unknown_user_unauthorized(client: AsyncClient):
    resp = await client.post("/api/auth/token", json={
        "email": "ghost@example.com", "password": "whatever",
    })
    assert resp.status_code == 401


# ── /me (auth + effective permissions) ───────────────────────────────────────

async def test_me_requires_valid_token(client: AsyncClient):
    resp = await client.get("/api/auth/me")
    assert resp.status_code in (401, 403)


async def test_me_returns_user_and_permissions(client: AsyncClient, admin_headers: dict):
    resp = await client.get("/api/auth/me", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["email"] == "admin@test.com"
    # Superuser gets the wildcard permission
    assert "*" in body["effective_permissions"]


async def test_me_rejects_garbage_token(client: AsyncClient):
    resp = await client.get(
        "/api/auth/me", headers={"Authorization": "Bearer not.a.jwt"}
    )
    assert resp.status_code == 401


# ── RBAC gating: regular users must NOT access admin routes ──────────────────

async def test_list_users_requires_admin(client: AsyncClient, user_headers: dict):
    resp = await client.get("/api/auth/users", headers=user_headers)
    assert resp.status_code == 403


async def test_list_users_allowed_for_admin(client: AsyncClient, admin_headers: dict):
    resp = await client.get("/api/auth/users", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "items" in body and "total" in body
    assert body["total"] >= 1


async def test_create_user_requires_admin(client: AsyncClient, user_headers: dict):
    resp = await client.post(
        "/api/auth/users",
        json={"email": "created@example.com", "password": "pass12345"},
        headers=user_headers,
    )
    assert resp.status_code == 403


# ── Permissions & groups CRUD (admin) ────────────────────────────────────────

async def test_permission_crud_roundtrip(client: AsyncClient, admin_headers: dict):
    # Create
    create = await client.post(
        "/api/auth/permissions",
        json={"name": "reports:export", "description": "Export reports"},
        headers=admin_headers,
    )
    assert create.status_code == 201, create.text
    perm_id = create.json()["id"]

    # Read back via list
    listing = await client.get("/api/auth/permissions", headers=admin_headers)
    assert listing.status_code == 200
    names = [p["name"] for p in listing.json()]
    assert "reports:export" in names

    # Update
    update = await client.put(
        f"/api/auth/permissions/{perm_id}",
        json={"description": "Updated desc"},
        headers=admin_headers,
    )
    assert update.status_code == 200, update.text
    assert update.json()["description"] == "Updated desc"

    # Delete
    delete = await client.delete(
        f"/api/auth/permissions/{perm_id}", headers=admin_headers
    )
    assert delete.status_code == 204

    # 404 after delete
    gone = await client.put(
        f"/api/auth/permissions/{perm_id}",
        json={"description": "x"},
        headers=admin_headers,
    )
    assert gone.status_code == 404


async def test_group_crud_with_permission_assignment(
    client: AsyncClient, admin_headers: dict
):
    # Create a permission to assign
    perm = await client.post(
        "/api/auth/permissions",
        json={"name": "maps:edit", "description": "Edit maps"},
        headers=admin_headers,
    )
    perm_id = perm.json()["id"]

    # Create a group referencing that permission
    group = await client.post(
        "/api/auth/groups",
        json={"name": "Editors", "permissions": [perm_id]},
        headers=admin_headers,
    )
    assert group.status_code == 201, group.text
    body = group.json()
    assert body["name"] == "Editors"
    assert any(p["id"] == perm_id for p in body["permissions"])


async def test_group_duplicate_name_conflict(client: AsyncClient, admin_headers: dict):
    payload = {"name": "Duplicable"}
    assert (await client.post("/api/auth/groups", json=payload, headers=admin_headers)).status_code == 201
    resp = await client.post("/api/auth/groups", json=payload, headers=admin_headers)
    assert resp.status_code == 409


async def test_unknown_admin_resource_404(client: AsyncClient, admin_headers: dict):
    resp = await client.put(
        "/api/auth/users/00000000-0000-0000-0000-000000000000",
        json={"full_name": "Ghost"},
        headers=admin_headers,
    )
    assert resp.status_code == 404