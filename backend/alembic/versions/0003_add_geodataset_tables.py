"""Add geo_datasets and geo_features tables with PostGIS geometry support.

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-29
"""
from __future__ import annotations
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure PostGIS extension is available
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # ── geo_datasets ──────────────────────────────────────────────────────────
    op.create_table(
        "geo_datasets",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(512), nullable=False),
        sa.Column("format", sa.String(32), nullable=False, server_default="GeoJSON"),
        sa.Column("type", sa.String(32), nullable=False, server_default="vector"),
        sa.Column("crs", sa.String(128), nullable=False, server_default="EPSG:4326 (WGS 84)"),
        sa.Column("tags", JSONB, nullable=False, server_default="[]"),
        sa.Column("feature_count", sa.Integer, nullable=True),
        sa.Column("file_size_bytes", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("storage_key", sa.Text, nullable=True),
        sa.Column("attributes", JSONB, nullable=False, server_default="[]"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_geo_datasets_name", "geo_datasets", ["name"])

    # ── geo_features ──────────────────────────────────────────────────────────
    op.create_table(
        "geo_features",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "dataset_id",
            sa.String(36),
            sa.ForeignKey("geo_datasets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("properties", JSONB, nullable=False, server_default="{}"),
    )
    # Add the PostGIS geometry column separately using raw SQL
    # (geoalchemy2 DDL helpers need the extension already active)
    op.execute(
        "ALTER TABLE geo_features ADD COLUMN geom geometry(Geometry, 4326)"
    )
    op.create_index("ix_geo_features_dataset_id", "geo_features", ["dataset_id"])
    op.execute(
        "CREATE INDEX ix_geo_features_geom ON geo_features USING GIST (geom)"
    )


def downgrade() -> None:
    op.drop_table("geo_features")
    op.drop_table("geo_datasets")
