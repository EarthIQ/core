from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.api.auth.models import User, Group


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
    
    # Access control
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
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

    owner: Mapped[User] = relationship("User", lazy="selectin")
    group_access: Mapped[List[MapGroupAccess]] = relationship(
        "MapGroupAccess", back_populates="map_item", cascade="all, delete-orphan", lazy="selectin"
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
