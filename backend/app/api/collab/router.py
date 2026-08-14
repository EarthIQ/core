"""
Collaboration WebSocket Router
Endpoint: /api/collab/ws/{project_id}?token=<jwt>

Authentication via query param because HTTP Authorization headers
are not supported in the WebSocket upgrade handshake.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.collab.manager import manager
from app.core.db import AsyncSessionLocal
from app.core.security import JWTError, decode_access_token
from app.api.auth.service import get_user_by_id
from app.api.projects.service import get_project_by_id, compute_user_permission

logger = logging.getLogger(__name__)
router = APIRouter(tags=["collaboration"])


@router.websocket("/ws/{project_id}")
async def collab_ws(
    websocket: WebSocket,
    project_id: str,
    token: str = Query(..., description="JWT access token"),
):
    """
    WebSocket presence endpoint for multi-user map collaboration.

    Flow:
    1. Authenticate user from ?token= query param
    2. Validate the user has at least read access to the project
    3. Broadcast join event to all collaborators in the room
    4. Relay presence updates (cursor + viewport) from this client
    5. Broadcast leave on disconnect
    """
    async with AsyncSessionLocal() as db:
        # 1. Authenticate
        try:
            payload = decode_access_token(token)
            user_id: str = payload["sub"]
        except (JWTError, KeyError):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        user = await get_user_by_id(db, user_id)
        if not user or not user.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # 2. Validate project access (owner OR group access OR superuser = any non-None permission)
        project = await get_project_by_id(db, project_id)
        if not project or compute_user_permission(project, user) is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        email = user.email
        full_name = user.full_name

    # 3. Connect to the room
    await manager.connect(project_id, user_id, email, full_name, websocket)

    try:
        # 4. Message loop
        while True:
            raw = await websocket.receive_text()
            await manager.handle_message(project_id, user_id, raw)
    except WebSocketDisconnect:
        pass
    finally:
        # 5. Disconnect and notify peers
        await manager.disconnect(project_id, user_id)
