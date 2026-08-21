"""Add annotations, bookmarks, and comments columns to projects.

Revision ID: 0008
Revises: 0007
Create Date: 2026-08-21
"""
from __future__ import annotations
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("annotations", sa.JSON(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "projects",
        sa.Column("bookmarks", sa.JSON(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "projects",
        sa.Column("comments", sa.JSON(), nullable=False, server_default="[]"),
    )


def downgrade() -> None:
    op.drop_column("projects", "comments")
    op.drop_column("projects", "bookmarks")
    op.drop_column("projects", "annotations")