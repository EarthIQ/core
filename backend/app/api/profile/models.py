"""Profile / Organization / Preferences — ORM models (core).

Tables
------
organizations        — a workspace / team the user belongs to (the "org profile")
user_organizations   — many-to-many membership with a per-user role
user_preferences     — server-persisted, customizable UI preferences per user

These share the core ``Base`` so the core Alembic env + ``create_all`` pick them
up automatically. The ``User`` model (``app.api.auth.models``) already carries
the additional self-service profile columns (bio, avatar_url, ...).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Organization ───────────────────────────────────────────────────────────────

class Organization(Base):
    """A workspace / team / company a user can belong to (the "organization profile")."""

    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    # Stable, human-friendly identifier used in URLs / slugs (e.g. "nasa-ghg").
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    industry: Mapped[str | None] = mapped_column(String(120), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Brand accent for the org (optional, e.g. "#22c55e"). Client may use it as a token override.
    accent_color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Free-form structured metadata (JSON string, e.g. {"plan":"pro","region":"eu" }).
    meta: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow
    )

    # Members (reverse of UserOrganization.organization).
    members: Mapped[list[UserOrganization]] = relationship(
        "UserOrganization",
        back_populates="organization",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="UserOrganization.joined_at.desc()",
    )

    def __repr__(self) -> str:
        return f"<Organization id={self.id} name={self.name!r}>"


# ── User ↔ Organization membership ─────────────────────────────────────────────

# Allowed membership roles (kept as a plain constant for the router/service + UI).
ORG_ROLES = ["owner", "admin", "member", "viewer"]


class UserOrganization(Base):
    """Membership of a user in an organization, with a role."""

    __tablename__ = "user_organizations"
    __table_args__ = (
        UniqueConstraint("user_id", "organization_id", name="uq_user_org_membership"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # "owner" | "admin" | "member" | "viewer"
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="member")
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )

    organization: Mapped[Organization] = relationship(
        "Organization", back_populates="members", lazy="joined"
    )
    user: Mapped["User"] = relationship(  # type: ignore[name-defined]
        "User", back_populates="organizations", lazy="joined"
    )

    def __repr__(self) -> str:
        return f"<UserOrganization user={self.user_id} org={self.organization_id} role={self.role!r}>"


# ── User Preferences (customizable UX) ─────────────────────────────────────────

class UserPreferences(Base):
    """Per-user, server-persisted UI preferences (theme, units, basemap, ...).

    This is the *server* counterpart to the client's local theme store. Keeping
    it here means a user's experience follows them across devices / sessions and
    is visible to admins. The ``extra`` JSON field is an extensibility hatch so
    modules can add their own prefs without a migration.
    """

    __tablename__ = "user_preferences"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )

    theme_mode: Mapped[str] = mapped_column(String(16), nullable=False, default="dark")
    map_units: Mapped[str] = mapped_column(String(16), nullable=False, default="metric")
    default_basemap: Mapped[str | None] = mapped_column(String(64), nullable=True)
    accent_color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    compact_mode: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    font_scale: Mapped[str] = mapped_column(String(12), nullable=False, default="normal")
    # Extensible free-form JSON (dict).
    extra: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow
    )

    def __repr__(self) -> str:
        return f"<UserPreferences user={self.user_id} theme={self.theme_mode!r}>"