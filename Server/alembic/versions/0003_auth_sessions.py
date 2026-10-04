"""Add auth_sessions table so bearer tokens issued at login can actually be
verified server-side. Additive only (new table).

Revision ID: 0003_auth_sessions
Revises: 0002_locks_cutoff_dedup
Create Date: 2026-10-04 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0003_auth_sessions'
down_revision: Union[str, None] = '0002_locks_cutoff_dedup'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'auth_sessions' in inspector.get_table_names():
        return  # already created by Base.metadata.create_all() on a prior app startup
    op.create_table(
        'auth_sessions',
        sa.Column('token', sa.String(length=128), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('username', sa.String(length=64), nullable=False),
        sa.Column('role', sa.String(length=32), nullable=False),
        sa.Column('display_name', sa.String(length=128), nullable=False),
        sa.Column('outlet_id', sa.String(length=32), nullable=True),
        sa.Column('vehicle_id', sa.String(length=32), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('token'),
    )
    op.create_index(op.f('ix_auth_sessions_user_id'), 'auth_sessions', ['user_id'], unique=False)
    op.create_index(op.f('ix_auth_sessions_role'), 'auth_sessions', ['role'], unique=False)


def downgrade() -> None:
    op.drop_table('auth_sessions')
