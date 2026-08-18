from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, EmailStr, Field

# ── Role literals — mirror frontend types.ts ──────────────────────────────────
Role = Literal["owner", "editor", "commenter", "viewer"]
LinkRole = Literal["editor", "commenter", "viewer"]
GeneralAccessType = Literal["restricted", "link"]


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


class ShareSettingsRead(BaseModel):
    editors_can_share: bool = True
    viewers_can_download: bool = True

    model_config = {"populate_by_name": True}


class ShareStateRead(BaseModel):
    """Full share state returned by GET /api/maps/{id}/share."""

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
