# backend/alembic/versions/20251206_223629_add_consent_tables.py

"""add_consent_tables

Revision ID: 20251206_223629
Revises: [latest_revision]
Create Date: 2025-12-06 22:36:29.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '20251206_223629'
# Set to the previous migration in the chain (update if your history differs)
down_revision: Union[str, None] = '20251205_000000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create consent_records table
    op.create_table('consent_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=64), nullable=False),
        sa.Column('consent_data', sa.JSON(), nullable=False),
        sa.Column('consent_hash', sa.String(length=64), nullable=False),
        sa.Column('consent_version', sa.String(length=16), nullable=False),
        sa.Column('ip_address', sa.dialects.postgresql.INET(), nullable=False),
        sa.Column('user_agent', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_consent_records_id'), 'consent_records', ['id'], unique=False)
    op.create_index(op.f('ix_consent_records_user_id'), 'consent_records', ['user_id'], unique=False)

    # Create cookie_categories table
    op.create_table('cookie_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=32), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('required', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_cookie_categories_id'), 'cookie_categories', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_cookie_categories_id'), table_name='cookie_categories')
    op.drop_table('cookie_categories')
    op.drop_index(op.f('ix_consent_records_user_id'), table_name='consent_records')
    op.drop_index(op.f('ix_consent_records_id'), table_name='consent_records')
    op.drop_table('consent_records')
