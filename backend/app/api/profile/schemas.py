"""Profile / Organization / Preferences - Pydantic schemas (core)."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator

# ── Validation vocab ───────────────────────────────────────────────────────────
THEME_MODES = ["dark", "light", "system"]
MAP_UNITS = ["metric", "imperial"]
FONT_SCALES = ["small", "normal", "large"]

_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _valid_hex_color(v: str | None) -> str | None:
    if v in (None, ""):
        return None
    v = v.strip()
    if re.fullmatch(r"#[0-9a-fA-F]{3}", v) or re.fullmatch(r"#[0-9a-fA-F]{6}", v):
        return v
    return None


# ── User profile (self-service) ────────────────────────────────────────────────


class ProfileRead(BaseModel):
    """The signed-in user's public + profile fields (no secrets)."""

    id: str
    email: EmailStr
    full_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    job_title: str | None = None
    location: str | None = None
    phone: str | None = None
    website: str | None = None
    preferred_timezone: str | None = None
    is_superuser: bool
    created_at: datetime
    last_login_at: datetime | None = None

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    """Partial update for the user's own profile (``PUT /me/profile``)."""

    full_name: str | None = Field(None, max_length=255)
    bio: str | None = Field(None, max_length=4000)
    avatar_url: str | None = Field(None, max_length=512)
    job_title: str | None = Field(None, max_length=120)
    location: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=60)
    website: str | None = Field(None, max_length=255)
    preferred_timezone: str | None = Field(None, max_length=64)

    @field_validator("avatar_url", "website")
    @classmethod
    def _normalize_url(cls, v: str | None) -> str | None:
        if v in (None, ""):
            return None
        v = v.strip()
        return v or None


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _strong(cls, v: str) -> str:
        if (
            not any(c.isupper() for c in v)
            or not any(c.islower() for c in v)
            or not any(c.isdigit() for c in v)
        ):
            raise ValueError("Password must contain upper, lower, and a number")
        return v


class ChangePasswordResponse(BaseModel):
    ok: bool = True


# ── Organizations ──────────────────────────────────────────────────────────────


class OrgMemberRead(BaseModel):
    user_id: str
    email: EmailStr
    full_name: str | None = None
    avatar_url: str | None = None
    role: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class OrganizationRead(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None = None
    industry: str | None = None
    website: str | None = None
    logo_url: str | None = None
    location: str | None = None
    accent_color: str | None = None
    meta: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime
    # Filled in by the router for context:
    member_count: int = 0
    my_role: str | None = None  # role of the current user (None if not a member)
    is_primary: bool = False  # is this the user's primary organization?

    model_config = {"from_attributes": True}


class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    description: str | None = Field(None, max_length=4000)
    industry: str | None = Field(None, max_length=120)
    website: str | None = Field(None, max_length=255)
    logo_url: str | None = Field(None, max_length=512)
    location: str | None = Field(None, max_length=255)
    accent_color: str | None = None
    meta: dict[str, Any] | None = None

    @field_validator("accent_color")
    @classmethod
    def _accent(cls, v: str | None) -> str | None:
        out = _valid_hex_color(v)
        if v and not out:
            raise ValueError("accent_color must be a hex color like #22c55e")
        return out


class OrganizationUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=160)
    description: str | None = Field(None, max_length=4000)
    industry: str | None = Field(None, max_length=120)
    website: str | None = Field(None, max_length=255)
    logo_url: str | None = Field(None, max_length=512)
    location: str | None = Field(None, max_length=255)
    accent_color: str | None = None
    meta: dict[str, Any] | None = None

    @field_validator("accent_color")
    @classmethod
    def _accent(cls, v: str | None) -> str | None:
        out = _valid_hex_color(v)
        if v and not out:
            raise ValueError("accent_color must be a hex color like #22c55e")
        return out


class OrgMemberUpdate(BaseModel):
    role: str = Field(..., pattern="^(owner|admin|member|viewer)$")


# ── User preferences (customizable UX) ─────────────────────────────────────────


class PreferencesRead(BaseModel):
    theme_mode: str = "dark"
    map_units: str = "metric"
    default_basemap: str | None = None
    accent_color: str | None = None
    compact_mode: bool = False
    font_scale: str = "normal"
    extra: dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class PreferencesUpdate(BaseModel):
    theme_mode: str | None = Field(None, pattern="^(dark|light|system)$")
    map_units: str | None = Field(None, pattern="^(metric|imperial)$")
    default_basemap: str | None = Field(None, max_length=64)
    accent_color: str | None = None
    compact_mode: bool | None = None
    font_scale: str | None = Field(None, pattern="^(small|normal|large)$")
    extra: dict[str, Any] | None = None

    @field_validator("accent_color")
    @classmethod
    def _accent(cls, v: str | None) -> str | None:
        out = _valid_hex_color(v)
        if v and not out:
            raise ValueError("accent_color must be a hex color like #22c55e")
        return out


__all__ = [
    "FONT_SCALES",
    "MAP_UNITS",
    "THEME_MODES",
    "ChangePassword",
    "ChangePasswordResponse",
    "OrgMemberRead",
    "OrgMemberUpdate",
    "OrganizationCreate",
    "OrganizationRead",
    "OrganizationUpdate",
    "PreferencesRead",
    "PreferencesUpdate",
    "ProfileRead",
    "ProfileUpdate",
]
