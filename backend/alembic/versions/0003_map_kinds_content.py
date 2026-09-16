"""Add maps.kind + maps.content (published content kinds)

Revision ID: b7e4d1a2c903
Revises: a3f8c2d91b44
Create Date: 2026-09-15 21:00:00.000000

Story maps and map presentations persist as ``maps`` rows (kind =
``story_map`` / ``presentation``) so the existing share system applies to
them uniformly. Historical rows default to ``kind='map'``.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b7e4d1a2c903"
down_revision: str | None = "a3f8c2d91b44"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "maps",
        sa.Column("kind", sa.String(length=20), nullable=False, server_default="map"),
    )
    op.create_index(op.f("ix_maps_kind"), "maps", ["kind"], unique=False)
    op.add_column("maps", sa.Column("content", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("maps", "content")
    op.drop_index(op.f("ix_maps_kind"), table_name="maps")
    op.drop_column("maps", "kind")
