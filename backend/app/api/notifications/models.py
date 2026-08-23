"""
Notifications — SQLAlchemy ORM Models (core).

All tables are prefixed with ``notification_`` to avoid collisions. They share
the core ``Base`` so the core Alembic env picks them up automatically.

Tables
------
notification_messages     — a single immutable notification (the "event")
notification_recipients   — who the message was delivered to + read state
notification_preferences  — per-user delivery / category preferences

A "notification" in the UI is a ``(message, recipient)`` pair. The message is
stored once; each recipient gets their own row tracking whether they've read it.
This makes "mark as read" per-user and lets a single broadcast fan out to many
users cheaply.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Message ────────────────────────────────────────────────────────────────────

class NotificationMessage(Base):
    """A single notification event (title + body + optional structured payload)."""

    __tablename__ = "notification_messages"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    # e.g. "system" | "access_request" | "project" | "dataset" | "ai" | "mention"
    category: Mapped[str] = mapped_column(
        String(40), nullable=False, default="system", index=True
    )
    # e.g. "info" | "success" | "warning" | "error"
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="info")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Structured, machine-readable context (e.g. {"project_id": "...", "actor": "..."}).
    # Stored as a JSON string to stay dialect-agnostic.
    payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Who triggered the notification (user id) or a system source string.
    source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Optional deep link the client should navigate to when the item is clicked.
    link: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow, index=True
    )

    recipients: Mapped[list[NotificationRecipient]] = relationship(
        back_populates="message",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="NotificationRecipient.created_at.desc()",
    )

    def __repr__(self) -> str:
        return f"<NotificationMessage id={self.id} category={self.category!r} title={self.title!r}>"


# ── Recipient ──────────────────────────────────────────────────────────────────

class NotificationRecipient(Base):
    """Delivery + read-state of a :class:`NotificationMessage` to one user."""

    __tablename__ = "notification_recipients"
    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_notification_delivered"),
        Index("ix_notification_recipients_unread", "user_id", "read"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    message_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("notification_messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ``lazy="joined"``: the message must be co-loaded with every recipient,
    # otherwise serializing a recipient outside a greenlet context
    # (``recipient_to_read`` in an async request handler) triggers a lazy-load
    # and raises ``MissingGreenlet``.
    message: Mapped[NotificationMessage] = relationship(
        back_populates="recipients", lazy="joined"
    )

    def __repr__(self) -> str:
        return f"<NotificationRecipient user={self.user_id} message={self.message_id} read={self.read}>"


# ── Preferences ────────────────────────────────────────────────────────────────

class NotificationPreferences(Base):
    """Per-user notification delivery / category preferences."""

    __tablename__ = "notification_preferences"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    # Master switch — when off, no in-app notifications are delivered to the user.
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Per-category toggles, stored as a JSON object e.g.
    # {"system": true, "project": true, "dataset": true, "access_request": true, "ai": true, "mention": true}
    categories: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Whether to also surface a browser/desktop toast when a notification arrives.
    toasts: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Sound on (kept for parity with settings UI; client decides actual audio).
    sound: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow
    )

    def __repr__(self) -> str:
        return f"<NotificationPreferences user={self.user_id} enabled={self.enabled}>"