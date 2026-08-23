"""Unit tests for the notifications Pydantic schemas."""
from __future__ import annotations

from app.api.notifications import schemas


def test_notification_create_defaults():
    body = schemas.NotificationCreate(title="Hi", user_id="u1")
    assert body.title == "Hi"
    assert body.category == "system"
    assert body.kind == "info"
    assert body.body is None
    assert body.payload is None


def test_broadcast_defaults_to_all_users():
    body = schemas.NotificationBroadcast(title="Hi all")
    assert body.user_ids == []
    assert body.respect_preferences is True


def test_read_schema_roundtrip():
    n = schemas.NotificationRead(
        id="r1",
        message_id="m1",
        category="project",
        kind="success",
        title="Shared",
        body="A shared a project",
        payload={"project_id": "p1"},
        source="alice",
        link="/projects/p1",
        read=False,
        read_at=None,
        created_at="2026-01-01T00:00:00Z",
    )
    dumped = n.model_dump()
    assert dumped["category"] == "project"
    assert dumped["payload"] == {"project_id": "p1"}
    assert dumped["read"] is False


def test_category_vocab():
    assert "system" in schemas.CATEGORIES
    assert "project" in schemas.CATEGORIES
    assert set(schemas.DEFAULT_CATEGORY_PREFS) == set(schemas.CATEGORIES)