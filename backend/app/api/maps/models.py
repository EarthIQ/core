from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional, TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.api.auth.models import User, Group

if TYPE_CHECKING:
    from app.api.projects.models import ProjectModel


class MapModel(Base):
    """Configurable Map entity with viewport, basemap, layers, and ownership."""

    __tablename__ = "maps"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Viewport config
    center_lng: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    center_lat: Mapped[float] = mapped_column(Float, default=20.0, nullable=False)
    zoom: Mapped[float] = mapped_column(Float, default=2.5, nullable=False)
    basemap: Mapped[str] = mapped_column(String(100), default="dataviz-dark", nullable=False)
    
    # Layer configurations (vector/raster layer JSON)
    layers_config: Mapped[Any] = mapped_column(JSON, default=list, nullable=False)
    
    # Project relationship and widgets
    project_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True
    )
    widgets_config: Mapped[Any] = mapped_column(JSON, default=dict, nullable=False)

    # Access control
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # ── Link / general sharing ────────────────────────────────────────────────
    # Random token used for "Anyone with link" sharing
    share_token: Mapped[Optional[str]] = mapped_column(
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
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    owner: Mapped[User] = relationship("User", lazy="selectin")
    project: Mapped[Optional[ProjectModel]] = relationship("ProjectModel", back_populates="maps", lazy="selectin")
    group_access: Mapped[List[MapGroupAccess]] = relationship(
        "MapGroupAccess", back_populates="map_item", cascade="all, delete-orphan", lazy="selectin"
    )
    user_access: Mapped[List[MapUserAccess]] = relationship(
        "MapUserAccess", back_populates="map_item", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<MapModel id={self.id} title={self.title!r} public={self.is_public}>"


class MapGroupAccess(Base):
    """Maps group permissions to specific Map items."""

    __tablename__ = "map_group_access"
    __table_args__ = (
        UniqueConstraint("map_id", "group_id", name="uq_map_group_access"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
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
        return f"<MapGroupAccess map_id={self.map_id} group_id={self.group_id} perm={self.permission}>"


class MapUserAccess(Base):
    """Per-user access entries for a Map — owner/editor/commenter/viewer roles.

    This is the source of truth for the Share Dialog. An invite is ``pending``
    until the invited person accepts it via the email link.
    """

    __tablename__ = "map_user_access"
    __table_args__ = (
        UniqueConstraint("map_id", "user_id", name="uq_map_user_access"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    map_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("maps.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    # Email used for pending (not-yet-registered) invitees
    email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    # Role: owner | editor | commenter | viewer
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="viewer")
    # Whether the invitee has not yet accepted
    pending: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Who sent the invite
    invited_by_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # One-time token for invite-accept links (cleared after acceptance)
    invite_token: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, unique=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    map_item: Mapped[MapModel] = relationship("MapModel", back_populates="user_access")
    user: Mapped[Optional[User]] = relationship(
        "User", foreign_keys=[user_id], lazy="selectin"
    )
    invited_by: Mapped[Optional[User]] = relationship(
        "User", foreign_keys=[invited_by_id], lazy="selectin"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<MapUserAccess map_id={self.map_id} email={self.email} role={self.role} pending={self.pending}>"
