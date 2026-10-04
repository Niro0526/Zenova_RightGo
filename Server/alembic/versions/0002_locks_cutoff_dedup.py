"""Additive schema changes for dispatcher audit fixes:
- locked flags on draft_assignments/draft_stop_sequences/draft_trip_meta/
  draft_vehicle_fuel_inputs so the greedy re-suggest planner can preserve
  manual dispatcher decisions instead of overwriting them.
- unique (scenario, version) on released_manifests as a DB-level guard
  against a concurrent double-release race creating two manifests with the
  same version number.
- deferral_memory.last_counted_run_date so a deferral streak is only bumped
  once per eligible planning run, not once per manifest revision.
- orders.run_date + operating_calendar_days table for the 4 PM Asia/Colombo
  confirmation cutoff and operating-calendar eligibility check.

All changes are additive (new nullable columns / new table / new
constraint) - no existing column is altered or dropped, so this is safe to
run against a populated database without data loss.

Revision ID: 0002_locks_cutoff_dedup
Revises: 0001_initial_schema
Create Date: 2026-10-04 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0002_locks_cutoff_dedup'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('draft_assignments', sa.Column('locked', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('draft_stop_sequences', sa.Column('locked', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('draft_trip_meta', sa.Column('locked', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('draft_vehicle_fuel_inputs', sa.Column('locked', sa.Boolean(), nullable=False, server_default=sa.false()))

    # SQLite cannot ALTER a constraint onto an existing table directly - batch
    # mode handles it via copy-and-move (also works unchanged on Postgres).
    with op.batch_alter_table('released_manifests') as batch_op:
        batch_op.create_unique_constraint(
            'uq_released_manifest_scenario_version', ['scenario', 'version']
        )

    op.add_column('deferral_memory', sa.Column('last_counted_run_date', sa.Date(), nullable=True))

    op.add_column('orders', sa.Column('run_date', sa.Date(), nullable=True))
    op.create_index(op.f('ix_orders_run_date'), 'orders', ['run_date'], unique=False)

    # app startup also runs Base.metadata.create_all(), which may have
    # already created this brand-new table (it only creates missing tables,
    # never adds columns to existing ones) before this migration ran - guard
    # against "table already exists" in that case.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'operating_calendar_days' not in inspector.get_table_names():
        op.create_table(
            'operating_calendar_days',
            sa.Column('date', sa.Date(), nullable=False),
            sa.Column('is_operating', sa.Boolean(), nullable=False),
            sa.Column('is_weekend', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('is_holiday', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.PrimaryKeyConstraint('date'),
        )


def downgrade() -> None:
    op.drop_table('operating_calendar_days')
    op.drop_index(op.f('ix_orders_run_date'), table_name='orders')
    op.drop_column('orders', 'run_date')
    op.drop_column('deferral_memory', 'last_counted_run_date')
    with op.batch_alter_table('released_manifests') as batch_op:
        batch_op.drop_constraint('uq_released_manifest_scenario_version', type_='unique')
    op.drop_column('draft_vehicle_fuel_inputs', 'locked')
    op.drop_column('draft_trip_meta', 'locked')
    op.drop_column('draft_stop_sequences', 'locked')
    op.drop_column('draft_assignments', 'locked')
