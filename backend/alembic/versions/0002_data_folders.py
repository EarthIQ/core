"""Add data_folders catalog tree + geo_datasets.folder_id

Revision ID: a3f8c2d91b44
Revises: 92d68d0451ec
Create Date: 2026-07-09 09:00:00.000000
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a3f8c2d91b44'
down_revision: Union[str, None] = '92d68d0451ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'data_folders',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=256), nullable=False),
        sa.Column('parent_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['parent_id'], ['data_folders.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_data_folders_name'), 'data_folders', ['name'], unique=False)
    op.create_index(op.f('ix_data_folders_parent_id'), 'data_folders', ['parent_id'], unique=False)

    op.add_column(
        'geo_datasets',
        sa.Column('folder_id', sa.String(length=36), nullable=True),
    )
    op.create_foreign_key(
        'fk_geo_datasets_folder_id',
        'geo_datasets',
        'data_folders',
        ['folder_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index(op.f('ix_geo_datasets_folder_id'), 'geo_datasets', ['folder_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_geo_datasets_folder_id'), table_name='geo_datasets')
    op.drop_constraint('fk_geo_datasets_folder_id', 'geo_datasets', type_='foreignkey')
    op.drop_column('geo_datasets', 'folder_id')
    op.drop_index(op.f('ix_data_folders_parent_id'), table_name='data_folders')
    op.drop_index(op.f('ix_data_folders_name'), table_name='data_folders')
    op.drop_table('data_folders')