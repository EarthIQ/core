"""Share service — business logic for the map/project share system.

Roles hierarchy (highest → lowest):
  owner > editor > commenter > viewer

Permission enforcement:
  - Only the owner (or superuser) can transfer ownership or remove the owner entry.
  - Only owner (or editor if editorsCanShare=True) can manage access.

Entity support:
  - Both MapModel and ProjectModel are supported as shareable entities.
    The share router passes the entity ID; the service detects whether it is
    a map or a project and delegates accordingly.
"""
from __future__ import annotations

import secrets
import uuid
from typing import List, Optional, Union

from fastapi import HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.models import User
from app.api.maps.models import MapModel, MapUserAccess
from app.api.projects.models import ProjectModel, ProjectUserAccess
from app.api.maps.share.schemas import (
    AccessEntryRead,
    GeneralAccessRead,
    InviteRequest,
    ShareSettingsRead,
    ShareStateRead,
    UpdateGeneralAccessRequest,
    UpdateShareSettingsRequest,
    PeopleSearchResult,
    Role,
)

# ── Type alias for the two shareable entity types ─────────────────────────────
ShareableEntity = Union[MapModel, ProjectModel]
UserAccessRow = Union[MapUserAccess, ProjectUserAccess]


_ROLE_RANK: dict[str, int] = {
    "viewer": 1,
    "commenter": 2,
    "editor": 3,
    "owner": 4,
}


def _rank(role: str) -> int:
    return _ROLE_RANK.get(role, 0)


def _can_manage(map_item: MapModel, actor: User) -> bool:
    """Return True if ``actor`` is allowed to manage share settings."""
    if actor.is_superuser or map_item.owner_id == actor.id:
        return True
    # Check if actor has an editor entry and editorsCanShare is enabled
    settings = map_item.share_settings or {}
    if not settings.get("editorsCanShare", True):
        return False
    for entry in map_item.user_access:
        if entry.user_id == actor.id and entry.role == "editor" and not entry.pending:
            return True
    return False


def _entry_to_schema(entry: MapUserAccess, current_user: Optional[User] = None) -> AccessEntryRead:
    user = entry.user
    name = user.full_name if user else None
    is_you = bool(current_user and entry.user_id == current_user.id)
    return AccessEntryRead(
        id=entry.id,
        email=entry.email,
        name=name,
        role=entry.role,  # type: ignore[arg-type]
        pending=entry.pending,
        is_you=is_you,
    )


def _map_to_share_state(map_item: MapModel, current_user: Optional[User] = None) -> ShareStateRead:
    raw_settings = map_item.share_settings or {}
    settings = ShareSettingsRead(
        editors_can_share=raw_settings.get("editorsCanShare", True),
        viewers_can_download=raw_settings.get("viewersCanDownload", True),
    )
    general_type: str = "link" if map_item.share_link_enabled else "restricted"
    general = GeneralAccessRead(
        type=general_type,  # type: ignore[arg-type]
        role=map_item.share_link_role,  # type: ignore[arg-type]
    )
    
    entries_list = list(map_item.user_access)
    # If legacy map without owner in user_access, add synthetic owner entry
    has_owner_entry = any(e.role == "owner" or e.user_id == map_item.owner_id for e in entries_list)
    if not has_owner_entry and map_item.owner:
        owner_entry = AccessEntryRead(
            id=f"owner_{map_item.owner_id}",
            email=map_item.owner.email,
            name=map_item.owner.full_name,
            role="owner",
            pending=False,
            is_you=bool(current_user and map_item.owner_id == current_user.id),
        )
        existing_schemas = [_entry_to_schema(e, current_user) for e in entries_list]
        return ShareStateRead(
            entries=[owner_entry] + sorted(existing_schemas, key=lambda e: (-_rank(e.role), e.pending, e.email)),
            general=general,
            settings=settings,
        )

    # Sort: owner first, then by role rank descending, pending last
    entries_sorted = sorted(
        entries_list,
        key=lambda e: (-_rank(e.role), e.pending, e.email),
    )
    return ShareStateRead(
        entries=[_entry_to_schema(e, current_user) for e in entries_sorted],
        general=general,
        settings=settings,
    )


from sqlalchemy.orm import selectinload

async def _get_map_or_404(db: AsyncSession, map_id: str) -> MapModel:
    result = await db.execute(
        select(MapModel)
        .options(
            selectinload(MapModel.user_access).selectinload(MapUserAccess.user),
            selectinload(MapModel.owner),
        )
        .where(MapModel.id == map_id)
    )
    map_item = result.scalar_one_or_none()
    if not map_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Map '{map_id}' not found")
    return map_item


async def _require_manage(db: AsyncSession, map_id: str, actor: User) -> MapModel:
    map_item = await _get_map_or_404(db, map_id)
    if not _can_manage(map_item, actor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage sharing for this map",
        )
    return map_item


# ── Public service functions ──────────────────────────────────────────────────

async def get_share_state(db: AsyncSession, map_id: str, actor: User) -> ShareStateRead:
    """Return full share state. Editors (if editorsCanShare) may also read it."""
    map_item = await _get_map_or_404(db, map_id)
    
    # Query fresh user_access entries from database
    entries_result = await db.execute(
        select(MapUserAccess)
        .options(selectinload(MapUserAccess.user))
        .where(MapUserAccess.map_id == map_id)
    )
    user_access_list = list(entries_result.scalars().all())

    # Viewers can see the dialog but we restrict full listing to managers
    if not _can_manage(map_item, actor):
        if map_item.owner_id != actor.id and not actor.is_superuser:
            actor_entry = next((e for e in user_access_list if e.user_id == actor.id), None)
            if actor_entry is None:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    raw_settings = map_item.share_settings or {}
    settings = ShareSettingsRead(
        editors_can_share=raw_settings.get("editorsCanShare", True),
        viewers_can_download=raw_settings.get("viewersCanDownload", True),
    )
    general_type: str = "link" if map_item.share_link_enabled else "restricted"
    general = GeneralAccessRead(
        type=general_type,  # type: ignore[arg-type]
        role=map_item.share_link_role,  # type: ignore[arg-type]
    )

    has_owner_entry = any(e.role == "owner" or e.user_id == map_item.owner_id for e in user_access_list)
    if not has_owner_entry and map_item.owner:
        owner_entry = AccessEntryRead(
            id=f"owner_{map_item.owner_id}",
            email=map_item.owner.email,
            name=map_item.owner.full_name,
            role="owner",
            pending=False,
            is_you=bool(actor and map_item.owner_id == actor.id),
        )
        existing_schemas = [_entry_to_schema(e, actor) for e in user_access_list]
        return ShareStateRead(
            entries=[owner_entry] + sorted(existing_schemas, key=lambda e: (-_rank(e.role), e.pending, e.email)),
            general=general,
            settings=settings,
        )

    entries_sorted = sorted(
        user_access_list,
        key=lambda e: (-_rank(e.role), e.pending, e.email),
    )
    return ShareStateRead(
        entries=[_entry_to_schema(e, actor) for e in entries_sorted],
        general=general,
        settings=settings,
    )


async def search_people(db: AsyncSession, query: str, map_id: Optional[str] = None) -> List[PeopleSearchResult]:
    """Search registered users by email or name for the people autocomplete."""
    if not query or not query.strip():
        return []
    q = f"%{query.strip()}%"
    result = await db.execute(
        select(User)
        .where(
            User.is_active == True,  # noqa: E712
            or_(User.email.ilike(q), User.full_name.ilike(q)),
        )
        .limit(10)
    )
    users = result.scalars().all()

    # Exclude users already on the map
    existing_emails: set[str] = set()
    if map_id:
        map_item = await _get_map_or_404(db, map_id)
        existing_emails = {e.email for e in map_item.user_access}

    return [
        PeopleSearchResult(
            id=u.id,
            email=u.email,
            name=u.full_name,
        )
        for u in users
        if u.email not in existing_emails
    ]


async def invite(
    db: AsyncSession,
    map_id: str,
    body: InviteRequest,
    actor: User,
) -> List[AccessEntryRead]:
    """Invite one or more email addresses to the map."""
    map_item = await _require_manage(db, map_id, actor)

    # Owner cannot be assigned via invite — use transfer_ownership
    if body.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use the transfer ownership action to assign the owner role",
        )

    existing_by_email = {e.email: e for e in map_item.user_access}
    created: List[AccessEntryRead] = []

    for email_str in body.emails:
        email = str(email_str).lower()

        if email in existing_by_email:
            # Update role if already invited
            existing_by_email[email].role = body.role
            created.append(_entry_to_schema(existing_by_email[email], actor))
            continue

        # Look up the user in the system
        user_result = await db.execute(select(User).where(User.email == email))
        existing_user = user_result.scalar_one_or_none()

        invite_token = secrets.token_urlsafe(32)
        access = MapUserAccess(
            id=str(uuid.uuid4()),
            map_id=map_id,
            user_id=existing_user.id if existing_user else None,
            email=email,
            role=body.role,
            pending=True,
            invited_by_id=actor.id,
            invite_token=invite_token,
        )
        db.add(access)
        await db.flush()
        created.append(_entry_to_schema(access, actor))

        # Send email asynchronously (fire-and-forget with error logging)
        if body.notify:
            from app.core.config import get_settings
            from app.api.maps.share.email import send_invite_email
            import asyncio

            settings = get_settings()
            accept_url = f"{settings.frontend_url}/maps/{map_id}/invite/accept?token={invite_token}"
            asyncio.ensure_future(
                send_invite_email(
                    to=email,
                    inviter_name=actor.full_name or actor.email,
                    map_title=map_item.title,
                    role=body.role,
                    message=body.message,
                    accept_url=accept_url,
                    frontend_url=settings.frontend_url,
                )
            )

    await db.flush()
    return created


async def update_role(
    db: AsyncSession,
    map_id: str,
    entry_id: str,
    new_role: Role,
    actor: User,
) -> None:
    """Change a user's role on the map."""
    map_item = await _require_manage(db, map_id, actor)

    result = await db.execute(
        select(MapUserAccess).where(
            MapUserAccess.id == entry_id,
            MapUserAccess.map_id == map_id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access entry not found")

    if entry.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change the owner's role directly — use Transfer Ownership",
        )
    if new_role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use Transfer Ownership to assign owner role",
        )
    # Editors cannot promote someone to editor if they are not owner
    if new_role == "editor" and not (actor.is_superuser or map_item.owner_id == actor.id):
        actor_entry = next((e for e in map_item.user_access if e.user_id == actor.id), None)
        if not actor_entry or actor_entry.role != "editor":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    entry.role = new_role
    await db.flush()


async def remove_access(
    db: AsyncSession,
    map_id: str,
    entry_id: str,
    actor: User,
) -> None:
    """Remove a user's access to the map."""
    map_item = await _require_manage(db, map_id, actor)

    result = await db.execute(
        select(MapUserAccess).where(
            MapUserAccess.id == entry_id,
            MapUserAccess.map_id == map_id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access entry not found")

    if entry.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the owner. Transfer ownership first.",
        )

    await db.delete(entry)
    await db.flush()


async def transfer_ownership(
    db: AsyncSession,
    map_id: str,
    entry_id: str,
    actor: User,
) -> None:
    """Transfer map ownership to another user (actor must be current owner or superuser)."""
    map_item = await _get_map_or_404(db, map_id)
    if map_item.owner_id != actor.id and not actor.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the current owner can transfer ownership",
        )

    result = await db.execute(
        select(MapUserAccess).where(
            MapUserAccess.id == entry_id,
            MapUserAccess.map_id == map_id,
        )
    )
    new_owner_entry = result.scalar_one_or_none()
    if not new_owner_entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access entry not found")
    if not new_owner_entry.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot transfer ownership to a pending (unregistered) invitee",
        )
    if new_owner_entry.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The invitee must accept the invitation before ownership can be transferred",
        )

    # Demote old owner → editor in user_access, update map owner_id
    old_owner_entry = next(
        (e for e in map_item.user_access if e.user_id == map_item.owner_id), None
    )
    if old_owner_entry:
        old_owner_entry.role = "editor"

    new_owner_entry.role = "owner"
    new_owner_entry.pending = False
    map_item.owner_id = new_owner_entry.user_id
    await db.flush()


async def update_general_access(
    db: AsyncSession,
    map_id: str,
    body: UpdateGeneralAccessRequest,
    actor: User,
) -> None:
    """Update link-sharing mode and link role."""
    map_item = await _require_manage(db, map_id, actor)

    if body.type == "link":
        # Generate a share token if one doesn't exist yet
        if not map_item.share_token:
            map_item.share_token = secrets.token_urlsafe(32)
        map_item.share_link_enabled = True
        map_item.share_link_role = body.role
    else:
        map_item.share_link_enabled = False
        # Keep token in DB so re-enabling the same link works

    await db.flush()


async def update_share_settings(
    db: AsyncSession,
    map_id: str,
    body: UpdateShareSettingsRequest,
    actor: User,
) -> None:
    """Update editorsCanShare / viewersCanDownload settings."""
    map_item = await _require_manage(db, map_id, actor)
    settings = dict(map_item.share_settings or {})

    if body.editors_can_share is not None:
        settings["editorsCanShare"] = body.editors_can_share
    if body.viewers_can_download is not None:
        settings["viewersCanDownload"] = body.viewers_can_download

    map_item.share_settings = settings
    await db.flush()


async def accept_invite(
    db: AsyncSession,
    token: str,
    actor: User,
) -> AccessEntryRead:
    """Accept a map invitation using the one-time token from an invite email.

    If the actor's email matches the invite email, the access is activated.
    """
    result = await db.execute(
        select(MapUserAccess).where(MapUserAccess.invite_token == token)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or already accepted",
        )

    if entry.email.lower() != actor.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation was sent to a different email address",
        )

    entry.user_id = actor.id
    entry.pending = False
    entry.invite_token = None  # Consume the token
    await db.flush()
    return _entry_to_schema(entry, actor)


async def get_map_share_state_by_token(db: AsyncSession, token: str) -> ShareStateRead:
    """Return share state for a link-share token (used by unauthenticated viewers)."""
    result = await db.execute(
        select(MapModel).where(
            MapModel.share_token == token,
            MapModel.share_link_enabled == True,  # noqa: E712
        )
    )
    map_item = result.scalar_one_or_none()
    if not map_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link is invalid or sharing has been disabled",
        )
    return _map_to_share_state(map_item)
