"""Persist the driver's manual Confirm Arrival per stop (stop_arrivals).

Additive only: one new table. Safe to run on a database whose app already ran
Base.metadata.create_all() (the table is skipped if it exists).

Revision ID: 0005_stop_arrivals
Revises: 0004_merge_heads
Create Date: 2026-10-05 09:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0005_stop_arrivals'
down_revision: Union[str, None] = '0004_merge_heads'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if 'stop_arrivals' in inspector.get_table_names():
        return
    op.create_table(
        'stop_arrivals',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('trip_id', sa.String(length=64), nullable=False),
        sa.Column('manifest_version', sa.Integer(), nullable=False),
        sa.Column('vehicle_id', sa.String(length=32), nullable=False),
        sa.Column('stop_id', sa.String(length=32), nullable=False),
        sa.Column('arrived_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('source', sa.String(length=16), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('arrived_by', sa.String(length=128), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('trip_id', 'manifest_version', 'vehicle_id', 'stop_id', name='uq_stop_arrival_trip_stop'),
    )
    op.create_index(op.f('ix_stop_arrivals_trip_id'), 'stop_arrivals', ['trip_id'], unique=False)
    op.create_index(op.f('ix_stop_arrivals_vehicle_id'), 'stop_arrivals', ['vehicle_id'], unique=False)
    op.create_index(op.f('ix_stop_arrivals_stop_id'), 'stop_arrivals', ['stop_id'], unique=False)


def downgrade() -> None:
    op.drop_table('stop_arrivals')
