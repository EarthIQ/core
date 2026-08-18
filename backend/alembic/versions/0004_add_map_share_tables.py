"""Add map share fields: share_token, share_link_*, share_settings on maps,
and new map_user_access table for per-user role-based access.

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-18
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── New columns on maps table ─────────────────────────────────────────────
    op.add_column(
        "maps",
        sa.Column("share_token", sa.String(64), nullable=True, unique=True),
    )
    op.add_column(
        "maps",
        sa.Column("share_link_role", sa.String(20), nullable=False, server_default="viewer"),
    )
    op.add_column(
        "maps",
        sa.Column("share_link_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "maps",
        sa.Column(
            "share_settings",
            sa.JSON(),
            nullable=False,
            server_default='{"editorsCanShare": true, "viewersCanDownload": true}',
        ),
    )

    op.create_index("ix_maps_share_token", "maps", ["share_token"], unique=True)

    # ── New map_user_access table ─────────────────────────────────────────────
    op.create_table(
        "map_user_access",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "map_id",
            sa.String(36),
            sa.ForeignKey("maps.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
        sa.Column("email", sa.String(254), nullable=False, index=True),
        sa.Column("role", sa.String(20), nullable=False, server_default="viewer"),
        sa.Column("pending", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "invited_by_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("invite_token", sa.String(64), nullable=True, unique=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("map_id", "user_id", name="uq_map_user_access"),
    )
    op.create_index("ix_map_user_access_invite_token", "map_user_access", ["invite_token"], unique=True)
    op.create_index("ix_map_user_access_email", "map_user_access", ["email"])


def downgrade() -> None:
    op.drop_table("map_user_access")
    op.drop_index("ix_maps_share_token", table_name="maps")
    op.drop_column("maps", "share_settings")
    op.drop_column("maps", "share_link_enabled")
    op.drop_column("maps", "share_link_role")
    op.drop_column("maps", "share_token")
