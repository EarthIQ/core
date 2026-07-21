"""Add groups, permissions, user_groups, group_permissions, maps, and map_group_access tables.

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-21
"""
from __future__ import annotations
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── groups ────────────────────────────────────────────────────────────────
    op.create_table(
        "groups",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_groups_name", "groups", ["name"], unique=True)

    # ── permissions ───────────────────────────────────────────────────────────
    op.create_table(
        "permissions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
    )
    op.create_index("ix_permissions_name", "permissions", ["name"], unique=True)

    # ── user_groups ───────────────────────────────────────────────────────────
    op.create_table(
        "user_groups",
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "group_id",
            sa.String(36),
            sa.ForeignKey("groups.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # ── group_permissions ─────────────────────────────────────────────────────
    op.create_table(
        "group_permissions",
        sa.Column(
            "group_id",
            sa.String(36),
            sa.ForeignKey("groups.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "permission_id",
            sa.String(36),
            sa.ForeignKey("permissions.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )

    # ── maps ──────────────────────────────────────────────────────────────────
    op.create_table(
        "maps",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("center_lng", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("center_lat", sa.Float(), nullable=False, server_default="20.0"),
        sa.Column("zoom", sa.Float(), nullable=False, server_default="2.5"),
        sa.Column("basemap", sa.String(100), nullable=False, server_default="dataviz-dark"),
        sa.Column("layers_config", sa.JSON(), nullable=False),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "owner_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
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
    op.create_index("ix_maps_title", "maps", ["title"])
    op.create_index("ix_maps_is_public", "maps", ["is_public"])
    op.create_index("ix_maps_owner_id", "maps", ["owner_id"])

    # ── map_group_access ──────────────────────────────────────────────────────
    op.create_table(
        "map_group_access",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "map_id",
            sa.String(36),
            sa.ForeignKey("maps.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "group_id",
            sa.String(36),
            sa.ForeignKey("groups.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("permission", sa.String(20), nullable=False, server_default="read"),
        sa.UniqueConstraint("map_id", "group_id", name="uq_map_group_access"),
    )
    op.create_index("ix_map_group_access_map_id", "map_group_access", ["map_id"])
    op.create_index("ix_map_group_access_group_id", "map_group_access", ["group_id"])


def downgrade() -> None:
    op.drop_table("map_group_access")
    op.drop_index("ix_maps_owner_id", table_name="maps")
    op.drop_index("ix_maps_is_public", table_name="maps")
    op.drop_index("ix_maps_title", table_name="maps")
    op.drop_table("maps")
    op.drop_table("group_permissions")
    op.drop_table("user_groups")
    op.drop_index("ix_permissions_name", table_name="permissions")
    op.drop_table("permissions")
    op.drop_index("ix_groups_name", table_name="groups")
    op.drop_table("groups")
