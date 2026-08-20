"""Share service — business logic for the map/project share system.

Roles hierarchy (highest → lowest):
  owner > editor > commenter > viewer

Permission enforcement:
  - Only the owner (or superuser) can transfer ownership or remove the owner entry.
  - Only owner (or editor if editorsCanShare=True) can manage access.

Entity support:
  - Both MapModel and ProjectModel are supported as shareable entities.
    Every public function accepts an ``entity_id``; the service detects
    whether it is a map or a project and delegates to the matching access
    table (MapUserAccess / ProjectUserAccess).
"""
from __future__ import annotations

import secrets
import uuid
from typing import List, Optional, Tuple, Type, Union

from fastapi import HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.models import User
from app.api.maps.models import MapModel, MapUserAccess
from app.api.projects.models import ProjectModel, ProjectUserAccess
from app.api.maps.share.schemas import (
    AccessEntryRead,
    AccessRequestRead,
    GeneralAccessRead,
    InviteAcceptRead,
    InviteRequest,
    RequestAccessBody,
    ShareSettingsRead,
    ShareStateRead,
    UpdateGeneralAccessRequest,
    UpdateShareSettingsRequest,
    PeopleSearchResult,
    Role,
)
from app.api.maps.share.models import AccessRequest

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


def _entity_type(item: ShareableEntity) -> str:
    """Return "map" or "project" for a shareable entity."""
    return "map" if isinstance(item, MapModel) else "project"


async def _resolve_entity(
    db: AsyncSession, entity_id: str
) -> Tuple[ShareableEntity, Type[UserAccessRow], str]:
    """Resolve an id to a map or project entity.

    Returns a tuple of (entity, its user-access ORM model, the foreign-key
    column name on that access model: ``map_id`` / ``project_id``).
    Raises 404 if the id matches neither a map nor a project.
    """
    result = await db.execute(select(MapModel).where(MapModel.id == entity_id))
    item = result.scalar_one_or_none()
    if item:
        return item, MapUserAccess, "map_id"

    result = await db.execute(select(ProjectModel).where(ProjectModel.id == entity_id))
    item = result.scalar_one_or_none()
    if item:
        return item, ProjectUserAccess, "project_id"

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Map or project '{entity_id}' not found",
    )


def _can_manage(item: ShareableEntity, actor: User) -> bool:
    """Return True if ``actor`` is allowed to manage share settings."""
    if actor.is_superuser or item.owner_id == actor.id:
        return True
    # Check if actor has an editor entry and editorsCanShare is enabled
    settings = item.share_settings or {}
    if not settings.get("editorsCanShare", True):
        return False
    for entry in item.user_access:
        if entry.user_id == actor.id and entry.role == "editor" and not entry.pending:
            return True
    return False


def _entry_to_schema(entry: UserAccessRow, current_user: Optional[User] = None) -> AccessEntryRead:
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


def _to_share_state(item: ShareableEntity, current_user: Optional[User] = None) -> ShareStateRead:
    raw_settings = item.share_settings or {}
    settings = ShareSettingsRead(
        editors_can_share=raw_settings.get("editorsCanShare", True),
        viewers_can_download=raw_settings.get("viewersCanDownload", True),
    )
    general_type: str = "link" if item.share_link_enabled else "restricted"
    general = GeneralAccessRead(
        type=general_type,  # type: ignore[arg-type]
        role=item.share_link_role,  # type: ignore[arg-type]
    )
    
    entries_list = list(item.user_access)
    # If legacy entity without owner in user_access, add synthetic owner entry
    has_owner_entry = any(e.role == "owner" or e.user_id == item.owner_id for e in entries_list)
    if not has_owner_entry and item.owner:
        owner_entry = AccessEntryRead(
            id=f"owner_{item.owner_id}",
            email=item.owner.email,
            name=item.owner.full_name,
            role="owner",
            pending=False,
            is_you=bool(current_user and item.owner_id == current_user.id),
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


async def _require_manage(db: AsyncSession, entity_id: str, actor: User) -> Tuple[ShareableEntity, Type[UserAccessRow], str]:
    item, access_model, fk_name = await _resolve_entity(db, entity_id)
    if not _can_manage(item, actor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage sharing for this map or project",
        )
    return item, access_model, fk_name


# ── Public service functions ──────────────────────────────────────────────────

async def get_share_state(db: AsyncSession, entity_id: str, actor: User) -> ShareStateRead:
    """Return full share state for a map or project. Editors (if editorsCanShare) may also read it."""
    item = (await _resolve_entity(db, entity_id))[0]

    # Query the user_access entries for the entity
    user_access_list = list(item.user_access)

    # Viewers can see the dialog but we restrict full listing to managers
    if not _can_manage(item, actor):
        if item.owner_id != actor.id and not actor.is_superuser:
            actor_entry = next((e for e in user_access_list if e.user_id == actor.id), None)
            if actor_entry is None:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return _to_share_state(item, actor)


async def search_people(db: AsyncSession, query: str, entity_id: Optional[str] = None) -> List[PeopleSearchResult]:
    """Search registered users by email or name for the people autocomplete.

    ``entity_id`` (a map or project id) is used to exclude users who already
    have an access entry on that entity.
    """
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

    # Exclude users already on the map/project
    existing_emails: set[str] = set()
    if entity_id:
        try:
            item = (await _resolve_entity(db, entity_id))[0]
            existing_emails = {e.email for e in item.user_access}
        except HTTPException:
            pass  # unknown entity — return all matches

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
    entity_id: str,
    body: InviteRequest,
    actor: User,
) -> List[AccessEntryRead]:
    """Invite one or more email addresses to a map or project."""
    item, access_model, fk_name = await _require_manage(db, entity_id, actor)

    # Owner cannot be assigned via invite — use transfer_ownership
    if body.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use the transfer ownership action to assign the owner role",
        )

    existing_by_email = {e.email: e for e in item.user_access}
    created: List[AccessEntryRead] = []
    entity_label = _entity_type(item)  # "map" | "project"

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
        access = access_model(
            id=str(uuid.uuid4()),
            **{fk_name: entity_id},
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
            accept_url = f"{settings.frontend_url}/invite/accept?token={invite_token}"
            asyncio.ensure_future(
                send_invite_email(
                    to=email,
                    inviter_name=actor.full_name or actor.email,
                    entity_title=item.title,
                    entity_label=entity_label,
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
    entity_id: str,
    entry_id: str,
    new_role: Role,
    actor: User,
) -> None:
    """Change a user's role on a map or project."""
    item, access_model, fk_name = await _require_manage(db, entity_id, actor)

    result = await db.execute(
        select(access_model).where(
            access_model.id == entry_id,
            getattr(access_model, fk_name) == entity_id,
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
    if new_role == "editor" and not (actor.is_superuser or item.owner_id == actor.id):
        actor_entry = next((e for e in item.user_access if e.user_id == actor.id), None)
        if not actor_entry or actor_entry.role != "editor":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    entry.role = new_role
    await db.flush()


async def remove_access(
    db: AsyncSession,
    entity_id: str,
    entry_id: str,
    actor: User,
) -> None:
    """Remove a user's access to a map or project."""
    item, access_model, fk_name = await _require_manage(db, entity_id, actor)

    result = await db.execute(
        select(access_model).where(
            access_model.id == entry_id,
            getattr(access_model, fk_name) == entity_id,
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
    entity_id: str,
    entry_id: str,
    actor: User,
) -> None:
    """Transfer map/project ownership to another user (actor must be current owner or superuser)."""
    item, access_model, fk_name = await _resolve_entity(db, entity_id)
    if item.owner_id != actor.id and not actor.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the current owner can transfer ownership",
        )

    result = await db.execute(
        select(access_model).where(
            access_model.id == entry_id,
            getattr(access_model, fk_name) == entity_id,
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

    # Demote old owner → editor in user_access, update entity owner_id
    old_owner_entry = next(
        (e for e in item.user_access if e.user_id == item.owner_id), None
    )
    if old_owner_entry:
        old_owner_entry.role = "editor"

    new_owner_entry.role = "owner"
    new_owner_entry.pending = False
    item.owner_id = new_owner_entry.user_id
    await db.flush()


async def update_general_access(
    db: AsyncSession,
    entity_id: str,
    body: UpdateGeneralAccessRequest,
    actor: User,
) -> None:
    """Update link-sharing mode and link role."""
    item, _, _ = await _require_manage(db, entity_id, actor)

    if body.type == "link":
        # Generate a share token if one doesn't exist yet
        if not item.share_token:
            item.share_token = secrets.token_urlsafe(32)
        item.share_link_enabled = True
        item.share_link_role = body.role
    else:
        item.share_link_enabled = False
        # Keep token in DB so re-enabling the same link works

    await db.flush()


async def update_share_settings(
    db: AsyncSession,
    entity_id: str,
    body: UpdateShareSettingsRequest,
    actor: User,
) -> None:
    """Update editorsCanShare / viewersCanDownload settings."""
    item, _, _ = await _require_manage(db, entity_id, actor)
    settings = dict(item.share_settings or {})

    if body.editors_can_share is not None:
        settings["editorsCanShare"] = body.editors_can_share
    if body.viewers_can_download is not None:
        settings["viewersCanDownload"] = body.viewers_can_download

    item.share_settings = settings
    await db.flush()


async def accept_invite(
    db: AsyncSession,
    token: str,
    actor: User,
) -> InviteAcceptRead:
    """Accept a map or project invitation using the one-time token from an invite email.

    Searches both the map and project access tables for the token. If the
    actor's email matches the invite email, the access is activated.
    """
    entry: Optional[UserAccessRow] = None
    for access_model in (MapUserAccess, ProjectUserAccess):
        result = await db.execute(
            select(access_model).where(access_model.invite_token == token)
        )
        found = result.scalar_one_or_none()
        if found:
            entry = found
            break
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or already accepted",
        )

    if isinstance(entry, MapUserAccess):
        entity_type: str = "map"
        entity_id = entry.map_id
        entity_model = MapModel
    else:
        entity_type = "project"
        entity_id = entry.project_id
        entity_model = ProjectModel

    if entry.email.lower() != actor.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation was sent to a different email address",
        )

    # Load the entity (validates it still exists and provides the title)
    result = await db.execute(select(entity_model).where(entity_model.id == entity_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or already accepted",
        )

    entry.user_id = actor.id
    entry.user = actor  # Keep the eagerly-loaded relationship in sync for the response
    entry.pending = False
    entry.invite_token = None  # Consume the token
    await db.flush()

    base = _entry_to_schema(entry, actor)
    return InviteAcceptRead(
        **base.model_dump(),
        entity_type=entity_type,  # type: ignore[arg-type]
        entity_id=entity_id,
        title=item.title,
    )


async def get_share_state_by_token(db: AsyncSession, token: str) -> ShareStateRead:
    """Return share state for a link-share token (used by unauthenticated viewers)."""
    for model in (MapModel, ProjectModel):
        result = await db.execute(
            select(model).where(
                model.share_token == token,
                model.share_link_enabled == True,  # noqa: E712
            )
        )
        item = result.scalar_one_or_none()
        if item:
            return _to_share_state(item)
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Link is invalid or sharing has been disabled",
    )


# ── Access requests (Google-Docs style) ───────────────────────────────────────

def _request_to_schema(req: AccessRequest, item: ShareableEntity) -> AccessRequestRead:
    return AccessRequestRead(
        id=req.id,
        entity_type=_entity_type(item),  # type: ignore[arg-type]
        entity_id=req.entity_id,
        title=item.title,
        requester_name=req.requester.full_name if req.requester else None,
        requester_email=req.email,
        message=req.message,
        requested_role=req.requested_role,  # type: ignore[arg-type]
        status=req.status,  # type: ignore[arg-type]
        granted_role=req.granted_role,  # type: ignore[arg-type]
        created_at=req.created_at,
    )


async def request_access(
    db: AsyncSession,
    entity_id: str,
    body: RequestAccessBody,
    actor: User,
) -> AccessRequestRead:
    """Request access to a map/project the actor cannot open; notifies the owner.

    A logged-in user without access submits a message; the owner receives an
    email with a review link. Re-submitting while a request is pending just
    refreshes the message (no duplicate email).
    """
    import asyncio

    from app.core.config import get_settings
    from app.api.maps.share.email import send_request_access_email

    item = (await _resolve_entity(db, entity_id))[0]
    label = _entity_type(item)

    if actor.is_superuser or item.owner_id == actor.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You already have access to this {label}",
        )
    if any(e.user_id == actor.id and not e.pending for e in item.user_access):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You already have access to this {label}",
        )

    # An open request already exists → refresh it, don't re-notify the owner
    result = await db.execute(
        select(AccessRequest).where(
            AccessRequest.entity_type == label,
            AccessRequest.entity_id == entity_id,
            AccessRequest.user_id == actor.id,
            AccessRequest.status == "pending",
        )
    )
    req = result.scalar_one_or_none()
    if req:
        if body.message:
            req.message = body.message
        req.requested_role = body.requested_role
        await db.flush()
        return _request_to_schema(req, item)

    approval_token = secrets.token_urlsafe(32)
    req = AccessRequest(
        id=str(uuid.uuid4()),
        entity_type=label,
        entity_id=entity_id,
        user_id=actor.id,
        email=actor.email,
        message=body.message,
        requested_role=body.requested_role,
        approval_token=approval_token,
    )
    db.add(req)
    await db.flush()

    owner = item.owner
    if owner:
        settings = get_settings()
        approve_url = f"{settings.frontend_url}/access/grant?token={approval_token}"
        asyncio.ensure_future(
            send_request_access_email(
                to=owner.email,
                requester_name=actor.full_name or actor.email,
                entity_title=item.title,
                requested_role=body.requested_role,
                message=body.message,
                approve_url=approve_url,
                frontend_url=settings.frontend_url,
                entity_label=label,
            )
        )

    return _request_to_schema(req, item)


async def _load_access_request(
    db: AsyncSession, token: str, actor: User
) -> Tuple[AccessRequest, ShareableEntity]:
    """Load a request by its one-time token and verify the actor owns the entity."""
    result = await db.execute(
        select(AccessRequest).where(AccessRequest.approval_token == token)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Access request not found"
        )

    entity_model = MapModel if req.entity_type == "map" else ProjectModel
    result = await db.execute(select(entity_model).where(entity_model.id == req.entity_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Access request not found"
        )

    if not (actor.is_superuser or item.owner_id == actor.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner of this map or project can handle access requests",
        )
    return req, item


async def get_access_request(
    db: AsyncSession, token: str, actor: User
) -> AccessRequestRead:
    """Fetch the request behind an owner approval link (owner/superuser only)."""
    req, item = await _load_access_request(db, token, actor)
    return _request_to_schema(req, item)


async def grant_access(
    db: AsyncSession, token: str, actor: User, role: str
) -> AccessRequestRead:
    """Approve an access request: create/update the user's access entry and
    notify the requester (owner/superuser only)."""
    import asyncio

    from app.core.config import get_settings
    from app.api.maps.share.email import send_access_granted_email

    req, item = await _load_access_request(db, token, actor)
    if req.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This access request has already been handled",
        )

    access_model = MapUserAccess if req.entity_type == "map" else ProjectUserAccess
    fk_name = "map_id" if req.entity_type == "map" else "project_id"

    result = await db.execute(
        select(access_model).where(
            access_model.user_id == req.user_id,
            getattr(access_model, fk_name) == req.entity_id,
        )
    )
    entry = result.scalar_one_or_none()
    if entry:
        entry.role = role
        entry.pending = False
        entry.email = req.email
    else:
        db.add(
            access_model(
                id=str(uuid.uuid4()),
                **{fk_name: req.entity_id},
                user_id=req.user_id,
                email=req.email,
                role=role,
                pending=False,
            )
        )

    req.status = "granted"
    req.granted_role = role
    await db.flush()

    settings = get_settings()
    if req.entity_type == "map":
        open_url = f"{settings.frontend_url}/share/map/{req.entity_id}"
    else:
        open_url = f"{settings.frontend_url}/map?projectId={req.entity_id}"
    asyncio.ensure_future(
        send_access_granted_email(
            to=req.email,
            grantor_name=actor.full_name or actor.email,
            entity_title=item.title,
            role=role,
            open_url=open_url,
            frontend_url=settings.frontend_url,
            entity_label=_entity_type(item),
        )
    )
    return _request_to_schema(req, item)


async def deny_access(
    db: AsyncSession, token: str, actor: User
) -> AccessRequestRead:
    """Decline an access request (owner/superuser only)."""
    req, item = await _load_access_request(db, token, actor)
    if req.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This access request has already been handled",
        )
    req.status = "denied"
    await db.flush()
    return _request_to_schema(req, item)


# Backwards-compatible alias
get_map_share_state_by_token = get_share_state_by_token
