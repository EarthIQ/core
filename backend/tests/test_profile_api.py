"""API integration tests — user profile, organizations, preferences over HTTP."""
from __future__ import annotations

from httpx import AsyncClient


# ── Auth gating ────────────────────────────────────────────────────────────────

async def test_profile_requires_auth(client: AsyncClient):
    assert (await client.get("/api/profile/me")).status_code in (401, 403)
    assert (await client.get("/api/profile/organizations")).status_code in (401, 403)


# ── Profile ────────────────────────────────────────────────────────────────────

async def test_get_and_update_my_profile(client: AsyncClient, user_a):
    h = user_a["headers"]

    got = await client.get("/api/profile/me", headers=h)
    assert got.status_code == 200
    body = got.json()
    assert body["email"] == "alice@eqcorp.com"
    assert body["bio"] is None

    updated = await client.put(
        "/api/profile/me",
        json={
            "full_name": "Alice Waters",
            "bio": "Hydrologist focused on watershed risk.",
            "job_title": "Senior Hydrologist",
            "location": "Amsterdam",
            "phone": "+31 20 1234 5678",
            "website": "https://alice.example.org",
            "preferred_timezone": "Europe/Amsterdam",
        },
        headers=h,
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["job_title"] == "Senior Hydrologist"
    assert updated.json()["bio"].startswith("Hydrologist")

    # Reflected on /me too (auth UserRead carries profile fields).
    me = await client.get("/api/auth/me", headers=h)
    assert me.json()["job_title"] == "Senior Hydrologist"


async def test_change_password_wrong_current(client: AsyncClient, user_a):
    resp = await client.post(
        "/api/profile/me/password",
        json={"current_password": "wrong", "new_password": "N3wPass!2024"},
        headers=user_a["headers"],
    )
    assert resp.status_code == 400


async def test_change_password_success_then_relogin(client: AsyncClient, user_a):
    new_pw = "N3wPass!2024"
    resp = await client.post(
        "/api/profile/me/password",
        json={"current_password": "S3curePass!2024", "new_password": new_pw},
        headers=user_a["headers"],
    )
    assert resp.status_code == 200, resp.text

    # Old password no longer works.
    bad = await client.post("/api/auth/token", json={"email": "alice@eqcorp.com", "password": "S3curePass!2024"})
    assert bad.status_code == 401

    # New password works.
    good = await client.post("/api/auth/token", json={"email": "alice@eqcorp.com", "password": new_pw})
    assert good.status_code == 200
    assert good.json()["access_token"]


# ── Preferences ────────────────────────────────────────────────────────────────

async def test_preferences_defaults_and_update(client: AsyncClient, user_a):
    h = user_a["headers"]
    got = await client.get("/api/profile/me/preferences", headers=h)
    assert got.status_code == 200
    assert got.json()["theme_mode"] == "dark"

    updated = await client.put(
        "/api/profile/me/preferences",
        json={"theme_mode": "light", "map_units": "imperial", "compact_mode": True, "extra": {"locale": "en"}},
        headers=h,
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["theme_mode"] == "light"
    assert updated.json()["map_units"] == "imperial"
    assert updated.json()["extra"]["locale"] == "en"


async def test_preferences_validation(client: AsyncClient, user_a):
    bad = await client.put(
        "/api/profile/me/preferences",
        json={"theme_mode": "neon"},
        headers=user_a["headers"],
    )
    assert bad.status_code == 422


# ── Organizations ──────────────────────────────────────────────────────────────

async def test_create_org_and_membership(client: AsyncClient, user_a):
    h = user_a["headers"]
    created = await client.post(
        "/api/profile/organizations",
        json={
            "name": "Watershed Watch",
            "description": "Monitoring river basins",
            "industry": "Environmental",
            "accent_color": "#22c55e",
            "meta": {"plan": "pro"},
        },
        headers=h,
    )
    assert created.status_code == 201, created.text
    org = created.json()
    assert org["name"] == "Watershed Watch"
    assert org["my_role"] == "owner"
    assert org["member_count"] == 1
    assert org["is_primary"] is True
    assert org["meta"]["plan"] == "pro"

    # Appears in my org list.
    listing = await client.get("/api/profile/organizations", headers=h)
    assert listing.status_code == 200
    assert len(listing.json()) == 1


async def test_org_crud_and_members(client: AsyncClient, user_a, user_b):
    h = user_a["headers"]

    created = await client.post(
        "/api/profile/organizations",
        json={"name": "Team A"},
        headers=h,
    )
    org_id = created.json()["id"]

    # Update (owner allowed).
    updated = await client.put(
        f"/api/profile/organizations/{org_id}",
        json={"description": "The A team"},
        headers=h,
    )
    assert updated.status_code == 200
    assert updated.json()["description"] == "The A team"

    # Add member by email (user_b).
    added = await client.post(
        f"/api/profile/organizations/{org_id}/members",
        json={"email": "bob@eqcorp.com", "role": "member"},
        headers=h,
    )
    assert added.status_code == 200, added.text
    members = added.json()
    assert len(members) == 2
    roles = {m["user_id"]: m["role"] for m in members}
    assert roles[user_b["id"]] == "member"

    # user_b sees it in their list and is a member.
    b_list = await client.get("/api/profile/organizations", headers=user_b["headers"])
    assert any(o["id"] == org_id and o["my_role"] == "member" for o in b_list.json())

    # user_b (a member, not admin) cannot manage the org.
    forbidden = await client.put(
        f"/api/profile/organizations/{org_id}",
        json={"description": "hijack"},
        headers=user_b["headers"],
    )
    assert forbidden.status_code == 403

    # user_b cannot be removed by self, but owner removes them.
    removed = await client.delete(
        f"/api/profile/organizations/{org_id}/members/{user_b['id']}",
        headers=h,
    )
    assert removed.status_code == 204


async def test_cannot_remove_sole_owner(client: AsyncClient, user_a):
    created = await client.post("/api/profile/organizations", json={"name": "Solo Org"}, headers=user_a["headers"])
    org_id = created.json()["id"]
    resp = await client.delete(
        f"/api/profile/organizations/{org_id}/members/{user_a['id']}",
        headers=user_a["headers"],
    )
    assert resp.status_code == 400


async def test_superuser_sees_all_orgs(client: AsyncClient, admin, user_a):
    # user_a creates an org they own; admin (superuser) should see it too.
    created = await client.post("/api/profile/organizations", json={"name": "A Org"}, headers=user_a["headers"])
    org_id = created.json()["id"]

    admin_list = await client.get("/api/profile/organizations", headers=admin["headers"])
    assert admin_list.status_code == 200
    ids = [o["id"] for o in admin_list.json()]
    assert org_id in ids


async def test_leave_organization(client: AsyncClient, user_a, user_b):
    created = await client.post("/api/profile/organizations", json={"name": "Shared"}, headers=user_a["headers"])
    org_id = created.json()["id"]
    await client.post(
        f"/api/profile/organizations/{org_id}/members",
        json={"email": "bob@eqcorp.com", "role": "member"},
        headers=user_a["headers"],
    )
    left = await client.delete(f"/api/profile/organizations/{org_id}/me", headers=user_b["headers"])
    assert left.status_code == 204

    b_list = await client.get("/api/profile/organizations", headers=user_b["headers"])
    assert all(o["id"] != org_id for o in b_list.json())


async def test_delete_org_cascades(client: AsyncClient, user_a):
    created = await client.post("/api/profile/organizations", json={"name": "Temp Org"}, headers=user_a["headers"])
    org_id = created.json()["id"]
    deleted = await client.delete(f"/api/profile/organizations/{org_id}", headers=user_a["headers"])
    assert deleted.status_code == 204

    gone = await client.get(f"/api/profile/organizations/{org_id}", headers=user_a["headers"])
    assert gone.status_code == 404