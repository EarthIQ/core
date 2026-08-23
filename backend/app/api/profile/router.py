"""Profile / Organization / Preferences — REST Router (core).

Mounted under ``/api/profile`` (see ``app.main``). All endpoints authenticate the
*current* user via the core ``get_current_user`` dependency (single source of
truth for auth) and are self-service unless otherwise noted.

Endpoints
---------
  GET    /me                    → my full profile
  PUT    /me                    → update my profile (bio, avatar, title, ...)
  POST   /me/password           → change my password
  GET    /me/preferences        → my UI preferences (theme, units, basemap, ...)
  PUT    /me/preferences        → update my UI preferences

  GET    /organizations                 → organizations I belong to (superuser: all)
  POST   /organizations                 → create an organization (I become owner)
  GET    /organizations/{org_id}        → org detail + my role
  PUT    /organizations/{org_id}        → update org (owner/admin)
  DELETE /organizations/{org_id}        → delete org (owner/admin)
  POST   /organizations/{org_id}/primary   → set as my primary org
  GET    /organizations/{org_id}/members   → list members
  POST   /organizations/{org_id}/members   → add member by email (owner/admin)
  PUT    /organizations/{org_id}/members/{user_id} → change a member's role
  DELETE /organizations/{org_id}/members/{user_id} → remove a member (owner/admin)
  DELETE /organizations/{org_id}/me     → leave this organization
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.models import User
from app.api.auth.router import get_current_user
from app.core.db import get_db

from . import schemas, service

router = APIRouter(tags=["profile"])


# ── Request bodies not part of the shared schemas ─────────────────────────────

class AddMemberRequest(BaseModel):
    email: EmailStr
    role: str = Field(default="member", pattern="^(owner|admin|member|viewer)$")


class SetPrimaryRequest(BaseModel):
    organization_id: Optional[str] = None


# ── My profile ─────────────────────────────────────────────────────────────────

@router.get("/me", response_model=schemas.ProfileRead, summary="Get my profile")
async def my_profile(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await service.get_profile(db, user)


@router.put("/me", response_model=schemas.ProfileRead, summary="Update my profile")
async def update_my_profile(
    body: schemas.ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.update_profile(db, user, body)


@router.post(
    "/me/password",
    response_model=schemas.ChangePasswordResponse,
    status_code=status.HTTP_200_OK,
    summary="Change my password",
)
async def change_my_password(
    body: schemas.ChangePassword,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.change_password(db, user, body)
    return {"ok": True}


# ── My preferences ─────────────────────────────────────────────────────────────

@router.get(
    "/me/preferences",
    response_model=schemas.PreferencesRead,
    summary="Get my UI preferences",
)
async def get_my_preferences(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    return await service.get_preferences(db, user.id)


@router.put(
    "/me/preferences",
    response_model=schemas.PreferencesRead,
    summary="Update my UI preferences",
)
async def update_my_preferences(
    body: schemas.PreferencesUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.update_preferences(db, user.id, body)


# ── Organizations ──────────────────────────────────────────────────────────────

@router.get(
    "/organizations",
    response_model=List[schemas.OrganizationRead],
    summary="List my organizations (superuser: all)",
)
async def list_orgs(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await service.list_my_organizations(db, user)


@router.post(
    "/organizations",
    response_model=schemas.OrganizationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create an organization",
)
async def create_org(
    body: schemas.OrganizationCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_organization(db, user, body)


@router.get(
    "/organizations/{org_id}",
    response_model=schemas.OrganizationRead,
    summary="Get an organization",
)
async def get_org(
    org_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await service._get_org_or_404(db, org_id)
    return service._org_to_read(
        db,
        org,
        current_user_id=user.id,
        current_user_is_superuser=user.is_superuser,
        primary_org_id=user.primary_organization_id,
    )


@router.put(
    "/organizations/{org_id}",
    response_model=schemas.OrganizationRead,
    summary="Update an organization (owner/admin)",
)
async def update_org(
    org_id: str,
    body: schemas.OrganizationUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.update_organization(db, user, org_id, body)


@router.delete(
    "/organizations/{org_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an organization (owner/admin)",
)
async def delete_org(
    org_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_organization(db, user, org_id)
    return None


@router.post(
    "/organizations/{org_id}/primary",
    response_model=schemas.OrganizationRead,
    summary="Set this as my primary organization",
)
async def set_primary(
    org_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.set_primary_organization(db, user, org_id)


# ── Membership ─────────────────────────────────────────────────────────────────

@router.get(
    "/organizations/{org_id}/members",
    response_model=List[dict],
    summary="List members of an organization",
)
async def list_members(
    org_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service._get_org_or_404(db, org_id)
    return await service.list_members(db, org_id)


@router.post(
    "/organizations/{org_id}/members",
    response_model=List[dict],
    summary="Add a member by email (owner/admin)",
)
async def add_member(
    org_id: str,
    body: AddMemberRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.add_member_by_email(db, user, org_id, body.email, body.role)


@router.put(
    "/organizations/{org_id}/members/{member_id}",
    response_model=List[dict],
    summary="Change a member's role (owner/admin)",
)
async def change_role(
    org_id: str,
    member_id: str,
    body: schemas.OrgMemberUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.update_member_role(db, user, org_id, member_id, body.role)


@router.delete(
    "/organizations/{org_id}/members/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a member (owner/admin)",
)
async def remove_member(
    org_id: str,
    member_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.remove_member(db, user, org_id, member_id)
    return None


@router.delete(
    "/organizations/{org_id}/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Leave an organization",
)
async def leave_org(
    org_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.leave_organization(db, user, org_id)
    return None