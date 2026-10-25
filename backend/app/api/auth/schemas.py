from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class PermissionRead(BaseModel):
    id: str
    name: str
    description: str | None = None

    model_config = {"from_attributes": True}


class PermissionCreate(BaseModel):
    name: str
    description: str | None = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str | None = None
    is_superuser: bool = False
    groups: list[str] = Field(default_factory=list)


class RegisterRequest(BaseModel):
    """Public self-service sign-up.

    Deliberately minimal: only the fields a visitor may set for themselves.
    ``is_superuser`` / group assignment are **not** accepted here, so an
    anonymous caller can never self-escalate to a privileged account.
    """

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str | None = None


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = None
    full_name: str | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None
    groups: list[str] | None = None


class UserRead(BaseModel):
    id: str
    email: EmailStr
    full_name: str | None
    is_active: bool
    is_superuser: bool
    created_at: datetime
    # ── Profile (self-service) ──────────────────────────────────────────────
    bio: str | None = None
    avatar_url: str | None = None
    job_title: str | None = None
    location: str | None = None
    phone: str | None = None
    website: str | None = None
    preferred_timezone: str | None = None
    primary_organization_id: str | None = None
    last_login_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserMeRead(UserRead):
    """Extended schema for the /me endpoint - includes computed effective permissions."""

    effective_permissions: list[str] = Field(default_factory=list)


class GroupRead(BaseModel):
    id: str
    name: str
    description: str | None = None
    created_at: datetime
    permissions: list[PermissionRead] = Field(default_factory=list)
    users: list[UserRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class GroupSummaryRead(BaseModel):
    id: str
    name: str
    description: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserAdminRead(UserRead):
    groups: list[GroupSummaryRead] = Field(default_factory=list)


class PaginatedUsersResponse(BaseModel):
    items: list[UserAdminRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedGroupsResponse(BaseModel):
    items: list[GroupRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedPermissionsResponse(BaseModel):
    items: list[PermissionRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GroupCreate(BaseModel):
    name: str
    description: str | None = None
    permissions: list[str] = Field(default_factory=list)
    user_ids: list[str] = Field(default_factory=list)


class GroupUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    permissions: list[str] | None = None
    user_ids: list[str] | None = None


class PermissionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
