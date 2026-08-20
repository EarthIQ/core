"""ORM models for the share sub-package (map + project agnostic).

Register with ``Base.metadata`` via the ``main.py`` import so that
``create_all`` (dev) and Alembic (production) both see the tables.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.api.auth.models import User


class AccessRequest(Base):
    """A user requesting access to a map or project (Google-Docs style).

    The entity's owner is emailed an approval link (``approval_token``).
    When the owner grants access, a ``user_access`` row is created (or
    updated) and this request flips to ``granted``.
    """

    __tablename__ = "access_requests"
    __table_args__ = (
        UniqueConstraint("entity_type", "entity_id", "user_id", name="uq_access_request"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    # "map" | "project"
    entity_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    # The requesting user (they must be logged in)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Requester email at time of request (kept for emails/notifications)
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    message: Mapped[str] = mapped_column(Text, default="", nullable=False)
    # pending | granted | denied
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    # Role the requester would like (informational) — viewer | commenter | editor
    requested_role: Mapped[str] = mapped_column(String(20), default="viewer", nullable=False)
    # Role actually granted when the owner approved
    granted_role: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # One-time token for the owner's approval link
    approval_token: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    requester: Mapped[Optional[User]] = relationship(
        "User", foreign_keys=[user_id], lazy="selectin"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<AccessRequest {self.entity_type}/{self.entity_id} by={self.email} status={self.status}>"
