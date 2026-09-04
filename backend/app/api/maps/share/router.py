"""FastAPI router for map & project sharing.

Mounted at:  /api/v1/maps/{map_id}/share          (via main.py include)
            /api/v1/projects/{project_id}/share  (via main.py include)
Additional:  /api/v1/people             (user search, mounted on the app)
             /api/v1/invite/accept      (token acceptance, any entity)
             /api/v1/maps/invite/accept (legacy alias)
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

# ── People search (no entity id needed) ───────────────────────────────────────

@router.get("/people", response_model=List[s.PeopleSearchResult], summary="Search users for share autocomplete")
async def search_people(
    q: str = Query("", description="Search term (email or name)"),
    entity_id: Optional[str] = Query(None, description="Map or project id — exclude users already on this entity"),
    map_id: Optional[str] = Query(None, description="Legacy alias for entity_id"),
    db: AsyncSession = Depends(get_db),
    _actor: User = Depends(get_current_user),
):
    return await svc.search_people(db, q, entity_id=entity_id or map_id)


# ── Invite accept (token-based, works for maps and projects, requires login) ──

@router.get(
    "/invite/accept",
    response_model=s.InviteAcceptRead,
    summary="Accept a map or project invitation via one-time token",
)
async def accept_invite(
    token: str = Query(..., description="One-time invite token from email link"),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await svc.accept_invite(db, token, actor)


# Legacy alias — same handler as above
@router.get(
    "/maps/invite/accept",
    response_model=s.InviteAcceptRead,
    include_in_schema=False,
    summary="Accept an invitation via one-time token (legacy)",
)
async def accept_invite_legacy(
    token: str = Query(..., description="One-time invite token from email link"),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await svc.accept_invite(db, token, actor)


# ── Access requests (owner approval, token-based) ─────────────────────────────

@router.get(
    "/access/request",
    response_model=s.AccessRequestRead,
    summary="Fetch an access request via the owner approval token",
)
async def get_access_request(
    token: str = Query(..., description="Approval token from the request email"),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await svc.get_access_request(db, token, actor)


@router.post(
    "/access/request/grant",
    response_model=s.AccessRequestRead,
    summary="Grant the requested access (owner only)",
)
async def grant_access(
    body: s.GrantAccessBody,
    token: str = Query(..., description="Approval token from the request email"),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await svc.grant_access(db, token, actor, body.role)


@router.post(
    "/access/request/deny",
    response_model=s.AccessRequestRead,
    summary="Decline an access request (owner only)",
)
async def deny_access_request(
    token: str = Query(..., description="Approval token from the request email"),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await svc.deny_access(db, token, actor)


# ── Per-entity share routes (mounted for both maps and projects) ─────────────

entity_share_router = APIRouter(tags=["share"])

# Backwards-compatible alias (main.py and external code may import either name)
map_share_router = entity_share_router


@entity_share_router.get(
    "",
    response_model=s.ShareStateRead,
    summary="Get full share state for a map or project",
)
async def get_share_state(
    entity_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await svc.get_share_state(db, entity_id, actor)


@entity_share_router.post(
    "/invite",
    response_model=List[s.AccessEntryRead],
    status_code=201,
    summary="Invite users by email",
)
async def invite(
    entity_id: str,
    body: s.InviteRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await svc.invite(db, entity_id, body, actor)


@entity_share_router.post(
    "/request",
    response_model=s.AccessRequestRead,
    status_code=201,
    summary="Request access to this map or project (notifies the owner)",
)
async def request_access(
    entity_id: str,
    body: s.RequestAccessBody,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await svc.request_access(db, entity_id, body, actor)


@entity_share_router.patch(
    "/{entry_id}",
    status_code=204,
    summary="Update a user's role",
)
async def update_role(
    entity_id: str,
    entry_id: str,
    body: s.UpdateRoleRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    await svc.update_role(db, entity_id, entry_id, body.role, actor)


@entity_share_router.delete(
    "/{entry_id}",
    status_code=204,
    summary="Remove a user's access",
)
async def remove_access(
    entity_id: str,
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    await svc.remove_access(db, entity_id, entry_id, actor)


@entity_share_router.post(
    "/transfer",
    status_code=204,
    summary="Transfer ownership to another user",
)
async def transfer_ownership(
    entity_id: str,
    body: s.TransferOwnershipRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    await svc.transfer_ownership(db, entity_id, body.entry_id, actor)


@entity_share_router.put(
    "/general",
    status_code=204,
    summary="Update general/link access mode",
)
async def update_general_access(
    entity_id: str,
    body: s.UpdateGeneralAccessRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    await svc.update_general_access(db, entity_id, body, actor)


@entity_share_router.put(
    "/settings",
    status_code=204,
    summary="Update share settings (editorsCanShare, viewersCanDownload)",
)
async def update_share_settings(
    entity_id: str,
    body: s.UpdateShareSettingsRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    await svc.update_share_settings(db, entity_id, body, actor)
