"""Add access_requests table (Google-Docs style access requests).

Revision ID: 0006
Revises: 0005
Create Date: 2026-08-20
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "access_requests",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("entity_type", sa.String(20), nullable=False),
        sa.Column("entity_id", sa.String(36), nullable=False),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("message", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("requested_role", sa.String(20), nullable=False, server_default="viewer"),
        sa.Column("granted_role", sa.String(20), nullable=True),
        sa.Column("approval_token", sa.String(64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.UniqueConstraint("entity_type", "entity_id", "user_id", name="uq_access_request"),
    )
    op.create_index("ix_access_requests_entity_type", "access_requests", ["entity_type"])
    op.create_index("ix_access_requests_entity_id", "access_requests", ["entity_id"])
    op.create_index("ix_access_requests_user_id", "access_requests", ["user_id"])
    op.create_index(
        "ix_access_requests_approval_token", "access_requests", ["approval_token"], unique=True
    )


def downgrade() -> None:
    op.drop_table("access_requests")
