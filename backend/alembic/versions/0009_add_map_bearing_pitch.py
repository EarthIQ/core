"""Add bearing and pitch columns to maps.

Revision ID: 0009
Revises: 0008
Create Date: 2026-08-21
"""
from __future__ import annotations
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "maps",
        sa.Column("bearing", sa.Float(), nullable=False, server_default="0.0"),
    )
    op.add_column(
        "maps",
        sa.Column("pitch", sa.Float(), nullable=False, server_default="0.0"),
    )


def downgrade() -> None:
    op.drop_column("maps", "pitch")
    op.drop_column("maps", "bearing")