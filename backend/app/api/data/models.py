from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class GeoDataset(Base):
    """Metadata record for an uploaded spatial dataset."""

    __tablename__ = "geo_datasets"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    format: Mapped[str] = mapped_column(
        String(32), nullable=False, default="GeoJSON"
    )  # GeoJSON | Shapefile | GeoTIFF | CSV | COG
    type: Mapped[str] = mapped_column(
        String(32), nullable=False, default="vector"
    )  # vector | raster | tabular | remote-sensing
    crs: Mapped[str] = mapped_column(String(128), nullable=False, default="EPSG:4326 (WGS 84)")
    tags: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    feature_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    storage_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    attributes: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list
    )  # [{"field": "name", "type": "String", "sample": "..."}]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    features: Mapped[list["GeoFeature"]] = relationship(
        "GeoFeature",
        back_populates="dataset",
        cascade="all, delete-orphan",
        lazy="noload",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<GeoDataset id={self.id} name={self.name!r}>"


class GeoFeature(Base):
    """Individual geometry feature belonging to a GeoDataset.

    Geometries are stored in PostGIS (EPSG:4326) so they can be
    queried efficiently for MVT tile generation via ST_AsMVT.
    """

    __tablename__ = "geo_features"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    dataset_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("geo_datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    geom = mapped_column(
        Geometry(geometry_type="GEOMETRY", srid=4326, nullable=True),
        nullable=True,
    )
    properties: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict
    )

    dataset: Mapped["GeoDataset"] = relationship(
        "GeoDataset", back_populates="features"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<GeoFeature id={self.id} dataset_id={self.dataset_id}>"
