"""Profile / Organization / Preferences — Pydantic schemas (core)."""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

# ── Validation vocab ───────────────────────────────────────────────────────────
THEME_MODES = ["dark", "light", "system"]
MAP_UNITS = ["metric", "imperial"]
FONT_SCALES = ["small", "normal", "large"]

_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _valid_hex_color(v: Optional[str]) -> Optional[str]:
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
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    preferred_timezone: Optional[str] = None
    is_superuser: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    """Partial update for the user's own profile (``PUT /me/profile``)."""

    full_name: Optional[str] = Field(None, max_length=255)
    bio: Optional[str] = Field(None, max_length=4000)
    avatar_url: Optional[str] = Field(None, max_length=512)
    job_title: Optional[str] = Field(None, max_length=120)
    location: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=60)
    website: Optional[str] = Field(None, max_length=255)
    preferred_timezone: Optional[str] = Field(None, max_length=64)

    @field_validator("avatar_url", "website")
    @classmethod
    def _normalize_url(cls, v: Optional[str]) -> Optional[str]:
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
        if not any(c.isupper() for c in v) or not any(c.islower() for c in v) or not any(
            c.isdigit() for c in v
        ):
            raise ValueError("Password must contain upper, lower, and a number")
        return v


class ChangePasswordResponse(BaseModel):
    ok: bool = True


# ── Organizations ──────────────────────────────────────────────────────────────

class OrgMemberRead(BaseModel):
    user_id: str
    email: EmailStr
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class OrganizationRead(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    location: Optional[str] = None
    accent_color: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    # Filled in by the router for context:
    member_count: int = 0
    my_role: Optional[str] = None  # role of the current user (None if not a member)
    is_primary: bool = False       # is this the user's primary organization?

    model_config = {"from_attributes": True}


class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    description: Optional[str] = Field(None, max_length=4000)
    industry: Optional[str] = Field(None, max_length=120)
    website: Optional[str] = Field(None, max_length=255)
    logo_url: Optional[str] = Field(None, max_length=512)
    location: Optional[str] = Field(None, max_length=255)
    accent_color: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

    @field_validator("accent_color")
    @classmethod
    def _accent(cls, v: Optional[str]) -> Optional[str]:
        out = _valid_hex_color(v)
        if v and not out:
            raise ValueError("accent_color must be a hex color like #22c55e")
        return out


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=160)
    description: Optional[str] = Field(None, max_length=4000)
    industry: Optional[str] = Field(None, max_length=120)
    website: Optional[str] = Field(None, max_length=255)
    logo_url: Optional[str] = Field(None, max_length=512)
    location: Optional[str] = Field(None, max_length=255)
    accent_color: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

    @field_validator("accent_color")
    @classmethod
    def _accent(cls, v: Optional[str]) -> Optional[str]:
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
    default_basemap: Optional[str] = None
    accent_color: Optional[str] = None
    compact_mode: bool = False
    font_scale: str = "normal"
    extra: Dict[str, Any] = Field(default_factory=dict)
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PreferencesUpdate(BaseModel):
    theme_mode: Optional[str] = Field(None, pattern="^(dark|light|system)$")
    map_units: Optional[str] = Field(None, pattern="^(metric|imperial)$")
    default_basemap: Optional[str] = Field(None, max_length=64)
    accent_color: Optional[str] = None
    compact_mode: Optional[bool] = None
    font_scale: Optional[str] = Field(None, pattern="^(small|normal|large)$")
    extra: Optional[Dict[str, Any]] = None

    @field_validator("accent_color")
    @classmethod
    def _accent(cls, v: Optional[str]) -> Optional[str]:
        out = _valid_hex_color(v)
        if v and not out:
            raise ValueError("accent_color must be a hex color like #22c55e")
        return out


__all__ = [
    "ProfileRead",
    "ProfileUpdate",
    "ChangePassword",
    "ChangePasswordResponse",
    "OrgMemberRead",
    "OrganizationRead",
    "OrganizationCreate",
    "OrganizationUpdate",
    "OrgMemberUpdate",
    "PreferencesRead",
    "PreferencesUpdate",
    "THEME_MODES",
    "MAP_UNITS",
    "FONT_SCALES",
]