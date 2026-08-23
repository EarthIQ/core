"""
Notifications — Pydantic Schemas (core).

These mirror the ORM models in ``models.py`` and define the request/response
contracts for the REST router.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


# ── Category / kind vocab ──────────────────────────────────────────────────────

# Canonical categories. New modules may introduce their own (free-form string)
# but these are the built-in ones surfaced in the preferences UI.
CATEGORIES = ["system", "project", "dataset", "access_request", "ai", "mention"]
KINDS = ["info", "success", "warning", "error"]

DEFAULT_CATEGORY_PREFS: dict[str, bool] = {c: True for c in CATEGORIES}


# ── Read-only views ────────────────────────────────────────────────────────────

class NotificationRead(BaseModel):
    """A single notification as shown to one user."""

    id: str                       # recipient id (per-user row) — used for read/unread actions
    message_id: str
    category: str
    kind: str
    title: str
    body: Optional[str] = None
    payload: Optional[dict[str, Any]] = None
    source: Optional[str] = None
    link: Optional[str] = None
    read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationSummary(BaseModel):
    total: int
    unread: int
    by_category: dict[str, int] = Field(default_factory=dict)
    by_kind: dict[str, int] = Field(default_factory=dict)


class NotificationListResponse(BaseModel):
    items: List[NotificationRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class UnreadCountResponse(BaseModel):
    unread: int


class ReadAllResponse(BaseModel):
    marked: int


class BroadcastResponse(BaseModel):
    delivered: int


class PreferencesRead(BaseModel):
    enabled: bool
    categories: dict[str, bool] = Field(default_factory=dict)
    toasts: bool
    sound: bool
    updated_at: Optional[datetime] = None


class PreferencesUpdate(BaseModel):
    enabled: Optional[bool] = None
    categories: Optional[dict[str, bool]] = None
    toasts: Optional[bool] = None
    sound: Optional[bool] = None


# ── Create / broadcast ─────────────────────────────────────────────────────────

class NotificationCreate(BaseModel):
    """Create and deliver a single notification to one user."""

    title: str = Field(..., min_length=1, max_length=255)
    body: Optional[str] = None
    category: str = Field(default="system")
    kind: str = Field(default="info")
    payload: Optional[dict[str, Any]] = None
    source: Optional[str] = None
    link: Optional[str] = None
    user_id: str = Field(..., description="Recipient user id")


class NotificationBroadcast(BaseModel):
    """Create one message and deliver it to many users (or everyone)."""

    title: str = Field(..., min_length=1, max_length=255)
    body: Optional[str] = None
    category: str = Field(default="system")
    kind: str = Field(default="info")
    payload: Optional[dict[str, Any]] = None
    source: Optional[str] = None
    link: Optional[str] = None
    # Explicit recipient list. When empty/omitted, broadcast to ALL users
    # (subject to each user's own preferences).
    user_ids: List[str] = Field(default_factory=list)
    # Skip recipients whose preferences disable this category / in-app delivery.
    respect_preferences: bool = True