"""Tests for the notifications service layer (delivery, preferences, counts, mutations)."""
from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.api.notifications import schemas, service


async def test_create_single_delivers(db_session, user_a):
    rec = await service.create_single(
        db_session,
        schemas.NotificationCreate(title="Hi Alice", body="hello", user_id=user_a["id"]),
    )
    assert rec is not None
    assert rec.user_id == user_a["id"]
    assert rec.read is False


async def test_create_single_respects_disabled_category(db_session, user_a):
    await service.update_preferences(
        db_session, user_a["id"],
        schemas.PreferencesUpdate(categories={"system": False}),
    )
    rec = await service.create_single(
        db_session,
        schemas.NotificationCreate(title="Nope", category="system", user_id=user_a["id"]),
    )
    assert rec is None


async def test_create_single_respects_master_switch(db_session, user_a):
    await service.update_preferences(
        db_session, user_a["id"], schemas.PreferencesUpdate(enabled=False)
    )
    rec = await service.create_single(
        db_session,
        schemas.NotificationCreate(title="Nope", user_id=user_a["id"]),
    )
    assert rec is None


async def test_broadcast_to_all(db_session, user_a, user_b):
    recipients = await service.create_broadcast(
        db_session,
        schemas.NotificationBroadcast(title="Everyone"),
    )
    ids = {r.user_id for r in recipients}
    assert user_a["id"] in ids and user_b["id"] in ids


async def test_broadcast_to_specific_users_only(db_session, user_a, user_b):
    recipients = await service.create_broadcast(
        db_session,
        schemas.NotificationBroadcast(title="Only Bob", user_ids=[user_b["id"]]),
    )
    assert {r.user_id for r in recipients} == {user_b["id"]}


async def test_list_and_counts(db_session, user_a):
    for _ in range(3):
        await service.create_single(
            db_session,
            schemas.NotificationCreate(title="item", user_id=user_a["id"]),
        )
    result = await service.list_for_user(db_session, user_a["id"])
    assert result.total == 3
    assert len(result.items) == 3
    assert await service.unread_count(db_session, user_a["id"]) == 3


async def test_mark_read_and_unread(db_session, user_a):
    rec = await service.create_single(
        db_session, schemas.NotificationCreate(title="r", user_id=user_a["id"])
    )
    marked = await service.mark_read(db_session, user_a["id"], rec.id)
    assert marked.read is True
    assert await service.unread_count(db_session, user_a["id"]) == 0

    unmarked = await service.mark_unread(db_session, user_a["id"], rec.id)
    assert unmarked.read is False


async def test_mark_all_read(db_session, user_a):
    for _ in range(2):
        await service.create_single(
            db_session, schemas.NotificationCreate(title="r", user_id=user_a["id"])
        )
    marked = await service.mark_all_read(db_session, user_a["id"])
    assert marked == 2
    assert await service.unread_count(db_session, user_a["id"]) == 0


async def test_delete_owned(db_session, user_a):
    rec = await service.create_single(
        db_session, schemas.NotificationCreate(title="gone", user_id=user_a["id"])
    )
    await service.delete_notification(db_session, user_a["id"], rec.id)
    assert await service.unread_count(db_session, user_a["id"]) == 0


async def test_delete_foreign_raises(db_session, user_a, user_b):
    rec = await service.create_single(
        db_session, schemas.NotificationCreate(title="mine", user_id=user_a["id"])
    )
    with pytest.raises(HTTPException) as excinfo:
        await service.delete_notification(db_session, user_b["id"], rec.id)
    assert excinfo.value.status_code == 404


async def test_summary_breakdown(db_session, user_a):
    await service.create_single(
        db_session,
        schemas.NotificationCreate(title="p", category="project", user_id=user_a["id"]),
    )
    await service.create_single(
        db_session,
        schemas.NotificationCreate(title="s", category="system", user_id=user_a["id"]),
    )
    s = await service.summary(db_session, user_a["id"])
    assert s.total == 2
    assert s.unread == 2
    assert s.by_category.get("project") == 1
    assert s.by_category.get("system") == 1


async def test_preferences_roundtrip(db_session, user_a):
    prefs = await service.get_preferences(db_session, user_a["id"])
    assert prefs.enabled is True
    assert "system" in prefs.categories

    updated = await service.update_preferences(
        db_session,
        user_a["id"],
        schemas.PreferencesUpdate(enabled=False, toasts=False, categories={"project": False}),
    )
    assert updated.enabled is False
    assert updated.toasts is False
    assert updated.categories["project"] is False
    # Untouched categories remain on.
    assert updated.categories["system"] is True