"""Add description, source, and meta columns to geo_datasets.

Revision ID: 0007
Revises: 0006
Create Date: 2026-08-20
"""
from __future__ import annotations
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "geo_datasets",
        sa.Column("description", sa.Text(), nullable=True),
    )
    op.add_column(
        "geo_datasets",
        sa.Column("source", sa.String(512), nullable=True),
    )
    op.add_column(
        "geo_datasets",
        sa.Column("meta", JSONB(), nullable=False, server_default="{}"),
    )


def downgrade() -> None:
    op.drop_column("geo_datasets", "meta")
    op.drop_column("geo_datasets", "source")
    op.drop_column("geo_datasets", "description")