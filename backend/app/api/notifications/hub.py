"""
Notifications — Real-time hub (core).

An in-memory, per-user WebSocket registry (mirrors the core ``collab`` manager).
When a notification is created, the router calls :meth:`NotificationHub.push`
to fan the payload out to every live connection owned by the target users.

Design notes
------------
* asyncio is single-threaded, so the ``dict`` registry needs no locks.
* A user may have several open tabs; every socket for that user receives the push.
* Dead sockets are cleaned up lazily on send failure (same approach as core).
* The client authenticates via the ``?token=`` query param (WebSocket handshakes
  cannot carry an ``Authorization`` header).
"""
from __future__ import annotations

import json
import logging
from typing import Any, Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class NotificationHub:
    """Tracks live notification sockets per user id."""

    def __init__(self) -> None:
        # user_id -> list[WebSocket]
        self._sockets: dict[str, list[WebSocket]] = {}

    # ── Lifecycle ──────────────────────────────────────────────────────────────

    def register(self, user_id: str, websocket: WebSocket) -> None:
        self._sockets.setdefault(user_id, []).append(websocket)
        logger.info("notif WS connect: user=%s total=%d", user_id, len(self._sockets[user_id]))

    def unregister(self, user_id: str, websocket: WebSocket) -> None:
        socks = self._sockets.get(user_id, [])
        if websocket in socks:
            socks.remove(websocket)
        if not socks:
            self._sockets.pop(user_id, None)
        logger.info("notif WS disconnect: user=%s", user_id)

    def online_users(self) -> list[str]:
        return [uid for uid, socks in self._sockets.items() if socks]

    # ── Push ───────────────────────────────────────────────────────────────────

    async def push(
        self,
        user_id: str,
        notification: dict[str, Any],
        unread_count: Optional[int] = None,
    ) -> None:
        """Send a new-notification event to one user's live sockets."""
        payload = {
            "type": "notification:new",
            "notification": notification,
            "unread_count": unread_count,
        }
        await self._broadcast_to(user_id, payload)

    async def _broadcast_to(self, user_id: str, payload: dict[str, Any]) -> None:
        socks = list(self._sockets.get(user_id, []))
        dead: list[WebSocket] = []
        for ws in socks:
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.unregister(user_id, ws)

    def clear(self) -> None:
        """Drop all tracked sockets (used by tests)."""
        self._sockets.clear()


# Singleton shared across the app (and importable by other modules to push).
hub = NotificationHub()