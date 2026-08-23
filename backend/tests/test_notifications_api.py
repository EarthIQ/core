"""API integration tests — auth gating + full notification lifecycle over HTTP."""
from __future__ import annotations

from httpx import AsyncClient


# ── Auth gating ────────────────────────────────────────────────────────────────

async def test_notifications_requires_auth(client: AsyncClient):
    resp = await client.get("/api/notifications")
    assert resp.status_code in (401, 403)


async def test_non_admin_cannot_broadcast(client: AsyncClient, user_a, user_b):
    resp = await client.post(
        "/api/notifications/broadcast",
        json={"title": "x", "user_ids": [user_b["id"]]},
        headers=user_a["headers"],
    )
    assert resp.status_code == 403


# ── Lifecycle ──────────────────────────────────────────────────────────────────

async def test_admin_create_and_list(client: AsyncClient, admin, user_a):
    resp = await client.post(
        "/api/notifications",
        json={"title": "Shared with you", "body": "A shared a project",
              "category": "project", "kind": "success", "link": "/projects/p1",
              "user_id": user_a["id"]},
        headers=admin["headers"],
    )
    assert resp.status_code == 201, resp.text
    created = resp.json()
    assert created["title"] == "Shared with you"
    assert created["category"] == "project"

    listing = await client.get("/api/notifications", headers=user_a["headers"])
    assert listing.status_code == 200
    items = listing.json()["items"]
    assert len(items) == 1
    assert items[0]["read"] is False

    count = await client.get("/api/notifications/unread-count", headers=user_a["headers"])
    assert count.json()["unread"] == 1


async def test_mark_read_updates_count(client: AsyncClient, admin, user_a):
    created = (
        await client.post(
            "/api/notifications",
            json={"title": "m", "user_id": user_a["id"]},
            headers=admin["headers"],
        )
    ).json()

    await client.post(f"/api/notifications/{created['id']}/read", headers=user_a["headers"])

    count = await client.get("/api/notifications/unread-count", headers=user_a["headers"])
    assert count.json()["unread"] == 0


async def test_mark_all_read(client: AsyncClient, admin, user_a):
    for _ in range(3):
        await client.post(
            "/api/notifications", json={"title": "m", "user_id": user_a["id"]},
            headers=admin["headers"],
        )
    resp = await client.post("/api/notifications/read-all", headers=user_a["headers"])
    assert resp.json()["marked"] == 3
    count = await client.get("/api/notifications/unread-count", headers=user_a["headers"])
    assert count.json()["unread"] == 0


async def test_summary_endpoint(client: AsyncClient, admin, user_a):
    await client.post(
        "/api/notifications",
        json={"title": "p", "category": "project", "user_id": user_a["id"]},
        headers=admin["headers"],
    )
    await client.post(
        "/api/notifications",
        json={"title": "s", "category": "system", "user_id": user_a["id"]},
        headers=admin["headers"],
    )
    resp = await client.get("/api/notifications/summary", headers=user_a["headers"])
    data = resp.json()
    assert data["total"] == 2
    assert data["by_category"]["project"] == 1
    assert data["by_category"]["system"] == 1


async def test_user_cannot_read_another_users_notification(client: AsyncClient, admin, user_a, user_b):
    created = (
        await client.post(
            "/api/notifications", json={"title": "x", "user_id": user_a["id"]},
            headers=admin["headers"],
        )
    ).json()
    resp = await client.post(f"/api/notifications/{created['id']}/read", headers=user_b["headers"])
    assert resp.status_code == 404


async def test_delete_own(client: AsyncClient, admin, user_a):
    created = (
        await client.post(
            "/api/notifications", json={"title": "x", "user_id": user_a["id"]},
            headers=admin["headers"],
        )
    ).json()
    resp = await client.delete(f"/api/notifications/{created['id']}", headers=user_a["headers"])
    assert resp.status_code == 204
    listing = await client.get("/api/notifications", headers=user_a["headers"])
    assert listing.json()["total"] == 0


# ── Preferences via API ────────────────────────────────────────────────────────

async def test_preferences_get_put(client: AsyncClient, user_a):
    got = await client.get("/api/notifications/preferences", headers=user_a["headers"])
    assert got.status_code == 200
    assert got.json()["enabled"] is True

    put = await client.put(
        "/api/notifications/preferences",
        json={"enabled": False, "toasts": False, "categories": {"system": False}},
        headers=user_a["headers"],
    )
    data = put.json()
    assert data["enabled"] is False
    assert data["categories"]["system"] is False


async def test_broadcast_delivers_to_target_users(client: AsyncClient, admin, user_a, user_b):
    resp = await client.post(
        "/api/notifications/broadcast",
        json={"title": "Hi both", "user_ids": [user_a["id"], user_b["id"]]},
        headers=admin["headers"],
    )
    assert resp.status_code == 200
    assert resp.json()["delivered"] == 2

    for h in (user_a["headers"], user_b["headers"]):
        listing = await client.get("/api/notifications", headers=h)
        assert any(i["title"] == "Hi both" for i in listing.json()["items"])