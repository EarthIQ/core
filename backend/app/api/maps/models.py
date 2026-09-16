from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.api.auth.models import Group, User
from app.core.db import Base

if TYPE_CHECKING:
    from app.api.projects.models import ProjectModel


class MapModel(Base):
    """Configurable Map entity with viewport, basemap, layers, and ownership."""

    __tablename__ = "maps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Viewport config
    center_lng: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    center_lat: Mapped[float] = mapped_column(Float, default=20.0, nullable=False)
    zoom: Mapped[float] = mapped_column(Float, default=2.5, nullable=False)
    bearing: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    pitch: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    basemap: Mapped[str] = mapped_column(String(100), default="opentopomap", nullable=False)

    # Layer configurations (vector/raster layer JSON)
    layers_config: Mapped[Any] = mapped_column(JSON, default=list, nullable=False)

    # Project relationship and widgets
    project_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True
    )
    widgets_config: Mapped[Any] = mapped_column(JSON, default=dict, nullable=False)

    # ── Published content kind ────────────────────────────────────────────────
    # All three builder surfaces persist as ``maps`` rows so the share system
    # (user access, link roles, invites, access requests) applies uniformly:
    #   "map"          - classic published map (default, historical rows)
    #   "story_map"    - narrative story map (content = {"story": {...}})
    #   "presentation" - slide deck (content = {"deck": {...}, "context": {...}})
    kind: Mapped[str] = mapped_column(
        String(20), default="map", nullable=False, server_default="map", index=True
    )
    # Rich content payload for non-map kinds (plain JSON document)
    content: Mapped[Any | None] = mapped_column(JSON, nullable=True)

    # Access control
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # ── Link / general sharing ────────────────────────────────────────────────
    # Random token used for "Anyone with link" sharing
    share_token: Mapped[str | None] = mapped_column(
        String(64), nullable=True, unique=True, index=True
    )
    # Role granted to anyone who has the link ("viewer" | "commenter" | "editor")
    share_link_role: Mapped[str] = mapped_column(String(20), default="viewer", nullable=False)
    # Whether link sharing is currently enabled
    share_link_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── Share-level settings (editorsCanShare, viewersCanDownload) ────────────
    share_settings: Mapped[Any] = mapped_column(
        JSON,
        default=lambda: {"editorsCanShare": True, "viewersCanDownload": True},
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    owner: Mapped[User] = relationship("User", lazy="selectin")
    project: Mapped[ProjectModel | None] = relationship(
        "ProjectModel", back_populates="maps", lazy="selectin"
    )
    group_access: Mapped[list[MapGroupAccess]] = relationship(
        "MapGroupAccess", back_populates="map_item", cascade="all, delete-orphan", lazy="selectin"
    )
    user_access: Mapped[list[MapUserAccess]] = relationship(
        "MapUserAccess", back_populates="map_item", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<MapModel id={self.id} title={self.title!r} public={self.is_public}>"


class MapGroupAccess(Base):
    """Maps group permissions to specific Map items."""

    __tablename__ = "map_group_access"
    __table_args__ = (UniqueConstraint("map_id", "group_id", name="uq_map_group_access"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    map_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("maps.id", ondelete="CASCADE"), nullable=False, index=True
    )
    group_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    permission: Mapped[str] = mapped_column(
        String(20), default="read", nullable=False
    )  # read | write | admin

    map_item: Mapped[MapModel] = relationship("MapModel", back_populates="group_access")
    group: Mapped[Group] = relationship("Group", lazy="selectin")

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<MapGroupAccess map_id={self.map_id} group_id={self.group_id} perm={self.permission}>"
        )


class MapUserAccess(Base):
    """Per-user access entries for a Map - owner/editor/commenter/viewer roles.

    This is the source of truth for the Share Dialog. An invite is ``pending``
    until the invited person accepts it via the email link.
    """

    __tablename__ = "map_user_access"
    __table_args__ = (UniqueConstraint("map_id", "user_id", name="uq_map_user_access"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    map_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("maps.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    # Email used for pending (not-yet-registered) invitees
    email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    # Role: owner | editor | commenter | viewer
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="viewer")
    # Whether the invitee has not yet accepted
    pending: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Who sent the invite
    invited_by_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # One-time token for invite-accept links (cleared after acceptance)
    invite_token: Mapped[str | None] = mapped_column(
        String(64), nullable=True, unique=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    map_item: Mapped[MapModel] = relationship("MapModel", back_populates="user_access")
    user: Mapped[User | None] = relationship("User", foreign_keys=[user_id], lazy="selectin")
    invited_by: Mapped[User | None] = relationship(
        "User", foreign_keys=[invited_by_id], lazy="selectin"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<MapUserAccess map_id={self.map_id} email={self.email} role={self.role} pending={self.pending}>"
