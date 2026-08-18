"""FastAPI router for map sharing.

Mounted at:  /api/maps/{map_id}/share   (via main.py include)
Additional:  /api/people               (user search, mounted on maps router)
             /api/maps/invite/accept   (token acceptance)
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.api.auth.models import User
from app.api.auth.router import get_current_user
from app.api.maps.share import schemas as s
from app.api.maps.share import service as svc

router = APIRouter(tags=["share"])

# ── People search (no map_id needed) ─────────────────────────────────────────

@router.get("/people", response_model=List[s.PeopleSearchResult], summary="Search users for share autocomplete")
async def search_people(
    q: str = Query("", description="Search term (email or name)"),
    map_id: Optional[str] = Query(None, description="Exclude users already on this map"),
    db: AsyncSession = Depends(get_db),
    _actor: User = Depends(get_current_user),
):
    return await svc.search_people(db, q, map_id=map_id)


# ── Invite accept (token-based, public but requires login) ────────────────────

@router.get(
    "/maps/invite/accept",
    response_model=s.AccessEntryRead,
    summary="Accept a map invitation via one-time token",
)
async def accept_invite(
    token: str = Query(..., description="One-time invite token from email link"),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await svc.accept_invite(db, token, actor)


# ── Per-map share routes ──────────────────────────────────────────────────────

map_share_router = APIRouter(tags=["share"])


@map_share_router.get(
    "",
    response_model=s.ShareStateRead,
    summary="Get full share state for a map",
)
async def get_share_state(
    map_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await svc.get_share_state(db, map_id, actor)


@map_share_router.post(
    "/invite",
    response_model=List[s.AccessEntryRead],
    status_code=201,
    summary="Invite users by email",
)
async def invite(
    map_id: str,
    body: s.InviteRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await svc.invite(db, map_id, body, actor)


@map_share_router.patch(
    "/{entry_id}",
    status_code=204,
    summary="Update a user's role on the map",
)
async def update_role(
    map_id: str,
    entry_id: str,
    body: s.UpdateRoleRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    await svc.update_role(db, map_id, entry_id, body.role, actor)


@map_share_router.delete(
    "/{entry_id}",
    status_code=204,
    summary="Remove a user's access to the map",
)
async def remove_access(
    map_id: str,
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    await svc.remove_access(db, map_id, entry_id, actor)


@map_share_router.post(
    "/transfer",
    status_code=204,
    summary="Transfer map ownership to another user",
)
async def transfer_ownership(
    map_id: str,
    body: s.TransferOwnershipRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    await svc.transfer_ownership(db, map_id, body.entry_id, actor)


@map_share_router.put(
    "/general",
    status_code=204,
    summary="Update general/link access mode",
)
async def update_general_access(
    map_id: str,
    body: s.UpdateGeneralAccessRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    await svc.update_general_access(db, map_id, body, actor)


@map_share_router.put(
    "/settings",
    status_code=204,
    summary="Update share settings (editorsCanShare, viewersCanDownload)",
)
async def update_share_settings(
    map_id: str,
    body: s.UpdateShareSettingsRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    await svc.update_share_settings(db, map_id, body, actor)
