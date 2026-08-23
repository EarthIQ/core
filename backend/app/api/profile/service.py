"""Profile / Organization / Preferences — Service layer (core).

Pure business logic operating on an ``AsyncSession``. Does **not** commit — the
caller (the ``get_db`` dependency / router) owns the transaction.
"""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.models import User
from app.core.security import hash_password, verify_password

from . import schemas
from .models import Organization, UserOrganization, UserPreferences

_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _slugify(value: str) -> str:
    """Turn an arbitrary name into a stable, URL-safe slug."""
    base = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if not base:
        base = "org"
    return f"{base}-{uuid.uuid4().hex[:6]}"


# ── User profile (self-service) ────────────────────────────────────────────────

async def get_profile(db: AsyncSession, user: User) -> schemas.ProfileRead:
    return schemas.ProfileRead.model_validate(user)


async def update_profile(db: AsyncSession, user: User, data: schemas.ProfileUpdate) -> schemas.ProfileRead:
    payload = data.model_dump(exclude_unset=True)
    for field, value in payload.items():
        setattr(user, field, value)
    await db.flush()
    await db.refresh(user)
    return schemas.ProfileRead.model_validate(user)


async def change_password(db: AsyncSession, user: User, body: schemas.ChangePassword) -> None:
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current one",
        )
    user.hashed_password = hash_password(body.new_password)
    await db.flush()


# ── Preferences ─────────────────────────────────────────────────────────────────

async def _get_preferences(db: AsyncSession, user_id: str) -> UserPreferences:
    result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == user_id)
    )
    prefs = result.scalar_one_or_none()
    if prefs is None:
        prefs = UserPreferences(user_id=user_id)
        db.add(prefs)
        await db.flush()
    return prefs


def _prefs_to_read(p: UserPreferences) -> schemas.PreferencesRead:
    extra: Dict[str, Any] = {}
    if p.extra:
        try:
            parsed = json.loads(p.extra)
            if isinstance(parsed, dict):
                extra = parsed
        except (json.JSONDecodeError, TypeError):
            extra = {}
    return schemas.PreferencesRead(
        theme_mode=p.theme_mode,
        map_units=p.map_units,
        default_basemap=p.default_basemap,
        accent_color=p.accent_color,
        compact_mode=p.compact_mode,
        font_scale=p.font_scale,
        extra=extra,
        updated_at=p.updated_at,
    )


async def get_preferences(db: AsyncSession, user_id: str) -> schemas.PreferencesRead:
    prefs = await _get_preferences(db, user_id)
    await db.refresh(prefs)
    return _prefs_to_read(prefs)


async def update_preferences(
    db: AsyncSession, user_id: str, body: schemas.PreferencesUpdate
) -> schemas.PreferencesRead:
    prefs = await _get_preferences(db, user_id)
    if body.theme_mode is not None:
        prefs.theme_mode = body.theme_mode
    if body.map_units is not None:
        prefs.map_units = body.map_units
    if body.default_basemap is not None:
        prefs.default_basemap = body.default_basemap
    if body.accent_color is not None:
        prefs.accent_color = body.accent_color
    if body.compact_mode is not None:
        prefs.compact_mode = body.compact_mode
    if body.font_scale is not None:
        prefs.font_scale = body.font_scale
    if body.extra is not None:
        prefs.extra = json.dumps(body.extra)
    prefs.updated_at = _utcnow()
    await db.flush()
    await db.refresh(prefs)
    return _prefs_to_read(prefs)


# ── Organizations ──────────────────────────────────────────────────────────────

def _parse_meta(raw: Optional[str]) -> Optional[Dict[str, Any]]:
    if raw in (None, ""):
        return None
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except (json.JSONDecodeError, TypeError):
        return None


def _org_to_read(
    db: AsyncSession,
    org: Organization,
    *,
    current_user_id: Optional[str] = None,
    current_user_is_superuser: bool = False,
    primary_org_id: Optional[str] = None,
) -> schemas.OrganizationRead:
    members = list(org.members or [])
    my_role: Optional[str] = None
    if current_user_id:
        for m in members:
            if m.user_id == current_user_id:
                my_role = m.role
                break
        # Superusers implicitly have full control of every org they can see.
        if my_role is None and current_user_is_superuser:
            my_role = "admin"
    return schemas.OrganizationRead(
        id=org.id,
        name=org.name,
        slug=org.slug,
        description=org.description,
        industry=org.industry,
        website=org.website,
        logo_url=org.logo_url,
        location=org.location,
        accent_color=org.accent_color,
        meta=_parse_meta(org.meta),
        created_at=org.created_at,
        updated_at=org.updated_at,
        member_count=len(members),
        my_role=my_role,
        is_primary=(primary_org_id is not None and org.id == primary_org_id),
    )


def _membership(org: Organization, user_id: str) -> Optional[UserOrganization]:
    for m in org.members or []:
        if m.user_id == user_id:
            return m
    return None


def _require_org_role(user: User, org: Organization) -> None:
    """Raise 403 unless the user may manage the org (owner/admin or superuser)."""
    if user.is_superuser:
        return
    m = _membership(org, user.id)
    if m is None or m.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage this organization",
        )


async def _get_org_or_404(db: AsyncSession, org_id: str) -> Organization:
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return org


async def _org_by_slug_or_404(db: AsyncSession, slug: str) -> Organization:
    result = await db.execute(select(Organization).where(Organization.slug == slug))
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return org


async def list_my_organizations(
    db: AsyncSession, user: User, *, include_all: bool = False
) -> List[schemas.OrganizationRead]:
    """Organizations the user belongs to, plus (for superusers) every org.

    ``include_all`` (used by superusers) exposes every organization so admins can
    manage any workspace; non-membership is still reflected in ``my_role``.
    """
    membership = (
        select(UserOrganization)
        .where(UserOrganization.user_id == user.id)
        .order_by(UserOrganization.joined_at.desc())
    )
    if user.is_superuser or include_all:
        org_ids = [user_id for user_id in (await db.execute(select(Organization.id))).scalars().all()]
        if not org_ids:
            # no organizations at all
            orgs: List[Organization] = []
        else:
            orgs = list((await db.execute(select(Organization).where(Organization.id.in_(org_ids)))).scalars().all())
    else:
        memberships = list((await db.execute(membership)).scalars().all())
        if not memberships:
            return []
        org_ids = [m.organization_id for m in memberships]
        orgs = list((await db.execute(select(Organization).where(Organization.id.in_(org_ids)))).scalars().all())

    out: List[schemas.OrganizationRead] = []
    for org in orgs:
        out.append(
            _org_to_read(
                db,
                org,
                current_user_id=user.id,
                current_user_is_superuser=user.is_superuser,
                primary_org_id=user.primary_organization_id,
            )
        )
    return out


async def create_organization(
    db: AsyncSession, user: User, body: schemas.OrganizationCreate
) -> schemas.OrganizationRead:
    name = body.name.strip()
    slug = _slugify(name)
    existing = await db.execute(select(Organization).where(Organization.slug == slug))
    if existing.scalar_one_or_none():
        slug = _slugify(name)

    org = Organization(
        name=name,
        slug=slug,
        description=body.description,
        industry=body.industry,
        website=body.website,
        logo_url=body.logo_url,
        location=body.location,
        accent_color=body.accent_color,
        meta=json.dumps(body.meta) if body.meta else None,
    )
    db.add(org)
    await db.flush()

    # Creator becomes the owner.
    db.add(UserOrganization(user_id=user.id, organization_id=org.id, role="owner"))
    await db.flush()

    # First org becomes the user's primary automatically.
    if user.primary_organization_id is None:
        user.primary_organization_id = org.id
        await db.flush()

    org = await _get_org_or_404(db, org.id)
    return _org_to_read(
        db,
        org,
        current_user_id=user.id,
        current_user_is_superuser=user.is_superuser,
        primary_org_id=user.primary_organization_id,
    )


async def update_organization(
    db: AsyncSession, user: User, org_id: str, body: schemas.OrganizationUpdate
) -> schemas.OrganizationRead:
    org = await _get_org_or_404(db, org_id)
    _require_org_role(user, org)

    if body.name is not None:
        org.name = body.name.strip()
    if body.description is not None:
        org.description = body.description
    if body.industry is not None:
        org.industry = body.industry
    if body.website is not None:
        org.website = body.website
    if body.logo_url is not None:
        org.logo_url = body.logo_url
    if body.location is not None:
        org.location = body.location
    if body.accent_color is not None:
        org.accent_color = body.accent_color
    if body.meta is not None:
        org.meta = json.dumps(body.meta)
    org.updated_at = _utcnow()
    await db.flush()

    org = await _get_org_or_404(db, org.id)
    return _org_to_read(
        db,
        org,
        current_user_id=user.id,
        current_user_is_superuser=user.is_superuser,
        primary_org_id=user.primary_organization_id,
    )


async def set_primary_organization(db: AsyncSession, user: User, org_id: Optional[str]) -> schemas.OrganizationRead:
    if org_id is None:
        user.primary_organization_id = None
        await db.flush()
        # Return the (now none) primary — pick first membership.
        my = await list_my_organizations(db, user)
        if not my:
            raise HTTPException(status_code=400, detail="You have no organizations")
        return my[0]
    org = await _get_org_or_404(db, org_id)
    m = _membership(org, user.id)
    if m is None and not user.is_superuser:
        raise HTTPException(status_code=400, detail="You are not a member of this organization")
    user.primary_organization_id = org.id
    await db.flush()
    return _org_to_read(
        db,
        org,
        current_user_id=user.id,
        current_user_is_superuser=user.is_superuser,
        primary_org_id=user.primary_organization_id,
    )


# ── Membership management ──────────────────────────────────────────────────────

async def list_members(db: AsyncSession, org_id: str) -> List[Dict[str, Any]]:
    org = await _get_org_or_404(db, org_id)
    # Query memberships directly (NOT ``org.members``): the relationship list is
    # cached by the identity map for the duration of the session, so it would be
    # stale right after ``add_member_by_email`` / ``remove_member`` flushed a
    # change in the *same* request.
    memberships = list(
        (
            await db.execute(
                select(UserOrganization)
                .where(UserOrganization.organization_id == org.id)
                .order_by(UserOrganization.joined_at.desc())
            )
        )
        .scalars()
        .all()
    )
    if not memberships:
        return []
    user_ids = [m.user_id for m in memberships]
    users = list(
        (await db.execute(select(User).where(User.id.in_(user_ids)))).scalars().all()
    )
    by_id = {u.id: u for u in users}
    out: List[Dict[str, Any]] = []
    for m in sorted(memberships, key=lambda x: x.joined_at, reverse=True):
        u = by_id.get(m.user_id)
        if u is None:
            continue
        out.append(
            {
                "user_id": m.user_id,
                "email": u.email,
                "full_name": u.full_name,
                "avatar_url": u.avatar_url,
                "role": m.role,
                "joined_at": m.joined_at,
            }
        )
    return out


async def add_member_by_email(
    db: AsyncSession, actor: User, org_id: str, email: str, role: str = "member"
) -> Dict[str, Any]:
    org = await _get_org_or_404(db, org_id)
    _require_org_role(actor, org)
    if role not in ("owner", "admin", "member", "viewer"):
        raise HTTPException(status_code=400, detail="Invalid role")

    target = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=404, detail="No user found with that email")
    if target.id == actor.id:
        return await list_members(db, org_id)  # no-op

    existing = _membership(org, target.id)
    if existing is None:
        db.add(UserOrganization(user_id=target.id, organization_id=org.id, role=role))
        await db.flush()
    return await list_members(db, org_id)


async def update_member_role(
    db: AsyncSession, actor: User, org_id: str, member_id: str, role: str
) -> Dict[str, Any]:
    org = await _get_org_or_404(db, org_id)
    _require_org_role(actor, org)
    if role not in ("owner", "admin", "member", "viewer"):
        raise HTTPException(status_code=400, detail="Invalid role")
    existing = _membership(org, member_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Member not found in this organization")
    # Protect ownership: an owner must always exist.
    if existing.role == "owner" and role != "owner":
        owner_count = sum(1 for m in org.members if m.role == "owner")
        if owner_count <= 1:
            raise HTTPException(status_code=400, detail="An organization must keep at least one owner")
    existing.role = role
    await db.flush()
    return await list_members(db, org_id)


async def remove_member(db: AsyncSession, actor: User, org_id: str, member_id: str) -> None:
    org = await _get_org_or_404(db, org_id)
    _require_org_role(actor, org)
    existing = _membership(org, member_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Member not found in this organization")
    if existing.role == "owner":
        owner_count = sum(1 for m in org.members if m.role == "owner")
        if owner_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the sole owner")
    await db.delete(existing)
    # If the removed user was the actor's primary org pointer, leave it (FK SET NULL handles deletion).
    await db.flush()


async def leave_organization(db: AsyncSession, user: User, org_id: str) -> None:
    org = await _get_org_or_404(db, org_id)
    existing = _membership(org, user.id)
    if existing is None:
        raise HTTPException(status_code=404, detail="You are not a member of this organization")
    if existing.role == "owner":
        owner_count = sum(1 for m in org.members if m.role == "owner")
        if owner_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="You are the sole owner; transfer ownership or delete the organization first",
            )
    await db.delete(existing)
    if user.primary_organization_id == org.id:
        user.primary_organization_id = None
    await db.flush()


async def delete_organization(db: AsyncSession, user: User, org_id: str) -> None:
    org = await _get_org_or_404(db, org_id)
    _require_org_role(user, org)
    await db.delete(org)
    await db.flush()