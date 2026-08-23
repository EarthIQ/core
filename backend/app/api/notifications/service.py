"""
Notifications — Service layer (core).

Pure data + business logic. Takes an ``AsyncSession`` and returns domain
objects / schema instances. It does **not** commit — the caller owns the
transaction (the core ``get_db`` dependency commits at the end of each request).

The real-time fan-out to connected clients is the *router's* job (see
``hub.py``) so that the service stays transport-agnostic and testable.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from . import schemas
from .models import (
    NotificationMessage,
    NotificationPreferences,
    NotificationRecipient,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Preferences helpers ────────────────────────────────────────────────────────

def _parse_categories(raw: Optional[str]) -> dict[str, bool]:
    if not raw:
        return dict(schemas.DEFAULT_CATEGORY_PREFS)
    try:
        data = json.loads(raw)
        if not isinstance(data, dict):
            return dict(schemas.DEFAULT_CATEGORY_PREFS)
        # Merge over defaults so new categories default to "on".
        out = dict(schemas.DEFAULT_CATEGORY_PREFS)
        out.update({str(k): bool(v) for k, v in data.items()})
        return out
    except (json.JSONDecodeError, TypeError):
        return dict(schemas.DEFAULT_CATEGORY_PREFS)


async def _get_preferences(db: AsyncSession, user_id: str) -> NotificationPreferences:
    """Return the user's preferences row, creating a default one if absent."""
    result = await db.execute(
        select(NotificationPreferences).where(NotificationPreferences.user_id == user_id)
    )
    prefs = result.scalar_one_or_none()
    if prefs is None:
        prefs = NotificationPreferences(
            user_id=user_id,
            enabled=True,
            categories=json.dumps(dict(schemas.DEFAULT_CATEGORY_PREFS)),
            toasts=True,
            sound=False,
        )
        db.add(prefs)
        await db.flush()
    return prefs


def _prefs_to_read(prefs: NotificationPreferences) -> schemas.PreferencesRead:
    return schemas.PreferencesRead(
        enabled=prefs.enabled,
        categories=_parse_categories(prefs.categories),
        toasts=prefs.toasts,
        sound=prefs.sound,
        updated_at=prefs.updated_at,
    )


def delivery_allowed(prefs: NotificationPreferences, category: str) -> bool:
    """Whether a user should receive a notification of this category."""
    if not prefs.enabled:
        return False
    cats = _parse_categories(prefs.categories)
    return cats.get(category, True)


# ── Serialization ──────────────────────────────────────────────────────────────

def _parse_payload(raw: Optional[str]) -> Optional[dict[str, Any]]:
    if raw in (None, ""):
        return None
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {"value": data}
    except (json.JSONDecodeError, TypeError):
        return None


def recipient_to_read(recipient: NotificationRecipient) -> schemas.NotificationRead:
    msg: NotificationMessage = recipient.message
    return schemas.NotificationRead(
        id=recipient.id,
        message_id=msg.id,
        category=msg.category,
        kind=msg.kind,
        title=msg.title,
        body=msg.body,
        payload=_parse_payload(msg.payload),
        source=msg.source,
        link=msg.link,
        read=recipient.read,
        read_at=recipient.read_at,
        created_at=recipient.created_at,
    )


def _dump_payload(payload: Optional[dict[str, Any]]) -> Optional[str]:
    if payload is None:
        return None
    return json.dumps(payload)


# ── Create / deliver ───────────────────────────────────────────────────────────

async def create_single(
    db: AsyncSession,
    body: schemas.NotificationCreate,
) -> Optional[NotificationRecipient]:
    """Create a message and deliver it to one user. Skipped if disallowed."""
    prefs = await _get_preferences(db, body.user_id)
    if not delivery_allowed(prefs, body.category):
        return None

    msg = NotificationMessage(
        category=body.category,
        kind=body.kind,
        title=body.title,
        body=body.body,
        payload=_dump_payload(body.payload),
        source=body.source,
        link=body.link,
    )
    db.add(msg)
    await db.flush()

    recipient = NotificationRecipient(message_id=msg.id, user_id=body.user_id, read=False)
    db.add(recipient)
    await db.flush()
    await db.refresh(recipient)
    return recipient


async def create_broadcast(
    db: AsyncSession,
    body: schemas.NotificationBroadcast,
) -> List[NotificationRecipient]:
    """Create one message and deliver it to a set of users (or everyone)."""
    if body.user_ids:
        user_ids = list(dict.fromkeys(body.user_ids))  # de-dup, keep order
    else:
        from app.api.auth.models import User

        result = await db.execute(
            select(User.id).where(User.is_active.is_(True))
        )
        user_ids = list(result.scalars().all())

    if not user_ids:
        return []

    # Decide which recipients actually allow this category (if requested).
    allowed: List[str] = []
    if body.respect_preferences:
        for uid in user_ids:
            prefs = await _get_preferences(db, uid)
            if delivery_allowed(prefs, body.category):
                allowed.append(uid)
    else:
        allowed = user_ids

    if not allowed:
        return []

    msg = NotificationMessage(
        category=body.category,
        kind=body.kind,
        title=body.title,
        body=body.body,
        payload=_dump_payload(body.payload),
        source=body.source,
        link=body.link,
    )
    db.add(msg)
    await db.flush()

    recipients: List[NotificationRecipient] = []
    for uid in allowed:
        rec = NotificationRecipient(message_id=msg.id, user_id=uid, read=False)
        db.add(rec)
        recipients.append(rec)
    await db.flush()
    for rec in recipients:
        await db.refresh(rec)
    return recipients


# ── Read / list / counts ───────────────────────────────────────────────────────

async def list_for_user(
    db: AsyncSession,
    user_id: str,
    *,
    category: Optional[str] = None,
    unread_only: bool = False,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> schemas.NotificationListResponse:
    q = (
        select(NotificationRecipient)
        .join(NotificationMessage, NotificationRecipient.message_id == NotificationMessage.id)
        .where(NotificationRecipient.user_id == user_id)
    )
    if category:
        q = q.where(NotificationMessage.category == category)
    if unread_only:
        q = q.where(NotificationRecipient.read.is_(False))
    if search:
        needle = f"%{search}%"
        q = q.where(
            NotificationMessage.title.ilike(needle)
            | NotificationMessage.body.ilike(needle)
        )

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    total_pages = max(1, (total + page_size - 1) // page_size)

    rows = (
        (
            await db.execute(
                q.order_by(NotificationRecipient.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        )
        .scalars()
        .all()
    )
    items = [recipient_to_read(r) for r in rows]
    return schemas.NotificationListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


async def unread_count(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(
        select(func.count(NotificationRecipient.id)).where(
            NotificationRecipient.user_id == user_id,
            NotificationRecipient.read.is_(False),
        )
    )
    return int(result.scalar_one())


async def summary(db: AsyncSession, user_id: str) -> schemas.NotificationSummary:
    base = select(NotificationMessage).join(
        NotificationRecipient, NotificationRecipient.message_id == NotificationMessage.id
    ).where(NotificationRecipient.user_id == user_id)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()

    unread_q = base.where(NotificationRecipient.read.is_(False))
    unread = (await db.execute(select(func.count()).select_from(unread_q.subquery()))).scalar_one()

    by_category: dict[str, int] = {}
    for cat, cnt in (
        await db.execute(
            select(NotificationMessage.category, func.count())
            .join(NotificationRecipient, NotificationRecipient.message_id == NotificationMessage.id)
            .where(NotificationRecipient.user_id == user_id)
            .group_by(NotificationMessage.category)
        )
    ).all():
        by_category[cat] = cnt

    by_kind: dict[str, int] = {}
    for kind, cnt in (
        await db.execute(
            select(NotificationMessage.kind, func.count())
            .join(NotificationRecipient, NotificationRecipient.message_id == NotificationMessage.id)
            .where(NotificationRecipient.user_id == user_id)
            .group_by(NotificationMessage.kind)
        )
    ).all():
        by_kind[kind] = cnt

    return schemas.NotificationSummary(
        total=int(total),
        unread=int(unread),
        by_category=by_category,
        by_kind=by_kind,
    )


async def _get_owned_recipient(
    db: AsyncSession, user_id: str, recipient_id: str
) -> NotificationRecipient:
    result = await db.execute(
        select(NotificationRecipient).where(
            NotificationRecipient.id == recipient_id,
            NotificationRecipient.user_id == user_id,
        )
    )
    rec = result.scalar_one_or_none()
    if rec is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    return rec


async def mark_read(
    db: AsyncSession, user_id: str, recipient_id: str
) -> schemas.NotificationRead:
    rec = await _get_owned_recipient(db, user_id, recipient_id)
    rec.read = True
    rec.read_at = _utcnow()
    await db.flush()
    await db.refresh(rec)
    return recipient_to_read(rec)


async def mark_unread(
    db: AsyncSession, user_id: str, recipient_id: str
) -> schemas.NotificationRead:
    rec = await _get_owned_recipient(db, user_id, recipient_id)
    rec.read = False
    rec.read_at = None
    await db.flush()
    await db.refresh(rec)
    return recipient_to_read(rec)


async def mark_all_read(db: AsyncSession, user_id: str) -> int:
    now = _utcnow()
    result = await db.execute(
        select(NotificationRecipient).where(
            NotificationRecipient.user_id == user_id,
            NotificationRecipient.read.is_(False),
        )
    )
    recs = list(result.scalars().all())
    for rec in recs:
        rec.read = True
        rec.read_at = now
    await db.flush()
    return len(recs)


async def delete_notification(
    db: AsyncSession, user_id: str, recipient_id: str
) -> None:
    rec = await _get_owned_recipient(db, user_id, recipient_id)
    await db.delete(rec)
    await db.flush()


# ── Preferences ────────────────────────────────────────────────────────────────

async def get_preferences(
    db: AsyncSession, user_id: str
) -> schemas.PreferencesRead:
    prefs = await _get_preferences(db, user_id)
    await db.refresh(prefs)
    return _prefs_to_read(prefs)


async def update_preferences(
    db: AsyncSession, user_id: str, body: schemas.PreferencesUpdate
) -> schemas.PreferencesRead:
    prefs = await _get_preferences(db, user_id)
    if body.enabled is not None:
        prefs.enabled = body.enabled
    if body.toasts is not None:
        prefs.toasts = body.toasts
    if body.sound is not None:
        prefs.sound = body.sound
    if body.categories is not None:
        merged = dict(_parse_categories(prefs.categories))
        merged.update({str(k): bool(v) for k, v in body.categories.items()})
        prefs.categories = json.dumps(merged)
    prefs.updated_at = _utcnow()
    await db.flush()
    await db.refresh(prefs)
    return _prefs_to_read(prefs)