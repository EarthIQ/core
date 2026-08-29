from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.api.auth.models import User, Group

class ProjectModel(Base):
    """Geospatial Project workspace."""

    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Viewport config
    center_lng: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    center_lat: Mapped[float] = mapped_column(Float, default=20.0, nullable=False)
    zoom: Mapped[float] = mapped_column(Float, default=2.5, nullable=False)
    basemap: Mapped[str] = mapped_column(String(100), default="opentopomap", nullable=False)

    # Layer configurations
    layers_config: Mapped[Any] = mapped_column(JSON, default=list, nullable=False)

    # Map editor state (annotations, bookmarks, comments)
    annotations: Mapped[Any] = mapped_column(JSON, default=list, nullable=False)
    bookmarks: Mapped[Any] = mapped_column(JSON, default=list, nullable=False)
    comments: Mapped[Any] = mapped_column(JSON, default=list, nullable=False)

    # Ownership
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Link / general sharing ────────────────────────────────────────────────
    share_token: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, unique=True, index=True
    )
    share_link_role: Mapped[str] = mapped_column(String(20), default="viewer", nullable=False)
    share_link_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    share_settings: Mapped[Any] = mapped_column(
        JSON,
        default=lambda: {"editorsCanShare": True, "viewersCanDownload": True},
        nullable=False,
    )

    owner: Mapped[User] = relationship("User", lazy="selectin")
    group_access: Mapped[List[ProjectGroupAccess]] = relationship(
        "ProjectGroupAccess", back_populates="project_item", cascade="all, delete-orphan", lazy="selectin"
    )
    user_access: Mapped[List[ProjectUserAccess]] = relationship(
        "ProjectUserAccess", back_populates="project", cascade="all, delete-orphan", lazy="selectin"
    )
    maps: Mapped[List[MapModel]] = relationship(
        "MapModel", back_populates="project", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ProjectModel id={self.id} title={self.title!r}>"


class ProjectGroupAccess(Base):
    """Projects group permissions to specific Project workspaces."""

    __tablename__ = "project_group_access"
    __table_args__ = (
        UniqueConstraint("project_id", "group_id", name="uq_project_group_access"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    group_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    permission: Mapped[str] = mapped_column(
        String(20), default="read", nullable=False
    )  # read | write | admin

    project_item: Mapped[ProjectModel] = relationship("ProjectModel", back_populates="group_access")
    group: Mapped[Group] = relationship("Group", lazy="selectin")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ProjectGroupAccess project_id={self.project_id} group_id={self.group_id} perm={self.permission}>"


class ProjectUserAccess(Base):
    """Per-user role-based access control for projects (owner/editor/commenter/viewer)."""

    __tablename__ = "project_user_access"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_user_access"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), default="viewer", nullable=False)
    pending: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    invited_by_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    invite_token: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    project: Mapped[ProjectModel] = relationship("ProjectModel", back_populates="user_access")
    user: Mapped[Optional[User]] = relationship(
        "User", foreign_keys=[user_id], lazy="selectin"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ProjectUserAccess project_id={self.project_id} email={self.email!r} role={self.role!r}>"
