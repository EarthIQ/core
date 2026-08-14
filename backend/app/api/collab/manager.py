"""
Collaboration Connection Manager
Manages in-memory WebSocket connections per project room.
"""
from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass, field
from typing import Any, Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)


@dataclass
class CollaboratorInfo:
    user_id: str
    email: str
    full_name: Optional[str]
    websocket: WebSocket
    cursor: Optional[dict] = None      # {"lng": float, "lat": float}
    viewport: Optional[dict] = None   # {"zoom": float, "center": {"lng": float, "lat": float}}


class ConnectionManager:
    """
    In-memory WebSocket room manager.
    Each project gets its own room keyed by project_id.
    Thread-safety: asyncio single-threaded — no locks needed.
    """

    def __init__(self):
        # project_id -> {user_id -> CollaboratorInfo}
        self._rooms: dict[str, dict[str, CollaboratorInfo]] = {}

    # ── Connection lifecycle ──────────────────────────────────────────────────

    async def connect(
        self,
        project_id: str,
        user_id: str,
        email: str,
        full_name: Optional[str],
        websocket: WebSocket,
    ) -> None:
        await websocket.accept()
        room = self._rooms.setdefault(project_id, {})
        room[user_id] = CollaboratorInfo(
            user_id=user_id,
            email=email,
            full_name=full_name,
            websocket=websocket,
        )
        logger.info("WS connect: user=%s project=%s total=%d", user_id, project_id, len(room))

        # Send the new user a snapshot of current collaborators
        await self._send_json(websocket, {
            "type": "snapshot",
            "collaborators": [
                self._collaborator_payload(c)
                for uid, c in room.items()
                if uid != user_id
            ],
        })

        # Notify all others that this user joined
        await self.broadcast(project_id, {
            "type": "join",
            "user_id": user_id,
            "email": email,
            "full_name": full_name,
        }, exclude=user_id)

    async def disconnect(self, project_id: str, user_id: str) -> None:
        room = self._rooms.get(project_id, {})
        room.pop(user_id, None)
        if not room:
            self._rooms.pop(project_id, None)
        logger.info("WS disconnect: user=%s project=%s", user_id, project_id)

        await self.broadcast(project_id, {
            "type": "leave",
            "user_id": user_id,
        })

    # ── Message handling ──────────────────────────────────────────────────────

    async def handle_message(
        self, project_id: str, user_id: str, raw: str
    ) -> None:
        try:
            msg: dict[str, Any] = json.loads(raw)
        except json.JSONDecodeError:
            return

        msg_type = msg.get("type")
        room = self._rooms.get(project_id, {})
        collab = room.get(user_id)
        if not collab:
            return

        if msg_type == "presence":
            collab.cursor = msg.get("cursor")
            collab.viewport = msg.get("viewport")
            await self.broadcast(project_id, {
                "type": "presence",
                **self._collaborator_payload(collab),
            }, exclude=user_id)

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _collaborator_payload(self, c: CollaboratorInfo) -> dict:
        return {
            "user_id": c.user_id,
            "email": c.email,
            "full_name": c.full_name,
            "cursor": c.cursor,
            "viewport": c.viewport,
        }

    async def broadcast(
        self, project_id: str, payload: dict, exclude: Optional[str] = None
    ) -> None:
        room = self._rooms.get(project_id, {})
        dead: list[str] = []
        for uid, collab in room.items():
            if uid == exclude:
                continue
            try:
                await self._send_json(collab.websocket, payload)
            except Exception:
                dead.append(uid)
        # Clean up dead connections
        for uid in dead:
            room.pop(uid, None)

    @staticmethod
    async def _send_json(ws: WebSocket, data: dict) -> None:
        await ws.send_text(json.dumps(data))


# Singleton instance shared across the app
manager = ConnectionManager()
