"""
Notifications — REST + WebSocket Router (core).

Mounted under ``/api/notifications`` (see ``app.main``).

REST endpoints (all authenticated as the *current* user unless noted)
-----------------------------------------------------------------------
  GET    /                       → list my notifications (filterable + paginated)
  GET    /summary                → counts + per-category / per-kind breakdown
  GET    /unread-count           → { "unread": <int> }  (lightweight badge source)
  POST   /                       → create + deliver a single notification (admin)
  POST   /broadcast              → create + deliver to many / all users (admin)
  POST   /{id}/read              → mark one as read
  POST   /{id}/unread            → mark one as unread
  POST   /read-all               → mark all as read → { "marked": <int> }
  DELETE /{id}                   → delete one of my notifications
  GET    /preferences            → my notification preferences
  PUT    /preferences            → update my notification preferences
  WS     /stream?token=<jwt>     → live push of new notifications for this user

Programmatic API for *other* modules
------------------------------------
Any module can fire a notification with ``app.api.notifications.router.emit(...)``
which persists it and pushes it to live clients in one call.
"""
from __future__ import annotations

import logging
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.models import User
from app.core.db import AsyncSessionLocal, get_db
from app.core.security import JWTError, decode_access_token

from . import schemas, service
from .hub import hub
from .models import NotificationRecipient

logger = logging.getLogger(__name__)
router = APIRouter()

# Reuse the core "current user" dependency (single source of truth for auth).
from app.api.auth.router import get_current_user  # noqa: E402


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _auth_ws(websocket: WebSocket) -> Optional[str]:
    """Authenticate a WebSocket via ?token= query param. Returns user id or None."""
    token = websocket.query_params.get("token")
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        user_id = payload["sub"]
    except (JWTError, KeyError):
        return None

    async with AsyncSessionLocal() as db:
        from app.api.auth.service import get_user_by_id

        user = await get_user_by_id(db, user_id)
        if not user or not user.is_active:
            return None
    return user_id


def _require_admin(user: User) -> User:
    if not user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return user


# ── Read endpoints (current user) ──────────────────────────────────────────────

@router.get(
    "",
    response_model=schemas.NotificationListResponse,
    summary="List my notifications",
    tags=["notifications"],
)
async def list_mine(
    category: Optional[str] = Query(None, description="Filter by category"),
    unread_only: bool = Query(False, description="Only unread"),
    search: Optional[str] = Query(None, description="Search title/body"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.list_for_user(
        db,
        user.id,
        category=category,
        unread_only=unread_only,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/summary",
    response_model=schemas.NotificationSummary,
    summary="Notification summary for the current user",
    tags=["notifications"],
)
async def summary(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.summary(db, user.id)


@router.get(
    "/unread-count",
    response_model=schemas.UnreadCountResponse,
    summary="Unread count (badge)",
    tags=["notifications"],
)
async def unread_count(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"unread": await service.unread_count(db, user.id)}


# ── Create / broadcast (admin) ─────────────────────────────────────────────────

@router.post(
    "",
    response_model=schemas.NotificationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create + deliver a notification to a user (admin)",
    tags=["notifications"],
)
async def create_single(
    body: schemas.NotificationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    recipient = await service.create_single(db, body)
    if recipient is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Notification not delivered (recipient preferences)",
        )
    # Real-time push to the live client of the recipient.
    payload = service.recipient_to_read(recipient).model_dump(mode="json")
    count = await service.unread_count(db, body.user_id)
    await hub.push(body.user_id, payload, unread_count=count)
    return payload


@router.post(
    "/broadcast",
    summary="Create + deliver to many / all users (admin)",
    response_model=schemas.BroadcastResponse,
    tags=["notifications"],
)
async def broadcast(
    body: schemas.NotificationBroadcast,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    recipients: List[NotificationRecipient] = await service.create_broadcast(db, body)
    # Push to every live recipient.
    for rec in recipients:
        payload = service.recipient_to_read(rec).model_dump(mode="json")
        count = await service.unread_count(db, rec.user_id)
        await hub.push(rec.user_id, payload, unread_count=count)
    return {"delivered": len(recipients)}


# ── Mutations (current user) ───────────────────────────────────────────────────

@router.post(
    "/read-all",
    summary="Mark all my notifications as read",
    response_model=schemas.ReadAllResponse,
    tags=["notifications"],
)
async def read_all(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    marked = await service.mark_all_read(db, user.id)
    return {"marked": marked}


@router.post(
    "/{notification_id}/read",
    response_model=schemas.NotificationRead,
    summary="Mark one notification as read",
    tags=["notifications"],
)
async def mark_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.mark_read(db, user.id, notification_id)


@router.post(
    "/{notification_id}/unread",
    response_model=schemas.NotificationRead,
    summary="Mark one notification as unread",
    tags=["notifications"],
)
async def mark_unread(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.mark_unread(db, user.id, notification_id)


@router.delete(
    "/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete one of my notifications",
    tags=["notifications"],
)
async def delete_one(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await service.delete_notification(db, user.id, notification_id)
    return None


# ── Preferences (current user) ─────────────────────────────────────────────────

@router.get(
    "/preferences",
    response_model=schemas.PreferencesRead,
    summary="Get my notification preferences",
    tags=["notifications"],
)
async def get_prefs(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.get_preferences(db, user.id)


@router.put(
    "/preferences",
    response_model=schemas.PreferencesRead,
    summary="Update my notification preferences",
    tags=["notifications"],
)
async def update_prefs(
    body: schemas.PreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await service.update_preferences(db, user.id, body)


# ── Real-time stream (WebSocket) ───────────────────────────────────────────────

@router.websocket("/stream")
async def stream(websocket: WebSocket) -> None:
    """
    Live notification stream for the authenticated user.

    Protocol (server → client):
      { "type": "connected" }
      { "type": "notification:new", "notification": {...}, "unread_count": <int> }

    The client must connect with ``?token=<jwt>``.
    """
    user_id = await _auth_ws(websocket)
    if user_id is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    hub.register(user_id, websocket)
    await websocket.send_text('{"type":"connected"}')

    try:
        # The client doesn't need to send anything; keep the socket open until it closes.
        while True:
            # Receive (clients may send "ping" to keep proxies alive).
            msg = await websocket.receive_text()
            if msg and msg.strip() in ("ping", "ping "):
                await websocket.send_text('{"type":"pong"}')
    except WebSocketDisconnect:
        pass
    finally:
        hub.unregister(user_id, websocket)


# ── Programmatic API for other modules ────────────────────────────────────────

async def emit(
    user_ids: List[str] | str,
    title: str,
    *,
    body: Optional[str] = None,
    category: str = "system",
    kind: str = "info",
    payload: Optional[dict[str, Any]] = None,
    source: Optional[str] = None,
    link: Optional[str] = None,
) -> int:
    """
    Fire a notification from any other module.

    Example::

        from app.api.notifications.router import emit
        await emit(["user-id-1", "user-id-2"], "Project shared with you",
                   body="Alice shared Rhine Basin", category="project", link="/projects/xyz")

    Returns the number of recipients actually delivered to (after preferences).
    This uses its own DB session and commits, so it is safe to call outside a
    request (e.g. from a background task).
    """
    user_list = [user_ids] if isinstance(user_ids, str) else list(user_ids)
    if not user_list:
        return 0

    body_obj = schemas.NotificationBroadcast(
        title=title,
        body=body,
        category=category,
        kind=kind,
        payload=payload,
        source=source or "module",
        link=link,
        user_ids=user_list,
        respect_preferences=True,
    )

    async with AsyncSessionLocal() as db:
        recipients = await service.create_broadcast(db, body_obj)
        await db.commit()
        # Capture serialised payloads before the session closes.
        pushed = [
            (rec.user_id, service.recipient_to_read(rec).model_dump(mode="json"))
            for rec in recipients
        ]
        counts = {uid: await service.unread_count(db, uid) for uid, _ in pushed}
        await db.commit()

    for uid, payload_json in pushed:
        await hub.push(uid, payload_json, unread_count=counts.get(uid))
    return len(recipients)


__all__ = ["router", "emit"]