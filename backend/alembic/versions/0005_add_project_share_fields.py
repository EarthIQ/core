"""Add share fields to projects.

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-18
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("share_token", sa.String(64), nullable=True),
    )
    op.add_column(
        "projects",
        sa.Column("share_link_role", sa.String(20), nullable=False, server_default="viewer"),
    )
    op.add_column(
        "projects",
        sa.Column("share_link_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "projects",
        sa.Column(
            "share_settings",
            sa.JSON(),
            nullable=False,
            server_default='{"editorsCanShare": true, "viewersCanDownload": true}',
        ),
    )
    op.create_index("ix_projects_share_token", "projects", ["share_token"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_projects_share_token", table_name="projects")
    op.drop_column("projects", "share_settings")
    op.drop_column("projects", "share_link_enabled")
    op.drop_column("projects", "share_link_role")
    op.drop_column("projects", "share_token")