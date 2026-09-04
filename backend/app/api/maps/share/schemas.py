from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, EmailStr, Field

# ── Role literals — mirror frontend types.ts ──────────────────────────────────
Role = Literal["owner", "editor", "commenter", "viewer"]
LinkRole = Literal["editor", "commenter", "viewer"]
GeneralAccessType = Literal["restricted", "link"]
EntityType = Literal["map", "project"]


# ── Core share models ─────────────────────────────────────────────────────────

class AccessEntryRead(BaseModel):
    """Represents a single user's access entry in the Share Dialog."""

    id: str
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Role
    pending: bool = False
    is_you: bool = False

    model_config = {"from_attributes": True}


class GeneralAccessRead(BaseModel):
    """'Anyone with link' or 'Restricted' mode."""

    type: GeneralAccessType
    role: LinkRole


class InviteAcceptRead(AccessEntryRead):
    """Invite-accept result: the activated entry plus the entity it belongs to.

    The frontend uses ``entity_type`` / ``entity_id`` to navigate to the
    right place (project workspace vs. map view) after accepting.
    """

    entity_type: EntityType
    entity_id: str
    title: str


class ShareSettingsRead(BaseModel):
    editors_can_share: bool = True
    viewers_can_download: bool = True

    model_config = {"populate_by_name": True}


class ShareStateRead(BaseModel):
    """Full share state returned by GET /api/v1/maps/{id}/share."""

    entries: List[AccessEntryRead]
    general: GeneralAccessRead
    settings: ShareSettingsRead


# ── People search ─────────────────────────────────────────────────────────────

class PeopleSearchResult(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Role = "viewer"  # default suggestion role

    model_config = {"from_attributes": True}


# ── Request bodies ────────────────────────────────────────────────────────────

class InviteRequest(BaseModel):
    emails: List[EmailStr] = Field(..., min_length=1)
    role: Role = "viewer"
    message: str = ""
    notify: bool = True


class UpdateRoleRequest(BaseModel):
    role: Role


class TransferOwnershipRequest(BaseModel):
    entry_id: str


class UpdateGeneralAccessRequest(BaseModel):
    type: GeneralAccessType
    role: LinkRole = "viewer"


class UpdateShareSettingsRequest(BaseModel):
    editors_can_share: Optional[bool] = None
    viewers_can_download: Optional[bool] = None

    model_config = {"populate_by_name": True}


# ── Access requests (Google-Docs style) ───────────────────────────────────────

class RequestAccessBody(BaseModel):
    """Sent by a logged-in user who does not have access to the entity."""

    message: str = ""
    requested_role: LinkRole = "viewer"


class GrantAccessBody(BaseModel):
    """Sent by the owner when approving a request (owner role excluded)."""

    role: LinkRole = "viewer"


class AccessRequestRead(BaseModel):
    id: str
    entity_type: EntityType
    entity_id: str
    title: str
    requester_name: Optional[str] = None
    requester_email: str
    message: str = ""
    requested_role: LinkRole
    status: Literal["pending", "granted", "denied"]
    granted_role: Optional[LinkRole] = None
    created_at: datetime

    model_config = {"from_attributes": True}
